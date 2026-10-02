'use client';

import React from 'react';
import { 
  Plus, 
  Trash2, 
  ArrowUpRight,
  ArrowDownRight,
  Equal
} from 'lucide-react';
import { 
  CalculationTrackResult, 
  formatPercent, 
  formatUSDT 
} from '@/lib/calculator';

interface TestPricesSectionProps {
  testPrices: string[];
  onChangeTestPrice: (index: number, val: string) => void;
  onAddTestPrice: () => void;
  onRemoveTestPrice: (index: number) => void;
  percentTrack: CalculationTrackResult;
  fixedTrack: CalculationTrackResult;
}

export const TestPricesSection: React.FC<TestPricesSectionProps> = ({
  testPrices,
  onChangeTestPrice,
  onAddTestPrice,
  onRemoveTestPrice,
  percentTrack,
  fixedTrack,
}) => {
  const canAddMore = testPrices.length < 5;
  const showPercentResults = percentTrack.hasTrack && percentTrack.isValid;
  const showFixedResults = fixedTrack.hasTrack && fixedTrack.isValid;

  const renderStatusBadge = (status: 'profit' | 'loss' | 'breakeven') => {
    switch (status) {
      case 'profit':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            <ArrowUpRight className="w-3 h-3" />
            ربح
          </span>
        );
      case 'loss':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full">
            <ArrowDownRight className="w-3 h-3" />
            خسارة
          </span>
        );
      case 'breakeven':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
            <Equal className="w-3 h-3" />
            تعادل
          </span>
        );
    }
  };

  const getStatusCardClasses = (status: 'profit' | 'loss' | 'breakeven') => {
    switch (status) {
      case 'profit':
        return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300';
      case 'loss':
        return 'border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300';
      case 'breakeven':
        return 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300';
    }
  };

  return (
    <section className="space-y-3.5">
      {/* Header and Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            أسعار الاختبار (اختياري)
          </h2>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            ({testPrices.length}/5)
          </span>
        </div>

        {canAddMore && (
          <button
            type="button"
            onClick={onAddTestPrice}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30 text-xs font-medium hover:bg-sky-500/25 transition cursor-pointer active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة سعر اختبار</span>
          </button>
        )}
      </div>

      {/* Test Price Inputs & Linked Results */}
      <div className="space-y-3">
        {testPrices.map((price, idx) => {
          const trimmedPrice = price.trim();
          const hasEnteredPrice = trimmedPrice !== '' && !isNaN(parseFloat(trimmedPrice));
          
          // Find calculation results for this test price
          const percentRes = showPercentResults
            ? percentTrack.testResults.find((r) => r.price === trimmedPrice)
            : undefined;

          const fixedRes = showFixedResults
            ? fixedTrack.testResults.find((r) => r.price === trimmedPrice)
            : undefined;

          return (
            <div 
              key={idx}
              className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 space-y-2.5 transition-all"
            >
              {/* Input Row */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 shrink-0 min-w-[90px]">
                  سعر الاختبار {idx + 1}:
                </span>

                <div className="relative flex-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="مثال: 0.03180"
                    value={price}
                    onChange={(e) => onChangeTestPrice(idx, e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>

                {/* Delete button (available if there are more than 1, or always so user can clear/remove) */}
                {testPrices.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveTestPrice(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    title={`حذف سعر الاختبار ${idx + 1}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Linked Results for this test price */}
              {hasEnteredPrice && (showPercentResults || showFixedResults) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800/80">
                  {/* Percent Track Result Card */}
                  {showPercentResults && percentRes && (
                    <div className={`rounded-xl border p-2.5 text-right transition ${getStatusCardClasses(percentRes.status)}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold">
                          حسب النسبة (%)
                        </span>
                        {renderStatusBadge(percentRes.status)}
                      </div>

                      <div className="flex items-baseline justify-between gap-2 mt-1">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">الربح/الخسارة:</span>
                        <div className="text-left font-mono font-bold text-sm tracking-tight" dir="ltr">
                          <span className={percentRes.netPnL > 0 ? 'text-emerald-600 dark:text-emerald-400' : percentRes.netPnL < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}>
                            {percentRes.netPnL > 0 ? '+' : ''}{formatUSDT(percentRes.netPnL)} USDT
                          </span>
                        </div>
                      </div>

                      <div className="flex items-baseline justify-between gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">النسبة المئوية:</span>
                        <div className="text-left font-mono font-bold text-xs" dir="ltr">
                          <span className={percentRes.pnlPercent > 0 ? 'text-emerald-600 dark:text-emerald-400' : percentRes.pnlPercent < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}>
                            {formatPercent(percentRes.pnlPercent)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fixed Track Result Card */}
                  {showFixedResults && fixedRes && (
                    <div className={`rounded-xl border p-2.5 text-right transition ${getStatusCardClasses(fixedRes.status)}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold">
                          حسب المبلغ (USDT)
                        </span>
                        {renderStatusBadge(fixedRes.status)}
                      </div>

                      <div className="flex items-baseline justify-between gap-2 mt-1">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">الربح/الخسارة:</span>
                        <div className="text-left font-mono font-bold text-sm tracking-tight" dir="ltr">
                          <span className={fixedRes.netPnL > 0 ? 'text-emerald-600 dark:text-emerald-400' : fixedRes.netPnL < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}>
                            {fixedRes.netPnL > 0 ? '+' : ''}{formatUSDT(fixedRes.netPnL)} USDT
                          </span>
                        </div>
                      </div>

                      <div className="flex items-baseline justify-between gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">النسبة المئوية:</span>
                        <div className="text-left font-mono font-bold text-xs" dir="ltr">
                          <span className={fixedRes.pnlPercent > 0 ? 'text-emerald-600 dark:text-emerald-400' : fixedRes.pnlPercent < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}>
                            {formatPercent(fixedRes.pnlPercent)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
