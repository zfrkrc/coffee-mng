/**
 * UUIDv7 generation.
 *
 * UUIDv7 is time-ordered (millisecond timestamp prefix) which gives us
 * roughly-sortable, globally-unique ids without a centralized sequence.
 * PostgreSQL supports uuidv7() natively on newer versions; this client-side
 * implementation keeps the app portable and lets the ORM fall back to it.
 *
 * The id is big-endian (RFC 9562): 48-bit unix epoch ms, then 12 random bits
 * variant+version, then 62 random bits.
 */

const encoder = new TextEncoder();

export function uuidv7(): string {
  const bytes = new Uint8Array(16);
  const ms = Date.now();

  // 48-bit timestamp (big-endian).
  bytes[0] = (ms / 2 ** 40) & 0xff;
  bytes[1] = (ms / 2 ** 32) & 0xff;
  bytes[2] = (ms / 2 ** 24) & 0xff;
  bytes[3] = (ms / 2 ** 16) & 0xff;
  bytes[4] = (ms / 2 ** 8) & 0xff;
  bytes[5] = ms & 0xff;

  // Version 7.
  bytes[6] = 0x70 | (cryptoRandomByte() & 0x0f);
  // Variant 10xx.
  bytes[8] = 0x80 | (cryptoRandomByte() & 0x3f);

  for (let i = 7; i < 16; i += 1) {
    if (i === 8) continue;
    bytes[i] = cryptoRandomByte();
  }

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function cryptoRandomByte(): number {
  const buf = new Uint8Array(1);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
    return buf[0];
  }
  // Fallback for non-web runtimes (Node < 19 or exotic environments).
  return Math.floor(Math.random() * 256);
}

/** Cheap sanity check for id format (not a validation guarantee). */
export function isUuidV7(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Convert a UUIDv7 string to a Buffer/bytes array (useful for storage). */
export function uuidv7ToBytes(value: string): Uint8Array {
  const hex = value.replace(/-/g, '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Keep encoder referenced for environments that need TextEncoder available.
void encoder;
