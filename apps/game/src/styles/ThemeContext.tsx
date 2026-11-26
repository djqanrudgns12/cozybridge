import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  THEME_OPTIONS,
  type ThemeId,
} from './design-tokens';

const STORAGE_KEY = 'linebound-ui-theme';

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (next: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'craft',
  setTheme: () => {},
});

function readSavedTheme(): ThemeId {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && THEME_OPTIONS.some((t) => t.id === raw)) {
      return raw as ThemeId;
    }
  } catch {
    // 로컬 스토리지 접근 불가 환경에서는 기본값 유지
  }
  return 'craft';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readSavedTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore storage quota errors
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
