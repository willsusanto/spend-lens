'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

const themeStorageKey = 'ledger-theme';

type Theme = 'light' | 'dark';

const applyTheme = (theme: Theme) => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  window.localStorage.setItem(themeStorageKey, theme);
};

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>('light');
  const isDark = theme === 'dark';

  useEffect(() => {
    setTheme(
      document.documentElement.classList.contains('dark') ? 'dark' : 'light',
    );
  }, []);

  const toggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';

    applyTheme(nextTheme);
    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="grid min-h-10 min-w-10 place-items-center rounded border border-[hsl(var(--outline-variant))] bg-[hsl(var(--surface-lowest))] text-[hsl(var(--on-surface-variant))] transition-colors hover:bg-[hsl(var(--surface-high))] hover:text-[hsl(var(--foreground))]"
      onClick={toggleTheme}
    >
      {isDark ? (
        <Sun className="size-5" aria-hidden="true" />
      ) : (
        <Moon className="size-5" aria-hidden="true" />
      )}
    </button>
  );
};
