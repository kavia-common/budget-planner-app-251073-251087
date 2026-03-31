/**
 * @file recurring.js
 * Pure utilities for recurring transactions:
 * - represent a recurring rule on a transaction
 * - generate "occurrence" transactions for a selected period
 *
 * Important: These helpers are pure and do NOT mutate/persist anything.
 */

import { isDateInSelectedPeriod, monthKeyToDateRange, normalizeSelectedPeriod } from '../../../utils/period';

/**
 * @typedef {'none'|'daily'|'weekly'|'biweekly'|'monthly'|'yearly'} LegacyRecurringFrequency
 */

/**
 * Legacy recurring rule shape embedded on a legacy transaction.
 *
 * @typedef {Object} LegacyRecurring
 * @property {boolean} enabled
 * @property {LegacyRecurringFrequency} frequency
 * @property {string=} untilDate ISO date-only (YYYY-MM-DD). Optional.
 */

/**
 * @typedef {Object} GenerationInput
 * @property {Array<any>} baseTransactions Existing persisted legacy transactions (may include recurring + non-recurring).
 * @property {import('../../../utils/period').SelectedPeriod} period The current selected period (month or custom range).
 * @property {boolean=} includeDisabled Whether to include disabled recurring rules (default false).
 */

/**
 * @typedef {Object} GeneratedOccurrence
 * @property {any} tx The generated legacy transaction object.
 * @property {string} sourceId The base transaction id that generated this occurrence.
 * @property {string} occurrenceDate The occurrence date (YYYY-MM-DD).
 */

/**
 * Normalize ISO date-only.
 * @param {string} value
 * @returns {string}
 */
function normalizeIsoDateOnly(value) {
  const v = String(value || '').trim();
  if (!v) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return '';
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return v;
}

/**
 * Add days to ISO date-only.
 * @param {string} dateOnly
 * @param {number} days
 * @returns {string}
 */
