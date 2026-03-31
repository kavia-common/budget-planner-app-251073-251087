import React from 'react';
import { isTransactionRecurring } from '../utils/recurring';

/**
 * @file TransactionList.js
 * Transaction table with optional edit/delete actions.
 *
 * Step 07.01:
 * - Show a "Recurring" badge for base recurring rules.
 * - Show preview-generated occurrences (tx.generated === true) as read-only rows.
 */

/**
 * TransactionList component — displays a table of transactions.
 *
 * PUBLIC_INTERFACE
 * @param {Object} props
 * @param {Array} props.transactions List of transaction objects to show
 * @param {(tx: any) => void=} props.onEdit Called when user chooses to edit a row
 * @param {(tx: any) => void=} props.onDelete Called when user chooses to delete a row
 * @param {string=} props.emptyLabel Optional empty-state label
 * @returns {JSX.Element}
 */
function TransactionList({ transactions, onEdit, onDelete, emptyLabel }) {
    /** This is a public function. */
    const showActions = Boolean(onEdit || onDelete);

    if (!transactions || transactions.length === 0) {
        return <div className="empty-state">{emptyLabel || 'No transactions for this period.'}</div>;
    }

    return (
        <table className="transactions-table">
            <caption className="sr-only">Transactions for selected period</caption>
            <thead>
                <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Type</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Category</th>
                    <th scope="col">Note</th>
                    <th scope="col">Flags</th>
                    {showActions ? <th scope="col">Actions</th> : null}
                </tr>
            </thead>
            <tbody>
                {transactions.map((tx, idx) => {
                    const label = `${tx.type} ${tx.amount != null ? Number(tx.amount).toFixed(2) : ''} on ${tx.date}`;
                    const isGenerated = Boolean(tx && tx.generated);
                    const recurring = isTransactionRecurring(tx);

                    return (
                        <tr key={tx.id || idx} className={isGenerated ? 'tx-row-generated' : ''}>
                            <td>{tx.date}</td>
                            <td className={`tx-type-${tx.type}`}>{tx.type}</td>
                            <td>{Number(tx.amount || 0).toFixed(2)}</td>
                            <td>{tx.category}</td>
                            <td>{tx.note}</td>
                            <td>
                                {recurring ? <span className="tx-flag tx-flag--recurring">Recurring</span> : null}
                                {isGenerated ? <span className="tx-flag tx-flag--generated">Preview</span> : null}
                            </td>
                            {showActions ? (
                                <td className="tx-actions">
                                    {isGenerated ? (
                                        <span className="tx-actions__readonly" aria-label="Preview occurrence is read-only">
                                            —
                                        </span>
                                    ) : (
                                        <>
                                            {onEdit ? (
                                                <button
                                                    type="button"
                                                    className="tx-action-btn"
                                                    onClick={() => onEdit(tx)}
                                                    aria-label={`Edit ${label}`}
                                                >
                                                    Edit
                                                </button>
                                            ) : null}
                                            {onDelete ? (
                                                <button
                                                    type="button"
                                                    className="tx-action-btn danger"
                                                    onClick={() => onDelete(tx)}
                                                    aria-label={`Delete ${label}`}
                                                >
                                                    Delete
                                                </button>
                                            ) : null}
                                        </>
                                    )}
                                </td>
                            ) : null}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

export default TransactionList;
