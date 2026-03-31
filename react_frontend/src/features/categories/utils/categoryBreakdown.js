/**
 * @file categoryBreakdown.js
 * Pure helpers to compute category totals for charts.
 */

/**
 * @typedef {Object} CategoryBreakdownRow
 * @property {string} category Category name.
 * @property {number} amount Total amount (dollars) for this category.
 */

/**
 * Compute a category breakdown for expenses (default) or income.
 *
 * Amounts are assumed to be legacy `tx.amount` in dollars (number).
 *
 * PUBLIC_INTERFACE
 * @param {Array<{type:'income'|'expense', amount:number, category?:string}>} txs
 * @param {{type?: 'expense'|'income'}} opts
 * @returns {CategoryBreakdownRow[]} Sorted descending by amount.
 */
export function computeCategoryBreakdown(txs, opts = {}) {
  /** This is a public function. */
  const includeType = opts.type === 'income' ? 'income' : 'expense';

  /** @type {Map<string, number>} */
  const totals = new Map();

  (txs || []).forEach((tx) => {
    if (!tx || tx.type !== includeType) return;
    const cat = String(tx.category || '').trim() || 'Uncategorized';
    const amt = Number(tx.amount || 0);
    if (!Number.isFinite(amt) || amt <= 0) return;

    totals.set(cat, (totals.get(cat) || 0) + amt);
  });

  const rows = Array.from(totals.entries()).map(([category, amount]) => ({ category, amount }));
  rows.sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
  return rows;
}

/**
 * Sum amount from breakdown rows.
 *
 * PUBLIC_INTERFACE
 * @param {Array<{amount:number}>} rows
 * @returns {number}
 */
export function sumBreakdownAmount(rows) {
  /** This is a public function. */
  return (rows || []).reduce((acc, r) => acc + (Number(r.amount || 0) || 0), 0);
}
