/**
 * @file localStorage.js
 * Local storage helpers.
 *
 * NOTE: The current UI uses a legacy `bp_transactions` key with an array of simple
 * transaction objects:
 * { type, amount, date, category, note }
 *
 * A richer AppState store exists under src/state, but this feature preserves
 * current behavior until the app is fully migrated.
 */

const LEGACY_TX_KEY = 'bp_transactions';

/**
 * Load legacy transactions from localStorage.
 *
 * PUBLIC_INTERFACE
 * @returns {Array<{type:string, amount:number, date:string, category:string, note:string}>}
 */
export function loadLegacyTransactions() {
  /** This is a public function. */
  try {
    const raw = window.localStorage.getItem(LEGACY_TX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save legacy transactions to localStorage.
 *
 * PUBLIC_INTERFACE
 * @param {Array} txs
 */
export function saveLegacyTransactions(txs) {
  /** This is a public function. */
  try {
    window.localStorage.setItem(LEGACY_TX_KEY, JSON.stringify(txs || []));
  } catch {
    // Ignore write errors (private mode/quota/etc) to keep UX smooth.
  }
}

