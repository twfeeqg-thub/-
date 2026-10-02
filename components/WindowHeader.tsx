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
  BookmarkCheck
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

export type WindowMode = 'normal' | 'maximized' | 'minimized' | 'floating' | 'closed';

interface WindowHeaderProps {
  mode: WindowMode;
  onSetMode: (mode: WindowMode) => void;
  onReset: () => void;
  onToggleSettings?: () => void;
  hasDefaultsSaved?: boolean;
}

export const WindowHeader: React.FC<WindowHeaderProps> = ({
  mode,
  onSetMode,
  onReset,
  onToggleSettings,
  hasDefaultsSaved = false,
}) => {
  return (
    <header className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md select-none rounded-t-2xl">
      {/* Brand title and V0 tag */}
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs">
          V0
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-100 tracking-tight leading-tight">
            حاسبة الفروقات السعرية
          </h1>
          <p className="text-[10px] text-slate-400 hidden sm:block">
            حساب التعادل والربح/الخسارة اليدوي
          </p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        <PWAInstallButton />

        {/* Quick Settings for default fees */}
        {onToggleSettings && (
          <button
            onClick={onToggleSettings}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              hasDefaultsSaved
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-slate-800/70 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800'
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
          className="p-1.5 rounded-lg bg-slate-800/70 text-slate-400 border border-slate-700/60 hover:text-rose-300 hover:bg-rose-950/40 hover:border-rose-900/40 transition cursor-pointer"
          title="تفريغ الخانات"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Window state buttons */}
        {/* Minimize (تصغير) */}
        <button
          onClick={() => onSetMode(mode === 'minimized' ? 'normal' : 'minimized')}
          className={`p-1.5 rounded-lg border transition cursor-pointer ${
            mode === 'minimized'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800/70 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800'
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
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-slate-800/70 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800'
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
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800/70 text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title={mode === 'maximized' ? 'استعادة الحجم العادي' : 'تكبير'}
        >
          {mode === 'maximized' ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Close (إغلاق) */}
        <button
          onClick={() => onSetMode('closed')}
          className="p-1.5 rounded-lg bg-slate-800/70 text-slate-400 border border-slate-700/60 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
          title="إغلاق الواجهة"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
