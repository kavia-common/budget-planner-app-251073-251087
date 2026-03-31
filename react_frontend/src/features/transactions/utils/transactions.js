/**
 * @file transactions.js
 * Pure utilities for transaction lists.
 */

import { getMonthString } from '../../../utils/date';

/**
 * Filter transactions for a given month string.
 *
 * PUBLIC_INTERFACE
 * @param {Array<{date:string}>} txs
 * @param {string} month - 'YYYY-MM'
 * @returns {Array}
 */
export function filterByMonth(txs, month) {
  /** This is a public function. */
  return (txs || []).filter((tx) => getMonthString(tx.date) === month);
}

/**
 * Compute totals for a transaction list (amount is assumed to be a number in dollars).
 *
 * PUBLIC_INTERFACE
 * @param {Array<{type:'income'|'expense', amount:number}>} txs
 * @returns {{ income: number, expense: number, net: number }}
 */
export function computeTotals(txs) {
  /** This is a public function. */
  let income = 0;
  let expense = 0;
  (txs || []).forEach((tx) => {
    if (tx.type === 'income') income += tx.amount;
    else if (tx.type === 'expense') expense += tx.amount;
  });
  return { income, expense, net: income - expense };
}

