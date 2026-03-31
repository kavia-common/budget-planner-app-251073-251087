/**
 * @file appState.js
 * localStorage-backed state store helpers for the Budget Planner app.
 *
 * This module defines:
 * - storage key + load/save
 * - lightweight ID generation
 * - CRUD operations for core entities
 * - safe schema version handling (forward-compatible stubs for migrations)
 */

import {
  APP_STATE_SCHEMA_VERSION,
  DEFAULT_CATEGORY_TEMPLATES,
  DEFAULT_ALERT_THRESHOLDS_PCT,
  createInitialAppState,
} from '../models/core';
import { getMonthString } from '../utils/date';

const STORAGE_KEY = 'bp_app_state_v1';

/**
 * Very small ID generator (not crypto-secure).
 * Good enough for local-only data. Avoids adding dependencies.
 *
 * PUBLIC_INTERFACE
 * @returns {string}
 */
export function createId() {
  return `id_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

/**
 * Safely parse JSON.
 * @param {string} raw
 * @returns {any|null}
 */
function safeJsonParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Create Category entities on first run.
 * @param {number} nowMs
 * @returns {Record<string, import('../models/core').Category>}
 */
function buildDefaultCategories(nowMs) {
  /** @type {Record<string, any>} */
  const categories = {};
  DEFAULT_CATEGORY_TEMPLATES.forEach((tpl) => {
    const id = createId();
    categories[id] = {
      id,
      name: tpl.name,
      kind: tpl.kind,
      color: tpl.color,
      createdAtMs: nowMs,
      updatedAtMs: nowMs,
    };
  });
  return categories;
}

/**
 * Initializes state with seeded categories.
 * @param {string} monthKey
 * @returns {import('../models/core').AppState}
 */
function createSeededInitialState(monthKey) {
  const nowMs = Date.now();
  const state = createInitialAppState(monthKey);
  state.entities.categories = buildDefaultCategories(nowMs);
  return state;
}

/**
 * Attempt to migrate a persisted state to the latest schema.
 * For now, schemaVersion=1 is the only supported schema.
 *
 * PUBLIC_INTERFACE
 * @param {any} persisted
 * @returns {import('../models/core').AppState}
 */
export function migrateAppState(persisted) {
  if (!persisted || typeof persisted !== 'object') {
    return createSeededInitialState(getMonthString(new Date().toISOString()));
  }

  const schemaVersion = Number(persisted.schemaVersion || 0);

  // Future: add migration steps here as the schema evolves.
  if (schemaVersion !== APP_STATE_SCHEMA_VERSION) {
    // If unknown schema, start fresh to avoid runtime issues.
    return createSeededInitialState(getMonthString(new Date().toISOString()));
  }

  // Minimal validation + defaults to be resilient to partial older writes.
  const nowMonth = getMonthString(new Date().toISOString());
  const migrated = {
    schemaVersion: APP_STATE_SCHEMA_VERSION,
    entities: {
      transactions: persisted.entities?.transactions || {},
      categories: persisted.entities?.categories || buildDefaultCategories(Date.now()),
      recurringRules: persisted.entities?.recurringRules || {},
      budgets: persisted.entities?.budgets || {},
    },
    ui: {
      theme: persisted.ui?.theme === 'dark' ? 'dark' : 'light',
      filters: {
        monthKey: persisted.ui?.filters?.monthKey || nowMonth,
        type: persisted.ui?.filters?.type || 'all',
        categoryIds: Array.isArray(persisted.ui?.filters?.categoryIds) ? persisted.ui.filters.categoryIds : [],
        searchText: persisted.ui?.filters?.searchText || '',
        sort: persisted.ui?.filters?.sort || 'date_desc',
      },
      onboarding: {
        completed: Boolean(persisted.ui?.onboarding?.completed),
      },
    },
  };

  return migrated;
}

/**
 * Load app state from localStorage.
 *
 * PUBLIC_INTERFACE
 * @returns {import('../models/core').AppState}
 */
export function loadAppState() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createSeededInitialState(getMonthString(new Date().toISOString()));
  }
  return migrateAppState(safeJsonParse(raw));
}

/**
 * Save app state to localStorage.
 *
 * PUBLIC_INTERFACE
 * @param {import('../models/core').AppState} state
 */
export function saveAppState(state) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Create a new Transaction entity.
 *
 * PUBLIC_INTERFACE
 * @param {import('../models/core').Transaction} tx
 * @returns {import('../models/core').Transaction}
 */
export function normalizeTransaction(tx) {
  const nowMs = Date.now();
  return {
    id: tx.id || createId(),
    type: tx.type,
    amountCents: Math.max(0, Math.trunc(tx.amountCents)),
    date: tx.date,
    categoryId: tx.categoryId,
    note: (tx.note || '').trim(),
    createdAtMs: tx.createdAtMs || nowMs,
    updatedAtMs: nowMs,
  };
}

/**
 * CRUD: Transactions
 *
 * PUBLIC_INTERFACE
 * @param {import('../models/core').AppState} state
 * @param {import('../models/core').Transaction} tx
 * @returns {import('../models/core').AppState}
 */
export function addTransaction(state, tx) {
  const normalized = normalizeTransaction(tx);
  return {
    ...state,
    entities: {
      ...state.entities,
      transactions: {
        ...state.entities.transactions,
        [normalized.id]: normalized,
      },
    },
  };
}

/**
 * PUBLIC_INTERFACE
 * @param {import('../models/core').AppState} state
 * @param {string} id
 * @param {Partial<import('../models/core').Transaction>} patch
 * @returns {import('../models/core').AppState}
 */
export function updateTransaction(state, id, patch) {
  const existing = state.entities.transactions[id];
  if (!existing) return state;

  const next = normalizeTransaction({ ...existing, ...patch, id, createdAtMs: existing.createdAtMs });
  return {
    ...state,
    entities: {
      ...state.entities,
      transactions: {
        ...state.entities.transactions,
        [id]: next,
      },
    },
  };
}

/**
 * PUBLIC_INTERFACE
 * @param {import('../models/core').AppState} state
 * @param {string} id
 * @returns {import('../models/core').AppState}
 */
export function deleteTransaction(state, id) {
  if (!state.entities.transactions[id]) return state;
  const { [id]: _removed, ...rest } = state.entities.transactions;
  return {
    ...state,
    entities: {
      ...state.entities,
      transactions: rest,
    },
  };
}

/**
 * CRUD: Categories
 *
 * PUBLIC_INTERFACE
 * @param {import('../models/core').AppState} state
 * @param {import('../models/core').Category} category
 * @returns {import('../models/core').AppState}
 */
export function addCategory(state, category) {
  const nowMs = Date.now();
  const id = category.id || createId();
  const next = {
    id,
    name: (category.name || '').trim(),
    kind: category.kind || 'both',
    color: category.color,
    createdAtMs: category.createdAtMs || nowMs,
    updatedAtMs: nowMs,
  };

  return {
    ...state,
    entities: {
      ...state.entities,
      categories: {
        ...state.entities.categories,
        [id]: next,
      },
    },
  };
}

/**
 * PUBLIC_INTERFACE
 * @param {import('../models/core').AppState} state
 * @param {string} id
 * @param {Partial<import('../models/core').Category>} patch
 * @returns {import('../models/core').AppState}
 */
export function updateCategory(state, id, patch) {
  const existing = state.entities.categories[id];
  if (!existing) return state;

  const nowMs = Date.now();
  const next = {
    ...existing,
    ...patch,
    id,
    name: patch.name != null ? String(patch.name).trim() : existing.name,
    updatedAtMs: nowMs,
  };

  return {
    ...state,
    entities: {
      ...state.entities,
      categories: {
        ...state.entities.categories,
        [id]: next,
      },
    },
  };
}

/**
 * Deletes a category. NOTE: Transactions referencing this category are NOT deleted;
 * instead their categoryId is set to '' so the UI can show "Uncategorized".
 *
 * PUBLIC_INTERFACE
 * @param {import('../models/core').AppState} state
 * @param {string} id
 * @returns {import('../models/core').AppState}
 */
export function deleteCategory(state, id) {
  if (!state.entities.categories[id]) return state;

  const { [id]: _removed, ...restCats } = state.entities.categories;

  const nextTx = { ...state.entities.transactions };
  Object.values(nextTx).forEach((tx) => {
    if (tx.categoryId === id) {
      nextTx[tx.id] = { ...tx, categoryId: '', updatedAtMs: Date.now() };
    }
  });

  return {
    ...state,
    entities: {
      ...state.entities,
      categories: restCats,
      transactions: nextTx,
    },
    ui: {
      ...state.ui,
      filters: {
        ...state.ui.filters,
        categoryIds: state.ui.filters.categoryIds.filter((cid) => cid !== id),
      },
    },
  };
}

/**
 * CRUD: Recurring Rules
 *
 * PUBLIC_INTERFACE
 * @param {import('../models/core').AppState} state
 * @param {import('../models/core').RecurringRule} rule
 * @returns {import('../models/core').AppState}
 */
export function addRecurringRule(state, rule) {
  const nowMs = Date.now();
  const id = rule.id || createId();
  const next = {
    id,
    enabled: rule.enabled !== false,
    type: rule.type,
    amountCents: Math.max(0, Math.trunc(rule.amountCents)),
    categoryId: rule.categoryId,
    note: (rule.note || '').trim(),
    frequency: rule.frequency,
    startDate: rule.startDate,
    endDate: rule.endDate,
    lastAppliedDate: rule.lastAppliedDate,
    createdAtMs: rule.createdAtMs || nowMs,
    updatedAtMs: nowMs,
  };

  return {
    ...state,
    entities: {
      ...state.entities,
      recurringRules: {
        ...state.entities.recurringRules,
        [id]: next,
      },
    },
  };
}

/**
 * PUBLIC_INTERFACE
 * @param {import('../models/core').AppState} state
 * @param {string} id
 * @param {Partial<import('../models/core').RecurringRule>} patch
 * @returns {import('../models/core').AppState}
 */
export function updateRecurringRule(state, id, patch) {
  const existing = state.entities.recurringRules[id];
  if (!existing) return state;
  const nowMs = Date.now();

  const next = {
    ...existing,
    ...patch,
    id,
    updatedAtMs: nowMs,
  };

  return {
    ...state,
    entities: {
      ...state.entities,
      recurringRules: {
        ...state.entities.recurringRules,
        [id]: next,
      },
    },
  };
}

/**
 * PUBLIC_INTERFACE
 * @param {import('../models/core').AppState} state
 * @param {string} id
 * @returns {import('../models/core').AppState}
 */
export function deleteRecurringRule(state, id) {
  if (!state.entities.recurringRules[id]) return state;
  const { [id]: _removed, ...rest } = state.entities.recurringRules;
  return {
    ...state,
    entities: {
      ...state.entities,
      recurringRules: rest,
    },
  };
}

/**
 * CRUD: Budgets
 *
 * PUBLIC_INTERFACE
 * @param {import('../models/core').AppState} state
 * @param {import('../models/core').Budget} budget
 * @returns {import('../models/core').AppState}
 */
export function addBudget(state, budget) {
  const nowMs = Date.now();
  const id = budget.id || createId();
  const next = {
    id,
    period: budget.period || 'monthly',
    monthKey: budget.monthKey,
    categoryId: budget.categoryId,
    limitCents: Math.max(0, Math.trunc(budget.limitCents)),
    alertThresholdsPct:
      Array.isArray(budget.alertThresholdsPct) && budget.alertThresholdsPct.length > 0
        ? budget.alertThresholdsPct
        : DEFAULT_ALERT_THRESHOLDS_PCT,
    alertsEnabled: budget.alertsEnabled !== false,
    createdAtMs: budget.createdAtMs || nowMs,
    updatedAtMs: nowMs,
  };

  return {
    ...state,
    entities: {
      ...state.entities,
      budgets: {
        ...state.entities.budgets,
        [id]: next,
      },
    },
  };
}

/**
 * PUBLIC_INTERFACE
 * @param {import('../models/core').AppState} state
 * @param {string} id
 * @param {Partial<import('../models/core').Budget>} patch
 * @returns {import('../models/core').AppState}
 */
export function updateBudget(state, id, patch) {
  const existing = state.entities.budgets[id];
  if (!existing) return state;

  const nowMs = Date.now();
  const next = {
    ...existing,
    ...patch,
    id,
    updatedAtMs: nowMs,
    alertThresholdsPct: patch.alertThresholdsPct || existing.alertThresholdsPct,
  };

  return {
    ...state,
    entities: {
      ...state.entities,
      budgets: {
        ...state.entities.budgets,
        [id]: next,
      },
    },
  };
}

/**
 * PUBLIC_INTERFACE
 * @param {import('../models/core').AppState} state
 * @param {string} id
 * @returns {import('../models/core').AppState}
 */
export function deleteBudget(state, id) {
  if (!state.entities.budgets[id]) return state;
  const { [id]: _removed, ...rest } = state.entities.budgets;
  return {
    ...state,
    entities: {
      ...state.entities,
      budgets: rest,
    },
  };
}

/**
 * UI: Update filters (persisted).
 *
 * PUBLIC_INTERFACE
 * @param {import('../models/core').AppState} state
 * @param {Partial<import('../models/core').TransactionFilters>} patch
 * @returns {import('../models/core').AppState}
 */
export function updateFilters(state, patch) {
  return {
    ...state,
    ui: {
      ...state.ui,
      filters: {
        ...state.ui.filters,
        ...patch,
      },
    },
  };
}

