import React from 'react';
import { getRecentMonths } from '../../utils/date';
import { formatCurrencyFromCents } from '../../utils/money';

/**
 * Month selector and summary strip.
 *
 * PUBLIC_INTERFACE
 * @param {{
 *  month: string,
 *  onMonthChange: (month: string) => void,
 *  totals: { income: number, expense: number, net: number }
 * }} props
 */
export function MonthBar({ month, onMonthChange, totals }) {
  /** This is a public function. */
  return (
    <div className="month-bar">
      <label htmlFor="month-select">Month:&nbsp;</label>
      <select id="month-select" value={month} onChange={(e) => onMonthChange(e.target.value)}>
        {getRecentMonths().map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>

      <div className="summary-cards">
        <div className="summary income">
          <span>Income</span>
          <strong>{formatCurrencyFromCents(Math.round(totals.income * 100))}</strong>
        </div>
        <div className="summary expense">
          <span>Expense</span>
          <strong>{formatCurrencyFromCents(Math.round(totals.expense * 100))}</strong>
        </div>
        <div className="summary net">
          <span>Net</span>
          <strong>{formatCurrencyFromCents(Math.round(totals.net * 100))}</strong>
        </div>
      </div>
    </div>
  );
}

