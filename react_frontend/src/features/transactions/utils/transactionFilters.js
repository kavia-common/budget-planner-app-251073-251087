/**
 * @file transactionFilters.js
 * Pure utilities for searching, filtering, and sorting transactions (legacy shape).
 *
 * Legacy transaction shape expected by current UI:
 * { id, type: 'income'|'expense', amount: number (dollars), date: 'YYYY-MM-DD', category: string, note: string }
 */

/**
 * @typedef {'all'|'income'|'expense'} TxTypeFilter
 */

/**
 * @typedef {'date_desc'|'date_asc'|'amount_desc'|'amount_asc'} TxSortKey
 */

/**
 * @typedef {Object} TransactionMultiFilters
 * @property {string} searchText Free text query (matches category/note).
 * @property {TxTypeFilter} type Transaction type filter.
 * @property {string[]} categories Selected categories (multi-select). Empty => all.
 * @property {string} minAmount Minimum amount in dollars (string to preserve input UX).
 * @property {string} maxAmount Maximum amount in dollars (string to preserve input UX).
 * @property {string} startDate ISO date-only lower bound (YYYY-MM-DD). Empty => none.
 * @property {string} endDate ISO date-only upper bound (YYYY-MM-DD). Empty => none.
 * @property {TxSortKey} sort Sort key.
 */

/**
 * Create default filter state.
 *
 * PUBLIC_INTERFACE
 * @returns {TransactionMultiFilters}
 */
export function createDefaultTransactionMultiFilters() {
  /** This is a public function. */
  return {
    searchText: '',
    type: 'all',
    categories: [],
    minAmount: '',
    maxAmount: '',
    startDate: '',
    endDate: '',
    sort: 'date_desc',
  };
}

/**
 * Normalize and parse a numeric input. Returns null if blank/invalid.
 * @param {string} raw
 * @returns {number|null}
 */
function parseAmountInput(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Normalize a string for case-insensitive searching.
 * @param {string} value
 * @returns {string}
 */
function norm(value) {
  return String(value || '').trim().toLowerCase();
}

/**
 * Validate YYYY-MM-DD (date-only). Returns '' if invalid.
 * @param {string} value
 * @returns {string}
 */
function normalizeIsoDateOnly(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return '';
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return v;
}

/**
 * Compare two ISO date-only strings.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareIsoDateOnly(a, b) {
  return String(a || '').localeCompare(String(b || ''));
}

/**
 * Apply multi-filters + search + sorting to a transaction list.
 * Does NOT apply period filtering; caller should pass in period-filtered txs
 * (so filters always operate within selected period state).
 *
 * PUBLIC_INTERFACE
 * @template T
 * @param {Array<T & {type:string, amount:number, date:string, category?:string, note?:string}>} txs
 * @param {TransactionMultiFilters} filters
 * @returns {Array<T>}
 */
export function applyTransactionMultiFilters(txs, filters) {
  /** This is a public function. */
  const f = filters || createDefaultTransactionMultiFilters();

  const q = norm(f.searchText);
  const type = f.type || 'all';

  const categorySet = new Set((f.categories || []).filter(Boolean));
  const minA = parseAmountInput(f.minAmount);
  const maxA = parseAmountInput(f.maxAmount);

  const start = normalizeIsoDateOnly(f.startDate);
  const end = normalizeIsoDateOnly(f.endDate);

  // Defensive: if range is inverted, swap (UX forgiving).
  let rangeStart = start;
  let rangeEnd = end;
  if (rangeStart && rangeEnd && compareIsoDateOnly(rangeStart, rangeEnd) > 0) {
    const tmp = rangeStart;
    rangeStart = rangeEnd;
    rangeEnd = tmp;
  }

  /** @type {Array<any>} */
  let out = (txs || []).filter((tx) => {
    if (type !== 'all' && tx.type !== type) return false;

    if (categorySet.size > 0) {
      const cat = String(tx.category || '');
      if (!categorySet.has(cat)) return false;
    }

    const amt = Number(tx.amount || 0);
    if (minA != null && amt < minA) return false;
    if (maxA != null && amt > maxA) return false;

    // date range filter (inclusive)
    const txDate = normalizeIsoDateOnly(tx.date);
    if (rangeStart && (!txDate || compareIsoDateOnly(txDate, rangeStart) < 0)) return false;
    if (rangeEnd && (!txDate || compareIsoDateOnly(txDate, rangeEnd) > 0)) return false;

    if (q) {
      const cat = norm(tx.category);
      const note = norm(tx.note);
      if (!cat.includes(q) && !note.includes(q)) return false;
    }

    return true;
  });

  const compareDateAsc = (a, b) => String(a.date || '').localeCompare(String(b.date || ''));
  const compareAmountAsc = (a, b) => Number(a.amount || 0) - Number(b.amount || 0) || compareDateAsc(a, b);

  switch (f.sort) {
    case 'date_asc':
      out.sort(compareDateAsc);
      break;
    case 'amount_asc':
      out.sort(compareAmountAsc);
      break;
    case 'amount_desc':
      out.sort((a, b) => -compareAmountAsc(a, b));
      break;
    case 'date_desc':
    default:
      out.sort((a, b) => -compareDateAsc(a, b));
      break;
  }

  return out;
}

/**
 * Derive available categories from a transaction list (unique, sorted).
 *
 * PUBLIC_INTERFACE
 * @param {Array<{category?:string}>} txs
 * @returns {string[]}
 */
export function getAvailableCategoriesFromTransactions(txs) {
  /** This is a public function. */
  const set = new Set();
  (txs || []).forEach((tx) => {
    const c = String(tx.category || '').trim();
    if (c) set.add(c);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
