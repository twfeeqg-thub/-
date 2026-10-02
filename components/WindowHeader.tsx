'use client';

import React from 'react';
import { 
  Minus, 
  Maximize2, 
  Minimize2, 
  Layers, 
  X, 
  RotateCcw,
  SlidersHorizontal,
  BookmarkCheck,
  ArrowRight,
  Coins
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { ThemeToggle } from './ThemeToggle';

export type WindowMode = 'normal' | 'maximized' | 'minimized' | 'floating' | 'closed';

interface WindowHeaderProps {
  mode: WindowMode;
  onSetMode: (mode: WindowMode) => void;
  onReset: () => void;
  onToggleSettings?: () => void;
  hasDefaultsSaved?: boolean;
  currencyName?: string;
  onBackToDashboard?: () => void;
}

export const WindowHeader: React.FC<WindowHeaderProps> = ({
  mode,
  onSetMode,
  onReset,
  onToggleSettings,
  hasDefaultsSaved = false,
  currencyName,
  onBackToDashboard,
}) => {
  return (
    <header className="flex items-center justify-between px-3.5 py-2.5 bg-white/95 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-md select-none rounded-t-2xl">
      {/* Brand title / Back Button / Currency Badge */}
      <div className="flex items-center gap-2">
        {onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/20 text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer active:scale-95"
            title="الرجوع إلى لوحة العملات"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">لوحة العملات</span>
            <span className="sm:hidden">رجوع</span>
          </button>
        )}

        {currencyName ? (
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-xl">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">
              {currencyName}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-500 font-bold text-xs">
            V0
          </div>
        )}

        <div>
          <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
            حاسبة الفروقات السعرية
          </h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
            {currencyName ? `حسابات عملة ${currencyName} المستقلة` : 'حساب التعادل والربح/الخسارة'}
          </p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <PWAInstallButton />

        {/* Theme Toggle (Light / Dark) */}
        <ThemeToggle />

        {/* Quick Settings for default fees */}
        {onToggleSettings && (
          <button
            onClick={onToggleSettings}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              hasDefaultsSaved
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/60 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
            title="الإعدادات الافتراضية للتكاليف"
          >
            {hasDefaultsSaved ? (
              <BookmarkCheck className="w-3.5 h-3.5" />
            ) : (
              <SlidersHorizontal className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Reset inputs button */}
        <button
          onClick={onReset}
          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 hover:text-rose-500 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
          title="تفريغ خانات هذه العملة"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Window state buttons */}
        {/* Minimize (تصغير) */}
        <button
          onClick={() => onSetMode(mode === 'minimized' ? 'normal' : 'minimized')}
          className={`p-1.5 rounded-lg border transition cursor-pointer ${
            mode === 'minimized'
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
              : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/60 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
          title="تصغير"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Float mode (عائم) */}
        <button
          onClick={() => onSetMode(mode === 'floating' ? 'normal' : 'floating')}
          className={`p-1.5 rounded-lg border transition cursor-pointer ${
            mode === 'floating'
              ? 'bg-sky-500/20 text-sky-600 dark:text-sky-300 border-sky-500/40'
              : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/60 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
          title={mode === 'floating' ? 'إلغاء الوضع العائم' : 'عائم'}
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        {/* Maximize (تكبير) */}
        <button
          onClick={() => onSetMode(mode === 'maximized' ? 'normal' : 'maximized')}
          className={`p-1.5 rounded-lg border transition cursor-pointer ${
            mode === 'maximized'
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border-amber-500/40'
              : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/60 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
          }`}
          title={mode === 'maximized' ? 'استعادة الحجم العادي' : 'تكبير'}
        >
          {mode === 'maximized' ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Close (إغلاق / رجوع للوحة) */}
        <button
          onClick={onBackToDashboard ? onBackToDashboard : () => onSetMode('closed')}
          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
          title={onBackToDashboard ? 'الرجوع للوحة العملات' : 'إغلاق الواجهة'}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
