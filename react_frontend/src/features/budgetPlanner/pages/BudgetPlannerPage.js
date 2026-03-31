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

/**
 * @file BudgetPlannerPage.js
 * Main page with transaction CRUD.
 */

/**
 * Main budget planner screen/page.
 *
 * NOTE: This keeps the current behavior intact (legacy transaction shape and storage key).
 *
 * Step 06.01 additions:
 * - Category management (fixed + user-defined stored in localStorage)
 * - Category breakdown chart for selected period (expenses)
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

    // Derived views must all use the same selected period state.
    const periodTxs = useMemo(
        () => filterTransactionsByPeriod(transactions, normalizedPeriod),
        [transactions, normalizedPeriod]
    );

    // Available categories for filters are based on current period transactions (so multi-select stays relevant).
    const availableFilterCategories = useMemo(() => getAvailableCategoriesFromTransactions(periodTxs), [periodTxs]);

    const filteredTxs = useMemo(() => applyTransactionMultiFilters(periodTxs, txFilters), [periodTxs, txFilters]);
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
    const expenseBreakdownRows = useMemo(() => computeCategoryBreakdown(periodTxs, { type: 'expense' }), [periodTxs]);

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
        setEditingTx(tx);
        setShowForm(true);
    }

    /**
     * Delete flow.
     * @param {any} tx
     */
    function handleDelete(tx) {
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
                <CategoryBreakdownChart
                    title={`Spending by category (${selectedPeriodLabel})`}
                    rows={expenseBreakdownRows}
                    emptyLabel={`No expenses for ${selectedPeriodLabel}.`}
                    currencyFormatter={(n) => `$${Number(n || 0).toFixed(2)}`}
                />

                <CategoryManager onCategoriesChanged={() => setCategoryRefreshTick((t) => t + 1)} />

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
