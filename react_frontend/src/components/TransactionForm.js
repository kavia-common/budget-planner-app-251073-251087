import React, { useState } from 'react';

/**
 * TransactionForm component — for adding income/expense transactions.
 *
 * @param {Object} props
 * @param {boolean} open Whether the modal is open
 * @param {Function} onClose Function to call to close the form/modal
 * @param {Function} onSave Called with the transaction object if valid
 * @param {string[]} categories Array of category names for dropdown
 */
function TransactionForm({ open, onClose, onSave, categories }) {
    const [type, setType] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [category, setCategory] = useState('');
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState({});

    /**
     * Validate form fields.
     * Sets errors if invalid.
     * @returns {boolean}
     */
    function validate() {
        const errorsNew = {};
        if (!type) errorsNew.type = 'Type is required';
        if (!amount || isNaN(amount) || Number(amount) < 0) errorsNew.amount = 'Valid amount required';
        if (!date) errorsNew.date = 'Date is required';
        if (!category) errorsNew.category = 'Category is required';
        setErrors(errorsNew);
        return Object.keys(errorsNew).length === 0;
    }

    /**
     * Handle form submission.
     * Calls onSave with data if valid.
     * @param {Event} e
     */
    function handleSubmit(e) {
        e.preventDefault();
        if (validate()) {
            onSave({
                type,
                amount: Number(amount),
                date,
                category,
                note: note.trim(),
            });
            setType('');
            setAmount('');
            setDate('');
            setCategory('');
            setNote('');
            setErrors({});
            onClose();
        }
    }

    /**
     * Reset form and close.
     */
    function handleClose() {
        setType('');
        setAmount('');
        setDate('');
        setCategory('');
        setNote('');
        setErrors({});
        onClose();
    }

    if (!open) return null;

    return (
        <div className="modal-backdrop" tabIndex={-1} aria-modal="true" role="dialog">
            <div className="modal">
                <h2>Add Transaction</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-row">
                        <label>
                            Type
                            <select value={type} onChange={e => setType(e.target.value)} required>
                                <option value="">Select</option>
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                            </select>
                        </label>
                        {errors.type && <span className="form-error">{errors.type}</span>}
                    </div>
                    <div className="form-row">
                        <label>
                            Amount
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                required
                                />
                        </label>
                        {errors.amount && <span className="form-error">{errors.amount}</span>}
                    </div>
                    <div className="form-row">
                        <label>
                            Date
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                required
                                />
                        </label>
                        {errors.date && <span className="form-error">{errors.date}</span>}
                    </div>
                    <div className="form-row">
                        <label>
                            Category
                            <select value={category} onChange={e => setCategory(e.target.value)} required>
                                <option value="">Select</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </label>
                        {errors.category && <span className="form-error">{errors.category}</span>}
                    </div>
                    <div className="form-row">
                        <label>
                            Note
                            <input
                                type="text"
                                value={note}
                                maxLength={80}
                                onChange={e => setNote(e.target.value)}
                                placeholder="(optional)"
                                />
                        </label>
                    </div>
                    <div className="form-actions">
                        <button type="submit">Add</button>
                        <button type="button" onClick={handleClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default TransactionForm;

