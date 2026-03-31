import React, { useMemo, useRef, useState } from 'react';

import { TopBar } from '../../../components/layout/TopBar';
import { MonthBar } from '../../../components/layout/MonthBar';
import { FabButton } from '../../../components/ui/FabButton';

import TransactionForm from '../../transactions/components/TransactionForm';
import TransactionList from '../../transactions/components/TransactionList';

import { useTheme } from '../../../hooks/useTheme';
import { useTransactions } from '../../transactions/hooks/useTransactions';

import { getMonthString } from '../../../utils/date';
import { formatSelectedPeriodLabel, normalizeSelectedPeriod } from '../../../utils/period';
import { computeTotals, filterTransactionsByPeriod } from '../../transactions/utils/transactions';
import {
    applyTransactionMultiFilters,
    createDefaultTransactionMultiFilters,
    getAvailableCategoriesFromTransactions,
} from '../../transactions/utils/transactionFilters';
import { TransactionFiltersBar } from '../../transactions/components/TransactionFiltersBar';
import { getAllCategories } from '../../categories/services/categoriesStorage';
import { CategoryManager } from '../../categories/components/CategoryManager';
import { CategoryBreakdownChart } from '../../categories/components/CategoryBreakdownChart';
import { computeCategoryBreakdown } from '../../categories/utils/categoryBreakdown';
import { generateRecurringOccurrencesForPeriod } from '../../transactions/utils/recurring';

import { BudgetsPanel } from '../../budgets/components/BudgetsPanel';
import { computeBudgetAlerts } from '../../budgets/utils/budgetAlerts';
import { formatCurrencyFromCents } from '../../../utils/money';

/**
 * @file BudgetPlannerPage.js
 * Main page with transaction CRUD.
 *
 * Step 07.01:
 * - Allow marking transactions as recurring in the form.
 * - For selected period, generate preview occurrences (not persisted).
 * - Offer a confirm action to permanently add generated occurrences.
 *
 * Step 08.01:
 * - Budgets + alerts (overall and per-category) persisted in localStorage.
 * - Budget consumption is computed from the selected period's filtered expenses.
 */

/**
 * Main budget planner screen/page.
 *
 * NOTE: This keeps the current behavior intact (legacy transaction shape and storage key).
 *
 * PUBLIC_INTERFACE
 * @returns {JSX.Element}
 */
