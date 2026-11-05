import { ThemeMode } from '@/types/settings.types';

let mediaQueryListener: ((e: MediaQueryListEvent) => void) | null = null;
let mediaQuery: MediaQueryList | null = null;

export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Clean up any previous system listener
  if (mediaQuery && mediaQueryListener) {
    mediaQuery.removeEventListener('change', mediaQueryListener);
    mediaQueryListener = null;
    mediaQuery = null;
  }

  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    // 'system'
    mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = (matches: boolean) => {
      if (matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    updateSystemTheme(mediaQuery.matches);

    mediaQueryListener = (e: MediaQueryListEvent) => updateSystemTheme(e.matches);
    mediaQuery.addEventListener('change', mediaQueryListener);
  }
}
