/**
 * @file budgetsStorage.js
 * localStorage-backed storage for budgets + alert preferences for the legacy transaction UI.
 *
 * Why separate storage?
 * - The current UI uses a legacy `bp_transactions` array shape.
 * - A richer AppState exists under src/state, but the UI isn't fully migrated.
 * - This module adds budgets without forcing a full migration.
 */

const BUDGETS_KEY = 'bp_budgets_v1';

/**
 * @typedef {'overall'|'category'} BudgetScope
 */

/**
 * @typedef {Object} LegacyBudget
 * @property {string} id Stable identifier.
 * @property {BudgetScope} scope "overall" or "category".
 * @property {string=} category Category name when scope === 'category'.
 * @property {number} limitCents Budget limit in cents.
 * @property {number} warnPct Percent (0-100) to consider "approaching" (e.g., 80).
 * @property {boolean} enabled Whether budget is active.
 * @property {number} createdAtMs
 * @property {number} updatedAtMs
 */

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
 * Very small ID generator (not crypto-secure).
 * @returns {string}
 */
function createId() {
    return `b_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

/**
 * Normalize / validate a budget record.
 * @param {any} input
 * @returns {LegacyBudget|null}
 */
function normalizeBudget(input) {
    if (!input || typeof input !== 'object') return null;

    const scope = input.scope === 'category' ? 'category' : 'overall';
    const category = scope === 'category' ? String(input.category || '').trim() : undefined;
    if (scope === 'category' && !category) return null;

    const limitCents = Math.max(0, Math.trunc(Number(input.limitCents || 0)));
    const warnPctRaw = Number(input.warnPct);
    const warnPct = Number.isFinite(warnPctRaw) ? Math.min(99, Math.max(1, Math.round(warnPctRaw))) : 80;

    const nowMs = Date.now();

    return {
        id: input.id ? String(input.id) : createId(),
        scope,
        category,
        limitCents,
        warnPct,
        enabled: input.enabled !== false,
        createdAtMs: Number.isFinite(Number(input.createdAtMs)) ? Number(input.createdAtMs) : nowMs,
        updatedAtMs: nowMs,
    };
}

/**
 * Load all budgets from localStorage.
 *
 * PUBLIC_INTERFACE
 * @returns {LegacyBudget[]}
 */
export function loadBudgets() {
    /** This is a public function. */
    try {
        const raw = window.localStorage.getItem(BUDGETS_KEY);
        if (!raw) return [];
        const parsed = safeJsonParse(raw);
        const arr = Array.isArray(parsed) ? parsed : [];
        const out = [];
        for (const item of arr) {
            const normalized = normalizeBudget(item);
            if (normalized) out.push(normalized);
        }

        // Stable sort: overall first, then category alpha, then created.
        out.sort((a, b) => {
            if (a.scope !== b.scope) return a.scope === 'overall' ? -1 : 1;
            const ac = a.category || '';
            const bc = b.category || '';
            const catCmp = ac.localeCompare(bc);
            if (catCmp) return catCmp;
            return (a.createdAtMs || 0) - (b.createdAtMs || 0);
        });

        return out;
    } catch {
        return [];
    }
}

/**
 * Persist budgets list.
 * @param {LegacyBudget[]} budgets
 */
function saveBudgetsRaw(budgets) {
    try {
        window.localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets || []));
    } catch {
        // ignore quota/private mode errors
    }
}

/**
 * Upsert a budget.
 *
 * PUBLIC_INTERFACE
 * @param {any} budget
 * @returns {{ok: boolean, budget?: LegacyBudget, error?: string}}
 */
export function upsertBudget(budget) {
    /** This is a public function. */
    const normalized = normalizeBudget(budget);
    if (!normalized) {
        return { ok: false, error: 'Invalid budget. Please check scope/category and amount.' };
    }
    if (normalized.limitCents <= 0) {
        return { ok: false, error: 'Budget limit must be greater than 0.' };
    }

    const current = loadBudgets();

    // Ensure uniqueness:
    // - only one overall budget
    // - only one budget per category
    const next = current.filter((b) => {
        if (normalized.scope === 'overall') return b.scope !== 'overall';
        if (normalized.scope === 'category') {
            return !(b.scope === 'category' && String(b.category || '').toLowerCase() === String(normalized.category || '').toLowerCase());
        }
        return true;
    });

    next.push(normalized);
    saveBudgetsRaw(next);
    return { ok: true, budget: normalized };
}

/**
 * Delete a budget by id.
 *
 * PUBLIC_INTERFACE
 * @param {string} id
 */
export function deleteBudget(id) {
    /** This is a public function. */
    const current = loadBudgets();
    const next = current.filter((b) => b.id !== id);
    saveBudgetsRaw(next);
}

/**
 * Convenience: get the active overall budget (if any).
 *
 * PUBLIC_INTERFACE
 * @returns {LegacyBudget|null}
 */
export function getOverallBudget() {
    /** This is a public function. */
    const all = loadBudgets();
    const b = all.find((x) => x.scope === 'overall' && x.enabled);
    return b || null;
}

/**
 * Convenience: get active category budgets as a map keyed by normalized category name.
 *
 * PUBLIC_INTERFACE
 * @returns {Record<string, LegacyBudget>}
 */
export function getCategoryBudgetsByKey() {
    /** This is a public function. */
    const all = loadBudgets();
    /** @type {Record<string, LegacyBudget>} */
    const out = {};
    for (const b of all) {
        if (b.scope !== 'category' || !b.enabled) continue;
        const k = String(b.category || '').trim().toLowerCase();
        if (!k) continue;
        out[k] = b;
    }
    return out;
}

export const __testing__ = {
    safeJsonParse,
    normalizeBudget,
};
