'use client';

import React from 'react';
import { X, Check, Palette, Laptop, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { AccentColor } from '@/types/currency';

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeCustomizerModal: React.FC<ThemeCustomizerModalProps> = ({ isOpen, onClose }) => {
  const { themeMode, setThemeMode, accentColor, setAccentColor, resolvedTheme } = useTheme();

  if (!isOpen) return null;

  const accentOptions: { key: AccentColor; name: string; desc: string; bgClass: string; ringClass: string }[] = [
    { 
      key: 'amber', 
      name: 'ذهبي Binance الأصلي', 
      desc: 'المظهر الكلاسيكي الفاخر لمنصة بينانس والعملات الرقمية', 
      bgClass: 'bg-amber-500',
      ringClass: 'ring-amber-500',
    },
    { 
      key: 'emerald', 
      name: 'أخضر زمردي (صعود Bullish)', 
      desc: 'طابع التداول الصاعد والشموع الخضراء المتفائلة', 
      bgClass: 'bg-emerald-500',
      ringClass: 'ring-emerald-500',
    },
    { 
      key: 'cyan', 
      name: 'أزرق سيبراني (Cyber Cyan)', 
      desc: 'ألوان مستقبلية مريحة وعالية التركيز للشاشات الطويلة', 
      bgClass: 'bg-cyan-500',
      ringClass: 'ring-cyan-500',
    },
    { 
      key: 'violet', 
      name: 'بنفسجي عصري (Crypto Violet)', 
      desc: 'أناقة داكنة عصرية مستوحاة من أحدث منصات Web3', 
      bgClass: 'bg-violet-500',
      ringClass: 'ring-violet-500',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 text-right flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                تخصيص مظهر التطبيق وألوان الثيم
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                اختر وضع العرض ولون الثيم المفضل لديك
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Display Mode (وضع العرض) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
            <span>وضع الإضاءة:</span>
            <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
              {themeMode === 'system' ? `تلقائي (${resolvedTheme === 'dark' ? 'داكن' : 'فاتح'})` : themeMode === 'dark' ? 'داكن' : 'فاتح'}
            </span>
          </label>

          <div className="grid grid-cols-3 gap-2">
            {/* System */}
            <button
              type="button"
              onClick={() => setThemeMode('system')}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                themeMode === 'system'
                  ? 'bg-amber-500/15 border-amber-500 text-slate-900 dark:text-slate-100 ring-2 ring-amber-500/40 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Laptop className="w-5 h-5 text-sky-400" />
              <span className="text-xs font-bold">تلقائي</span>
              <span className="text-[10px] text-slate-400">حسب النظام</span>
            </button>

            {/* Dark */}
            <button
              type="button"
              onClick={() => setThemeMode('dark')}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                themeMode === 'dark'
                  ? 'bg-amber-500/15 border-amber-500 text-slate-900 dark:text-slate-100 ring-2 ring-amber-500/40 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Moon className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold">داكن</span>
              <span className="text-[10px] text-slate-400">مريح للعين</span>
            </button>

            {/* Light */}
            <button
              type="button"
              onClick={() => setThemeMode('light')}
              className={`p-3 rounded-xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                themeMode === 'light'
                  ? 'bg-amber-500/15 border-amber-500 text-slate-900 dark:text-slate-100 ring-2 ring-amber-500/40 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <Sun className="w-5 h-5 text-amber-500" />
              <span className="text-xs font-bold">فاتح</span>
              <span className="text-[10px] text-slate-400">عالي التباين</span>
            </button>
          </div>
        </div>

        {/* Section 2: Accent Color Themes (لون الثيم المفضل) */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
            لون الثيم المفضل للحاسبة والأزرار:
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {accentOptions.map((opt) => {
              const isSelected = accentColor === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setAccentColor(opt.key)}
                  className={`p-3 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500 shadow-sm ring-2 ring-amber-500/40'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full ${opt.bgClass} shadow-xs shrink-0 ring-2 ring-white dark:ring-slate-900`}></span>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {opt.name}
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-500 shrink-0" />}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {opt.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer active:scale-95 shadow-md shadow-amber-500/20"
          >
            تطبيق وإغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
