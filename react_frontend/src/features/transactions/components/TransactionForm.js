import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';

/**
 * @file TransactionForm.js
 * Add/Edit transaction modal form with validation and accessibility.
 */

/**
 * Validate a YYYY-MM-DD date-only string.
 * @param {string} value
 * @returns {boolean}
 */
function isValidIsoDateOnly(value) {
    if (!value) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(`${value}T00:00:00`);
    return !Number.isNaN(d.getTime());
}

/**
 * Parse amount input and validate constraints.
 * @param {string} raw
 * @returns {{amountNumber: number|null, error: string|null}}
 */
function parseAndValidateAmount(raw) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) return { amountNumber: null, error: 'Amount is required' };
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return { amountNumber: null, error: 'Amount must be a number' };
    if (n <= 0) return { amountNumber: null, error: 'Amount must be greater than 0' };
    if (n > 100000000) return { amountNumber: null, error: 'Amount is too large' };
    // Limit to 2 decimals for predictable display.
    const rounded = Math.round(n * 100) / 100;
    return { amountNumber: rounded, error: null };
}

/**
 * TransactionForm component — for adding/editing income/expense transactions.
 *
 * PUBLIC_INTERFACE
 * @param {Object} props
 * @param {boolean} props.open Whether the modal is open
 * @param {Function} props.onClose Function to call to close the form/modal
 * @param {(tx: any) => void} props.onSave Called with the transaction object if valid
 * @param {string[]} props.categories Array of category names for dropdown
 * @param {any=} props.initialTransaction When set, puts the form into edit mode
 * @returns {JSX.Element|null}
 */
