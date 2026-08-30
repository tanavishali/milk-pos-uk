/**
 * Money handling — the one rule, before any of it is written.
 *
 * Every monetary value in this backend is stored and transported as an
 * **integer number of minor units** (pence). Never a float, never a decimal
 * string, never a `Number` holding pounds.
 *
 * Why:
 *
 * - Floating point cannot represent most decimal fractions. `24.5 + 9.99`
 *   evaluates to `34.489999999999995`, which is invisible in a formatted
 *   figure but decides whether a bill reads Paid or Part Paid when compared
 *   against `34.49`. The frontend mock papers over this with a `round2()` call
 *   after every arithmetic step; an integer store removes the problem instead
 *   of rounding it away repeatedly.
 * - Money is compared for exact equality all over the ledger (`settled >=
 *   total`), and equality on floats is not a safe operation.
 * - Mongo's `Double` has the same limitation. Integers avoid needing
 *   `Decimal128` and the BSON conversion that comes with it.
 *
 * Boundary note: the existing frontend (`frontend/services/mock/`) stores
 * money as 2dp decimal pounds. When it moves onto this API, the conversion
 * (pounds to pence in, pence to pounds out) belongs in the DTO layer — one
 * crossing point, not scattered through the services.
 *
 * Currency is GBP, so the minor unit is a penny: £34.49 is stored as `3449`.
 *
 * TODO: sum/allocate helpers once the ledger is implemented.
 */

/**
 * Pounds (as the API and the frontend speak them) to stored pence.
 *
 * `Math.round` rather than a truncation, because `24.5 * 100` is `2450` but
 * `10.07 * 100` is `1006.9999999999999` — truncating there loses a penny on
 * roughly one price in a hundred.
 */
export function toMinorUnits(value: number): number {
  return Math.round(value * 100);
}

/** Stored pence back to the decimal the API returns: `2450` becomes `24.5`. */
export function fromMinorUnits(minor: number): number {
  return minor / 100;
}
