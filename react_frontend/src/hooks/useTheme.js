import { useEffect, useState } from 'react';

/**
 * React hook to manage light/dark theme via the document `data-theme` attribute.
 *
 * PUBLIC_INTERFACE
 * @param {'light'|'dark'} initialTheme
 * @returns {{theme: 'light'|'dark', toggleTheme: () => void, setTheme: (t:'light'|'dark') => void}}
 */
export function useTheme(initialTheme = 'light') {
  /** This is a public function. */
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return { theme, toggleTheme, setTheme };
}

