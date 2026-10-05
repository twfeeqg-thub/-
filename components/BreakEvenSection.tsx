'use client';

import React from 'react';
import { CalculationTrackResult, formatCurrencyPrice } from '@/lib/calculator';
import { Target, AlertTriangle } from 'lucide-react';

interface BreakEvenSectionProps {
  hasValidBase: boolean;
  percentTrack: CalculationTrackResult;
  fixedTrack: CalculationTrackResult;
  feeMethod?: 'cumulative' | 'separate';
}

export const BreakEvenSection: React.FC<BreakEvenSectionProps> = ({
  hasValidBase,
  percentTrack,
  fixedTrack,
  feeMethod = 'cumulative',
}) => {
  const showPercent = percentTrack.hasTrack;
  const showFixed = fixedTrack.hasTrack;

  if (!hasValidBase) {
    return (
      <section className="bg-slate-100/60 dark:bg-slate-900/30 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-4 text-center">
        <div className="flex flex-col items-center justify-center gap-1 text-slate-500 dark:text-slate-400">
          <Target className="w-5 h-5 text-slate-400 dark:text-slate-600" />
          <p className="text-xs">أدخل سعر الدخول ومبلغ الصفقة لحساب سعر التعادل</p>
        </div>
      </section>
    );
  }

  // If user entered valid base but hasn't entered any fee yet
  if (!showPercent && !showFixed) {
    return (
      <section className="bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          أدخل تكلفة الدخول أو الخروج (نسبة % أو مبلغ USDT) لإظهار سعر التعادل
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-amber-500" />
          <span>سعر التعادل (Break-Even)</span>
          <span className="text-[10px] font-normal px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-300 border border-amber-500/20">
            {feeMethod === 'separate' ? 'حساب منفصل' : 'حساب تراكمي'}
          </span>
        </h2>
        <span className="text-[10px] text-amber-700 dark:text-amber-400/80 font-medium">
          الحد الأدنى لتغطية التكاليف
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Percentage Track Break-Even Card */}
        {showPercent && (
          <div className="relative overflow-hidden rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 p-3.5 text-right shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                سعر التعادل حسب النسبة (%)
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono">
                {feeMethod === 'separate' ? 'نسبة منفصلة' : 'نسبة تراكمية'}
              </span>
            </div>

            {percentTrack.isValid ? (
              <>
                <div 
                  className="text-xl sm:text-2xl font-mono font-extrabold text-amber-600 dark:text-amber-400 tracking-tight select-all py-0.5 text-left"
                  dir="ltr"
                >
                  {formatCurrencyPrice(percentTrack.breakEvenPrice)}
                </div>

                <div className="mt-2 pt-2 border-t border-amber-500/20 flex items-center justify-between text-[10px] text-amber-700/80 dark:text-amber-300/80 font-mono">
                  <span>
                    {feeMethod === 'separate' ? 'الكمية المشتراة (كاملة):' : 'الكمية المشتراة بعد الخصم:'}
                  </span>
                  <span dir="ltr">{formatCurrencyPrice(percentTrack.quantity)}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 text-xs py-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{percentTrack.errorMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Fixed Amount Track Break-Even Card */}
        {showFixed && (
          <div className="relative overflow-hidden rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 p-3.5 text-right shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
                سعر التعادل حسب المبلغ (USDT)
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono">
                {feeMethod === 'separate' ? 'مبلغ منفصل' : 'مبلغ تراكمي'}
              </span>
            </div>

            {fixedTrack.isValid ? (
              <>
                <div 
                  className="text-xl sm:text-2xl font-mono font-extrabold text-amber-600 dark:text-amber-400 tracking-tight select-all py-0.5 text-left"
                  dir="ltr"
                >
                  {formatCurrencyPrice(fixedTrack.breakEvenPrice)}
                </div>

                <div className="mt-2 pt-2 border-t border-amber-500/20 flex items-center justify-between text-[10px] text-amber-700/80 dark:text-amber-300/80 font-mono">
                  <span>
                    {feeMethod === 'separate' ? 'الكمية المشتراة (كاملة):' : 'الكمية المشتراة بعد الخصم:'}
                  </span>
                  <span dir="ltr">{formatCurrencyPrice(fixedTrack.quantity)}</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-rose-500 dark:text-rose-400 text-xs py-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{fixedTrack.errorMessage}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
