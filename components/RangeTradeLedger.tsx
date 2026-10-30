'use client';

import React from 'react';
import { RangeTrackedTrade } from '@/types/rangeScalper';
import { trimTrailingZeros } from '@/lib/calculator';
import { 
  CheckCircle2, 
  Clock, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Bell, 
  BellOff, 
  Calculator, 
  RotateCcw,
  Layers,
  ArrowRight
} from 'lucide-react';

interface RangeTradeLedgerProps {
  closedTrades: RangeTrackedTrade[];
  onToggleOldTroughAlert: (tradeId: string) => void;
  onDeleteHistoryItem: (tradeId: string) => void;
  onClearAllHistory: () => void;
  onReopenTradeAtTrough: (trade: RangeTrackedTrade) => void;
  onNavigateToCalculator: (name: string, price: string) => void;
  onOpenChart: (symbol: string) => void;
}

export const RangeTradeLedger: React.FC<RangeTradeLedgerProps> = ({
  closedTrades,
  onToggleOldTroughAlert,
  onDeleteHistoryItem,
  onClearAllHistory,
  onReopenTradeAtTrough,
  onNavigateToCalculator,
  onOpenChart,
}) => {
  if (closedTrades.length === 0) {
    return null;
  }

  // Summary stats
  const totalNetPnlUsdt = closedTrades.reduce((acc, t) => {
    const val = t.realizedNetPnlUsdt !== undefined ? t.realizedNetPnlUsdt : (t.realizedPnlUsdt || 0);
    return acc + val;
  }, 0);

  const winningCount = closedTrades.filter((t) => {
    const val = t.realizedNetPnlUsdt !== undefined ? t.realizedNetPnlUsdt : (t.realizedPnlUsdt || 0);
    return val > 0;
  }).length;

  const winRate = closedTrades.length > 0 ? (winningCount / closedTrades.length) * 100 : 0;

  return (
    <div className="mt-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 sm:p-6 shadow-xs" dir="rtl">
      {/* LEDGER HEADER & STATS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
              سجل صفقات المسار العرضي المنفذة ({closedTrades.length})
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            توثيق كامل لمواعيد الدخول والخروج، وحجم المكسب الصافي، مع ميزة التنبيه عند عودة السعر لنفس القاع القديم
          </p>
        </div>

        {/* Aggregate summary badges & clear button */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold">
            <span className="text-slate-500 ml-1">نسبة النجاح:</span>
            <span className="text-emerald-500 font-black">{winRate.toFixed(1)}%</span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold ${
            totalNetPnlUsdt >= 0 ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
          }`}>
            <span className="ml-1">صافي الأرباح المحققة:</span>
            <span className="font-black">
              {totalNetPnlUsdt >= 0 ? '+' : ''}${totalNetPnlUsdt.toFixed(2)} USDT
            </span>
          </div>

          <button
            type="button"
            onClick={onClearAllHistory}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
            title="مسح السجل كاملاً"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TRADES LIST */}
      <div className="space-y-2.5">
        {closedTrades.map((item) => {
          const netUsdt = item.realizedNetPnlUsdt !== undefined ? item.realizedNetPnlUsdt : (item.realizedPnlUsdt || 0);
          const isProfit = netUsdt >= 0;
          const formatTime = (ts?: number) => {
            if (!ts) return '—';
            const d = new Date(ts);
            const h = String(d.getHours()).padStart(2, '0');
            const m = String(d.getMinutes()).padStart(2, '0');
            return `${h}:${m}`;
          };
          const entryTimeStr = formatTime(item.entryTimestamp);
          const exitTimeStr = formatTime(item.exitTimestamp);

          return (
            <div
              key={item.id}
              className="p-3 sm:p-4 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-white/40 dark:bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              {/* Coin Symbol & Duration */}
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                  isProfit ? 'bg-emerald-500/15 text-emerald-500' : 'bg-rose-500/15 text-rose-500'
                }`}>
                  {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-sm text-slate-900 dark:text-slate-100">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      فريم {item.timeframeMinutes}د
                    </span>
                    <span className="text-[10px] text-slate-400">
                      (مدة الصفقة: {item.holdingDurationMinutes || 1} دقيقة)
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono" suppressHydrationWarning>
                    شراء: ${item.entryPrice ? trimTrailingZeros(item.entryPrice.toString()) : '—'} ({entryTimeStr}) 
                    ← بيع: ${item.exitPrice ? trimTrailingZeros(item.exitPrice.toString()) : '—'} ({exitTimeStr})
                  </div>
                </div>
              </div>

              {/* Profit / Loss Metrics & Repeat Alert Toggle */}
              <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60 dark:border-slate-800/60">
                {/* Realized Amount and Percent */}
                <div className="text-right sm:text-left" dir="ltr">
                  <div className={`font-mono font-black text-sm ${isProfit ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {isProfit ? '+' : ''}${netUsdt.toFixed(2)} USDT
                  </div>
                  <div className={`text-[11px] font-mono font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                    ({isProfit ? '+' : ''}{(item.realizedPnlPercent || 0).toFixed(2)}% صافي)
                  </div>
                </div>

                {/* Repeat Old Trough Alert Toggle */}
                <button
                  type="button"
                  onClick={() => onToggleOldTroughAlert(item.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                    item.notifyOnOldTroughReturn
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title={
                    item.notifyOnOldTroughReturn
                      ? 'التنبيه مفعل: سيتم تنبيهك فور عودة السعر لنفس القاع القديم ($' + item.troughPrice + ')'
                      : 'انقر لتفعيل تنبيه فور عودة السعر لنفس القاع القديم ($' + item.troughPrice + ')'
                  }
                >
                  {item.notifyOnOldTroughReturn ? <Bell className="w-3.5 h-3.5 text-amber-500 fill-current" /> : <BellOff className="w-3.5 h-3.5" />}
                  <span className="text-[10px]">
                    {item.notifyOnOldTroughReturn ? 'تنبيه القاع القديم (مفعل)' : 'تنبيه القاع القديم (صامت)'}
                  </span>
                </button>

                {/* Re-enter trade button */}
                <button
                  type="button"
                  onClick={() => onReopenTradeAtTrough(item)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition cursor-pointer"
                  title="إعادة مراقبة هذه العملة ونقلها للبطاقات النشطة"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[10px]">إعادة للمراقبة</span>
                </button>

                {/* Fast Hop to Calculator */}
                <button
                  type="button"
                  onClick={() => onNavigateToCalculator(item.name, (item.entryPrice || item.troughPrice).toString())}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 transition cursor-pointer"
                  title="تصدير للحاسبة"
                >
                  <Calculator className="w-3.5 h-3.5" />
                </button>

                {/* Fast Hop to Chart */}
                <button
                  type="button"
                  onClick={() => onOpenChart(item.binanceSymbol)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 transition cursor-pointer"
                  title="عرض الشارت"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                </button>

                {/* Delete history item */}
                <button
                  type="button"
                  onClick={() => onDeleteHistoryItem(item.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 transition cursor-pointer"
                  title="حذف من السجل"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