function TransactionForm({ open, onClose, onSave, categories, initialTransaction }) {
    /** This is a public function. */
    const reactId = useId();

    const isEditMode = Boolean(initialTransaction);

    const [type, setType] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [category, setCategory] = useState('');
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState({});

    const typeId = useMemo(() => `tx_type_${reactId}`, [reactId]);
    const amountId = useMemo(() => `tx_amount_${reactId}`, [reactId]);
    const dateId = useMemo(() => `tx_date_${reactId}`, [reactId]);
    const categoryId = useMemo(() => `tx_category_${reactId}`, [reactId]);
    const noteId = useMemo(() => `tx_note_${reactId}`, [reactId]);

    const firstFieldRef = useRef(null);

    useEffect(() => {
        if (!open) return;

        // Populate fields on open for edit mode.
        if (initialTransaction) {
            setType(initialTransaction.type || '');
            setAmount(
                typeof initialTransaction.amount === 'number'
                    ? initialTransaction.amount.toFixed(2)
                    : String(initialTransaction.amount || '')
            );
            setDate(initialTransaction.date || '');
            setCategory(initialTransaction.category || '');
            setNote(initialTransaction.note || '');
            setErrors({});
            return;
        }

        // Fresh add form.
        setType('');
        setAmount('');
        setDate('');
        setCategory('');
        setNote('');
        setErrors({});
    }, [open, initialTransaction]);

    /**
     * Validate form fields and set errors.
     * @returns {boolean}
     */
    function validate() {
        /** @type {Record<string, string>} */
        const nextErrors = {};

        if (!type) nextErrors.type = 'Type is required';
        if (type && type !== 'income' && type !== 'expense') nextErrors.type = 'Type must be income or expense';

        const { error: amountError } = parseAndValidateAmount(amount);
        if (amountError) nextErrors.amount = amountError;

        if (!date) nextErrors.date = 'Date is required';
        if (date && !isValidIsoDateOnly(date)) nextErrors.date = 'Date must be a valid YYYY-MM-DD value';

        if (!category) nextErrors.category = 'Category is required';
        if (category && Array.isArray(categories) && categories.length > 0 && !categories.includes(category)) {
            nextErrors.category = 'Category must be one of the available categories';
        }

        if (note && String(note).length > 80) nextErrors.note = 'Note must be 80 characters or fewer';

        setErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    }

    /**
     * Handle form submission.
     * @param {React.FormEvent} e
     */
    function handleSubmit(e) {
        e.preventDefault();
        if (!validate()) return;

        const { amountNumber } = parseAndValidateAmount(amount);
        onSave({
            // Preserve legacy shape but include id when editing.
            ...(initialTransaction && initialTransaction.id ? { id: initialTransaction.id } : {}),
            type,
            amount: amountNumber == null ? 0 : amountNumber,
            date,
            category,
            note: String(note || '').trim(),
        });

        onClose();
    }

    /**
     * Close handler that resets local state.
     */
    function handleClose() {
        setErrors({});
        onClose();
    }

    const typeErrorId = errors.type ? `${typeId}_err` : undefined;
    const amountErrorId = errors.amount ? `${amountId}_err` : undefined;
    const dateErrorId = errors.date ? `${dateId}_err` : undefined;
    const categoryErrorId = errors.category ? `${categoryId}_err` : undefined;
    const noteErrorId = errors.note ? `${noteId}_err` : undefined;

    return (
        <Modal
            open={open}
            onClose={handleClose}
            title={isEditMode ? 'Edit Transaction' : 'Add Transaction'}
            description="All fields except Note are required."
            initialFocusRef={firstFieldRef}
        >
            <form onSubmit={handleSubmit} noValidate>
                <div className="form-row">
                    <label htmlFor={typeId}>Type</label>
                    <select
                        id={typeId}
                        ref={firstFieldRef}
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        aria-invalid={Boolean(errors.type)}
                        aria-describedby={typeErrorId}
                        required
                    >
                        <option value="">Select</option>
                        <option value="income">Income</option>
                        <option value="expense">Expense</option>
                    </select>
                    {errors.type ? (
                        <span id={typeErrorId} className="form-error" role="alert">
                            {errors.type}
                        </span>
                    ) : null}
                </div>

                <div className="form-row">
                    <label htmlFor={amountId}>Amount</label>
                    <input
                        id={amountId}
                        inputMode="decimal"
                        type="text"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        aria-invalid={Boolean(errors.amount)}
                        aria-describedby={amountErrorId}
                        placeholder="e.g. 12.34"
                        required
                    />
                    {errors.amount ? (
                        <span id={amountErrorId} className="form-error" role="alert">
                            {errors.amount}
                        </span>
                    ) : null}
                </div>

                <div className="form-row">
                    <label htmlFor={dateId}>Date</label>
                    <input
                        id={dateId}
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        aria-invalid={Boolean(errors.date)}
                        aria-describedby={dateErrorId}
                        required
                    />
                    {errors.date ? (
                        <span id={dateErrorId} className="form-error" role="alert">
                            {errors.date}
                        </span>
                    ) : null}
                </div>

                <div className="form-row">
                    <label htmlFor={categoryId}>Category</label>
                    <select
                        id={categoryId}
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        aria-invalid={Boolean(errors.category)}
                        aria-describedby={categoryErrorId}
                        required
                    >
                        <option value="">Select</option>
                        {categories.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                    {errors.category ? (
                        <span id={categoryErrorId} className="form-error" role="alert">
                            {errors.category}
                        </span>
                    ) : null}
                </div>

                <div className="form-row">
                    <label htmlFor={noteId}>Note</label>
                    <input
                        id={noteId}
                        type="text"
                        value={note}
                        maxLength={80}
                        onChange={(e) => setNote(e.target.value)}
                        aria-invalid={Boolean(errors.note)}
                        aria-describedby={noteErrorId}
                        placeholder="(optional)"
                    />
                    {errors.note ? (
                        <span id={noteErrorId} className="form-error" role="alert">
                            {errors.note}
                        </span>
                    ) : null}
                </div>

                <div className="form-actions">
                    <button type="submit">{isEditMode ? 'Save' : 'Add'}</button>
                    <button type="button" onClick={handleClose}>
                        Cancel
                    </button>
                </div>
            </form>
        </Modal>
    );
}

export default TransactionForm;
