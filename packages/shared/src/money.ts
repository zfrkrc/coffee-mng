/**
 * Money utilities.
 *
 * All monetary values are stored as integer minor units (cents) in the
 * database and across the API. Floats are never used for money. These helpers
 * keep the conversions explicit and auditable.
 */

/** Convert major units (e.g. 12.50) to cents (1250). */
export function toCents(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error('Cannot convert non-finite value to cents');
  }
  return Math.round(value * 100);
}

/** Convert cents (1250) to major units (12.5) for display. */
export function toMajor(cents: number): number {
  return cents / 100;
}

/** Format cents as a locale string with 2 decimals. */
export function formatCents(cents: number, locale = 'tr-TR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'TRY',
  }).format(toMajor(cents));
}

/** Sum an array of cent values safely. */
export function sumCents(values: number[]): number {
  return values.reduce((acc, v) => acc + (v ?? 0), 0);
}

/**
 * Round a computed quantity up to the nearest 0.01 (used for proportional
 * split bills so parts always sum to the whole).
 */
export function splitCents(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(total / parts);
  const remainder = total - base * parts;
  const result = Array<number>(parts).fill(base);
  for (let i = 0; i < remainder; i += 1) result[i] += 1;
  return result;
}
