import React, { useEffect, useId, useMemo, useRef } from 'react';

/**
 * @file Modal.js
 * Accessible modal dialog with:
 * - focus trap
 * - Escape to close
 * - backdrop click to close (configurable)
 * - ARIA labeling (title/description)
 *
 * This is intentionally dependency-free.
 */

/**
 * Return a list of focusable elements under a root.
 * @param {HTMLElement|null} root
 * @returns {HTMLElement[]}
 */
function getFocusableElements(root) {
    if (!root) return [];
    const selectors = [
        'a[href]',
        'area[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'iframe',
        'object',
        'embed',
        '[contenteditable="true"]',
        '[tabindex]:not([tabindex="-1"])',
    ];
    return Array.from(root.querySelectorAll(selectors.join(','))).filter((el) => {
        const style = window.getComputedStyle(el);
        return style.visibility !== 'hidden' && style.display !== 'none';
    });
}

/**
 * Modal component.
 *
 * PUBLIC_INTERFACE
 * @param {{
 *   open: boolean,
 *   title: string,
 *   description?: string,
 *   children: React.ReactNode,
 *   onClose: () => void,
 *   closeOnBackdrop?: boolean,
 *   initialFocusRef?: React.RefObject<HTMLElement>,
 *   labelledById?: string,
 *   describedById?: string,
 * }} props
 * @returns {JSX.Element|null}
 */
export function Modal({
    open,
    title,
    description,
    children,
    onClose,
    closeOnBackdrop = true,
    initialFocusRef,
    labelledById,
    describedById,
}) {
    /** This is a public function. */
    const reactId = useId();
    const titleId = useMemo(() => labelledById || `modal_title_${reactId}`, [labelledById, reactId]);
    const descId = useMemo(
        () => describedById || (description ? `modal_desc_${reactId}` : undefined),
        [describedById, description, reactId]
    );

    const dialogRef = useRef(null);
    const previouslyFocusedRef = useRef(null);

    useEffect(() => {
        if (!open) return;

        // Save/restore focus for accessibility.
        previouslyFocusedRef.current = document.activeElement;

        const focusTarget =
            (initialFocusRef && initialFocusRef.current) ||
            getFocusableElements(dialogRef.current)[0] ||
            dialogRef.current;

        // Ensure focus lands inside the dialog.
        window.setTimeout(() => {
            if (focusTarget && typeof focusTarget.focus === 'function') {
                focusTarget.focus();
            }
        }, 0);

        /**
         * Key handler for Escape + focus trap (Tab).
         * @param {KeyboardEvent} e
         */
        function onKeyDown(e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }

            if (e.key !== 'Tab') return;

            const focusable = getFocusableElements(dialogRef.current);
            if (focusable.length === 0) {
                e.preventDefault();
                return;
            }

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const active = document.activeElement;

            if (e.shiftKey) {
                if (active === first || active === dialogRef.current) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (active === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }

        document.addEventListener('keydown', onKeyDown, true);

        return () => {
            document.removeEventListener('keydown', onKeyDown, true);

            const prev = previouslyFocusedRef.current;
            if (prev && typeof prev.focus === 'function') {
                // Restore focus to the button that opened the modal.
                prev.focus();
            }
        };
    }, [open, onClose, initialFocusRef]);

    if (!open) return null;

    return (
        <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={(e) => {
                // Only close if the click started on the backdrop itself.
                if (!closeOnBackdrop) return;
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descId}
                ref={dialogRef}
                tabIndex={-1}
            >
                <div className="modal-header">
                    <h2 id={titleId}>{title}</h2>
                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                        aria-label="Close dialog"
                    >
                        ×
                    </button>
                </div>

                {description ? (
                    <p id={descId} className="modal-description">
                        {description}
                    </p>
                ) : null}

                <div className="modal-body">{children}</div>
            </div>
        </div>
    );
}
