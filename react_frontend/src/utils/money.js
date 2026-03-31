/**
 * @file money.js
 * Money helpers.
 */

// PUBLIC_INTERFACE
export function formatCurrencyFromCents(cents) {
  /** This is a public function. */
  const value = Number.isFinite(cents) ? cents : 0;
  return (value / 100).toFixed(2);
}

// PUBLIC_INTERFACE
export function dollarsToCents(amount) {
  /** This is a public function. */
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * 100));
}

