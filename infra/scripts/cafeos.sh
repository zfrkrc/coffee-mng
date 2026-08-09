#!/usr/bin/env bash
set -euo pipefail
# CafeOS Edge — lifecycle helpers
# Usage: ./scripts/cafeos.sh [up|down|logs|ps|build|restart|health|status]

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE="${ROOT}/infra/docker/docker-compose.yml"
ENV_FILE="${ROOT}/.env.edge"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ERROR: ${ENV_FILE} not found. Copy .env.edge.example first." >&2
  exit 1
fi

cmd="${1:-help}"
shift || true

case "${cmd}" in
  up)
    docker compose -f "${COMPOSE}" --env-file "${ENV_FILE}" up -d --build "$@"
    ;;
  down)
    docker compose -f "${COMPOSE}" --env-file "${ENV_FILE}" down "$@"
    ;;
  restart)
    docker compose -f "${COMPOSE}" --env-file "${ENV_FILE}" restart "$@"
    ;;
  logs)
    docker compose -f "${COMPOSE}" --env-file "${ENV_FILE}" logs -f --tail=100 "$@"
    ;;
  ps)
    docker compose -f "${COMPOSE}" --env-file "${ENV_FILE}" ps
    ;;
  build)
    docker compose -f "${COMPOSE}" --env-file "${ENV_FILE}" build "$@"
    ;;
  health)
    curl -sf http://localhost:3000/api/health/live && echo " api:ok"
    curl -sf http://localhost:3000/api/health/ready && echo " api:ready"
    curl -sf "http://localhost:${WEB_PORT:-3001}/" && echo " web:ok"
    ;;
  status)
    docker compose -f "${COMPOSE}" --env-file "${ENV_FILE}" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
    ;;
  *)
    echo "Usage: $0 [up|down|restart|logs|ps|build|health|status]"
    exit 0
    ;;
esac
