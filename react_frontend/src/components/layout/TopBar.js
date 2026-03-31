import React from 'react';

/**
 * App top navigation bar.
 *
 * PUBLIC_INTERFACE
 * @param {{title: string, right?: React.ReactNode}} props
 */
export function TopBar({ title, right }) {
  /** This is a public function. */
  return (
    <nav className="top-bar">
      <h1>{title}</h1>
      {right}
    </nav>
  );
}

