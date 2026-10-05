'use client';

import React from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showText?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showText = false }) => {
  const { themeMode, resolvedTheme, cycleThemeMode } = useTheme();

  const getLabel = () => {
    if (themeMode === 'system') return 'تلقائي (النظام)';
    if (themeMode === 'dark') return 'داكن';
    return 'فاتح';
  };

  const getTooltip = () => {
    if (themeMode === 'system') return `الوضع الحالي: تلقائي (النظام: ${resolvedTheme === 'dark' ? 'داكن' : 'فاتح'}) - انقر للتبديل`;
    if (themeMode === 'dark') return 'الوضع الحالي: داكن - انقر للتحويل إلى الفاتح';
    return 'الوضع الحالي: فاتح - انقر للتحويل إلى الداكن';
  };

  return (
    <button
      onClick={cycleThemeMode}
      type="button"
      className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
        resolvedTheme === 'dark'
          ? 'bg-slate-800/80 text-amber-300 border-slate-700/80 hover:bg-slate-700 hover:text-amber-200'
          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 shadow-xs'
      } ${className}`}
      title={getTooltip()}
      aria-label={getTooltip()}
    >
      {themeMode === 'system' ? (
        <Laptop className="w-4 h-4 text-sky-400" />
      ) : themeMode === 'dark' ? (
        <Moon className="w-4 h-4 text-amber-400" />
      ) : (
        <Sun className="w-4 h-4 text-amber-500" />
      )}
      {showText && (
        <span className="text-xs font-medium">
          {getLabel()}
        </span>
      )}
    </button>
  );
};
