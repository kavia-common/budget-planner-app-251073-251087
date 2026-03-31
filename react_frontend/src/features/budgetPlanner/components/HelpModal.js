import React from 'react';

import { Modal } from '../../../components/ui/Modal';

/**
 * @file HelpModal.js
 * Onboarding/help modal with quick tips for the Budget Planner UX.
 */

/**
 * HelpModal component.
 *
 * PUBLIC_INTERFACE
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 * }} props
 * @returns {JSX.Element|null}
 */
export function HelpModal({ open, onClose }) {
    /** This is a public function. */
    return (
        <Modal
            open={open}
            title="Quick help"
            description="Tips for adding transactions, using filters, budgets, and recurring previews."
            onClose={onClose}
        >
            <div className="help">
                <section className="help__section" aria-label="Getting started">
                    <h3 className="help__h">Getting started</h3>
                    <ul className="help__list">
                        <li>
                            Use <strong>+ Add</strong> (bottom-right) to create an income or expense transaction.
                        </li>
                        <li>
                            Your data is saved to <strong>this browser</strong> (localStorage). Clear site data to reset.
                        </li>
                        <li>
                            Use the <strong>Month/Period</strong> bar to switch between a month view and a custom date range.
                        </li>
                    </ul>
                </section>

                <section className="help__section" aria-label="Filters and sorting">
                    <h3 className="help__h">Filters</h3>
                    <ul className="help__list">
                        <li>Search by note, filter by type/category, and sort (date/amount).</li>
                        <li>
                            Budgets and alerts compare against your <strong>filtered expenses</strong> for the selected period.
                        </li>
                    </ul>
                </section>

                <section className="help__section" aria-label="Recurring preview">
                    <h3 className="help__h">Recurring transactions</h3>
                    <ul className="help__list">
                        <li>
                            Recurring items can be previewed for the selected period. Preview rows are labeled <strong>Preview</strong>.
                        </li>
                        <li>
                            Preview rows are <strong>not saved</strong> until you confirm “Add to saved transactions”.
                        </li>
                    </ul>
                </section>

                <section className="help__section" aria-label="CSV import and export">
                    <h3 className="help__h">CSV import/export</h3>
                    <ul className="help__list">
                        <li>Use the CSV button in the top bar to export or import data.</li>
                        <li>
                            Import supports merge/replace modes—review the preview and validation results before applying.
                        </li>
                    </ul>
                </section>

                <div className="help__footer">
                    <button type="button" className="help__closeBtn" onClick={onClose}>
                        Got it
                    </button>
                </div>
            </div>
        </Modal>
    );
}
