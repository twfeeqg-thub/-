'use client';

import React, { useState, useMemo } from 'react';
import { CurrencyItem } from '@/types/currency';
import { calculateAll, formatCompactPrice, formatPercent, trimTrailingZeros } from '@/lib/calculator';
import { 
  X, 
  ArrowLeftRight, 
  CheckSquare, 
  Square, 
  ShieldCheck, 
  Zap, 
  Calculator, 
  TrendingUp, 
  Coins, 
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface BreakEvenComparisonDrawerProps {
  isOpen: boolean;
  currencies: CurrencyItem[];
  livePrices?: Record<string, string>;
  onClose: () => void;
  onSelectCurrencyForCalculator: (id: string) => void;
}

export const BreakEvenComparisonDrawer: React.FC<BreakEvenComparisonDrawerProps> = ({
  isOpen,
  currencies,
  livePrices = {},
  onClose,
  onSelectCurrencyForCalculator,
}) => {
  // Selected currency IDs for comparison (default to first 2-3 currencies)
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    return currencies.slice(0, 3).map((c) => c.id);
  });

  const toggleSelectCurrency = (id: string) => {
    setSelectedIds((prev) => 
      prev.includes(id) 
        ? (prev.length > 1 ? prev.filter((i) => i !== id) : prev) 
        : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(currencies.map((c) => c.id));
  };

  // Compare calculations
  const comparisonItems = useMemo(() => {
    return selectedIds.map((id) => {
      const curr = currencies.find((c) => c.id === id);
      if (!curr) return null;

      const calc = calculateAll({
        entryPrice: curr.entryPrice,
        tradeAmount: curr.tradeAmount,
        coinQuantity: curr.coinQuantity,
        entryFeePercent: curr.entryFeePercent,
        exitFeePercent: curr.exitFeePercent,
        entryFeeFixed: curr.entryFeeFixed,
        exitFeeFixed: curr.exitFeeFixed,
        feeMethod: curr.feeMethod || 'cumulative',
      }, ['']);

      const entryNum = parseFloat(curr.entryPrice) || 0;
      const beNum = calc.percentTrack.breakEvenPrice || calc.fixedTrack.breakEvenPrice || 0;
      const pctToBE = entryNum > 0 && beNum > 0 ? ((beNum - entryNum) / entryNum) * 100 : 0;
      const pair = curr.binanceSymbol || `${curr.name}USDT`;
      const currentLive = livePrices[pair] ? parseFloat(livePrices[pair]) : null;

      // Net profit at +2% target simulation
      const qty = calc.percentTrack.quantity || calc.fixedTrack.quantity || 0;
      const simTargetPrice = entryNum * 1.02;
      const simExitGross = simTargetPrice * qty;
      const sellFeePercent = parseFloat(curr.exitFeePercent || '0.1') || 0.1;
      const simNetExit = simExitGross * (1 - sellFeePercent / 100);
      const initialInvested = parseFloat(curr.tradeAmount) || (entryNum * qty);
      const simNetProfit2pct = simNetExit - initialInvested;

      return {
        currency: curr,
        calc,
        entryNum,
        beNum,
        pctToBE,
        currentLive,
        qty,
        simNetProfit2pct,
      };
    }).filter(Boolean) as Array<{
      currency: CurrencyItem;
      calc: ReturnType<typeof calculateAll>;
      entryNum: number;
      beNum: number;
      pctToBE: number;
      currentLive: number | null;
      qty: number;
      simNetProfit2pct: number;
    }>;
  }, [selectedIds, currencies, livePrices]);

  // Find the currency with the lowest BE distance (% to BE)
  const bestBeDistanceId = useMemo(() => {
    let min = Infinity;
    let bestId: string | null = null;
    comparisonItems.forEach((item) => {
      if (item.pctToBE > 0 && item.pctToBE < min) {
        min = item.pctToBE;
        bestId = item.currency.id;
      }
    });
    return bestId;
  }, [comparisonItems]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 my-auto max-h-[92vh] overflow-y-auto"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                  جدول مقارنة أسعار التعادل والفروقات
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-bold">
                  {selectedIds.length} عملات محددة
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                قارن أسعار التعادل وهوامش الأرباح جنباً إلى جنب لتحديد الصفقة الأسهل وصولاً للربحية
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currency Selector Chips */}
        <div className="py-3 flex flex-wrap items-center gap-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
          <span className="text-xs text-slate-500 font-bold ml-1">اختر العملات للمقارنة:</span>
          {currencies.map((curr) => {
            const isSelected = selectedIds.includes(curr.id);
            return (
              <button
                key={curr.id}
                type="button"
                onClick={() => toggleSelectCurrency(curr.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer border ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                }`}
              >
                {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                <span>{curr.name}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={selectAll}
            className="text-xs font-bold text-amber-500 hover:underline px-2 cursor-pointer mr-auto"
          >
            تحديد الكل
          </button>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto py-4">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                <th className="py-2.5 px-3 font-medium">العملة والبيانات</th>
                <th className="py-2.5 px-3 font-medium">سعر الدخول</th>
                <th className="py-2.5 px-3 font-medium">رأس المال / الكمية</th>
                <th className="py-2.5 px-3 font-medium text-amber-500 font-bold">سعر التعادل (BE)</th>
                <th className="py-2.5 px-3 font-medium">الصعود المطلوب للتعادل</th>
                <th className="py-2.5 px-3 font-medium">عائد افتراضي (+2%)</th>
                <th className="py-2.5 px-3 font-medium text-center">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
              {comparisonItems.map((item) => {
                const isBest = item.currency.id === bestBeDistanceId;
                return (
                  <tr 
                    key={item.currency.id}
                    className={`transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${
                      isBest ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    {/* Currency Name & Badge */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                          {item.currency.name}
                        </span>
                        {isBest && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.2 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 font-bold">
                            <Sparkles className="w-3 h-3" />
                            الأسهل تعادلاً
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {item.currency.feeMethod === 'separate' ? 'رسوم منفصلة' : 'رسوم تراكمية'} ({item.currency.entryFeePercent || '0.1'}% / {item.currency.exitFeePercent || '0.1'}%)
                      </div>
                    </td>

                    {/* Entry Price */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                      {item.entryNum > 0 ? trimTrailingZeros(item.entryNum.toString()) : '—'}
                    </td>

                    {/* Capital & Quantity */}
                    <td className="py-3 px-3 font-mono">
                      <div>${item.currency.tradeAmount || '100'} USDT</div>
                      {item.qty > 0 && (
                        <div className="text-[10px] text-slate-400 mt-0.5" dir="ltr">
                          كمية: {trimTrailingZeros(item.qty.toFixed(4))}
                        </div>
                      )}
                    </td>

                    {/* Break-Even Price */}
                    <td className="py-3 px-3 font-mono font-bold text-base text-amber-500" dir="ltr">
                      {item.beNum > 0 ? trimTrailingZeros(item.beNum.toString()) : '—'}
                    </td>

                    {/* % to BE */}
                    <td className="py-3 px-3 font-mono font-bold" dir="ltr">
                      {item.pctToBE > 0 ? (
                        <span className={`px-2 py-0.5 rounded-md ${
                          item.pctToBE <= 0.25 
                            ? 'bg-emerald-500/15 text-emerald-400' 
                            : 'bg-amber-500/15 text-amber-400'
                        }`}>
                          +{item.pctToBE.toFixed(2)}%
                        </span>
                      ) : '—'}
                    </td>

                    {/* Simulated Profit at +2% */}
                    <td className="py-3 px-3 font-mono" dir="ltr">
                      {item.simNetProfit2pct > 0 ? (
                        <span className="text-emerald-500 font-bold">
                          +{item.simNetProfit2pct.toFixed(2)} $
                        </span>
                      ) : '—'}
                    </td>

                    {/* Open in Calculator */}
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCurrencyForCalculator(item.currency.id);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 font-bold transition flex items-center justify-center gap-1 mx-auto cursor-pointer"
                        title="فتح في الحاسبة الفردية"
                      >
                        <Calculator className="w-3.5 h-3.5" />
                        <span>فتح</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            💡 العملة التي تتطلب نسبة صعود أقل للتعادل تمنحك حماية أسرع لرأس المال مع انخفاض المخاطرة.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