export function BudgetPlannerPage() {
    /** This is a public function. */
    const { theme, toggleTheme } = useTheme('light');
    const [showForm, setShowForm] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [txFilters, setTxFilters] = useState(() => createDefaultTransactionMultiFilters());

    const openButtonRef = useRef(null);

    const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions();

    const [period, setPeriod] = useState(() => ({
        mode: 'month',
        monthKey: getMonthString(new Date().toISOString()),
        startDate: '',
        endDate: '',
    }));

    const normalizedPeriod = useMemo(() => normalizeSelectedPeriod(period), [period]);

    // Period-scoped persisted transactions.
    const periodTxs = useMemo(
        () => filterTransactionsByPeriod(transactions, normalizedPeriod),
        [transactions, normalizedPeriod]
    );

    // Step 07.01: generate preview occurrences (not persisted).
    const generatedOccurrences = useMemo(() => {
        const occ = generateRecurringOccurrencesForPeriod({ baseTransactions: transactions, period: normalizedPeriod });
        return occ.map((o) => o.tx);
    }, [transactions, normalizedPeriod]);

    const generatedPeriodTxs = useMemo(
        () => filterTransactionsByPeriod(generatedOccurrences, normalizedPeriod),
        [generatedOccurrences, normalizedPeriod]
    );

    // Combine for the list view (persisted + preview). (Preview should not affect persistence.)
    const combinedPeriodTxs = useMemo(() => {
        const seen = new Set();
        const out = [];

        const push = (tx) => {
            const key =
                tx && tx.id
                    ? String(tx.id)
                    : `${tx?.date || ''}|${tx?.type || ''}|${tx?.amount || ''}|${tx?.category || ''}|${tx?.note || ''}`;
            if (seen.has(key)) return;
            seen.add(key);
            out.push(tx);
        };

        (periodTxs || []).forEach(push);
        (generatedPeriodTxs || []).forEach(push);

        return out;
    }, [periodTxs, generatedPeriodTxs]);

    // Available categories for filters are based on combined period transactions (so the preview doesn't disappear with category filter UX).
    const availableFilterCategories = useMemo(
        () => getAvailableCategoriesFromTransactions(combinedPeriodTxs),
        [combinedPeriodTxs]
    );

    const filteredTxs = useMemo(() => applyTransactionMultiFilters(combinedPeriodTxs, txFilters), [combinedPeriodTxs, txFilters]);

    const totals = useMemo(() => computeTotals(filteredTxs), [filteredTxs]);

    // Categories for the transaction form:
    // - fixed defaults + user-defined localStorage categories
    // - plus any category already used by transactions (prevents orphaned categories from blocking validation)
    const observedCategoriesAllTime = useMemo(() => getAvailableCategoriesFromTransactions(transactions), [transactions]);
    const [categoryRefreshTick, setCategoryRefreshTick] = useState(0);

    const allCategoriesForForm = useMemo(() => {
        // Tick forces recompute after CategoryManager saves to localStorage.
        void categoryRefreshTick;
        return getAllCategories(observedCategoriesAllTime);
    }, [observedCategoriesAllTime, categoryRefreshTick]);

    // Category breakdown for selected period (expenses only).
    // Note: Use persisted transactions only for charts to avoid confusing "preview" spending in analytics.
    const expenseBreakdownRows = useMemo(() => computeCategoryBreakdown(periodTxs, { type: 'expense' }), [periodTxs]);

    // Step 08.01: Budget alerts computed from *filtered* transactions for the selected period.
    const budgetAlertState = useMemo(() => computeBudgetAlerts(filteredTxs), [filteredTxs]);
    const activeAlerts = budgetAlertState.alerts || [];

    /**
     * Open add modal.
     */
    function handleOpenAdd() {
        setEditingTx(null);
        setShowForm(true);
    }

    /**
     * Open edit modal.
     * @param {any} tx
     */
    function handleEdit(tx) {
        // Preview occurrences are read-only; TransactionList already blocks actions, but double-check here.
        if (tx && tx.generated) return;
        setEditingTx(tx);
        setShowForm(true);
    }

    /**
     * Delete flow.
     * @param {any} tx
     */
    function handleDelete(tx) {
        if (tx && tx.generated) return;

        const label = `${tx.type} ${Number(tx.amount || 0).toFixed(2)} on ${tx.date}`;
        const ok = window.confirm(`Delete transaction: ${label}?`);
        if (!ok) return;
        deleteTransaction(tx.id);
    }

    /**
     * Save handler used for both add and edit.
     * @param {any} tx
     */
    function handleSave(tx) {
        if (editingTx && editingTx.id) {
            updateTransaction(editingTx.id, tx);
        } else {
            addTransaction(tx);
        }
    }

    /**
     * Confirm-to-save for preview occurrences in the selected period.
     * Adds the generated occurrences to persistence as real transactions.
     */
    function handleConfirmAddGeneratedForPeriod() {
        const count = generatedPeriodTxs.length;
        if (count === 0) return;

        const selectedLabel = formatSelectedPeriodLabel(normalizedPeriod);
        const ok = window.confirm(
            `Add ${count} generated recurring transaction${count === 1 ? '' : 's'} to your saved list for ${selectedLabel}?\n\nThis will permanently add them (you can delete them later).`
        );
        if (!ok) return;

        generatedPeriodTxs.forEach((tx) => {
            addTransaction({
                ...tx,
                id: undefined,
                generated: false,
            });
        });
    }

    const selectedPeriodLabel = useMemo(() => formatSelectedPeriodLabel(normalizedPeriod), [normalizedPeriod]);

    return (
        <div className="App">
            <TopBar
                title="Budget Planner"
                right={
                    <button
                        className="theme-toggle"
                        onClick={toggleTheme}
                        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    >
                        {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
                    </button>
                }
            />

            <MonthBar period={normalizedPeriod} onPeriodChange={setPeriod} totals={totals} />

            <main>
                {/* Step 08.01: Budget alerts */}
                {activeAlerts.length > 0 ? (
                    <section className="budget-alerts" aria-label="Budget alerts">
                        <h2 className="budget-alerts__title">Budget alerts</h2>
                        <ul className="budget-alerts__list">
                            {activeAlerts.map((a) => {
                                const pct = Number.isFinite(a.pctUsed) ? a.pctUsed : 0;
                                const pctText = `${Math.round(pct)}%`;
                                const spent = formatCurrencyFromCents(a.spentCents);
                                const limit = formatCurrencyFromCents(a.limitCents);
                                const label =
                                    a.scope === 'overall'
                                        ? 'Overall'
                                        : a.category
                                          ? `Category: ${a.category}`
                                          : 'Category';

                                return (
                                    <li
                                        key={a.id}
                                        className={`budget-alert budget-alert--${a.level}`}
                                        aria-label={`${a.message}. ${label}. Spent $${spent} of $${limit} (${pctText}).`}
                                    >
                                        <div className="budget-alert__left">
                                            <strong className="budget-alert__label">{label}</strong>
                                            <div className="budget-alert__message">{a.message}</div>
                                        </div>
                                        <div className="budget-alert__right">
                                            <div className="budget-alert__numbers">
                                                <span>
                                                    ${spent} / ${limit}
                                                </span>
                                                <strong className="budget-alert__pct">{pctText}</strong>
                                            </div>
                                            <div className="budget-alert__barTrack" aria-hidden="true">
                                                <div
                                                    className="budget-alert__barFill"
                                                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                                />
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ) : null}

                <BudgetsPanel categories={allCategoriesForForm} />

                <CategoryBreakdownChart
                    title={`Spending by category (${selectedPeriodLabel})`}
                    rows={expenseBreakdownRows}
                    emptyLabel={`No expenses for ${selectedPeriodLabel}.`}
                    currencyFormatter={(n) => `$${Number(n || 0).toFixed(2)}`}
                />

                <CategoryManager onCategoriesChanged={() => setCategoryRefreshTick((t) => t + 1)} />

                {/* Step 07.01: Recurring generation banner */}
                {generatedPeriodTxs.length > 0 ? (
                    <section className="recurring-banner" aria-label="Recurring transactions preview">
                        <div className="recurring-banner__text">
                            <strong>{generatedPeriodTxs.length}</strong> recurring transaction
                            {generatedPeriodTxs.length === 1 ? '' : 's'} previewed for <strong>{selectedPeriodLabel}</strong>.
                            <div className="recurring-banner__sub">They are not saved until you confirm.</div>
                        </div>
                        <div className="recurring-banner__actions">
                            <button
                                type="button"
                                className="recurring-banner__btn"
                                onClick={handleConfirmAddGeneratedForPeriod}
                            >
                                Add to saved transactions
                            </button>
                        </div>
                    </section>
                ) : null}

                <TransactionFiltersBar
                    filters={txFilters}
                    onChange={setTxFilters}
                    availableCategories={availableFilterCategories}
                />
                <TransactionList
                    transactions={filteredTxs}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    emptyLabel={`No transactions for ${selectedPeriodLabel}.`}
                />
            </main>

            <FabButton
                label="Add transaction"
                onClick={() => {
                    openButtonRef.current = document.activeElement;
                    handleOpenAdd();
                }}
            >
                ＋
            </FabButton>

            <TransactionForm
                open={showForm}
                onClose={() => {
                    setShowForm(false);
                    setEditingTx(null);
                    // Modal already restores focus, but keep this ref for future extensions.
                    if (openButtonRef.current && typeof openButtonRef.current.focus === 'function') {
                        openButtonRef.current.focus();
                    }
                }}
                onSave={handleSave}
                categories={allCategoriesForForm}
                initialTransaction={editingTx}
            />
        </div>
    );
}
