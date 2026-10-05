'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ThemeMode, AccentColor, STORAGE_KEY_THEME_MODE, STORAGE_KEY_ACCENT_COLOR } from '@/types/currency';

interface ThemeContextType {
  themeMode: ThemeMode; // 'dark' | 'light' | 'system'
  resolvedTheme: 'dark' | 'light'; // The actual theme rendered
  accentColor: AccentColor; // 'amber' | 'emerald' | 'cyan' | 'violet'
  setThemeMode: (mode: ThemeMode) => void;
  setAccentColor: (color: AccentColor) => void;
  cycleThemeMode: () => void;
  // Legacy compatibility helpers
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'system',
  resolvedTheme: 'dark',
  accentColor: 'amber',
  setThemeMode: () => {},
  setAccentColor: () => {},
  cycleThemeMode: () => {},
  theme: 'dark',
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [systemIsDark, setSystemIsDark] = useState<boolean>(true);
  const [accentColor, setAccentColorState] = useState<AccentColor>('amber');
  const [mounted, setMounted] = useState(false);

  // Compute resolved theme
  const resolvedTheme: 'dark' | 'light' = !mounted 
    ? 'dark' 
    : themeMode === 'system' 
    ? (systemIsDark ? 'dark' : 'light') 
    : themeMode;

  const applyDomTheme = useCallback((theme: 'dark' | 'light', accent: AccentColor) => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.style.colorScheme = 'light';
      }
      root.setAttribute('data-theme', theme);
      root.setAttribute('data-accent', accent);
    }
  }, []);

  // Hydrate theme preferences asynchronously after initial paint
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedMode = localStorage.getItem(STORAGE_KEY_THEME_MODE) as ThemeMode | null;
        if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
          setThemeModeState(savedMode);
        } else {
          const legacy = localStorage.getItem('price_calc_v0_theme');
          if (legacy === 'light' || legacy === 'dark') {
            setThemeModeState(legacy);
          }
        }

        const savedAccent = localStorage.getItem(STORAGE_KEY_ACCENT_COLOR) as AccentColor | null;
        if (savedAccent === 'amber' || savedAccent === 'emerald' || savedAccent === 'cyan' || savedAccent === 'violet') {
          setAccentColorState(savedAccent);
        }

        if (typeof window !== 'undefined' && window.matchMedia) {
          setSystemIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
      } catch {
        // Ignore
      }
      setMounted(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // System media listener
  useEffect(() => {
    if (!mounted || typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    try {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } catch {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [mounted]);

  // Update DOM whenever resolvedTheme or accentColor changes (only after mount)
  useEffect(() => {
    if (mounted) {
      applyDomTheme(resolvedTheme, accentColor);
    }
  }, [mounted, resolvedTheme, accentColor, applyDomTheme]);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY_THEME_MODE, mode);
    } catch {
      // Ignore
    }
  };

  const setAccentColor = (color: AccentColor) => {
    setAccentColorState(color);
    try {
      localStorage.setItem(STORAGE_KEY_ACCENT_COLOR, color);
    } catch {
      // Ignore
    }
  };

  const cycleThemeMode = () => {
    if (themeMode === 'system') {
      setThemeMode('light');
    } else if (themeMode === 'light') {
      setThemeMode('dark');
    } else {
      setThemeMode('system');
    }
  };

  const toggleTheme = () => {
    if (resolvedTheme === 'dark') {
      setThemeMode('light');
    } else {
      setThemeMode('dark');
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        resolvedTheme,
        accentColor,
        setThemeMode,
        setAccentColor,
        cycleThemeMode,
        theme: resolvedTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
