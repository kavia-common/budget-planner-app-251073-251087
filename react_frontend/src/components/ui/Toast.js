import React, { useEffect, useRef } from 'react';

/**
 * @file Toast.js
 * Lightweight toast notification with optional action button.
 */

/**
 * Toast component.
 *
 * PUBLIC_INTERFACE
 * @param {{
 *   open: boolean,
 *   message: string,
 *   actionLabel?: string,
 *   onAction?: () => void,
 *   onClose: () => void,
 *   durationMs?: number,
 * }} props
 * @returns {JSX.Element|null}
 */
export function Toast({ open, message, actionLabel, onAction, onClose, durationMs = 6000 }) {
    /** This is a public function. */
    const closeTimerRef = useRef(0);

    useEffect(() => {
        if (!open) return;

        // Auto-close after duration (unless duration is 0 or negative).
        if (durationMs > 0) {
            closeTimerRef.current = window.setTimeout(() => {
                onClose();
            }, durationMs);
        }

        return () => {
            if (closeTimerRef.current) {
                window.clearTimeout(closeTimerRef.current);
                closeTimerRef.current = 0;
            }
        };
    }, [open, durationMs, onClose]);

    if (!open) return null;

    return (
        <div className="toast" role="status" aria-live="polite" aria-atomic="true">
            <div className="toast__message">{message}</div>
            <div className="toast__actions">
                {actionLabel && onAction ? (
                    <button type="button" className="toast__btn" onClick={onAction}>
                        {actionLabel}
                    </button>
                ) : null}
                <button type="button" className="toast__btn toast__btn--secondary" onClick={onClose} aria-label="Dismiss notification">
                    Dismiss
                </button>
            </div>
        </div>
    );
}
