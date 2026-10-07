'use client';

import React from 'react';
import { DollarSign, Percent, AlertCircle, Clock, Target } from 'lucide-react';

export interface TrackedPricePoints {
  baselinePrice?: string;
  peakPrice?: string;
  troughPrice?: string;
  livePrice?: string;
}

interface TradeDataSectionProps {
  entryPrice: string;
  onChangeEntryPrice: (val: string) => void;
  tradeAmount: string;
  onChangeTradeAmount: (val: string) => void;
  coinQuantity?: string;
  onChangeCoinQuantity?: (val: string) => void;
  currencyName?: string;
  entryFeePercent: string;
  onChangeEntryFeePercent: (val: string) => void;
  exitFeePercent: string;
  onChangeExitFeePercent: (val: string) => void;
  entryFeeFixed: string;
  onChangeEntryFeeFixed: (val: string) => void;
  exitFeeFixed: string;
  onChangeExitFeeFixed: (val: string) => void;
  errorMessage?: string;
  trackedPoints?: TrackedPricePoints;
  onAddTestPriceWithVal?: (val: string) => void;
}

export const TradeDataSection: React.FC<TradeDataSectionProps> = ({
  entryPrice,
  onChangeEntryPrice,
  tradeAmount,
  onChangeTradeAmount,
  coinQuantity,
  onChangeCoinQuantity,
  currencyName,
  entryFeePercent,
  onChangeEntryFeePercent,
  exitFeePercent,
  onChangeExitFeePercent,
  entryFeeFixed,
  onChangeEntryFeeFixed,
  exitFeeFixed,
  onChangeExitFeeFixed,
  errorMessage,
  trackedPoints,
  onAddTestPriceWithVal,
}) => {
  const hasPercent = entryFeePercent.trim() !== '' || exitFeePercent.trim() !== '';
  const hasFixed = entryFeeFixed.trim() !== '' || exitFeeFixed.trim() !== '';

  const hasAnyTrackedPoint = Boolean(
    trackedPoints && (trackedPoints.baselinePrice || trackedPoints.peakPrice || trackedPoints.troughPrice || trackedPoints.livePrice)
  );

  return (
    <section className="space-y-3.5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          بيانات الصفقة
        </h2>

        {/* Dynamic track status indicator */}
        <div className="flex items-center gap-1">
          {hasPercent && hasFixed ? (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-500/30">
              مساران مستقلان للمقارنة
            </span>
          ) : hasPercent ? (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              مسار النسبة فقط
            </span>
          ) : hasFixed ? (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              مسار المبلغ فقط
            </span>
          ) : null}
        </div>
      </div>

      {/* Tracked Points Quick Import Strip */}
      {hasAnyTrackedPoint && trackedPoints && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] animate-in fade-in">
          <span className="text-amber-800 dark:text-amber-300 font-bold flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-500" />
            <span>سجل الرصد:</span>
          </span>

          {trackedPoints.baselinePrice && (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-amber-500/30 rounded-lg px-2 py-0.5 font-mono shadow-xs">
              <span className="text-amber-600 dark:text-amber-400 font-bold">الرصد: {trackedPoints.baselinePrice}</span>
              <button
                type="button"
                onClick={() => onChangeEntryPrice(trackedPoints.baselinePrice!)}
                className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 cursor-pointer"
                title="استخدام سعر الرصد كسعر دخول"
              >
                دخول
              </button>
              {onAddTestPriceWithVal && (
                <button
                  type="button"
                  onClick={() => onAddTestPriceWithVal(trackedPoints.baselinePrice!)}
                  className="text-[10px] px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 cursor-pointer"
                  title="إضافة سعر الرصد كهدف اختبار"
                >
                  اختبار
                </button>
              )}
            </div>
          )}

          {trackedPoints.peakPrice && (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-lg px-2 py-0.5 font-mono shadow-xs">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">القمة: {trackedPoints.peakPrice}</span>
              <button
                type="button"
                onClick={() => onChangeEntryPrice(trackedPoints.peakPrice!)}
                className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 cursor-pointer"
                title="استخدام القمة كسعر دخول"
              >
                دخول
              </button>
              {onAddTestPriceWithVal && (
                <button
                  type="button"
                  onClick={() => onAddTestPriceWithVal(trackedPoints.peakPrice!)}
                  className="text-[10px] px-1 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
                  title="إضافة القمة كهدف ربح في قائمة الاختبار"
                >
                  اختبار
                </button>
              )}
            </div>
          )}

          {trackedPoints.troughPrice && (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-rose-500/30 rounded-lg px-2 py-0.5 font-mono shadow-xs">
              <span className="text-rose-600 dark:text-rose-400 font-bold">القاع: {trackedPoints.troughPrice}</span>
              <button
                type="button"
                onClick={() => onChangeEntryPrice(trackedPoints.troughPrice!)}
                className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 hover:bg-amber-500/30 cursor-pointer"
                title="استخدام القاع كسعر دخول"
              >
                دخول
              </button>
              {onAddTestPriceWithVal && (
                <button
                  type="button"
                  onClick={() => onAddTestPriceWithVal(trackedPoints.troughPrice!)}
                  className="text-[10px] px-1 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/30 cursor-pointer"
                  title="إضافة القاع كهدف اختبار"
                >
                  اختبار
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Primary Inputs Grid: Entry Price & Trade Amount & Coin Quantity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {/* Entry Price */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block text-right">
            سعر الدخول <span className="text-amber-500 font-bold">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              placeholder="مثال: 0.03152 أو 0.00000123"
              value={entryPrice}
              onChange={(e) => onChangeEntryPrice(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition text-left font-mono"
              dir="ltr"
            />
          </div>
          <span className="text-[9px] text-slate-400 dark:text-slate-500 block text-right">
            يقبل أي عدد من المنازل العشرية الصغيرة
          </span>
        </div>

        {/* Trade Amount in USDT */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block text-right">
            مبلغ الصفقة (USDT) <span className="text-amber-500 font-bold">*</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              inputMode="decimal"
              placeholder="مثال: 10 أو 100"
              value={tradeAmount}
              onChange={(e) => onChangeTradeAmount(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-xl pl-14 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition text-left font-mono"
              dir="ltr"
            />
            <span className="absolute left-2.5 text-[11px] font-bold text-slate-400 select-none">
              USDT
            </span>
          </div>
          <span className="text-[9px] text-slate-400 dark:text-slate-500 block text-right">
            المبلغ الإجمالي بالدولار المستثمر في الصفقة
          </span>
        </div>

        {/* Coin Quantity (Optional / Alternative for Convert & Swaps) */}
        <div className="space-y-1 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block text-right">
              كمية العملة <span className="text-amber-500 text-[10px] font-bold">(اختياري)</span>
            </label>
            <span className="text-[9px] text-slate-400">للتحويل المباشر</span>
          </div>
          <div className="relative flex items-center">
            <input
              type="text"
              inputMode="decimal"
              placeholder="مثال: 50 أو 1.5"
              value={coinQuantity || ''}
              onChange={(e) => onChangeCoinQuantity && onChangeCoinQuantity(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-xl pl-16 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition text-left font-mono"
              dir="ltr"
            />
            <span className="absolute left-2.5 text-[11px] font-bold text-slate-400 select-none max-w-[55px] truncate" title={currencyName}>
              {currencyName || 'QTY'}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 dark:text-slate-500 block text-right">
            عند إدخال الكمية يُحسب مبلغ الـ USDT تلقائياً
          </span>
        </div>
      </div>

      {/* Cost Inputs: Entry Fee & Exit Fee */}
      <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            تكاليف التداول (الدخول والخروج)
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400">
            أدخل النسبة (%) أو المبلغ الثابت (USDT) أو كليهما
          </span>
        </div>

        {/* Entry Cost Row */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 block text-right">
            تكلفة الدخول (Buy Fee)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {/* Percentage */}
            <div className="relative flex items-center">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.0%"
                value={entryFeePercent}
                onChange={(e) => onChangeEntryFeePercent(e.target.value)}
                className="w-full bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 text-left font-mono"
                dir="ltr"
              />
              <span className="absolute left-2 text-slate-400 select-none">
                <Percent className="w-3 h-3" />
              </span>
            </div>
            {/* Fixed Amount */}
            <div className="relative flex items-center">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00 USDT"
                value={entryFeeFixed}
                onChange={(e) => onChangeEntryFeeFixed(e.target.value)}
                className="w-full bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 text-left font-mono"
                dir="ltr"
              />
              <span className="absolute left-2 text-slate-400 select-none">
                <DollarSign className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Exit Cost Row */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-500 dark:text-slate-400 block text-right">
            تكلفة الخروج (Sell Fee)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {/* Percentage */}
            <div className="relative flex items-center">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.0%"
                value={exitFeePercent}
                onChange={(e) => onChangeExitFeePercent(e.target.value)}
                className="w-full bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 text-left font-mono"
                dir="ltr"
              />
              <span className="absolute left-2 text-slate-400 select-none">
                <Percent className="w-3 h-3" />
              </span>
            </div>
            {/* Fixed Amount */}
            <div className="relative flex items-center">
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00 USDT"
                value={exitFeeFixed}
                onChange={(e) => onChangeExitFeeFixed(e.target.value)}
                className="w-full bg-white dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 text-left font-mono"
                dir="ltr"
              />
              <span className="absolute left-2 text-slate-400 select-none">
                <DollarSign className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Input Validation Error Alert */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}
    </section>
  );
};
