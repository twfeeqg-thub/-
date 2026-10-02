'use client';

import React, { useState } from 'react';
import { X, Check, Trash2, SlidersHorizontal, Info } from 'lucide-react';

export interface DefaultFeeSettings {
  entryFeePercent: string;
  exitFeePercent: string;
  entryFeeFixed: string;
  exitFeeFixed: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: DefaultFeeSettings;
  onSaveDefaults: (settings: DefaultFeeSettings) => void;
  onClearDefaults: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSaveDefaults,
  onClearDefaults,
}) => {
  const [form, setForm] = useState<DefaultFeeSettings>({ ...currentSettings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveDefaults(form);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleClear = () => {
    onClearDefaults();
    setForm({
      entryFeePercent: '',
      exitFeePercent: '',
      entryFeeFixed: '',
      exitFeeFixed: '',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl p-5 text-right flex flex-col gap-4 animate-in zoom-in-95 duration-150"
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              التكاليف الافتراضية الثابتة
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            تُحفظ تكاليف الدخول والخروج فقط لملئها تلقائياً عند فتح حاسبة أي عملة. لا يتم حفظ أسعار العملات أو مبالغ الصفقات تلقائياً.
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          {/* Default Percentage Fees */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              النسب المئوية الافتراضية (%)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
                  دخول (%)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="مثال: 0.1"
                  value={form.entryFeePercent}
                  onChange={(e) => setForm({ ...form, entryFeePercent: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 text-left font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
                  خروج (%)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="مثال: 0.1"
                  value={form.exitFeePercent}
                  onChange={(e) => setForm({ ...form, exitFeePercent: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 text-left font-mono"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Default Fixed Fees */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              المبالغ الثابتة الافتراضية (USDT)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
                  دخول (USDT)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="مثال: 0.05"
                  value={form.entryFeeFixed}
                  onChange={(e) => setForm({ ...form, entryFeeFixed: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 text-left font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
                  خروج (USDT)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="مثال: 0.05"
                  value={form.exitFeeFixed}
                  onChange={(e) => setForm({ ...form, exitFeeFixed: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 text-left font-mono"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition cursor-pointer active:scale-95"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  تم الحفظ بنجاح
                </>
              ) : (
                'حفظ كافتراضي'
              )}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
              title="مسح الإعدادات الافتراضية"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