function addDays(dateOnly, days) {
  const d = new Date(`${dateOnly}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Add months to ISO date-only.
 * If the original day-of-month doesn't exist in the target month, it clamps to the last day.
 * @param {string} dateOnly
 * @param {number} months
 * @returns {string}
 */
function addMonthsClamped(dateOnly, months) {
  const [yStr, mStr, dStr] = dateOnly.split('-');
  const y = Number(yStr);
  const m = Number(mStr) - 1; // 0-based
  const day = Number(dStr);

  const target = new Date(y, m + months, 1);
  // last day of target month: day 0 of next month
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const clampedDay = Math.min(day, lastDay);

  const out = new Date(target.getFullYear(), target.getMonth(), clampedDay);
  const yy = out.getFullYear();
  const mm = String(out.getMonth() + 1).padStart(2, '0');
  const dd = String(out.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Add years to ISO date-only (clamped for Feb 29).
 * @param {string} dateOnly
 * @param {number} years
 * @returns {string}
 */
function addYearsClamped(dateOnly, years) {
  const [yStr, mStr, dStr] = dateOnly.split('-');
  const y = Number(yStr) + years;
  const m = Number(mStr); // 1-12
  const day = Number(dStr);

  // Determine last day of that month in the target year.
  const lastDay = new Date(y, m, 0).getDate();
  const clampedDay = Math.min(day, lastDay);

  const mm = String(m).padStart(2, '0');
  const dd = String(clampedDay).padStart(2, '0');
  return `${y}-${mm}-${dd}`;
}

/**
 * Compare ISO date-only.
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareIsoDateOnly(a, b) {
  return String(a || '').localeCompare(String(b || ''));
}

/**
 * Build a stable key for an occurrence to prevent duplicates.
 * @param {string} sourceId
 * @param {string} dateOnly
 * @returns {string}
 */
function occurrenceKey(sourceId, dateOnly) {
  return `${sourceId}__${dateOnly}`;
}

/**
 * Determine the date range used for generation.
 * For custom range:
 * - if either bound missing, we still generate only within the explicit bounds (partial range)
 *   but the UI usually supplies both. We keep behavior defensive.
 *
 * @param {import('../../../utils/period').SelectedPeriod} period
 * @returns {{start: string, end: string, hasStart: boolean, hasEnd: boolean}}
 */
function getGenerationRange(period) {
  const p = normalizeSelectedPeriod(period);
  if (p.mode === 'month') {
    const { startDate, endDate } = monthKeyToDateRange(p.monthKey);
    return { start: startDate, end: endDate, hasStart: Boolean(startDate), hasEnd: Boolean(endDate) };
  }

  const start = normalizeIsoDateOnly(p.startDate);
  const end = normalizeIsoDateOnly(p.endDate);

  // If missing, keep empty marker. We won't generate without at least one bound.
  return { start, end, hasStart: Boolean(start), hasEnd: Boolean(end) };
}

/**
 * Produce the next occurrence date from a given date.
 * @param {string} dateOnly
 * @param {LegacyRecurringFrequency} frequency
 * @returns {string}
 */
function nextDate(dateOnly, frequency) {
  switch (frequency) {
    case 'daily':
      return addDays(dateOnly, 1);
    case 'weekly':
      return addDays(dateOnly, 7);
    case 'biweekly':
      return addDays(dateOnly, 14);
    case 'monthly':
      return addMonthsClamped(dateOnly, 1);
    case 'yearly':
      return addYearsClamped(dateOnly, 1);
    case 'none':
    default:
      return '';
  }
}

/**
 * Check if a legacy tx is marked as recurring.
 * We treat missing recurring info as non-recurring.
 *
 * PUBLIC_INTERFACE
 * @param {any} tx
 * @returns {boolean}
 */
export function isTransactionRecurring(tx) {
  /** This is a public function. */
  return Boolean(tx && tx.recurring && tx.recurring.enabled && tx.recurring.frequency && tx.recurring.frequency !== 'none');
}

/**
 * Generate recurring transaction occurrences for the given selected period.
 *
 * Rules:
 * - Only generates occurrences for base transactions that have tx.recurring.enabled true and a known frequency.
 * - Uses the base tx.date as the anchor (first occurrence).
 * - Only emits occurrences whose date is inside the selected period.
 * - Does NOT include the base transaction itself (caller already has persisted base txs).
 * - Does NOT permanently duplicate: generated transactions are returned separately.
 * - Skips occurrences that already exist in the persisted list with:
 *   - same sourceRecurringId and date, OR
 *   - same "fingerprint" (type/amount/category/note/date) as a best-effort fallback.
 *
 * PUBLIC_INTERFACE
 * @param {GenerationInput} input
 * @returns {GeneratedOccurrence[]}
 */
export function generateRecurringOccurrencesForPeriod(input) {
  /** This is a public function. */
  const baseTransactions = Array.isArray(input?.baseTransactions) ? input.baseTransactions : [];
  const period = input?.period;
  const includeDisabled = Boolean(input?.includeDisabled);

  const { hasStart, hasEnd, start, end } = getGenerationRange(period);
  if (!hasStart && !hasEnd) return [];

  // Build a set of existing occurrence keys to avoid duplicates.
  const existingOccurrenceKeys = new Set();
  const existingFingerprintKeys = new Set();

  baseTransactions.forEach((tx) => {
    const dt = normalizeIsoDateOnly(tx?.date);
    if (!dt) return;

    if (tx?.sourceRecurringId) {
      existingOccurrenceKeys.add(occurrenceKey(String(tx.sourceRecurringId), dt));
    }

    // Best effort: type+amount+category+note+date
    const fp = [
      String(tx.type || ''),
      String(Number(tx.amount || 0) || 0),
      String(tx.category || ''),
      String(tx.note || ''),
      dt,
    ].join('|');
    existingFingerprintKeys.add(fp);
  });

  /** @type {GeneratedOccurrence[]} */
  const out = [];

  for (const base of baseTransactions) {
    const baseId = String(base?.id || '');
    const baseDate = normalizeIsoDateOnly(base?.date);
    if (!baseId || !baseDate) continue;

    const recurring = base?.recurring || null;
    const enabled = Boolean(recurring?.enabled);
    if (!enabled && !includeDisabled) continue;

    const frequency = String(recurring?.frequency || 'none');
    if (!frequency || frequency === 'none') continue;

    const until = normalizeIsoDateOnly(recurring?.untilDate || '');
    // If untilDate exists and is before base date, nothing to generate.
    if (until && compareIsoDateOnly(until, baseDate) < 0) continue;

    // Start iterating from the next date after baseDate (base tx already exists).
    let cursor = nextDate(baseDate, frequency);
    if (!cursor) continue;

    // Hard safety cap to avoid accidental infinite loops.
    let iterations = 0;

    while (cursor) {
      iterations += 1;
      if (iterations > 500) break;

      // Stop when we are beyond explicit end of generation window.
      if (hasEnd && end && compareIsoDateOnly(cursor, end) > 0) break;

      // Stop when we passed untilDate.
      if (until && compareIsoDateOnly(cursor, until) > 0) break;

      // Only generate inside selected period (inclusive).
      if (isDateInSelectedPeriod(cursor, period)) {
        const occKey = occurrenceKey(baseId, cursor);
        if (!existingOccurrenceKeys.has(occKey)) {
          const fp = [
            String(base.type || ''),
            String(Number(base.amount || 0) || 0),
            String(base.category || ''),
            String(base.note || ''),
            cursor,
          ].join('|');

          if (!existingFingerprintKeys.has(fp)) {
            // Create a generated tx that looks like the legacy tx, but tagged:
            // - id is stable-ish (not truly stable across runs, but ok for in-session rendering)
            // - sourceRecurringId allows duplicate suppression after user confirms generation
            const generated = {
              ...base,
              id: `gen_${baseId}_${cursor}`,
              date: cursor,
              // mark provenance
              sourceRecurringId: baseId,
              // These occurrences are not recurring by default; rule lives on the base tx.
              recurring: { enabled: false, frequency: 'none', untilDate: '' },
              generated: true,
            };

            out.push({ tx: generated, sourceId: baseId, occurrenceDate: cursor });
            existingOccurrenceKeys.add(occKey);
            existingFingerprintKeys.add(fp);
          }
        }
      }

      // Advance.
      cursor = nextDate(cursor, frequency);

      // If we have a start bound and cursor is still before it, keep moving (loop continues).
      if (hasStart && start && cursor && compareIsoDateOnly(cursor, start) < 0) {
        // continue loop
      }
    }
  }

  // Sort generated occurrences by date ascending for UX.
  out.sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate));
  return out;
}
