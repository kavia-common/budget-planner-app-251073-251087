import React from 'react';

/**
 * Floating action button.
 *
 * PUBLIC_INTERFACE
 * @param {{label: string, onClick: () => void, children: React.ReactNode}} props
 */
export function FabButton({ label, onClick, children }) {
  /** This is a public function. */
  return (
    <button className="fab" onClick={onClick} aria-label={label}>
      {children}
    </button>
  );
}

