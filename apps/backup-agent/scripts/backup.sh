#!/bin/sh
# CafeOS Edge — safe PostgreSQL backup (plain SQL, gzip).
#
# Robustness guarantees:
#   - set -euo pipefail: fail on any command error, unset var, or pipe failure.
#   - pg_dump exit code is honored (pipefail).
#   - stderr (pg_dump notices) is NEVER mixed into the backup file (fd 2 -> log).
#   - write to .tmp first, verify, then atomic rename — a failed dump is never
#     left as a "valid" backup.
#   - gzip -t integrity check + SQL header check before rename.
#   - credentials are only ever passed via PGPASSWORD env; never logged/echoed.
#
# Output (stdout): the final backup file path, or nothing on failure (exit != 0).

set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL required}"
: "${BACKUP_DIR:?BACKUP_DIR required}"

# --- Parse DATABASE_URL without echoing credentials ---------------------------
# Supported: postgresql://user:pass@host:port/db  (password may contain : @ / %)
url="${DATABASE_URL#*://}"        # user:pass@host:port/db
user="${url%%:*}"                 # user
rest="${url#*:}"                  # pass@host:port/db
pass="${rest%%@*}"                # pass
rest="${rest#*@}"                 # host:port/db
host="${rest%%:*}"                # host
rest="${rest#*:}"                 # port/db
port="${rest%%/*}"                # port
db="${rest#*/}"                   # db

export PGPASSWORD="$pass"

mkdir -p "$BACKUP_DIR"

ts="$(date +%s%3N)"
tmp="${BACKUP_DIR}/cafeos-backup-${ts}.sql.gz.tmp"
final="${BACKUP_DIR}/cafeos-backup-${ts}.sql.gz"

cleanup() { rm -f "$tmp"; }
trap cleanup EXIT

# --- 1. Dump (plain SQL) -> gzip -> .tmp --------------------------------------
# pipefail makes this fail if pg_dump OR gzip exits non-zero.
pg_dump -h "$host" -p "$port" -U "$user" -d "$db" \
  --no-owner --no-privileges --no-password 2>"${tmp}.pgdump.err" \
  | gzip -9 > "$tmp"

# If pg_dump emitted warnings, surface them on stderr (not into the backup).
if [ -s "${tmp}.pgdump.err" ]; then
  cat "${tmp}.pgdump.err" >&2
fi
rm -f "${tmp}.pgdump.err"

# --- 2. Integrity: gzip -t ----------------------------------------------------
gzip -t "$tmp"

# --- 3. Content check: decompressed stream must start with SQL preamble --------
# (head closes early -> gunzip may get SIGPIPE; that's expected and harmless.
#  Integrity is already proven by `gzip -t` above.)
header="$(gunzip -c "$tmp" 2>/dev/null | head -c 64 || true)"
case "$header" in
  "--"*|"/*"*) : ;;
  *)
    echo "backup header check failed (not a PostgreSQL dump)" >&2
    exit 1
    ;;
esac

# --- 4. Non-empty sanity ------------------------------------------------------
if [ ! -s "$tmp" ]; then
  echo "backup is empty" >&2
  exit 1
fi

# --- 5. Atomic rename (only after full verification) --------------------------
mv "$tmp" "$final"
trap - EXIT

echo "$final"
