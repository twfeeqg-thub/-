'use client';

import React, { useState, useMemo } from 'react';
import { RangeTrackedTrade } from '@/types/rangeScalper';
import { trimTrailingZeros } from '@/lib/calculator';
import { calculateRangeBreakEven } from '@/lib/rangeAnalysis';
import { 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  Power, 
  Bell, 
  BellOff, 
  X, 
  Calculator, 
  ExternalLink, 
  Check, 
  DollarSign, 
  Edit3, 
  Save, 
  CheckCircle2, 
  TrendingUp, 
  Layers,
  Clock,
  ArrowRight
} from 'lucide-react';

interface RangeTradeCardProps {
  trade: RangeTrackedTrade;
  livePrice?: string;
  onUpdateTrade: (trade: RangeTrackedTrade) => void;
  onDeleteTrade: (id: string) => void;
  onToggleActive: (id: string) => void;
  onToggleAlerts: (id: string) => void;
  onOpenChart: (symbol: string) => void;
  onNavigateToCalculator: (name: string, price: string) => void;
  onNavigateToTracker: (name: string) => void;
  onNavigateToScalper: (name: string) => void;
}

export const RangeTradeCard: React.FC<RangeTradeCardProps> = ({
  trade,
  livePrice,
  onUpdateTrade,
  onDeleteTrade,
  onToggleActive,
  onToggleAlerts,
  onOpenChart,
  onNavigateToCalculator,
  onNavigateToTracker,
  onNavigateToScalper,
}) => {
  const currentPriceNum = livePrice ? parseFloat(livePrice) : trade.troughPrice;

  // Editing levels state
  const [isEditingLevels, setIsEditingLevels] = useState(false);
  const [editTrough, setEditTrough] = useState(trade.troughPrice.toString());
  const [editPeak, setEditPeak] = useState(trade.peakPrice.toString());

  // In-trade execution state
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [buyAmountUsdt, setBuyAmountUsdt] = useState('100');
  const [customEntryPrice, setCustomEntryPrice] = useState(currentPriceNum.toString());

  // Position within the channel (0% = at trough, 100% = at peak)
  const channelPositionPercent = useMemo(() => {
    if (trade.peakPrice <= trade.troughPrice || currentPriceNum <= 0) return 50;
    const ratio = ((currentPriceNum - trade.troughPrice) / (trade.peakPrice - trade.troughPrice)) * 100;
    return Math.max(0, Math.min(100, ratio));
  }, [currentPriceNum, trade.troughPrice, trade.peakPrice]);

  // Distance from trough in %
  const distFromTrough = useMemo(() => {
    if (trade.troughPrice <= 0 || currentPriceNum <= 0) return 0;
    return ((currentPriceNum - trade.troughPrice) / trade.troughPrice) * 100;
  }, [currentPriceNum, trade.troughPrice]);

  // In-trade live metrics
  const inTradeMetrics = useMemo(() => {
    if (trade.status !== 'in_trade' || !trade.entryPrice || currentPriceNum <= 0) return null;
    const entry = trade.entryPrice;
    const diff = currentPriceNum - entry;
    const pnlPercent = (diff / entry) * 100;
    const allocated = trade.allocatedUsdt || 100;
    const qty = trade.coinQuantity || (allocated / entry);
    const pnlUsdt = diff * qty;
    return { pnlPercent, pnlUsdt, qty };
  }, [trade, currentPriceNum]);

  // Save manually edited levels
  const handleSaveLevels = () => {
    const tNum = parseFloat(editTrough);
    const pNum = parseFloat(editPeak);
    if (!isNaN(tNum) && !isNaN(pNum) && pNum > tNum && tNum > 0) {
      const grossSpread = ((pNum - tNum) / tNum) * 100;
      const totalCost = trade.entryFeePercent + trade.exitFeePercent + trade.slippagePercent;
      const netMargin = grossSpread - totalCost;
      onUpdateTrade({
        ...trade,
        troughPrice: tNum,
        peakPrice: pNum,
        grossSpreadPercent: grossSpread,
        netMarginPercent: netMargin,
      });
      setIsEditingLevels(false);
    }
  };

  // Execute buy at trough
  const handleConfirmBuy = () => {
    const p = parseFloat(customEntryPrice) || currentPriceNum;
    const amt = parseFloat(buyAmountUsdt) || 100;
    const qty = p > 0 ? amt / p : 0;
    const be = calculateRangeBreakEven(p, trade.entryFeePercent, trade.exitFeePercent);

    onUpdateTrade({
      ...trade,
      status: 'in_trade',
      entryPrice: p,
      allocatedUsdt: amt,
      coinQuantity: qty,
      entryTimestamp: Date.now(),
      breakEvenPrice: be,
    });
    setIsBuyModalOpen(false);
  };

  // Execute exit and sell
  const handleConfirmSell = () => {
    if (!trade.entryPrice) return;
    const exitPrice = currentPriceNum;
    const entry = trade.entryPrice;
    const amt = trade.allocatedUsdt || 100;
    const qty = trade.coinQuantity || (amt / entry);

    const diff = exitPrice - entry;
    const pnlPercent = (diff / entry) * 100;
    const pnlUsdt = diff * qty;

    const durationMinutes = trade.entryTimestamp
      ? Math.max(1, Math.round((Date.now() - trade.entryTimestamp) / 60000))
      : 1;

    onUpdateTrade({
      ...trade,
      status: 'closed',
      exitPrice,
      exitTimestamp: Date.now(),
      realizedPnlUsdt: pnlUsdt,
      realizedPnlPercent: pnlPercent,
      holdingDurationMinutes: durationMinutes,
    });
  };

  return (
    <div 
      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-200 shadow-xs hover:shadow-md ${
        trade.isActive === false
          ? 'bg-slate-100/40 dark:bg-slate-900/40 border-slate-300/60 dark:border-slate-800/60 opacity-60'
          : trade.status === 'in_trade'
          ? (inTradeMetrics && inTradeMetrics.pnlPercent >= 0 
              ? 'bg-emerald-950/20 border-emerald-500/40' 
              : 'bg-rose-950/20 border-rose-500/40')
          : 'bg-white/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800'
      }`}
      dir="rtl"
    >
      {/* 1. CARD HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold text-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                {trade.name}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">/USDT</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              فريم {trade.timeframeMinutes} دقيقة
            </div>
          </div>
        </div>

        {/* Action Controls in Header */}
        <div className="flex items-center gap-1.5">
          {/* Status Badge */}
          {trade.isActive === false ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700">
              متوقفة
            </span>
          ) : trade.status === 'in_trade' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              صفقة نشطة
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              🎯 انتظار القاع
            </span>
          )}

          {/* Toggle Active/Pause */}
          <button
            type="button"
            onClick={() => onToggleActive(trade.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
              trade.isActive !== false
                ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title={trade.isActive !== false ? 'الصفقة مفعّلة — انقر للإيقاف المؤقت' : 'الصفقة متوقفة — انقر للتفعيل'}
          >
            <Power className="w-3 h-3" />
            <span>{trade.isActive !== false ? 'تفعيل' : 'غلق'}</span>
          </button>

          {/* Toggle Alerts (Default OFF) */}
          <button
            type="button"
            onClick={() => onToggleAlerts(trade.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
              trade.alertsEnabled
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500/30'
                : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
            title={trade.alertsEnabled ? 'تنبيهات القاع مشغلة — انقر للإغلاق' : 'تنبيهات القاع مغلقة (افتراضي) — انقر للتشغيل'}
          >
            {trade.alertsEnabled ? <Bell className="w-3 h-3 text-amber-500" /> : <BellOff className="w-3 h-3" />}
            <span>{trade.alertsEnabled ? 'تنبيه' : 'صامت'}</span>
          </button>

          {/* Delete Button (X) */}
          <button
            type="button"
            onClick={() => {
              if (confirm(`هل أنت متأكد من حذف عملة ${trade.name} من صائد القيعان؟`)) {
                onDeleteTrade(trade.id);
              }
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
            title="حذف هذه العملة من القائمة (X)"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* 2. PRICE & CHANNEL PROGRESS GAUGES */}
      <div className="py-2.5 my-2 border-y border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">السعر اللحظي المباشر</span>
            <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-slate-50">
              ${livePrice ? trimTrailingZeros(livePrice) : trimTrailingZeros(trade.troughPrice.toString())}
            </span>
          </div>

          <div className="text-left" dir="ltr">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">المسافة عن القاع</span>
            <span className={`text-xs sm:text-sm font-mono font-bold ${
              distFromTrough <= 0.4 ? 'text-emerald-500 animate-pulse font-black' : 'text-slate-600 dark:text-slate-300'
            }`}>
              {distFromTrough >= 0 ? '+' : ''}{distFromTrough.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Visual Channel Slider: Position between Trough and Peak */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
            <span>القاع: ${trimTrailingZeros(trade.troughPrice.toString())}</span>
            <span className="font-sans font-bold text-amber-500">موضع السعر داخل القناة</span>
            <span>القمة: ${trimTrailingZeros(trade.peakPrice.toString())}</span>
          </div>
          <div className="relative w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div 
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 rounded-full transition-all duration-300"
              style={{ width: `${channelPositionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. CHANNEL SPREAD & NET EXPECTED MARGIN */}
      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 text-center mb-3">
        <div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">نطاق التذبذب</span>
          <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
            +{trade.grossSpreadPercent.toFixed(2)}%
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">إجمالي التكاليف</span>
          <span className="font-mono font-bold text-xs text-rose-500">
            -{(trade.entryFeePercent + trade.exitFeePercent + trade.slippagePercent).toFixed(2)}%
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block">صافي الربح المتوقع</span>
          <span className={`font-mono font-black text-xs ${
            trade.netMarginPercent >= 0.3 ? 'text-emerald-500' : 'text-amber-500'
          }`}>
            +{trade.netMarginPercent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 4. IN-TRADE METRICS (Visible when in trade) */}
      {trade.status === 'in_trade' && inTradeMetrics && (
        <div className="p-3 mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">سعر الشراء: ${trade.entryPrice}</span>
            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
              التعادل: ${trade.breakEvenPrice ? trimTrailingZeros(trade.breakEvenPrice.toFixed(4)) : '—'}
            </span>
          </div>
          <div className="text-left" dir="ltr">
            <span className={`text-base font-black font-mono ${
              inTradeMetrics.pnlPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'
            }`}>
              {inTradeMetrics.pnlPercent >= 0 ? '+' : ''}{inTradeMetrics.pnlPercent.toFixed(2)}%
            </span>
            <span className="text-[10px] block text-slate-500">
              ({inTradeMetrics.pnlUsdt >= 0 ? '+' : ''}{inTradeMetrics.pnlUsdt.toFixed(2)}$)
            </span>
          </div>
        </div>
      )}

      {/* 5. EDIT LEVELS MODAL/FORM (Manual Tweak) */}
      {isEditingLevels ? (
        <div className="p-3 mb-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">القاع اليدوي ($)</label>
              <input
                type="number"
                step="any"
                value={editTrough}
                onChange={(e) => setEditTrough(e.target.value)}
                className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">القمة اليدوية ($)</label>
              <input
                type="number"
                step="any"
                value={editPeak}
                onChange={(e) => setEditPeak(e.target.value)}
                className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setIsEditingLevels(false)}
              className="px-2.5 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSaveLevels}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ المستويات</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* 6. BUY & SELL MODAL DIALOGS */}
      {isBuyModalOpen && (
        <div className="p-3 mb-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
          <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
            تأكيد شراء {trade.name} عند القاع:
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">مبلغ الشراء (USDT)</label>
              <input
                type="number"
                value={buyAmountUsdt}
                onChange={(e) => setBuyAmountUsdt(e.target.value)}
                className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">سعر التنفيذ ($)</label>
              <input
                type="number"
                step="any"
                value={customEntryPrice}
                onChange={(e) => setCustomEntryPrice(e.target.value)}
                className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setIsBuyModalOpen(false)}
              className="px-2.5 py-1 rounded-lg text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleConfirmBuy}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>تأكيد الشراء وبدء الصفقة</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. ACTION BUTTONS: BUY / SELL / EDIT */}
      <div className="flex items-center gap-2 mb-3">
        {trade.status === 'watching_trough' ? (
          <button
            type="button"
            onClick={() => {
              setCustomEntryPrice(currentPriceNum.toString());
              setIsBuyModalOpen(true);
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>شراء الآن عند القاع</span>
          </button>
        ) : trade.status === 'in_trade' ? (
          <button
            type="button"
            onClick={handleConfirmSell}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-xs"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>خروج لـ USDT وتوثيق الربح</span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => {
            setEditTrough(trade.troughPrice.toString());
            setEditPeak(trade.peakPrice.toString());
            setIsEditingLevels(!isEditingLevels);
          }}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          title="تعديل القاع والقمة يدوياً"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 8. FAST HOP BUTTONS: QUICK NAVIGATION ACROSS THE APP */}
      <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
        <span className="text-[10px] text-slate-400 font-bold">تنقل سريع:</span>
        <div className="flex items-center gap-1">
          {/* Quick hop to Calculator */}
          <button
            type="button"
            onClick={() => onNavigateToCalculator(trade.name, trade.troughPrice.toString())}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition cursor-pointer"
            title="تصدير العملة وسعر القاع إلى حاسبة التعادل"
          >
            <Calculator className="w-3 h-3 text-amber-500" />
            <span>التعادل</span>
          </button>

          {/* Quick hop to TradingView Chart */}
          <button
            type="button"
            onClick={() => onOpenChart(trade.name)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition cursor-pointer"
            title="فتح شارت TradingView الفوري"
          >
            <TrendingUp className="w-3 h-3 text-cyan-400" />
            <span>الشارت</span>
          </button>

          {/* Quick hop to Scalper */}
          <button
            type="button"
            onClick={() => onNavigateToScalper(trade.name)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition cursor-pointer"
            title="الانتقال إلى شاشة السكالبينج"
          >
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>سكالبينج</span>
          </button>

          {/* Quick hop to Tracker */}
          <button
            type="button"
            onClick={() => onNavigateToTracker(trade.name)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 transition cursor-pointer"
            title="الانتقال إلى شاشة رصد الصعود"
          >
            <ArrowRight className="w-3 h-3 text-blue-400" />
            <span>الرصد</span>
          </button>
        </div>
      </div>
    </div>
  );
};
