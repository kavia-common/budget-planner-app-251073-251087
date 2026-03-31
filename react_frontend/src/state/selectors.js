/**
 * @file selectors.js
 * Pure derived-data helpers ("selectors") for AppState.
 */

import { computeTotals, getMonthString } from '../components/utils';

/**
 * PUBLIC_INTERFACE
 * @param {import('../models/core').AppState} state
 * @returns {import('../models/core').Category[]}
 */
export function selectCategories(state) {
  return Object.values(state.entities.categories);
}

/**
 * PUBLIC_INTERFACE
 * @param {import('../models/core').AppState} state
 * @returns {import('../models/core').Transaction[]}
 */
export function selectAllTransactions(state) {
  return Object.values(state.entities.transactions);
}

/**
 * Apply state.ui.filters to transactions.
 *
 * PUBLIC_INTERFACE
 * @param {import('../models/core').AppState} state
 * @returns {import('../models/core').Transaction[]}
 */
export function selectFilteredTransactions(state) {
  const { monthKey, type, categoryIds, searchText, sort } = state.ui.filters;

  const categoriesById = state.entities.categories;

  const normalizedSearch = (searchText || '').trim().toLowerCase();
  const categorySet = new Set(categoryIds || []);

  let txs = selectAllTransactions(state).filter((tx) => {
    if (monthKey && getMonthString(tx.date) !== monthKey) return false;
    if (type !== 'all' && tx.type !== type) return false;
    if (categorySet.size > 0 && !categorySet.has(tx.categoryId)) return false;

    if (normalizedSearch) {
      const catName = (categoriesById[tx.categoryId]?.name || '').toLowerCase();
      const note = (tx.note || '').toLowerCase();
      if (!catName.includes(normalizedSearch) && !note.includes(normalizedSearch)) return false;
    }

    return true;
  });

  const compareDateAsc = (a, b) => a.date.localeCompare(b.date) || a.createdAtMs - b.createdAtMs;
  const compareAmountAsc = (a, b) => a.amountCents - b.amountCents || compareDateAsc(a, b);

  switch (sort) {
    case 'date_asc':
      txs.sort(compareDateAsc);
      break;
    case 'amount_asc':
      txs.sort(compareAmountAsc);
      break;
    case 'amount_desc':
      txs.sort((a, b) => -compareAmountAsc(a, b));
      break;
    case 'date_desc':
    default:
      txs.sort((a, b) => -compareDateAsc(a, b));
      break;
  }

  return txs;
}

/**
 * Totals for the currently filtered transactions.
 *
 * PUBLIC_INTERFACE
 * @param {import('../models/core').AppState} state
 * @returns {{incomeCents:number, expenseCents:number, netCents:number}}
 */
export function selectFilteredTotalsCents(state) {
  const txs = selectFilteredTransactions(state);

  // computeTotals expects amount numbers, so convert without changing the core model.
  const totals = computeTotals(
    txs.map((tx) => ({
      type: tx.type,
      amount: tx.amountCents / 100,
    }))
  );

  return {
    incomeCents: Math.round(totals.income * 100),
    expenseCents: Math.round(totals.expense * 100),
    netCents: Math.round(totals.net * 100),
  };
}

