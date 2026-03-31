import React, { useMemo, useRef, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import {
    applyImportedTransactions,
    applyImportedUserCategories,
    exportBackupBundleText,
    exportTransactionsToCsv,
    validateBackupBundleText,
    validateTransactionsCsv,
} from '../utils/csv';

/**
 * @file CsvImportExportModal.js
 * Modal for CSV export/import with validation + preview and merge vs replace.
 */

/**
 * Read a File as text.
 * @param {File} file
 * @returns {Promise<string>}
 */
function readFileText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read file.'));
        reader.onload = () => resolve(String(reader.result || ''));
        reader.readAsText(file);
    });
}

/**
 * Download a text blob as a file.
 * @param {string} filename
 * @param {string} text
 */
function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

/**
 * CSV import/export modal.
 *
 * PUBLIC_INTERFACE
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   currentTransactions: any[],
 *   onApplied: () => void,
 * }} props
 * @returns {JSX.Element|null}
 */
export function CsvImportExportModal({ open, onClose, currentTransactions, onApplied }) {
    /** This is a public function. */
    const [tab, setTab] = useState('export'); // 'export' | 'import'
    const [importMode, setImportMode] = useState('merge'); // merge | replace
    const [rawText, setRawText] = useState('');
    const [importKind, setImportKind] = useState('auto'); // auto | transactions | bundle

    const [status, setStatus] = useState({ kind: 'idle', message: '' }); // idle | error | success
    const [lastValidation, setLastValidation] = useState(null);

    const fileInputRef = useRef(null);
    const pasteRef = useRef(null);

    const exportTxCsv = useMemo(() => exportTransactionsToCsv(currentTransactions || []), [currentTransactions]);
    const exportBundle = useMemo(() => exportBackupBundleText(), []);

    const preview = useMemo(() => {
        if (!lastValidation || !lastValidation.ok) return null;
        const txs = lastValidation.transactions || [];
        const cats = lastValidation.userCategories || lastValidation.inferredCategories || [];
        return {
            txCount: txs.length,
            catsCount: cats.length,
            warnings: lastValidation.warnings || [],
        };
    }, [lastValidation]);

    const canApply = Boolean(lastValidation && lastValidation.ok && (lastValidation.transactions || lastValidation.userCategories));

    function resetImportState() {
        setRawText('');
        setLastValidation(null);
        setStatus({ kind: 'idle', message: '' });
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function validateNow(text) {
        const t = String(text || '');
        let res;

        if (importKind === 'transactions') {
            res = validateTransactionsCsv(t);
        } else if (importKind === 'bundle') {
            res = validateBackupBundleText(t);
        } else {
            // auto-detect: if bundle marker present, use bundle; else treat as tx csv
            if (t.includes('[TRANSACTIONS]') || t.includes('[CATEGORIES]') || t.includes('[BUDGETS]')) {
                res = validateBackupBundleText(t);
            } else {
                res = validateTransactionsCsv(t);
            }
        }

        setLastValidation(res);
        if (!res.ok) {
            setStatus({ kind: 'error', message: res.errors?.[0] || 'Invalid CSV.' });
        } else if (res.warnings?.length) {
            setStatus({ kind: 'idle', message: '' });
        } else {
            setStatus({ kind: 'idle', message: '' });
        }
    }

    async function handlePickFile(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        setStatus({ kind: 'idle', message: '' });
        try {
            const text = await readFileText(file);
            setRawText(text);
            validateNow(text);
        } catch (err) {
            setStatus({ kind: 'error', message: err?.message || 'Failed to read file.' });
        }
    }

    function handlePasteSample(kind) {
        if (kind === 'transactions') {
            setRawText(exportTxCsv);
            validateNow(exportTxCsv);
            return;
        }
        setRawText(exportBundle);
        validateNow(exportBundle);
    }

    function applyImport() {
        if (!canApply) return;

        try {
            const res = lastValidation;

            // Apply transactions
            if (res.transactions && res.transactions.length) {
                applyImportedTransactions(res.transactions, { mode: importMode });
            } else if (importKind !== 'bundle') {
                // If user imported transactions-only and it had none, nothing to do.
            }

            // Apply categories (only if present in bundle)
            if (Array.isArray(res.userCategories)) {
                applyImportedUserCategories(res.userCategories, { mode: importMode });
            }

            setStatus({ kind: 'success', message: 'Import applied successfully.' });
            if (typeof onApplied === 'function') onApplied();
        } catch (err) {
            setStatus({ kind: 'error', message: err?.message || 'Failed to apply import.' });
        }
    }

    return (
        <Modal
            open={open}
            onClose={() => {
                onClose();
                // Keep tab selection but clear import feedback so next open is clean.
                setStatus({ kind: 'idle', message: '' });
            }}
            title="CSV Import / Export"
            description="Export your data to CSV for backup, or import from a CSV file. Import supports preview + validation and can merge or replace your local data."
            initialFocusRef={pasteRef}
        >
            <div className="csvio">
                <div className="csvio__tabs" role="tablist" aria-label="CSV import/export tabs">
                    <button
                        type="button"
                        className={`csvio__tab ${tab === 'export' ? 'csvio__tab--active' : ''}`}
                        role="tab"
                        aria-selected={tab === 'export'}
                        onClick={() => {
                            setTab('export');
                            setStatus({ kind: 'idle', message: '' });
                        }}
                    >
                        Export
                    </button>
                    <button
                        type="button"
                        className={`csvio__tab ${tab === 'import' ? 'csvio__tab--active' : ''}`}
                        role="tab"
                        aria-selected={tab === 'import'}
                        onClick={() => {
                            setTab('import');
                            setStatus({ kind: 'idle', message: '' });
                        }}
                    >
                        Import
                    </button>
                </div>

                {tab === 'export' ? (
                    <div className="csvio__panel" role="tabpanel" aria-label="Export tab">
                        <div className="csvio__section">
                            <h3 className="csvio__h">Transactions CSV</h3>
                            <p className="csvio__p">Exports your current transaction list. This is compatible with import.</p>
                            <div className="csvio__actions">
                                <button
                                    type="button"
                                    className="csvio__btn"
                                    onClick={() => downloadText(`budget-planner-transactions-${Date.now()}.csv`, exportTxCsv)}
                                >
                                    Download transactions.csv
                                </button>
                                <button
                                    type="button"
                                    className="csvio__btn csvio__btn--secondary"
                                    onClick={() => {
                                        navigator.clipboard?.writeText?.(exportTxCsv);
                                        setStatus({ kind: 'success', message: 'Copied transactions CSV to clipboard.' });
                                    }}
                                >
                                    Copy to clipboard
                                </button>
                            </div>

                            <textarea
                                className="csvio__textarea"
                                value={exportTxCsv}
                                readOnly
                                rows={8}
                                aria-label="Transactions CSV preview"
                            />
                        </div>

                        <div className="csvio__section">
                            <h3 className="csvio__h">Full backup bundle</h3>
                            <p className="csvio__p">
                                Includes transactions + user categories + budgets in one text file. Import will restore transactions and user categories.
                            </p>
                            <div className="csvio__actions">
                                <button
                                    type="button"
                                    className="csvio__btn"
                                    onClick={() => downloadText(`budget-planner-backup-${Date.now()}.txt`, exportBundle)}
                                >
                                    Download backup.txt
                                </button>
                                <button
                                    type="button"
                                    className="csvio__btn csvio__btn--secondary"
                                    onClick={() => {
                                        navigator.clipboard?.writeText?.(exportBundle);
                                        setStatus({ kind: 'success', message: 'Copied backup bundle to clipboard.' });
                                    }}
                                >
                                    Copy to clipboard
                                </button>
                            </div>

                            <textarea
                                className="csvio__textarea"
                                value={exportBundle}
                                readOnly
                                rows={10}
                                aria-label="Backup bundle preview"
                            />
                        </div>

                        {status.kind === 'success' ? <div className="csvio__notice csvio__notice--success">{status.message}</div> : null}
                    </div>
                ) : (
                    <div className="csvio__panel" role="tabpanel" aria-label="Import tab">
                        <div className="csvio__row">
                            <label className="csvio__label" htmlFor="csvio_mode">
                                Import mode
                            </label>
                            <select
                                id="csvio_mode"
                                className="csvio__select"
                                value={importMode}
                                onChange={(e) => setImportMode(e.target.value)}
                            >
                                <option value="merge">Merge (recommended)</option>
                                <option value="replace">Replace all local data</option>
                            </select>
                        </div>

                        <div className="csvio__row">
                            <label className="csvio__label" htmlFor="csvio_kind">
                                File type
                            </label>
                            <select
                                id="csvio_kind"
                                className="csvio__select"
                                value={importKind}
                                onChange={(e) => {
                                    setImportKind(e.target.value);
                                    setLastValidation(null);
                                    setStatus({ kind: 'idle', message: '' });
                                }}
                            >
                                <option value="auto">Auto-detect</option>
                                <option value="transactions">Transactions CSV</option>
                                <option value="bundle">Backup bundle</option>
                            </select>
                        </div>

                        <div className="csvio__actions">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.txt,text/csv,text/plain"
                                onChange={handlePickFile}
                                aria-label="Choose CSV file to import"
                            />
                            <button
                                type="button"
                                className="csvio__btn csvio__btn--secondary"
                                onClick={() => {
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                    resetImportState();
                                    if (pasteRef.current && typeof pasteRef.current.focus === 'function') pasteRef.current.focus();
                                }}
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                className="csvio__btn csvio__btn--secondary"
                                onClick={() => handlePasteSample(importKind === 'bundle' ? 'bundle' : 'transactions')}
                            >
                                Paste sample (current data)
                            </button>
                        </div>

                        <textarea
                            ref={pasteRef}
                            className="csvio__textarea"
                            value={rawText}
                            onChange={(e) => {
                                const t = e.target.value;
                                setRawText(t);
                                validateNow(t);
                            }}
                            rows={10}
                            placeholder="Paste CSV text here, or choose a file above…"
                            aria-label="CSV text input"
                        />

                        {status.kind === 'error' ? <div className="csvio__notice csvio__notice--error">{status.message}</div> : null}

                        {lastValidation && lastValidation.warnings && lastValidation.warnings.length ? (
                            <div className="csvio__notice csvio__notice--warning" aria-label="Import warnings">
                                <strong>Warnings:</strong>
                                <ul className="csvio__list">
                                    {lastValidation.warnings.slice(0, 6).map((w, idx) => (
                                        <li key={`${idx}-${w}`}>{w}</li>
                                    ))}
                                </ul>
                                {lastValidation.warnings.length > 6 ? (
                                    <div className="csvio__muted">+ {lastValidation.warnings.length - 6} more…</div>
                                ) : null}
                            </div>
                        ) : null}

                        {preview ? (
                            <div className="csvio__preview" aria-label="Import preview">
                                <div className="csvio__previewRow">
                                    <span>Transactions</span>
                                    <strong>{preview.txCount}</strong>
                                </div>
                                <div className="csvio__previewRow">
                                    <span>Categories</span>
                                    <strong>{preview.catsCount}</strong>
                                </div>
                                <div className="csvio__muted">
                                    Preview only. Click <strong>Apply import</strong> to {importMode === 'replace' ? 'replace' : 'merge'} your local data.
                                </div>
                            </div>
                        ) : null}

                        <div className="csvio__actions csvio__actions--bottom">
                            <button
                                type="button"
                                className="csvio__btn"
                                onClick={() => {
                                    const ok =
                                        importMode === 'replace'
                                            ? window.confirm(
                                                  'Replace mode will overwrite your local transactions (and user categories if provided). Are you sure?'
                                              )
                                            : true;
                                    if (!ok) return;
                                    applyImport();
                                }}
                                disabled={!canApply}
                            >
                                Apply import
                            </button>
                            <button type="button" className="csvio__btn csvio__btn--secondary" onClick={onClose}>
                                Close
                            </button>
                        </div>

                        {status.kind === 'success' ? <div className="csvio__notice csvio__notice--success">{status.message}</div> : null}
                    </div>
                )}
            </div>
        </Modal>
    );
}
