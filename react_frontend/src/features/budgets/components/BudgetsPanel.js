import React, { useEffect, useMemo, useState } from 'react';
import { dollarsToCents, formatCurrencyFromCents } from '../../../utils/money';
import { deleteBudget, loadBudgets, upsertBudget } from '../services/budgetsStorage';

/**
 * @file BudgetsPanel.js
 * Budget management UI (overall + per-category) for the legacy transaction-based app.
 */

/**
 * BudgetsPanel
 *
 * PUBLIC_INTERFACE
 * @param {{
 *  categories: string[],
 *  onBudgetsChanged?: () => void,
 * }} props
 * @returns {JSX.Element}
 */
export function BudgetsPanel({ categories, onBudgetsChanged }) {
    /** This is a public function. */
    const [budgets, setBudgets] = useState(() => loadBudgets());
    const [scope, setScope] = useState('overall');
    const [category, setCategory] = useState('');
    const [limit, setLimit] = useState('');
    const [warnPct, setWarnPct] = useState('80');
    const [enabled, setEnabled] = useState(true);
    const [error, setError] = useState('');

    const categoryOptions = useMemo(() => {
        const arr = Array.isArray(categories) ? categories : [];
        return arr.slice().sort((a, b) => a.localeCompare(b));
    }, [categories]);

    useEffect(() => {
        // Keep in sync if other parts update localStorage.
        setBudgets(loadBudgets());
    }, []);

    function refresh() {
        setBudgets(loadBudgets());
        if (onBudgetsChanged) onBudgetsChanged();
    }

    function resetForm() {
        setScope('overall');
        setCategory('');
        setLimit('');
        setWarnPct('80');
        setEnabled(true);
        setError('');
    }

    /**
     * @param {React.FormEvent} e
     */
    function handleSubmit(e) {
        e.preventDefault();
        setError('');

        const limitCents = dollarsToCents(limit);
        const warnPctN = Number(warnPct);

        const res = upsertBudget({
            scope,
            category: scope === 'category' ? category : undefined,
            limitCents,
            warnPct: warnPctN,
            enabled: Boolean(enabled),
        });

        if (!res.ok) {
            setError(res.error || 'Failed to save budget.');
            return;
        }

        refresh();
        resetForm();
    }

    function handleDelete(id) {
        const ok = window.confirm('Delete this budget?');
        if (!ok) return;
        deleteBudget(id);
        refresh();
    }

    const hasOverall = budgets.some((b) => b.scope === 'overall');
    const overallHint = hasOverall ? 'Saving an overall budget replaces the existing one.' : 'Set a total spending cap for the period.';

    return (
        <section className="budget-panel" aria-label="Budgets and alerts">
            <header className="budget-panel__header">
                <div>
                    <h2 className="budget-panel__title">Budgets</h2>
                    <p className="budget-panel__subtitle">
                        Budgets are compared to your <strong>filtered expenses</strong> in the selected period.
                    </p>
                </div>
            </header>

            <form className="budget-form" onSubmit={handleSubmit} noValidate>
                <div className="budget-form__row">
                    <div className="budget-form__field">
                        <label htmlFor="budget_scope">Scope</label>
                        <select
                            id="budget_scope"
                            value={scope}
                            onChange={(e) => {
                                setScope(e.target.value === 'category' ? 'category' : 'overall');
                                setError('');
                            }}
                        >
                            <option value="overall">Overall (all expenses)</option>
                            <option value="category">Per-category</option>
                        </select>
                        <div className="budget-form__hint">{scope === 'overall' ? overallHint : 'Track spending for a single category.'}</div>
                    </div>

                    {scope === 'category' ? (
                        <div className="budget-form__field">
                            <label htmlFor="budget_category">Category</label>
                            <select
                                id="budget_category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                required
                            >
                                <option value="">Select</option>
                                {categoryOptions.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : null}
                </div>

                <div className="budget-form__row">
                    <div className="budget-form__field">
                        <label htmlFor="budget_limit">Limit</label>
                        <input
                            id="budget_limit"
                            inputMode="decimal"
                            type="text"
                            value={limit}
                            onChange={(e) => setLimit(e.target.value)}
                            placeholder="e.g. 500"
                            required
                        />
                        <div className="budget-form__hint">Stored as dollars, compared using cents to avoid rounding drift.</div>
                    </div>

                    <div className="budget-form__field">
                        <label htmlFor="budget_warn">Approaching at (%)</label>
                        <input
                            id="budget_warn"
                            inputMode="numeric"
                            type="number"
                            min={1}
                            max={99}
                            step={1}
                            value={warnPct}
                            onChange={(e) => setWarnPct(e.target.value)}
                        />
                        <div className="budget-form__hint">Example: 80 means warn when you hit 80% of budget.</div>
                    </div>

                    <div className="budget-form__field budget-form__field--checkbox">
                        <label htmlFor="budget_enabled">
                            <input
                                id="budget_enabled"
                                type="checkbox"
                                checked={enabled}
                                onChange={(e) => setEnabled(e.target.checked)}
                            />
                            Enabled
                        </label>
                    </div>
                </div>

                {error ? (
                    <div className="budget-error" role="alert">
                        {error}
                    </div>
                ) : null}

                <div className="budget-form__actions">
                    <button type="submit" className="budget-btn">
                        Save budget
                    </button>
                    <button type="button" className="budget-btn budget-btn--secondary" onClick={resetForm}>
                        Reset
                    </button>
                </div>
            </form>

            <div className="budget-list" aria-label="Existing budgets">
                {budgets.length === 0 ? (
                    <div className="budget-empty">No budgets yet. Add an overall budget or a per-category budget above.</div>
                ) : (
                    <ul className="budget-list__items">
                        {budgets.map((b) => {
                            const label = b.scope === 'overall' ? 'Overall' : `Category: ${b.category}`;
                            return (
                                <li key={b.id} className="budget-list__item">
                                    <div className="budget-pill">
                                        <strong className="budget-pill__label">{label}</strong>
                                        <span className="budget-pill__value">
                                            Limit ${formatCurrencyFromCents(b.limitCents)}
                                        </span>
                                        <span className="budget-pill__meta">
                                            Warn @ {b.warnPct}% {b.enabled ? '' : '(disabled)'}
                                        </span>
                                    </div>
                                    <div className="budget-list__actions">
                                        <button
                                            type="button"
                                            className="budget-btn budget-btn--danger"
                                            onClick={() => handleDelete(b.id)}
                                            aria-label={`Delete budget ${label}`}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </section>
    );
}
