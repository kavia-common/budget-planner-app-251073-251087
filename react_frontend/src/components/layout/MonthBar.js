import React, { useEffect, useId, useMemo, useState } from 'react';
import { getRecentMonths } from '../../utils/date';
import { formatCurrencyFromCents } from '../../utils/money';
import { normalizeSelectedPeriod } from '../../utils/period';

/**
 * Period selector (month or custom date range) and summary strip.
 *
 * PUBLIC_INTERFACE
 * @param {{
 *  period: import('../../utils/period').SelectedPeriod,
 *  onPeriodChange: (period: import('../../utils/period').SelectedPeriod) => void,
 *  totals: { income: number, expense: number, net: number }
 * }} props
 */
export function MonthBar({ period, onPeriodChange, totals }) {
  /** This is a public function. */
  const reactId = useId();
  const modeId = useMemo(() => `period_mode_${reactId}`, [reactId]);
  const monthId = useMemo(() => `period_month_${reactId}`, [reactId]);
  const startId = useMemo(() => `period_start_${reactId}`, [reactId]);
  const endId = useMemo(() => `period_end_${reactId}`, [reactId]);

  const normalized = useMemo(() => normalizeSelectedPeriod(period), [period]);

  // Keep local draft state for custom dates to avoid forcing a "valid" range while user is typing.
  const [draftStart, setDraftStart] = useState(normalized.startDate || '');
  const [draftEnd, setDraftEnd] = useState(normalized.endDate || '');

  useEffect(() => {
    setDraftStart(normalized.startDate || '');
    setDraftEnd(normalized.endDate || '');
  }, [normalized.startDate, normalized.endDate, normalized.mode]);

  const mode = normalized.mode;

  return (
    <div className="month-bar">
      <div className="period-controls" role="group" aria-label="Period selection">
        <label htmlFor={modeId}>View:&nbsp;</label>
        <select
          id={modeId}
          value={mode}
          onChange={(e) => {
            const nextMode = e.target.value === 'custom' ? 'custom' : 'month';
            if (nextMode === 'month') {
              onPeriodChange({
                mode: 'month',
                monthKey: normalized.monthKey || getRecentMonths(1)[0],
                startDate: '',
                endDate: '',
              });
              return;
            }

            // Custom mode: start from current month range as a sensible default.
            onPeriodChange({
              mode: 'custom',
              monthKey: '',
              startDate: draftStart || '',
              endDate: draftEnd || '',
            });
          }}
        >
          <option value="month">Month</option>
          <option value="custom">Custom range</option>
        </select>

        {mode === 'month' ? (
          <>
            <label htmlFor={monthId} className="period-label">
              Month:&nbsp;
            </label>
            <select
              id={monthId}
              value={normalized.monthKey}
              onChange={(e) =>
                onPeriodChange({
                  mode: 'month',
                  monthKey: e.target.value,
                  startDate: '',
                  endDate: '',
                })
              }
            >
              {getRecentMonths().map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <label htmlFor={startId} className="period-label">
              From:&nbsp;
            </label>
            <input
              id={startId}
              type="date"
              value={draftStart}
              onChange={(e) => {
                const next = e.target.value;
                setDraftStart(next);
                onPeriodChange({ mode: 'custom', monthKey: '', startDate: next, endDate: draftEnd });
              }}
            />
            <label htmlFor={endId} className="period-label">
              To:&nbsp;
            </label>
            <input
              id={endId}
              type="date"
              value={draftEnd}
              onChange={(e) => {
                const next = e.target.value;
                setDraftEnd(next);
                onPeriodChange({ mode: 'custom', monthKey: '', startDate: draftStart, endDate: next });
              }}
            />
          </>
        )}
      </div>

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
