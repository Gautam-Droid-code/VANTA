/**
 * Money, in paise.
 *
 * Every stored amount is an integer number of paise — never a float, and never
 * a float that happens to look like rupees. `0.1 + 0.2` is `0.30000000000000004`
 * in binary floating point, and a currency column carrying that error is the
 * kind of bug nobody finds until a customer adds up their own invoice and gets
 * a different answer.
 *
 * The catalogue is authored in whole rupees (`Product.price`), which is a
 * separate unit from the one orders are stored in, and the conversion happens
 * in exactly two places: here on the way in, and `formatINR` on the way out.
 *
 * Client-safe: no `server-only`. The checkout summary is rendered on the server
 * but the order pages format money in components that may be either.
 */

/** Catalogue rupees to stored paise. */
export function rupeesToPaise(rupees: number): number {
  // Rounded, not truncated: a price that somehow arrives as 8998.9999 should
  // become ₹8,999, not ₹8,998.99.
  return Math.round(rupees * 100);
}

/** Stored paise back to rupees, for display only. Never for further maths. */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Formats a paise amount as Indian currency.
 *
 * Deliberately separate from `formatINR` in `lib/format.ts`, which takes whole
 * rupees and is what the catalogue uses. Having one function accept both units
 * would mean every caller had to know which it was passing, and the failure
 * mode is a price wrong by a factor of a hundred.
 */
export function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paiseToRupees(paise));
}
