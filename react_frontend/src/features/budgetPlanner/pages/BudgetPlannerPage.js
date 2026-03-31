import React, { useMemo, useRef, useState } from 'react';

import { TopBar } from '../../../components/layout/TopBar';
import { MonthBar } from '../../../components/layout/MonthBar';
import { FabButton } from '../../../components/ui/FabButton';

import TransactionForm from '../../transactions/components/TransactionForm';
import TransactionList from '../../transactions/components/TransactionList';

import { useTheme } from '../../../hooks/useTheme';
import { useTransactions } from '../../transactions/hooks/useTransactions';

import { getMonthString } from '../../../utils/date';
import { filterByMonth, computeTotals } from '../../transactions/utils/transactions';

/**
 * @file BudgetPlannerPage.js
 * Main page with transaction CRUD.
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

    const openButtonRef = useRef(null);

    const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions();

    // Keep categories as simple strings (legacy behavior).
    const DEFAULT_CATEGORIES = useMemo(
        () => ['Groceries', 'Rent', 'Utilities', 'Transportation', 'Dining', 'Salary', 'Miscellaneous'],
        []
    );

    const [month, setMonth] = useState(getMonthString(new Date().toISOString()));

    const monthTxs = useMemo(() => filterByMonth(transactions, month), [transactions, month]);
    const totals = useMemo(() => computeTotals(monthTxs), [monthTxs]);

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

            <MonthBar month={month} onMonthChange={setMonth} totals={totals} />

            <main>
                <TransactionList transactions={monthTxs} onEdit={handleEdit} onDelete={handleDelete} />
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
                categories={DEFAULT_CATEGORIES}
                initialTransaction={editingTx}
            />
        </div>
    );
}
