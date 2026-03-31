/**
 * @file date.js
 * Date utilities used across features.
 */

/**
 * Get YYYY-MM string from a Date or date string.
 *
 * PUBLIC_INTERFACE
 * @param {string} dateStr - date input string (YYYY-MM-DD or ISO string)
 * @returns {string} month key (e.g., '2024-03')
 */
export function getMonthString(dateStr) {
  /** This is a public function. */
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  let m = d.getMonth() + 1;
  if (typeof m === 'number' && m < 10) m = '0' + m;
  return `${y}-${m}`;
}

/**
 * Get an array of recent month keys (YYYY-MM), newest first.
 *
 * PUBLIC_INTERFACE
 * @param {number} count
 * @returns {string[]}
 */
export function getRecentMonths(count = 14) {
  /** This is a public function. */
  const now = new Date();
  const months = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    let m = d.getMonth() + 1;
    if (m < 10) m = '0' + m;
    months.push(`${d.getFullYear()}-${m}`);
  }
  return months;
}

