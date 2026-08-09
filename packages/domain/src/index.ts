/**
 * @cafeos/domain — business invariants and pure domain rules.
 *
 * Pure functions only. No I/O, no framework imports. These rules are shared
 * between the API and any future offline client validation so the business
 * logic lives in ONE place (never duplicated in DB and app layers).
 */
export * from './permissions';
export * from './order';
