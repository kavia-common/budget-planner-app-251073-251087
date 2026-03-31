/**
 * @file period.js
 * Helpers for "selected period" state (month or custom date range).
 *
 * The rest of the app should derive filtered transactions and summaries from a
 * single selected period object so different UI panels never drift out of sync.
 */

/**
 * @typedef {'month'|'custom'} PeriodMode
 */

/**
 * @typedef {Object} SelectedPeriod
 * @property {PeriodMode} mode
 * @property {string} monthKey Used when mode === 'month'. Format: YYYY-MM.
 * @property {string} startDate Used when mode === 'custom'. ISO date-only: YYYY-MM-DD.
 * @property {string} endDate Used when mode === 'custom'. ISO date-only: YYYY-MM-DD.
 */

/**
 * Ensure a date-only string is normalized to YYYY-MM-DD if possible.
 * Returns '' if invalid.
 * @param {string} dateOnly
 * @returns {string}
 */
function normalizeIsoDateOnly(dateOnly) {
  if (!dateOnly || typeof dateOnly !== 'string') return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return '';
  const d = new Date(`${dateOnly}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  // Keep original string format stable.
  return dateOnly;
}

/**
 * Compare two ISO date-only strings (YYYY-MM-DD).
 * Returns negative if a < b, positive if a > b, 0 if equal.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareIsoDateOnly(a, b) {
  return String(a || '').localeCompare(String(b || ''));
}

/**
 * Convert monthKey YYYY-MM to [startDate, endDate] as date-only strings.
 * End date is inclusive (last day of month).
 *
 * PUBLIC_INTERFACE
 * @param {string} monthKey
 * @returns {{ startDate: string, endDate: string }}
 */
export function monthKeyToDateRange(monthKey) {
  const mk = String(monthKey || '');
  if (!/^\d{4}-\d{2}$/.test(mk)) return { startDate: '', endDate: '' };

  const [yStr, mStr] = mk.split('-');
  const y = Number(yStr);
  const m = Number(mStr); // 1-12
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return { startDate: '', endDate: '' };

  const startDate = `${yStr}-${mStr}-01`;
  // JS Date: month is 0-based. Last day: new Date(y, m, 0)
  const last = new Date(y, m, 0);
  const lastDay = String(last.getDate()).padStart(2, '0');
  const endDate = `${yStr}-${mStr}-${lastDay}`;
  return { startDate, endDate };
}

/**
 * Return a safe SelectedPeriod with invariants enforced:
 * - custom mode dates are normalized
 * - if custom startDate > endDate they are swapped
 *
 * PUBLIC_INTERFACE
 * @param {SelectedPeriod} period
 * @returns {SelectedPeriod}
 */
export function normalizeSelectedPeriod(period) {
  const mode = period?.mode === 'custom' ? 'custom' : 'month';

  if (mode === 'month') {
    return {
      mode: 'month',
      monthKey: String(period?.monthKey || ''),
      startDate: '',
      endDate: '',
    };
  }

  let start = normalizeIsoDateOnly(period?.startDate || '');
  let end = normalizeIsoDateOnly(period?.endDate || '');

  if (start && end && compareIsoDateOnly(start, end) > 0) {
    const tmp = start;
    start = end;
    end = tmp;
  }

  return {
    mode: 'custom',
    monthKey: '',
    startDate: start,
    endDate: end,
  };
}

/**
 * Human-friendly period label for UI headers/empty states.
 *
 * PUBLIC_INTERFACE
 * @param {SelectedPeriod} period
 * @returns {string}
 */
export function formatSelectedPeriodLabel(period) {
  const p = normalizeSelectedPeriod(period);
  if (p.mode === 'month') return p.monthKey || '—';
  if (p.startDate && p.endDate) return `${p.startDate} → ${p.endDate}`;
  if (p.startDate) return `From ${p.startDate}`;
  if (p.endDate) return `Until ${p.endDate}`;
  return 'Custom range';
}

/**
 * Check whether a transaction's ISO date-only is inside the selected period.
 * Inclusive on both ends.
 *
 * PUBLIC_INTERFACE
 * @param {string} txDate ISO date-only (YYYY-MM-DD)
 * @param {SelectedPeriod} period
 * @returns {boolean}
 */
export function isDateInSelectedPeriod(txDate, period) {
  const dateOnly = normalizeIsoDateOnly(txDate);
  if (!dateOnly) return false;

  const p = normalizeSelectedPeriod(period);

  if (p.mode === 'month') {
    if (!p.monthKey) return true; // no selection -> show all
    const { startDate, endDate } = monthKeyToDateRange(p.monthKey);
    if (!startDate || !endDate) return true;
    return compareIsoDateOnly(dateOnly, startDate) >= 0 && compareIsoDateOnly(dateOnly, endDate) <= 0;
  }

  // custom mode: support partial ranges
  if (p.startDate && compareIsoDateOnly(dateOnly, p.startDate) < 0) return false;
  if (p.endDate && compareIsoDateOnly(dateOnly, p.endDate) > 0) return false;
  return true;
}

/**
 * Filter transactions by selected period.
 *
 * PUBLIC_INTERFACE
 * @template T
 * @param {Array<T & {date: string}>} txs
 * @param {SelectedPeriod} period
 * @returns {Array<T>}
 */
export function filterBySelectedPeriod(txs, period) {
  return (txs || []).filter((tx) => isDateInSelectedPeriod(tx.date, period));
}
