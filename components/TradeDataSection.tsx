'use client';

import React from 'react';
import { DollarSign, Percent, AlertCircle } from 'lucide-react';

interface TradeDataSectionProps {
  entryPrice: string;
  onChangeEntryPrice: (val: string) => void;
  tradeAmount: string;
  onChangeTradeAmount: (val: string) => void;
  entryFeePercent: string;
  onChangeEntryFeePercent: (val: string) => void;
  exitFeePercent: string;
  onChangeExitFeePercent: (val: string) => void;
  entryFeeFixed: string;
  onChangeEntryFeeFixed: (val: string) => void;
  exitFeeFixed: string;
  onChangeExitFeeFixed: (val: string) => void;
  errorMessage?: string;
}

export const TradeDataSection: React.FC<TradeDataSectionProps> = ({
  entryPrice,
  onChangeEntryPrice,
  tradeAmount,
  onChangeTradeAmount,
  entryFeePercent,
  onChangeEntryFeePercent,
  exitFeePercent,
  onChangeExitFeePercent,
  entryFeeFixed,
  onChangeEntryFeeFixed,
  exitFeeFixed,
  onChangeExitFeeFixed,
  errorMessage,
}) => {
  const hasPercent = entryFeePercent.trim() !== '' || exitFeePercent.trim() !== '';
  const hasFixed = entryFeeFixed.trim() !== '' || exitFeeFixed.trim() !== '';

  return (
    <section className="space-y-3.5">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
          بيانات الصفقة
        </h2>

        {/* Dynamic track status indicator */}
        <div className="flex items-center gap-1">
          {hasPercent && hasFixed ? (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30">
              مساران مستقلان للمقارنة
            </span>
          ) : hasPercent ? (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              مسار النسبة فقط
            </span>
          ) : hasFixed ? (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              مسار المبلغ فقط
            </span>
          ) : null}
        </div>
      </div>

      {/* Primary Inputs Grid: Entry Price & Trade Amount */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Entry Price */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-300 block text-right">
            سعر الدخول <span className="text-amber-400 font-bold">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              placeholder="مثال: 0.03152 أو 0.00000123"
              value={entryPrice}
              onChange={(e) => onChangeEntryPrice(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition text-left font-mono"
              dir="ltr"
            />
          </div>
          <span className="text-[9px] text-slate-500 block text-right">
            يقبل أي عدد من المنازل العشرية الصغيرة
          </span>
        </div>

        {/* Trade Amount in USDT */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-300 block text-right">
            مبلغ الصفقة (USDT) <span className="text-amber-400 font-bold">*</span>
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              inputMode="decimal"
              placeholder="مثال: 10 أو 100"
              value={tradeAmount}
              onChange={(e) => onChangeTradeAmount(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-14 pr-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition text-left font-mono"
              dir="ltr"
            />
            <span className="absolute left-2.5 text-[11px] font-bold text-slate-400 select-none">
              USDT
            </span>
          </div>
          <span className="text-[9px] text-slate-500 block text-right">
            تُشتق كمية العملة تلقائياً دون إدخالها
          </span>
        </div>
      </div>

      {/* Cost Inputs: Entry Fee & Exit Fee */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-300">
            تكاليف التداول (الدخول والخروج)
          </span>
          <span className="text-[9px] text-slate-400">
            أدخل النسبة (%) أو المبلغ الثابت (USDT) أو كليهما
          </span>
        </div>

        {/* Entry Cost Row */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 block text-right">
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
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 text-left font-mono"
                dir="ltr"
              />
              <span className="absolute left-2 text-slate-500 select-none">
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
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 text-left font-mono"
                dir="ltr"
              />
              <span className="absolute left-2 text-slate-500 select-none">
                <DollarSign className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Exit Cost Row */}
        <div className="space-y-1">
          <label className="text-[10px] text-slate-400 block text-right">
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
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 text-left font-mono"
                dir="ltr"
              />
              <span className="absolute left-2 text-slate-500 select-none">
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
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-7 pr-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 text-left font-mono"
                dir="ltr"
              />
              <span className="absolute left-2 text-slate-500 select-none">
                <DollarSign className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Input Validation Error Alert */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}
    </section>
  );
};
