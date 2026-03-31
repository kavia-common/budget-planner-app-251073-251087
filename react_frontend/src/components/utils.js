/**
 * Get YYYY-MM string from a Date or date string.
 * @param {string} dateStr - date input string (YYYY-MM-DD)
 * @returns {string} month key (e.g., '2024-03')
 */
export function getMonthString(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const y = d.getFullYear();
    let m = d.getMonth() + 1;
    if (typeof m === 'number' && m < 10) m = '0' + m;
    return `${y}-${m}`;
}

/**
 * Filter transactions for a given month string
 * @param {Array} txs - transactions
 * @param {string} month - 'YYYY-MM'
 * @returns {Array}
 */
export function filterByMonth(txs, month) {
    return txs.filter(tx => getMonthString(tx.date) === month);
}

/**
 * Compute totals for a transaction list.
 * @param {Array} txs
 * @returns Object: { income, expense, net }
 */
export function computeTotals(txs) {
    let income = 0;
    let expense = 0;
    txs.forEach(tx => {
        if (tx.type === 'income') {
            income += tx.amount;
        } else if (tx.type === 'expense') {
            expense += tx.amount;
        }
    });
    return { income, expense, net: income - expense };
}

