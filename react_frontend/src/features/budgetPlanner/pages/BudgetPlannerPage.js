import React, { useMemo, useState } from 'react';

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
  const { transactions, addTransaction } = useTransactions();

  // Keep categories as simple strings (legacy behavior).
  const DEFAULT_CATEGORIES = useMemo(
    () => ['Groceries', 'Rent', 'Utilities', 'Transportation', 'Dining', 'Salary', 'Miscellaneous'],
    []
  );

  const [month, setMonth] = useState(getMonthString(new Date().toISOString()));

  const monthTxs = useMemo(() => filterByMonth(transactions, month), [transactions, month]);
  const totals = useMemo(() => computeTotals(monthTxs), [monthTxs]);

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
        <TransactionList transactions={monthTxs} />
      </main>

      <FabButton label="Add transaction" onClick={() => setShowForm(true)}>
        ＋
      </FabButton>

      <TransactionForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={addTransaction}
        categories={DEFAULT_CATEGORIES}
      />
    </div>
  );
}

