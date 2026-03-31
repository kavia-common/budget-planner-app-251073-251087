import React, { useState, useEffect } from 'react';
import './App.css';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import { getMonthString, filterByMonth, computeTotals } from './components/utils';

/**
 * @file App.js
 * Main Budget Planner application component.
 * Implements: transaction input, monthly view, summary, localStorage sync, retro theming, and theme toggle.
 */

/**
 * Default categories for quick start.
 * @type {string[]}
 */
const DEFAULT_CATEGORIES = [
    'Groceries',
    'Rent',
    'Utilities',
    'Transportation',
    'Dining',
    'Salary',
    'Miscellaneous'
];

/**
 * Get array of YYYY-MM strings between given years.
 * @returns {string[]}
 */
function getRecentMonths(count = 14) {
    const now = new Date();
    let months = [];
    for (let i = 0; i < count; i++) {
        let d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        let m = d.getMonth() + 1;
        if (m < 10) m = '0' + m;
        months.push(`${d.getFullYear()}-${m}`);
    }
    return months;
}

/**
 * Load transactions from localStorage.
 * @returns {Array}
 */
function loadTransactions() {
    try {
        const raw = window.localStorage.getItem('bp_transactions');
        if (raw) return JSON.parse(raw);
        return [];
    } catch (e) {
        return [];
    }
}

/**
 * Save transactions to localStorage.
 * @param {Array} txs
 */
function saveTransactions(txs) {
    try {
        window.localStorage.setItem('bp_transactions', JSON.stringify(txs));
    } catch (e) {}
}

function App() {
    const [theme, setTheme] = useState('light');
    const [showForm, setShowForm] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [categories] = useState(DEFAULT_CATEGORIES);
    const [month, setMonth] = useState(getMonthString(new Date().toISOString()));

    // Theme switching
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    // Load transactions from storage on mount
    useEffect(() => {
        setTransactions(loadTransactions());
    }, []);

    // Save transactions on change
    useEffect(() => {
        saveTransactions(transactions);
    }, [transactions]);

    /**
     * Add a new transaction.
     * @param {Object} tx
     */
    function handleAddTransaction(tx) {
        setTransactions([
            ...transactions,
            { ...tx }
        ]);
    }

    // Filter for selected month
    const monthTxs = filterByMonth(transactions, month);
    const totals = computeTotals(monthTxs);

    return (
        <div className="App">
            {/* Top Navigation Bar */}
            <nav className="top-bar">
                <h1>Budget Planner</h1>
                <button
                    className="theme-toggle"
                    onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
                    aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                    {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
                </button>
            </nav>

            {/* Month and summary selector */}
            <div className="month-bar">
                <label htmlFor="month-select">Month:&nbsp;</label>
                <select
                    id="month-select"
                    value={month}
                    onChange={e => setMonth(e.target.value)}
                >
                    {getRecentMonths().map(m =>
                        <option key={m} value={m}>{m}</option>
                    )}
                </select>
                <div className="summary-cards">
                    <div className="summary income">
                        <span>Income</span>
                        <strong>{totals.income.toFixed(2)}</strong>
                    </div>
                    <div className="summary expense">
                        <span>Expense</span>
                        <strong>{totals.expense.toFixed(2)}</strong>
                    </div>
                    <div className="summary net">
                        <span>Net</span>
                        <strong>{totals.net.toFixed(2)}</strong>
                    </div>
                </div>
            </div>

            {/* Main content: Transaction list */}
            <main>
                <TransactionList transactions={monthTxs} />
            </main>

            {/* Floating Action Button */}
            <button
                className="fab"
                onClick={() => setShowForm(true)}
                aria-label="Add transaction"
            >
                ＋
            </button>

            {/* Modal transaction form */}
            <TransactionForm
                open={showForm}
                onClose={() => setShowForm(false)}
                onSave={handleAddTransaction}
                categories={categories}
            />
        </div>
    );
}

export default App;

