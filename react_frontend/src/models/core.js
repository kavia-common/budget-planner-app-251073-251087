/**
 * @file core.js
 * Core domain model definitions and defaults for the Budget Planner app.
 *
 * This file intentionally uses JSDoc typedefs (not TypeScript) to keep the
 * project aligned with the existing CRA JavaScript setup while still providing
 * a strongly-described data model.
 */

/**
 * @typedef {'income'|'expense'} TransactionType
 */

/**
 * A single immutable transaction record.
 *
 * Notes:
 * - `date` is stored as ISO date-only: YYYY-MM-DD (no time zone ambiguity).
 * - `amountCents` is an integer number of cents to avoid floating point drift.
 * - `categoryId` references a Category.id.
 *
 * @typedef {Object} Transaction
 * @property {string} id Stable UUID-like identifier.
 * @property {TransactionType} type
 * @property {number} amountCents Integer amount in cents (>= 0).
 * @property {string} date ISO date-only string (YYYY-MM-DD).
 * @property {string} categoryId
 * @property {string} note Optional short note.
 * @property {number} createdAtMs Epoch millis for sorting/auditing.
 * @property {number} updatedAtMs Epoch millis for sorting/auditing.
 */

/**
 * A user-defined category for transactions.
 *
 * @typedef {Object} Category
 * @property {string} id Stable UUID-like identifier.
 * @property {string} name Display name.
 * @property {string} kind 'both' means category can be used for income+expense.
 * @property {'income'|'expense'|'both'} kind
 * @property {string=} color Optional hex color (e.g. #3b82f6) for charts/UI.
 * @property {number} createdAtMs
 * @property {number} updatedAtMs
 */

/**
 * Recurring transaction frequency.
 * @typedef {'daily'|'weekly'|'biweekly'|'monthly'|'yearly'} RecurringFrequency
 */

/**
 * Represents a recurring rule which can generate transactions.
 *
 * The app will keep recurring rules separate from generated transactions so
 * the user can edit/disable a rule without rewriting history.
 *
 * @typedef {Object} RecurringRule
 * @property {string} id Stable UUID-like identifier.
 * @property {boolean} enabled
 * @property {TransactionType} type
 * @property {number} amountCents
 * @property {string} categoryId
 * @property {string} note
 * @property {RecurringFrequency} frequency
 * @property {string} startDate ISO date-only string (YYYY-MM-DD).
 * @property {string=} endDate Optional ISO date-only string.
 * @property {string=} lastAppliedDate ISO date-only string of last generation run.
 * @property {number} createdAtMs
 * @property {number} updatedAtMs
 */

/**
 * Budget period.
 * @typedef {'monthly'} BudgetPeriod
 */

/**
 * Budget definition per category (or overall).
 *
 * If categoryId is null/undefined, it represents an overall budget.
 *
 * @typedef {Object} Budget
 * @property {string} id Stable UUID-like identifier.
 * @property {BudgetPeriod} period
 * @property {string} monthKey YYYY-MM (e.g. 2026-03). Used for monthly budgets.
 * @property {string=} categoryId Optional category scope.
 * @property {number} limitCents Budget limit in cents.
 * @property {number[]} alertThresholdsPct List of thresholds like [50, 75, 90, 100].
 * @property {boolean} alertsEnabled
 * @property {number} createdAtMs
 * @property {number} updatedAtMs
 */

/**
 * Transaction list filter state (pure UI state; still persisted so the app
 * restores user context on reload).
 *
 * @typedef {Object} TransactionFilters
 * @property {string} monthKey YYYY-MM selection.
 * @property {'all'|'income'|'expense'} type
 * @property {string[]} categoryIds
 * @property {string} searchText Free text (note/category name matching).
 * @property {'date_desc'|'date_asc'|'amount_desc'|'amount_asc'} sort
 */

/**
 * Root persisted state shape stored in localStorage.
 *
 * @typedef {Object} AppState
 * @property {number} schemaVersion Used for future migrations.
 * @property {Object} entities
 * @property {Record<string, Transaction>} entities.transactions
 * @property {Record<string, Category>} entities.categories
 * @property {Record<string, RecurringRule>} entities.recurringRules
 * @property {Record<string, Budget>} entities.budgets
 * @property {Object} ui
 * @property {'light'|'dark'} ui.theme
 * @property {TransactionFilters} ui.filters
 * @property {Object} ui.onboarding
 * @property {boolean} ui.onboarding.completed
 */

export const APP_STATE_SCHEMA_VERSION = 1;

/**
 * Default categories for quick start.
 * These are created as entities on first run.
 *
 * @type {Array<Omit<Category, 'id'|'createdAtMs'|'updatedAtMs'>>}
 */
export const DEFAULT_CATEGORY_TEMPLATES = [
  { name: 'Groceries', kind: 'expense', color: '#22c55e' },
  { name: 'Rent', kind: 'expense', color: '#ef4444' },
  { name: 'Utilities', kind: 'expense', color: '#f59e0b' },
  { name: 'Transportation', kind: 'expense', color: '#06b6d4' },
  { name: 'Dining', kind: 'expense', color: '#a855f7' },
  { name: 'Salary', kind: 'income', color: '#3b82f6' },
  { name: 'Miscellaneous', kind: 'both', color: '#64748b' },
];

/**
 * Default alert thresholds used for budgets.
 * @type {number[]}
 */
export const DEFAULT_ALERT_THRESHOLDS_PCT = [50, 75, 90, 100];

/**
 * Creates the default filter state for a given monthKey.
 *
 * PUBLIC_INTERFACE
 * @param {string} monthKey YYYY-MM string.
 * @returns {TransactionFilters}
 */
export function createDefaultFilters(monthKey) {
  return {
    monthKey,
    type: 'all',
    categoryIds: [],
    searchText: '',
    sort: 'date_desc',
  };
}

/**
 * Creates a fresh initial AppState.
 *
 * PUBLIC_INTERFACE
 * @param {string} monthKey YYYY-MM string to initialize the UI selection.
 * @returns {AppState}
 */
export function createInitialAppState(monthKey) {
  return {
    schemaVersion: APP_STATE_SCHEMA_VERSION,
    entities: {
      transactions: {},
      categories: {},
      recurringRules: {},
      budgets: {},
    },
    ui: {
      theme: 'light',
      filters: createDefaultFilters(monthKey),
      onboarding: {
        completed: false,
      },
    },
  };
}

