import { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'bp_theme_v1';

/**
 * Read persisted theme prefs (if present).
 * @returns {{color?: 'light'|'dark', style?: 'retro'|'modern'}|null}
 */
function readStoredTheme() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const color = parsed.color === 'dark' ? 'dark' : parsed.color === 'light' ? 'light' : undefined;
    const style = parsed.style === 'retro' ? 'retro' : parsed.style === 'modern' ? 'modern' : undefined;

    if (!color && !style) return null;
    return { color, style };
  } catch {
    return null;
  }
}

/**
 * Persist theme prefs.
 * @param {{color: 'light'|'dark', style: 'retro'|'modern'}} value
 */
function writeStoredTheme(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore (private mode / storage disabled)
  }
}

/**
 * React hook to manage theming via the document `data-theme` and `data-style` attributes.
 *
 * We keep TWO independent axes:
 * - color theme: light/dark
 * - style theme: modern/retro
 *
 * PUBLIC_INTERFACE
 * @param {{initialColor?: 'light'|'dark', initialStyle?: 'retro'|'modern'}} options
 * @returns {{
 *  colorTheme: 'light'|'dark',
 *  styleTheme: 'retro'|'modern',
 *  toggleColorTheme: () => void,
 *  toggleStyleTheme: () => void,
 *  setColorTheme: (t:'light'|'dark') => void,
 *  setStyleTheme: (t:'retro'|'modern') => void,
 * }}
 */
export function useTheme(options = {}) {
  /** This is a public function. */
  const stored = useMemo(() => readStoredTheme(), []);
  const initialColor = stored?.color || options.initialColor || 'light';
  const initialStyle = stored?.style || options.initialStyle || 'retro';

  const [colorTheme, setColorTheme] = useState(initialColor);
  const [styleTheme, setStyleTheme] = useState(initialStyle);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', colorTheme);
    document.documentElement.setAttribute('data-style', styleTheme);
    writeStoredTheme({ color: colorTheme, style: styleTheme });
  }, [colorTheme, styleTheme]);

  const toggleColorTheme = () => setColorTheme((t) => (t === 'light' ? 'dark' : 'light'));
  const toggleStyleTheme = () => setStyleTheme((t) => (t === 'retro' ? 'modern' : 'retro'));

  return {
    colorTheme,
    styleTheme,
    toggleColorTheme,
    toggleStyleTheme,
    setColorTheme,
    setStyleTheme,
  };
}

