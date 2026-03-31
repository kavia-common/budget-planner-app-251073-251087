import React from 'react';

/**
 * TransactionList component — displays a table of transactions and summary.
 *
 * @param {Object} props
 * @param {Array} props.transactions List of transaction objects to show
 */
function TransactionList({ transactions }) {
  if (!transactions || transactions.length === 0) {
    return <div className="empty-state">No transactions for this month.</div>;
  }

  return (
    <table className="transactions-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Type</th>
          <th>Amount</th>
          <th>Category</th>
          <th>Note</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((tx, idx) => (
          <tr key={idx}>
            <td>{tx.date}</td>
            <td className={`tx-type-${tx.type}`}>{tx.type}</td>
            <td>{tx.amount.toFixed(2)}</td>
            <td>{tx.category}</td>
            <td>{tx.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default TransactionList;

