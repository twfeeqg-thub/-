'use client';

import React, { useState, useMemo } from 'react';
import { RangeTrackedTrade, RangeAlertConfig } from '@/types/rangeScalper';
import { trimTrailingZeros } from '@/lib/calculator';
import { calculateRangeBreakEven } from '@/lib/rangeAnalysis';
import { RangeAlertSettingsModal } from './RangeAlertSettingsModal';
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
  ArrowRight,
  Sliders,
  Percent
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

  // Modal for advanced alert conditions
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  // Editing levels state
  const [isEditingLevels, setIsEditingLevels] = useState(false);
  const [editTrough, setEditTrough] = useState(trade.troughPrice.toString());
  const [editPeak, setEditPeak] = useState(trade.peakPrice.toString());
  const [editCapital, setEditCapital] = useState((trade.tradeCapitalUsdt || 100).toString());

  // In-trade execution state
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [buyAmountUsdt, setBuyAmountUsdt] = useState((trade.tradeCapitalUsdt || 100).toString());
  const [customEntryPrice, setCustomEntryPrice] = useState(currentPriceNum.toString());

  // Capital base for calculations
  const capital = trade.tradeCapitalUsdt || 100;

  // Break-even price calculation
  const computedBreakEven = useMemo(() => {
    const baseEntry = trade.status === 'in_trade' && trade.entryPrice ? trade.entryPrice : trade.troughPrice;
    return calculateRangeBreakEven(baseEntry, trade.entryFeePercent, trade.exitFeePercent, trade.slippagePercent);
  }, [trade]);

  // Position within the channel (0% = at trough, 100% = at peak)
  const channelPositionPercent = useMemo(() => {
    if (trade.peakPrice <= trade.troughPrice || currentPriceNum <= 0) return 50;
    const ratio = ((currentPriceNum - trade.troughPrice) / (trade.peakPrice - trade.troughPrice)) * 100;
    return Math.max(0, Math.min(100, ratio));
  }, [currentPriceNum, trade.troughPrice, trade.peakPrice]);

  // Distance from trough in % and USDT
  const distFromTrough = useMemo(() => {
    if (trade.troughPrice <= 0 || currentPriceNum <= 0) return { percent: 0, usdt: 0 };
    const pct = ((currentPriceNum - trade.troughPrice) / trade.troughPrice) * 100;
    const usdt = (capital * pct) / 100;
    return { percent: pct, usdt };
  }, [currentPriceNum, trade.troughPrice, capital]);

  // Distance to break-even in % and USDT
  const distToBreakEven = useMemo(() => {
    if (computedBreakEven <= 0 || currentPriceNum <= 0) return { percent: 0, usdt: 0, isReached: false };
    const pct = ((currentPriceNum - computedBreakEven) / computedBreakEven) * 100;
    const usdt = (capital * pct) / 100;
    return { percent: pct, usdt, isReached: currentPriceNum >= computedBreakEven };
  }, [currentPriceNum, computedBreakEven, capital]);

  // In-trade live metrics (Deducting all costs to show true NET P&L)
  const inTradeMetrics = useMemo(() => {
    if (trade.status !== 'in_trade' || !trade.entryPrice || currentPriceNum <= 0) return null;
    const entry = trade.entryPrice;
    const diff = currentPriceNum - entry;
    const allocated = trade.allocatedUsdt || capital;
    const qty = trade.coinQuantity || (allocated / entry);
    const grossPnlUsdt = diff * qty;

    // Deduct entry fee, exit fee, and slippage
    const buyFeeUsdt = (allocated * trade.entryFeePercent) / 100;
    const sellFeeUsdt = (allocated * trade.exitFeePercent) / 100;
    const slippageUsdt = (allocated * trade.slippagePercent) / 100;
    const totalCostsUsdt = buyFeeUsdt + sellFeeUsdt + slippageUsdt;

    const netPnlUsdt = grossPnlUsdt - totalCostsUsdt;
    const netPnlPercent = (netPnlUsdt / allocated) * 100;

    return { 
      grossPnlUsdt, 
      netPnlUsdt, 
      netPnlPercent, 
      totalCostsUsdt,
      qty,
      allocated 
    };
  }, [trade, currentPriceNum, capital]);

  // Save manually edited levels
  const handleSaveLevels = () => {
    const tNum = parseFloat(editTrough);
    const pNum = parseFloat(editPeak);
    const capNum = parseFloat(editCapital) || 100;
    if (!isNaN(tNum) && !isNaN(pNum) && pNum > tNum && tNum > 0) {
      const grossSpread = ((pNum - tNum) / tNum) * 100;
      const totalCost = trade.entryFeePercent + trade.exitFeePercent + trade.slippagePercent;
      const netMargin = grossSpread - totalCost;
      const be = calculateRangeBreakEven(tNum, trade.entryFeePercent, trade.exitFeePercent, trade.slippagePercent);

      onUpdateTrade({
        ...trade,
        troughPrice: tNum,
        peakPrice: pNum,
        tradeCapitalUsdt: capNum,
        grossSpreadPercent: grossSpread,
        grossSpreadUsdt: (capNum * grossSpread) / 100,
        netMarginPercent: netMargin,
        netMarginUsdt: (capNum * netMargin) / 100,
        breakEvenPrice: be,
      });
      setIsEditingLevels(false);
    }
  };

  // Execute buy at trough
  const handleConfirmBuy = () => {
    const p = parseFloat(customEntryPrice) || currentPriceNum;
    const amt = parseFloat(buyAmountUsdt) || capital;
    const qty = p > 0 ? amt / p : 0;
    const be = calculateRangeBreakEven(p, trade.entryFeePercent, trade.exitFeePercent, trade.slippagePercent);

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

  // Execute exit and sell (NET P&L)
  const handleConfirmSell = () => {
    if (!trade.entryPrice) return;
    const exitPrice = currentPriceNum;
    const entry = trade.entryPrice;
    const amt = trade.allocatedUsdt || capital;
    const qty = trade.coinQuantity || (amt / entry);

    const diff = exitPrice - entry;
    const grossPnlUsdt = diff * qty;

    const buyFeeUsdt = (amt * trade.entryFeePercent) / 100;
    const sellFeeUsdt = (amt * trade.exitFeePercent) / 100;
    const slippageUsdt = (amt * trade.slippagePercent) / 100;
    const totalCostsUsdt = buyFeeUsdt + sellFeeUsdt + slippageUsdt;

    const netPnlUsdt = grossPnlUsdt - totalCostsUsdt;
    const netPnlPercent = (netPnlUsdt / amt) * 100;

    const durationMinutes = trade.entryTimestamp
      ? Math.max(1, Math.round((Date.now() - trade.entryTimestamp) / 60000))
      : 1;

    onUpdateTrade({
      ...trade,
      status: 'closed',
      exitPrice,
      exitTimestamp: Date.now(),
      realizedGrossPnlUsdt: grossPnlUsdt,
      realizedNetPnlUsdt: netPnlUsdt,
      realizedPnlPercent: netPnlPercent,
      holdingDurationMinutes: durationMinutes,
    });
  };

  const handleSaveAlertConfig = (newConfig: RangeAlertConfig) => {
    onUpdateTrade({
      ...trade,
      alertsEnabled: newConfig.enabled,
      alertConfig: newConfig,
    });
  };

  const isAlertActive = trade.alertsEnabled && trade.alertConfig?.enabled;

  return (
    <div 
      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-200 shadow-xs hover:shadow-md ${
        trade.isActive === false
          ? 'bg-slate-100/40 dark:bg-slate-900/40 border-slate-300/60 dark:border-slate-800/60 opacity-60'
          : trade.status === 'in_trade'
          ? (inTradeMetrics && inTradeMetrics.netPnlPercent >= 0 
              ? 'bg-emerald-950/20 border-emerald-500/40' 
              : 'bg-rose-950/20 border-rose-500/40')
          : 'bg-white/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800'
      }`}
      dir="rtl"
    >
      {/* 1. CARD HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
            trade.status === 'in_trade' 
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
              : 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
          }`}>
            {trade.name.substring(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
                {trade.name}
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                / {trade.timeframeMinutes}m
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.2 rounded-md ${
                trade.status === 'in_trade'
                  ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
              }`}>
                {trade.status === 'in_trade' ? 'صفقة نشطة' : 'انتظار القاع'}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 block">
              رأس المال: ${capital} USDT
            </span>
          </div>
        </div>

        {/* Action buttons (Toggles, Alert Settings, Delete) */}
        <div className="flex items-center gap-1.5">
          {/* Active/Pause Toggle */}
          <button
            type="button"
            onClick={() => onToggleActive(trade.id)}
            className={`p-1.5 rounded-xl transition cursor-pointer border ${
              trade.isActive !== false
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
            }`}
            title={trade.isActive !== false ? 'الصفقة نشطة — انقر للتعطيل المؤقت' : 'الصفقة معطلة — انقر للتفعيل'}
          >
            <Power className="w-4 h-4" />
          </button>

          {/* Smart Alert Button with Settings Modal */}
          <button
            type="button"
            onClick={() => setIsAlertModalOpen(true)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-xl transition cursor-pointer border text-xs font-bold ${
              isAlertActive
                ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
            title="إعدادات شروط التنبيه المتطورة"
          >
            {isAlertActive ? <Bell className="w-3.5 h-3.5 fill-current" /> : <BellOff className="w-3.5 h-3.5" />}
            <span className="text-[10px] hidden sm:inline">
              {isAlertActive ? 'تنبيه ذكي مفعل' : 'تنبيه (مغلق)'}
            </span>
            <Sliders className="w-3 h-3 opacity-70" />
          </button>

          {/* Edit Levels Toggle */}
          <button
            type="button"
            onClick={() => setIsEditingLevels(!isEditingLevels)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/30 transition cursor-pointer"
            title="تعديل القاع والقمة ورأس المال"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          {/* Delete Card Button */}
          <button
            type="button"
            onClick={() => onDeleteTrade(trade.id)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition cursor-pointer"
            title="حذف هذه البطاقة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. MANUAL LEVELS & CAPITAL EDIT ACCORDION */}
      {isEditingLevels && (
        <div className="p-3 mb-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-cyan-500/30 animate-fade-in text-xs">
          <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 block mb-2">
            تعديل مستويات القناة العرضية ورأس المال:
          </span>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">القاع المستهدف ($)</label>
              <input
                type="number"
                step="any"
                value={editTrough}
                onChange={(e) => setEditTrough(e.target.value)}
                className="w-full px-2 py-1 text-xs font-mono font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">القمة المستهدفة ($)</label>
              <input
                type="number"
                step="any"
                value={editPeak}
                onChange={(e) => setEditPeak(e.target.value)}
                className="w-full px-2 py-1 text-xs font-mono font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 block mb-0.5">رأس المال ($ USDT)</label>
              <input
                type="number"
                step="1"
                value={editCapital}
                onChange={(e) => setEditCapital(e.target.value)}
                className="w-full px-2 py-1 text-xs font-mono font-bold rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditingLevels(false)}
              className="px-3 py-1 rounded-lg text-[11px] text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSaveLevels}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400"
            >
              <Save className="w-3 h-3" />
              <span>تحديث المستويات</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. CHANNEL METRICS GRID (مع إظهار سعر التعادل والقيم المزدوجة $ و %) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
        {/* Trough Price */}
        <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] text-slate-500 block mb-0.5">منطقة القاع (شراء)</span>
          <span className="text-xs sm:text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
            ${trade.troughPrice}
          </span>
          <span className="text-[9px] text-slate-400 block mt-0.5">
            البعد: {distFromTrough.percent >= 0 ? `+${distFromTrough.percent.toFixed(2)}%` : `${distFromTrough.percent.toFixed(2)}%`} ({distFromTrough.usdt >= 0 ? `+$${distFromTrough.usdt.toFixed(2)}` : `-$${Math.abs(distFromTrough.usdt).toFixed(2)}`})
          </span>
        </div>

        {/* Peak Price */}
        <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
          <span className="text-[10px] text-slate-500 block mb-0.5">منطقة القمة (بيع)</span>
          <span className="text-xs sm:text-sm font-black font-mono text-cyan-600 dark:text-cyan-400">
            ${trade.peakPrice}
          </span>
          <span className="text-[9px] text-slate-400 block mt-0.5">
            فارق القناة: +{trade.grossSpreadPercent.toFixed(2)}% (+${((capital * trade.grossSpreadPercent) / 100).toFixed(2)})
          </span>
        </div>

        {/* Break-Even Price (سعر التعادل المطلوب في الملاحظة 3) */}
        <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/30">
          <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold block mb-0.5">
            سعر التعادل (Break-Even)
          </span>
          <span className="text-xs sm:text-sm font-black font-mono text-amber-600 dark:text-amber-300">
            ${computedBreakEven.toFixed(4)}
          </span>
          <span className="text-[9px] text-amber-600/80 block mt-0.5">
            {distToBreakEven.isReached ? '✅ السعر فوق التعادل' : `يبعد: ${Math.abs(distToBreakEven.percent).toFixed(2)}% ($${Math.abs(distToBreakEven.usdt).toFixed(2)})`}
          </span>
        </div>

        {/* Expected Net Margin ($ and %) */}
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold block mb-0.5">
            صافي الربح المتوقع
          </span>
          <span className="text-xs sm:text-sm font-black font-mono text-emerald-500">
            +${((capital * trade.netMarginPercent) / 100).toFixed(2)}
          </span>
          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block mt-0.5 font-bold">
            +{trade.netMarginPercent.toFixed(2)}% (بعد كافة التكاليف)
          </span>
        </div>
      </div>

      {/* 4. VISUAL CHANNEL GAUGE */}
      <div className="p-3 mb-3 rounded-xl bg-slate-100/40 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800">
        <div className="flex items-center justify-between text-[11px] mb-1.5 font-bold">
          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span>القاع</span>
            <span className="font-mono font-normal">(${trade.troughPrice})</span>
          </span>
          <span className="text-slate-900 dark:text-slate-100 font-black font-mono">
            الحالي: ${currentPriceNum}
          </span>
          <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
            <span>القمة</span>
            <span className="font-mono font-normal">(${trade.peakPrice})</span>
          </span>
        </div>

        <div className="relative w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          {/* Channel progress gradient */}
          <div 
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 via-amber-400 to-cyan-500 transition-all duration-300 rounded-full"
            style={{ width: `${channelPositionPercent}%` }}
          />
        </div>
      </div>

      {/* 5. IN-TRADE LIVE STATUS BANNER (الربح الصافي الحقيقي بعد خصم التكاليف) */}
      {trade.status === 'in_trade' && inTradeMetrics && (
        <div className={`p-3 mb-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
          inTradeMetrics.netPnlPercent >= 0 
            ? 'bg-emerald-500/10 border-emerald-500/30' 
            : 'bg-rose-500/10 border-rose-500/30'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                الدخول: ${trade.entryPrice}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                (الكمية: {trimTrailingZeros(inTradeMetrics.qty.toFixed(4))})
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block">
              رسوم مخصومة: -${inTradeMetrics.totalCostsUsdt.toFixed(2)} | الإجمالي قبل الرسوم: ${inTradeMetrics.grossPnlUsdt.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left sm:text-right">
              <span className="text-[10px] text-slate-400 block">صافي الربح الحقيقي</span>
              <span className={`text-sm sm:text-base font-black font-mono ${
                inTradeMetrics.netPnlPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'
              }`}>
                {inTradeMetrics.netPnlUsdt >= 0 ? `+$${inTradeMetrics.netPnlUsdt.toFixed(2)}` : `-$${Math.abs(inTradeMetrics.netPnlUsdt).toFixed(2)}`}
                {' '}
                ({inTradeMetrics.netPnlPercent >= 0 ? `+${inTradeMetrics.netPnlPercent.toFixed(2)}%` : `${inTradeMetrics.netPnlPercent.toFixed(2)}%`})
              </span>
            </div>

            <button
              type="button"
              onClick={handleConfirmSell}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-xs whitespace-nowrap"
            >
              بيع وخروج (توثيق)
            </button>
          </div>
        </div>
      )}

      {/* 6. BOTTOM ACTION BAR (دخول صفقة، وتنقل فوري بدون احتكاك) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
        {/* Left: Execution button */}
        {trade.status === 'watching_trough' ? (
          <button
            type="button"
            onClick={() => setIsBuyModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-xs"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>تنفيذ شراء عند القاع (${trade.troughPrice})</span>
          </button>
        ) : (
          <div className="text-xs font-bold text-emerald-500 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            <span>الصفقة قيد المراقبة اللحظية</span>
          </div>
        )}

        {/* Right: Zero-friction quick hop buttons */}
        <div className="flex items-center gap-1">
          {/* Quick hop to Chart */}
          <button
            type="button"
            onClick={() => onOpenChart(trade.binanceSymbol)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
            title="فتح الشارت المباشر لهذه العملة"
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">الشارت</span>
          </button>

          {/* Quick hop to Break-Even Calculator */}
          <button
            type="button"
            onClick={() => onNavigateToCalculator(trade.name, trade.troughPrice.toString())}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
            title="إرسال إلى حاسبة التعادل كصفقة دخول"
          >
            <Calculator className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">الحاسبة</span>
          </button>

          {/* Quick hop to Scalper */}
          <button
            type="button"
            onClick={() => onNavigateToScalper(trade.name)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
            title="فتح في لوحة السكالبينج"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">سكالبينج</span>
          </button>
        </div>
      </div>

      {/* 7. BUY AT TROUGH MODAL */}
      {isBuyModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
          onClick={() => setIsBuyModalOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-500 fill-current" />
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  تأكيد الشراء عند قاع {trade.name}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsBuyModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-4 text-xs">
              <div>
                <label className="text-slate-500 block mb-1">سعر الشراء الفعلي ($)</label>
                <input
                  type="number"
                  step="any"
                  value={customEntryPrice}
                  onChange={(e) => setCustomEntryPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-500 block mb-1">المبلغ المخصص للشراء ($ USDT)</label>
                <input
                  type="number"
                  step="1"
                  value={buyAmountUsdt}
                  onChange={(e) => setBuyAmountUsdt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-[11px] text-amber-700 dark:text-amber-300 font-bold">
                سعر التعادل المتوقع بعد الرسوم: ~${calculateRangeBreakEven(parseFloat(customEntryPrice) || currentPriceNum, trade.entryFeePercent, trade.exitFeePercent, trade.slippagePercent).toFixed(4)}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsBuyModalOpen(false)}
                className="w-1/2 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmBuy}
                className="w-1/2 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs"
              >
                تأكيد الشراء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. SMART ALERT SETTINGS MODAL */}
      <RangeAlertSettingsModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        currencyName={trade.name}
        binanceSymbol={trade.binanceSymbol}
        troughPrice={trade.troughPrice}
        peakPrice={trade.peakPrice}
        currentAlertConfig={trade.alertConfig}
        onSaveConfig={handleSaveAlertConfig}
      />
    </div>
  );
};
