'use client';

import React, { useMemo, useState } from 'react';
import { ScalpTrade } from '@/types/scalper';
import { useCurrentTimestamp } from '@/lib/time';
import { ScalperSparkline } from './ScalperSparkline';
import { ScalperMiniCalculator } from './ScalperMiniCalculator';
import { 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Maximize2, 
  TrendingDown, 
  CheckCircle2, 
  DollarSign, 
  AlertCircle,
  ExternalLink,
  Calculator
} from 'lucide-react';
import { trimTrailingZeros } from '@/lib/calculator';

interface ScalperCardProps {
  trade: ScalpTrade;
  livePrice?: string;
  onOpenDetail: (trade: ScalpTrade) => void;
  onQuickBuy: (trade: ScalpTrade, amountUsdt: number, coinQuantity?: string) => void;
  onQuickExit: (trade: ScalpTrade) => void;
  onNavigateToCalculator: (trade: ScalpTrade) => void;
}

export const ScalperCard: React.FC<ScalperCardProps> = ({
  trade,
  livePrice,
  onOpenDetail,
  onQuickBuy,
  onQuickExit,
  onNavigateToCalculator,
}) => {
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const currentTime = useCurrentTimestamp();
  const currentPriceNum = livePrice ? parseFloat(livePrice) : (trade.entryPrice ? parseFloat(trade.entryPrice) : 0);

  // Calculations for In-Trade
  const inTradeMetrics = useMemo(() => {
    if (trade.status !== 'in_trade' || !trade.entryPrice || currentPriceNum <= 0) return null;
    const entryNum = parseFloat(trade.entryPrice);
    if (isNaN(entryNum) || entryNum <= 0) return null;

    const diff = currentPriceNum - entryNum;
    const pnlPercent = (diff / entryNum) * 100;
    
    // Amount or quantity
    const allocated = trade.allocatedUsdt ? parseFloat(trade.allocatedUsdt) : 100;
    const quantity = trade.coinQuantity ? parseFloat(trade.coinQuantity) : (allocated / entryNum);
    const pnlUsdt = diff * quantity;

    // Elapsed minutes
    const effectiveNow = currentTime > 0 ? currentTime : (trade.entryTimestamp || 0);
    const elapsedMinutes = trade.entryTimestamp 
      ? Math.max(0, Math.floor((effectiveNow - trade.entryTimestamp) / 60000)) 
      : 0;

    // Peak distance
    const peakNum = trade.peakSinceEntry ? parseFloat(trade.peakSinceEntry) : entryNum;
    const dropFromPeakPercent = peakNum > 0 ? ((peakNum - currentPriceNum) / peakNum) * 100 : 0;

    return {
      pnlPercent,
      pnlUsdt,
      elapsedMinutes,
      dropFromPeakPercent: dropFromPeakPercent > 0 ? dropFromPeakPercent : 0,
      peakNum
    };
  }, [trade, currentPriceNum, currentTime]);

  // Calculations for Watching / Dip Hunter
  const dipMetrics = useMemo(() => {
    if (trade.status !== 'watching' || currentPriceNum <= 0) return null;
    const dipNum = trade.dipPrice ? parseFloat(trade.dipPrice) : currentPriceNum;
    if (isNaN(dipNum) || dipNum <= 0) return null;

    const bouncePercent = ((currentPriceNum - dipNum) / dipNum) * 100;
    const trigger = trade.bounceTriggerPercent || 0.4;
    const isBounceConfirmed = bouncePercent >= trigger;

    return {
      dipNum,
      bouncePercent,
      isBounceConfirmed,
      trigger
    };
  }, [trade, currentPriceNum]);

  return (
    <div 
      onClick={() => onOpenDetail(trade)}
      className={`group relative rounded-2xl border p-4 sm:p-5 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md ${
        trade.status === 'in_trade'
          ? (inTradeMetrics && inTradeMetrics.pnlPercent >= 0 
              ? 'bg-emerald-950/20 border-emerald-500/40 hover:border-emerald-500' 
              : 'bg-rose-950/20 border-rose-500/40 hover:border-rose-500')
          : trade.status === 'watching'
          ? (dipMetrics?.isBounceConfirmed 
              ? 'bg-amber-950/20 border-amber-500/50 hover:border-amber-400' 
              : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-amber-500/40')
          : 'bg-slate-100/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-80'
      }`}
    >
      {/* Top Header: Symbol, Status Badge & Expand Action */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${
            trade.status === 'in_trade'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : trade.status === 'watching'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
          }`}>
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                {trade.name}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">/USDT</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              {trade.binanceSymbol}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Indicator */}
          {trade.status === 'in_trade' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              صفقة مفتوحة
            </span>
          )}
          {trade.status === 'watching' && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
              dipMetrics?.isBounceConfirmed
                ? 'bg-amber-500/20 text-amber-500 dark:text-amber-300 border-amber-500/40 animate-pulse'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
            }`}>
              {dipMetrics?.isBounceConfirmed ? '🚀 ارتداد مؤكد' : '🎯 رصد القاع'}
            </span>
          )}
          {trade.status === 'closed' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <CheckCircle2 className="w-3 h-3" />
              مغلقة
            </span>
          )}

          {/* Expand Icon Button */}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail(trade);
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 transition"
            title="فتح التفاصيل الموسعة"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Metrics Section */}
      <div className="grid grid-cols-2 gap-3 py-2.5 my-1.5 border-y border-slate-200/50 dark:border-slate-800/50">
        <div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">السعر اللحظي</span>
          <span className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
            {livePrice ? trimTrailingZeros(livePrice) : '—'}
          </span>
        </div>

        {trade.status === 'in_trade' && inTradeMetrics && (
          <div className="text-left" dir="ltr">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">الربح اللحظي (P&L)</span>
            <div className={`flex items-baseline justify-end gap-1 font-mono font-bold text-base sm:text-lg ${
              inTradeMetrics.pnlPercent >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
            }`}>
              {inTradeMetrics.pnlPercent >= 0 ? '+' : ''}{inTradeMetrics.pnlPercent.toFixed(2)}%
              <span className="text-xs font-normal opacity-85">
                ({inTradeMetrics.pnlUsdt >= 0 ? '+' : ''}{inTradeMetrics.pnlUsdt.toFixed(2)} $)
              </span>
            </div>
          </div>
        )}

        {trade.status === 'watching' && (
          <div className="text-left" dir="ltr">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">الارتداد عن القاع</span>
            <div className={`flex items-center justify-end gap-1 font-mono font-bold text-base sm:text-lg ${
              (dipMetrics?.bouncePercent || 0) >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-400'
            }`}>
              {(dipMetrics?.bouncePercent || 0) >= 0 ? '+' : ''}{(dipMetrics?.bouncePercent || 0).toFixed(2)}%
            </div>
          </div>
        )}

        {trade.status === 'closed' && (
          <div className="text-left" dir="ltr">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">الربح المحقق</span>
            <div className={`font-mono font-bold text-base ${
              (trade.realizedPnlPercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {(trade.realizedPnlPercent || 0) >= 0 ? '+' : ''}{(trade.realizedPnlPercent || 0).toFixed(2)}%
              <span className="text-xs font-normal ml-1">
                ({(trade.realizedPnlUsdt || 0) >= 0 ? '+' : ''}{(trade.realizedPnlUsdt || 0).toFixed(2)} $)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mini Chart / Sparkline Section (حركة السعر مقابل القاع المرصود أو منذ الدخول) */}
      <div className="py-1 my-1">
        <ScalperSparkline
          status={trade.status}
          currentPrice={currentPriceNum}
          entryPrice={trade.entryPrice ? parseFloat(trade.entryPrice) : undefined}
          dipPrice={trade.dipPrice ? parseFloat(trade.dipPrice) : undefined}
          peakPrice={trade.peakSinceEntry ? parseFloat(trade.peakSinceEntry) : undefined}
          priceHistory={trade.priceHistory}
          height={38}
        />
      </div>

      {/* Auxiliary Details (Timer, Entry Price, Dip info) */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2.5">
        {trade.status === 'in_trade' && inTradeMetrics && (
          <>
            <div className="flex items-center gap-1.5 font-mono">
              <Clock className={`w-3.5 h-3.5 ${
                inTradeMetrics.elapsedMinutes >= 45 ? 'text-rose-400 animate-pulse' : 'text-amber-500'
              }`} />
              <span className={inTradeMetrics.elapsedMinutes >= 45 ? 'text-rose-400 font-bold' : ''}>
                {inTradeMinutesToDisplay(inTradeMetrics.elapsedMinutes)}
              </span>
              {inTradeMetrics.elapsedMinutes >= 45 && (
                <span className="text-[10px] text-rose-400 font-bold">(قارب 60د!)</span>
              )}
            </div>

            <div className="font-mono text-[11px]">
              دخول: {trade.entryPrice ? trimTrailingZeros(trade.entryPrice) : '—'}
            </div>
          </>
        )}

        {trade.status === 'watching' && (
          <>
            <div className="flex items-center gap-1 text-[11px]">
              <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
              <span>قاع: </span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {trade.dipPrice ? trimTrailingZeros(trade.dipPrice) : '—'}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span>هدف: <span className="font-mono text-amber-400">+{trade.bounceTriggerPercent || 0.4}%</span></span>
              {/* Mini calc button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCalcOpen(!isCalcOpen);
                }}
                className={`p-1 rounded-md border text-[10px] flex items-center gap-0.5 cursor-pointer ${
                  isCalcOpen ? 'bg-amber-500 text-slate-950 border-amber-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
                title="حاسبة كمية العملة"
              >
                <Calculator className="w-3 h-3" />
                <span>حاسبة</span>
              </button>
            </div>
          </>
        )}

        {trade.status === 'closed' && (
          <>
            <div className="flex items-center gap-1 text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>مدة الاحتفاظ: {trade.holdingDurationMinutes || 1} دقيقة</span>
            </div>
            <div className="text-[11px]">
              {trade.exitReason === 'manual_usdt' ? 'خروج فوري لـ USDT' : 
               trade.exitReason === 'target' ? 'تحقيق الهدف 🎯' :
               trade.exitReason === 'trailing_peak' ? 'حماية قمة الارتداد' :
               trade.exitReason === 'breakeven' ? 'خروج عند التعادل' : 'إغلاق الصفقة'}
            </div>
          </>
        )}
      </div>

      {/* Inline Mini Calculator if opened on card */}
      {isCalcOpen && trade.status === 'watching' && (
        <div 
          onClick={(e) => e.stopPropagation()} 
          className="mb-3 animate-in fade-in zoom-in-95"
        >
          <ScalperMiniCalculator
            availableCapital="1000"
            defaultPrice={livePrice || trade.dipPrice || ''}
            defaultAmount="100"
            onApply={(calcQty, amount, entryP) => {
              onQuickBuy(trade, parseFloat(amount) || 100, calcQty);
              setIsCalcOpen(false);
            }}
            onClose={() => setIsCalcOpen(false)}
          />
        </div>
      )}

      {/* Quick Action Footer Buttons */}
      <div 
        className="flex items-center gap-2 pt-2 border-t border-slate-200/40 dark:border-slate-800/40"
        onClick={(e) => e.stopPropagation()}
      >
        {trade.status === 'watching' ? (
          <>
            <button
              type="button"
              onClick={() => onQuickBuy(trade, 50)}
              className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>شراء قاع $50</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickBuy(trade, 100)}
              className="flex-1 py-1.5 px-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-1 shadow-xs cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>شراء $100</span>
            </button>
          </>
        ) : trade.status === 'in_trade' ? (
          <>
            <button
              type="button"
              onClick={() => onQuickExit(trade)}
              className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              <span>خروج فوري لـ USDT</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateToCalculator(trade)}
              className="py-2 px-2.5 rounded-xl text-xs font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1 cursor-pointer"
              title="تصدير للحاسبة وحساب التعادل"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onOpenDetail(trade)}
            className="w-full py-1.5 px-3 rounded-xl text-xs font-medium bg-slate-200/80 dark:bg-slate-800/80 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>عرض تفاصيل الصفقة والملاحظات</span>
          </button>
        )}
      </div>
    </div>
  );
};

function inTradeMinutesToDisplay(minutes: number): string {
  if (minutes < 1) return 'أقل من دقيقة';
  if (minutes < 60) return `${minutes} دقيقة`;
  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return `${hrs} س ${rem} د`;
}
