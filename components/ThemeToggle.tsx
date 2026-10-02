'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showText?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', showText = false }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
        theme === 'dark'
          ? 'bg-slate-800/80 text-amber-300 border-slate-700/80 hover:bg-slate-700 hover:text-amber-200'
          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:text-slate-900 shadow-xs'
      } ${className}`}
      title={theme === 'dark' ? 'التحويل إلى الوضع الفاتح' : 'التحويل إلى الوضع المظلم'}
      aria-label={theme === 'dark' ? 'التحويل إلى الوضع الفاتح' : 'التحويل إلى الوضع المظلم'}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700" />
      )}
      {showText && (
        <span className="text-xs font-medium">
          {theme === 'dark' ? 'فاتح' : 'داكن'}
        </span>
      )}
    </button>
  );
};
