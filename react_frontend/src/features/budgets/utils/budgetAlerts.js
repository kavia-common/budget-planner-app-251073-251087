import { getCategoryBudgetsByKey, getOverallBudget } from '../services/budgetsStorage';

/**
 * @file budgetAlerts.js
 * Compute budget consumption + alert states from a list of already-filtered transactions.
 */

/**
 * @typedef {'ok'|'approaching'|'exceeded'} BudgetAlertLevel
 */

/**
 * @typedef {Object} BudgetAlert
 * @property {string} id Budget id (or synthetic id for derived display).
 * @property {'overall'|'category'} scope
 * @property {string=} category Category name for category alerts
 * @property {number} limitCents
 * @property {number} spentCents
 * @property {number} pctUsed 0..Infinity
 * @property {BudgetAlertLevel} level
 * @property {string} message
 */

/**
 * Convert legacy transaction amount to cents.
 * @param {any} tx
 * @returns {number}
 */
function txAmountToCents(tx) {
    const n = Number(tx?.amount || 0);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.round(n * 100));
}

/**
 * Sum spending (expenses only) across transactions.
 * @param {any[]} txs
 * @returns {number}
 */
function sumExpenseCents(txs) {
    return (txs || []).reduce((acc, tx) => {
        if (tx?.type !== 'expense') return acc;
        return acc + txAmountToCents(tx);
    }, 0);
}

/**
 * Sum spending by category name (legacy `tx.category`).
 * @param {any[]} txs
 * @returns {Record<string, number>} lowercased category -> cents
 */
function sumExpenseCentsByCategoryKey(txs) {
    /** @type {Record<string, number>} */
    const out = {};
    for (const tx of txs || []) {
        if (!tx || tx.type !== 'expense') continue;
        const cat = String(tx.category || '').trim();
        if (!cat) continue;
        const k = cat.toLowerCase();
        out[k] = (out[k] || 0) + txAmountToCents(tx);
    }
    return out;
}

/**
 * Determine alert level for a given spent/limit and warn threshold.
 * @param {number} spentCents
 * @param {number} limitCents
 * @param {number} warnPct
 * @returns {BudgetAlertLevel}
 */
function computeLevel(spentCents, limitCents, warnPct) {
    if (limitCents <= 0) return 'ok';
    if (spentCents >= limitCents) return 'exceeded';
    const pct = (spentCents / limitCents) * 100;
    if (pct >= warnPct) return 'approaching';
    return 'ok';
}

/**
 * Compute alerts from the *already filtered* transactions list for the selected period.
 *
 * Notes:
 * - Uses only expense transactions.
 * - Uses the user's current filters (search/category/type) because the request
 *   specifies "compute budget consumption from the selected period’s filtered expenses".
 *
 * PUBLIC_INTERFACE
 * @param {any[]} filteredTxs
 * @returns {{alerts: BudgetAlert[], overall: BudgetAlert|null, byCategory: BudgetAlert[]}}
 */
export function computeBudgetAlerts(filteredTxs) {
    /** This is a public function. */
    const overallBudget = getOverallBudget();
    const categoryBudgetsByKey = getCategoryBudgetsByKey();

    const spentOverallCents = sumExpenseCents(filteredTxs);
    const spentByCatKey = sumExpenseCentsByCategoryKey(filteredTxs);

    /** @type {BudgetAlert|null} */
    let overall = null;

    if (overallBudget && overallBudget.enabled && overallBudget.limitCents > 0) {
        const pctUsed = overallBudget.limitCents > 0 ? (spentOverallCents / overallBudget.limitCents) * 100 : 0;
        const level = computeLevel(spentOverallCents, overallBudget.limitCents, overallBudget.warnPct);
        overall = {
            id: overallBudget.id,
            scope: 'overall',
            limitCents: overallBudget.limitCents,
            spentCents: spentOverallCents,
            pctUsed,
            level,
            message:
                level === 'exceeded'
                    ? 'Overall budget exceeded'
                    : level === 'approaching'
                      ? 'Overall budget approaching limit'
                      : 'Overall budget OK',
        };
    }

    /** @type {BudgetAlert[]} */
    const byCategory = [];

    for (const [catKey, budget] of Object.entries(categoryBudgetsByKey)) {
        const spentCents = spentByCatKey[catKey] || 0;
        const limitCents = budget.limitCents || 0;
        if (!budget.enabled || limitCents <= 0) continue;

        const pctUsed = limitCents > 0 ? (spentCents / limitCents) * 100 : 0;
        const level = computeLevel(spentCents, limitCents, budget.warnPct);

        byCategory.push({
            id: budget.id,
            scope: 'category',
            category: budget.category,
            limitCents,
            spentCents,
            pctUsed,
            level,
            message:
                level === 'exceeded'
                    ? `Budget exceeded: ${budget.category}`
                    : level === 'approaching'
                      ? `Budget approaching limit: ${budget.category}`
                      : `Budget OK: ${budget.category}`,
        });
    }

    // Sort: exceeded first, then approaching, then OK; within each, highest pct first.
    const levelRank = (lvl) => (lvl === 'exceeded' ? 0 : lvl === 'approaching' ? 1 : 2);
    byCategory.sort((a, b) => levelRank(a.level) - levelRank(b.level) || b.pctUsed - a.pctUsed);

    const alerts = [
        ...(overall ? [overall] : []),
        ...byCategory.filter((a) => a.level !== 'ok'),
    ];

    return { alerts, overall, byCategory };
}
