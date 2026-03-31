import React, { useMemo } from 'react';
import { sumBreakdownAmount } from '../utils/categoryBreakdown';

/**
 * @file CategoryBreakdownChart.js
 * Dependency-free chart for category breakdown.
 *
 * We use a simple horizontal bar list (SVG-free for text, DIV bars) to avoid adding chart libraries.
 */

/**
 * CategoryBreakdownChart component (horizontal bars).
 *
 * PUBLIC_INTERFACE
 * @param {{
 *  title: string,
 *  rows: Array<{category: string, amount: number}>,
 *  currencyFormatter?: (amount: number) => string,
 *  emptyLabel?: string,
 * }} props
 * @returns {JSX.Element}
 */
export function CategoryBreakdownChart({
  title,
  rows,
  currencyFormatter = (n) => Number(n || 0).toFixed(2),
  emptyLabel = 'No data for this period.',
}) {
  /** This is a public function. */
  const safeRows = Array.isArray(rows) ? rows : [];

  const total = useMemo(() => sumBreakdownAmount(safeRows), [safeRows]);
  const max = useMemo(() => safeRows.reduce((m, r) => Math.max(m, Number(r.amount || 0) || 0), 0), [safeRows]);

  return (
    <section className="chart-panel" aria-label={title}>
      <header className="chart-panel__header">
        <h2 className="chart-panel__title">{title}</h2>
        <div className="chart-panel__meta">
          <span className="chart-panel__totalLabel">Total</span>
          <strong className="chart-panel__totalValue">{currencyFormatter(total)}</strong>
        </div>
      </header>

      {safeRows.length === 0 ? (
        <div className="chart-empty">{emptyLabel}</div>
      ) : (
        <ul className="chart-bars" aria-label="Category breakdown bars">
          {safeRows.map((r) => {
            const amount = Number(r.amount || 0) || 0;
            const pct = max > 0 ? Math.max(0, Math.min(1, amount / max)) : 0;
            const pctLabel = total > 0 ? `${Math.round((amount / total) * 100)}%` : '0%';

            return (
              <li key={r.category} className="chart-bars__row">
                <div className="chart-bars__label">
                  <span className="chart-bars__category">{r.category}</span>
                  <span className="chart-bars__numbers">
                    <span className="chart-bars__pct" aria-label={`${r.category} share`}>
                      {pctLabel}
                    </span>
                    <span className="chart-bars__amount" aria-label={`${r.category} amount`}>
                      {currencyFormatter(amount)}
                    </span>
                  </span>
                </div>

                <div className="chart-bars__barTrack" role="img" aria-label={`${r.category} bar`}>
                  <div className="chart-bars__barFill" style={{ width: `${pct * 100}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
