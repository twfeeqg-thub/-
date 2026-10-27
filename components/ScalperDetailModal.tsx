'use client';

import React, { useState, useMemo } from 'react';
import { ScalpTrade } from '@/types/scalper';
import { useCurrentTimestamp } from '@/lib/time';
import { 
  X, 
  Zap, 
  Clock, 
  TrendingDown, 
  DollarSign, 
  Target, 
  ShieldAlert, 
  RotateCcw, 
  Calculator, 
  ExternalLink, 
  Save, 
  CheckCircle2, 
  AlertTriangle,
  Volume2,
  Trash2,
  Power,
  Bell,
  BellOff
} from 'lucide-react';
import { trimTrailingZeros } from '@/lib/calculator';
import { soundAlert } from '@/lib/soundAlert';
import { ScalperSparkline } from './ScalperSparkline';
import { ScalperMiniCalculator } from './ScalperMiniCalculator';

interface ScalperDetailModalProps {
  isOpen: boolean;
  trade: ScalpTrade | null;
  livePrice?: string;
  defaultEntryFeePercent?: string;
  defaultExitFeePercent?: string;
  onClose: () => void;
  onUpdateTrade: (updated: ScalpTrade) => void;
  onOpenTrade: (tradeId: string, entryPrice: string, amountUsdt: string, coinQuantity?: string) => void;
  onCloseTradeToUsdt: (tradeId: string, exitPrice: string, reason: ScalpTrade['exitReason']) => void;
  onDeleteTrade: (tradeId: string) => void;
  onNavigateToCalculator: (trade: ScalpTrade) => void;
  onNavigateToTracker: (symbol: string) => void;
}

interface ScalperDetailModalContentProps extends Omit<ScalperDetailModalProps, 'trade'> {
  trade: ScalpTrade;
}

const ScalperDetailModalContent: React.FC<ScalperDetailModalContentProps> = ({
  trade,
  livePrice,
  defaultEntryFeePercent = '0.1',
  defaultExitFeePercent = '0.1',
  onClose,
  onUpdateTrade,
  onOpenTrade,
  onCloseTradeToUsdt,
  onDeleteTrade,
  onNavigateToCalculator,
  onNavigateToTracker,
}) => {
  const currentTime = useCurrentTimestamp();
  const currentPriceNum = livePrice ? parseFloat(livePrice) : (trade.entryPrice ? parseFloat(trade.entryPrice) : 0);

  // Local Form state for Entry
  const [entryAmount, setEntryAmount] = useState<string>(() => trade.allocatedUsdt || '100');
  const [entryPriceInput, setEntryPriceInput] = useState<string>(() => trade.entryPrice || livePrice || '');
  const [coinQuantityInput, setCoinQuantityInput] = useState<string>(() => trade.coinQuantity || '');
  
  // Dip Hunter threshold
  const [bounceTrigger, setBounceTrigger] = useState<number>(() => trade.bounceTriggerPercent || 0.4);
  const [trailingAlertPercent, setTrailingAlertPercent] = useState<number>(() => trade.trailingDropAlertPercent || 0.35);

  // Observations / Notes
  const [notes, setNotes] = useState<string>(() => trade.notes || '');
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  // Effective entry price (for preview or inputs)
  const effectiveEntryPrice = entryPriceInput || (trade.status === 'watching' && livePrice ? livePrice : '');

  // Break Even Calculation preview
  const breakEvenPreview = useMemo(() => {
    const p = parseFloat(effectiveEntryPrice);
    if (isNaN(p) || p <= 0) return 0;
    const buyFee = parseFloat(defaultEntryFeePercent) || 0.1;
    const sellFee = parseFloat(defaultExitFeePercent) || 0.1;
    // Cumulative BE formula: P_entry * (1 + buyFee/100) / (1 - sellFee/100)
    return (p * (1 + buyFee / 100)) / (1 - sellFee / 100);
  }, [effectiveEntryPrice, defaultEntryFeePercent, defaultExitFeePercent]);

  // In-Trade Live Calculations
  const inTradeMetrics = useMemo(() => {
    if (trade.status !== 'in_trade' || !trade.entryPrice || currentPriceNum <= 0) return null;
    const entryNum = parseFloat(trade.entryPrice);
    if (isNaN(entryNum) || entryNum <= 0) return null;

    const diff = currentPriceNum - entryNum;
    const pnlPercent = (diff / entryNum) * 100;
    
    // Amount or coin quantity
    const allocated = trade.allocatedUsdt ? parseFloat(trade.allocatedUsdt) : 100;
    const quantity = trade.coinQuantity ? parseFloat(trade.coinQuantity) : (allocated / entryNum);
    const pnlUsdt = diff * quantity;

    // Elapsed time using currentTime hook to keep renders pure
    const effectiveNow = currentTime > 0 ? currentTime : (trade.entryTimestamp || 0);
    const elapsedMs = trade.entryTimestamp ? Math.max(0, effectiveNow - trade.entryTimestamp) : 0;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000);

    // Peak tracking
    const peakNum = trade.peakSinceEntry ? parseFloat(trade.peakSinceEntry) : entryNum;
    const peakPnlPercent = ((peakNum - entryNum) / entryNum) * 100;
    const dropFromPeakPercent = peakNum > 0 ? ((peakNum - currentPriceNum) / peakNum) * 100 : 0;

    // Trailing Warning check
    const isTrailingWarning = peakPnlPercent > 0.5 && dropFromPeakPercent >= trailingAlertPercent;

    return {
      entryNum,
      quantity,
      allocated,
      pnlPercent,
      pnlUsdt,
      elapsedMinutes,
      elapsedSeconds,
      peakNum,
      peakPnlPercent,
      dropFromPeakPercent: Math.max(0, dropFromPeakPercent),
      isTrailingWarning,
    };
  }, [trade, currentPriceNum, trailingAlertPercent, currentTime]);

  // Dip Metrics for Watching
  const dipMetrics = useMemo(() => {
    if (trade.status !== 'watching' || currentPriceNum <= 0) return null;
    const dipNum = trade.dipPrice ? parseFloat(trade.dipPrice) : currentPriceNum;
    if (isNaN(dipNum) || dipNum <= 0) return null;

    const bouncePercent = ((currentPriceNum - dipNum) / dipNum) * 100;
    const isBounceConfirmed = bouncePercent >= bounceTrigger;

    return {
      dipNum,
      bouncePercent,
      isBounceConfirmed,
    };
  }, [trade, currentPriceNum, bounceTrigger]);

  // Save notes handler
  const handleSaveNotes = () => {
    onUpdateTrade({
      ...trade,
      notes,
      bounceTriggerPercent: bounceTrigger,
      trailingDropAlertPercent: trailingAlertPercent,
    });
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  // Reset Dip to live price
  const handleResetDip = () => {
    if (!livePrice) return;
    onUpdateTrade({
      ...trade,
      dipPrice: livePrice,
      dipTimestamp: currentTime > 0 ? currentTime : Date.now(),
    });
  };

  // Target Ladder values
  const targets = useMemo(() => {
    const basePrice = trade.status === 'in_trade' && trade.entryPrice 
      ? parseFloat(trade.entryPrice) 
      : (parseFloat(effectiveEntryPrice) || currentPriceNum);

    if (basePrice <= 0) return [];

    const allocated = trade.allocatedUsdt ? parseFloat(trade.allocatedUsdt) : (parseFloat(entryAmount) || 100);
    const quantity = trade.coinQuantity ? parseFloat(trade.coinQuantity) : (allocated / basePrice);

    return [
      { label: 'هدف ارتداد سريع (T1)', percent: trade.target1Percent || 0.6 },
      { label: 'هدف ارتداد متوسط (T2)', percent: trade.target2Percent || 1.2 },
      { label: 'هدف ارتداد ممتد (T3)', percent: trade.target3Percent || 2.0 },
    ].map((t) => {
      const targetPrice = basePrice * (1 + t.percent / 100);
      const grossPnl = (targetPrice - basePrice) * quantity;
      return {
        ...t,
        targetPrice,
        grossPnl,
        isReached: currentPriceNum >= targetPrice,
      };
    });
  }, [trade, effectiveEntryPrice, currentPriceNum, entryAmount]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 my-auto max-h-[92vh] overflow-y-auto"
        dir="rtl"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
              trade.status === 'in_trade'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : trade.status === 'watching'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
            }`}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                  {trade.name}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {trade.binanceSymbol}
                </span>
                {trade.status === 'in_trade' ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    صفقة سكالبينج نشطة
                  </span>
                ) : trade.status === 'watching' ? (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    رصد القيعان السريعة
                  </span>
                ) : (
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-200 dark:bg-slate-800 text-slate-500">
                    صفقة مغلقة
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                استراتيجية سكالبينج من 5 دقائق إلى 60 دقيقة — الخروج المباشر لـ USDT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Active / Inactive Toggle */}
            <button
              type="button"
              onClick={() => onUpdateTrade({ ...trade, isActive: trade.isActive === false ? true : false })}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                trade.isActive !== false
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-600 dark:text-emerald-400'
                  : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-500'
              }`}
              title={trade.isActive !== false ? 'الصفقة مفعّلة — انقر للإيقاف المؤقت' : 'الصفقة متوقفة — انقر للتفعيل'}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{trade.isActive !== false ? 'مفعّلة' : 'غلق'}</span>
            </button>

            {/* Alerts Toggle (Default OFF) */}
            <button
              type="button"
              onClick={() => onUpdateTrade({ ...trade, alertsEnabled: !trade.alertsEnabled })}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                trade.alertsEnabled
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-300'
                  : 'bg-slate-100 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-400'
              }`}
              title={trade.alertsEnabled ? 'التنبيهات مشغلة — انقر للغلق' : 'التنبيهات مغلقة (افتراضي) — انقر للتفعيل'}
            >
              {trade.alertsEnabled ? <Bell className="w-3.5 h-3.5 text-amber-500" /> : <BellOff className="w-3.5 h-3.5" />}
              <span>{trade.alertsEnabled ? 'تنبيه' : 'صامت'}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateToCalculator(trade)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="تصدير إلى الحاسبة العامة والتعادل"
            >
              <Calculator className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTracker(trade.name)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="فتح في شاشة رصد صعود العملات"
            >
              <ExternalLink className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Banner: Current Price, Sparkline & Live Ticker */}
        <div className="my-4 p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">
              السعر المباشر من Binance
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-slate-50">
              {livePrice ? trimTrailingZeros(livePrice) : 'جاري الاتصال...'}
              <span className="text-sm font-normal text-slate-400 ml-1.5">USDT</span>
            </div>
          </div>

          {/* Embedded Mini Sparkline Chart */}
          <div className="w-full sm:w-auto flex justify-center py-1">
            <ScalperSparkline
              status={trade.status}
              currentPrice={currentPriceNum}
              entryPrice={trade.entryPrice ? parseFloat(trade.entryPrice) : undefined}
              dipPrice={trade.dipPrice ? parseFloat(trade.dipPrice) : undefined}
              peakPrice={trade.peakSinceEntry ? parseFloat(trade.peakSinceEntry) : undefined}
              priceHistory={trade.priceHistory}
              height={44}
            />
          </div>

          {trade.status === 'in_trade' && inTradeMetrics ? (
            <div className="text-left w-full sm:w-auto" dir="ltr">
              <span className="text-xs text-slate-400 block mb-0.5">صافي الربح اللحظي</span>
              <div className={`text-xl sm:text-2xl font-bold font-mono ${
                inTradeMetrics.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {inTradeMetrics.pnlPercent >= 0 ? '+' : ''}{inTradeMetrics.pnlPercent.toFixed(2)}%
                <div className="text-xs font-normal opacity-90">
                  {inTradeMetrics.pnlUsdt >= 0 ? '+' : ''}{inTradeMetrics.pnlUsdt.toFixed(2)} USDT
                </div>
              </div>
            </div>
          ) : (
            <div className="text-left w-full sm:w-auto" dir="ltr">
              <span className="text-xs text-slate-400 block mb-0.5">الارتداد عن القاع</span>
              <div className={`text-xl sm:text-2xl font-bold font-mono ${
                (dipMetrics?.bouncePercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {(dipMetrics?.bouncePercent || 0) >= 0 ? '+' : ''}{(dipMetrics?.bouncePercent || 0).toFixed(2)}%
              </div>
            </div>
          )}
        </div>

        {/* SECTION 1: IN-TRADE MONITOR & HOLDING TIMER */}
        {trade.status === 'in_trade' && inTradeMetrics && (
          <div className="space-y-4 mb-5 p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
            {/* Holding Timer Alert Banner */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              inTradeMetrics.elapsedMinutes >= 45
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                : inTradeMetrics.elapsedMinutes >= 25
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}>
              <div className="flex items-center gap-2">
                <Clock className={`w-5 h-5 ${inTradeMetrics.elapsedMinutes >= 45 ? 'animate-bounce text-rose-400' : ''}`} />
                <div>
                  <div className="font-bold text-sm">
                    عداد فترة الاحتفاظ بالصفقة: {inTradeMetrics.elapsedMinutes} دقيقة و {inTradeMetrics.elapsedSeconds} ثانية
                  </div>
                  <div className="text-[11px] opacity-80">
                    {inTradeMetrics.elapsedMinutes >= 45
                      ? '⚠️ تحذير: قارب وقت الصفقة 60 دقيقة — خطة الخروج لعملة مستقرة مستحقة الآن!'
                      : 'نافذة السكالبينج الذهبية: التداول بين 5 إلى 45 دقيقة ثم تأمين الربح كـ USDT.'}
                  </div>
                </div>
              </div>

              <div className="text-left font-mono font-bold text-base" dir="ltr">
                {String(inTradeMetrics.elapsedMinutes).padStart(2, '0')}:{String(inTradeMetrics.elapsedSeconds).padStart(2, '0')}
              </div>
            </div>

            {/* In-Trade Key Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">سعر الدخول</span>
                <span className="font-mono font-bold text-sm text-slate-200">
                  {trade.entryPrice ? trimTrailingZeros(trade.entryPrice) : '—'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">سعر التعادل (BE)</span>
                <span className="font-mono font-bold text-sm text-amber-400">
                  {trade.breakEvenPrice ? trimTrailingZeros(trade.breakEvenPrice) : breakEvenPreview > 0 ? trimTrailingZeros(breakEvenPreview.toString()) : '—'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">أعلى قمة ارتداد</span>
                <span className="font-mono font-bold text-sm text-emerald-400">
                  {trade.peakSinceEntry ? trimTrailingZeros(trade.peakSinceEntry) : '—'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-0.5">تراجع عن القمة</span>
                <span className={`font-mono font-bold text-sm ${inTradeMetrics.isTrailingWarning ? 'text-rose-400' : 'text-slate-300'}`}>
                  {inTradeMetrics.dropFromPeakPercent.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Trailing Warning notification */}
            {inTradeMetrics.isTrailingWarning && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    <strong>تنبيه تراجع القمة:</strong> تراجع السعر بنسبة {inTradeMetrics.dropFromPeakPercent.toFixed(2)}% عن أعلى ارتداد حققه! يُفضل جني الأرباح والخروج لـ USDT.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => soundAlert.playTrailingDropAlert()}
                  className="p-1 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 cursor-pointer"
                  title="سماع التنبيه الصوتي"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Rapid Exit to USDT Action Bar */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={() => onCloseTradeToUsdt(trade.id, livePrice || trade.entryPrice || '0', 'manual_usdt')}
                className="flex-1 py-3 px-4 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <DollarSign className="w-5 h-5" />
                <span>خروج فوري إلى USDT الآن (تأمين {inTradeMetrics.pnlUsdt.toFixed(2)} $)</span>
              </button>

              <button
                type="button"
                onClick={() => onCloseTradeToUsdt(trade.id, trade.breakEvenPrice || breakEvenPreview.toString(), 'breakeven')}
                className="py-3 px-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
                title="إغلاق الصفقة بسعر التعادل صفر ربح وخسارة"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>خروج عند التعادل</span>
              </button>
            </div>
          </div>
        )}

        {/* SECTION 2: DIP HUNTER & BOUNCE CONFIRMATION (FOR WATCHING) */}
        {trade.status === 'watching' && (
          <div className="space-y-4 mb-5 p-4 rounded-2xl bg-amber-950/15 border border-amber-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-sm text-slate-200">
                  رصد أدنى قاع محلي وتأكيد الارتداد
                </h3>
              </div>
              <button
                type="button"
                onClick={handleResetDip}
                className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>تعيين السعر الحالي كقاع</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-0.5">أدنى قاع مرصود</span>
                <span className="font-mono font-bold text-base text-amber-300">
                  {trade.dipPrice ? trimTrailingZeros(trade.dipPrice) : (livePrice ? trimTrailingZeros(livePrice) : '—')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-0.5">نسبة الارتداد اللحظية</span>
                <span className={`font-mono font-bold text-base ${
                  (dipMetrics?.bouncePercent || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {(dipMetrics?.bouncePercent || 0) >= 0 ? '+' : ''}{(dipMetrics?.bouncePercent || 0).toFixed(2)}%
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-0.5">حالة تأكيد الارتداد</span>
                <span className={`font-bold text-sm flex items-center gap-1 ${
                  dipMetrics?.isBounceConfirmed ? 'text-emerald-400' : 'text-slate-400'
                }`}>
                  {dipMetrics?.isBounceConfirmed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ارتداد جاهز للشراء!
                    </>
                  ) : (
                    <>في انتظار صعود +{bounceTrigger}%</>
                  )}
                </span>
              </div>
            </div>

            {/* Threshold buttons */}
            <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
              <span>تأكيد الارتداد عند صعود:</span>
              {[0.2, 0.4, 0.6, 0.8].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setBounceTrigger(val)}
                  className={`px-2 py-0.5 rounded-md font-mono text-xs transition cursor-pointer ${
                    bounceTrigger === val
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  +{val}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 3: INSTANT ENTRY / BUY SETUP (IF WATCHING OR RE-ENTERING) */}
        {trade.status === 'watching' && (
          <div className="space-y-4 mb-5 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                تنفيذ الشراء السريع وفتح مركز السكالبينج
              </h3>
              <button
                type="button"
                onClick={() => setShowCalculator((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  showCalculator
                    ? 'bg-amber-500 text-slate-950 border-amber-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:text-amber-500'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>{showCalculator ? 'إخفاء الحاسبة' : 'حاسبة الكمية ورأس المال'}</span>
              </button>
            </div>

            {/* Embedded Scalper Mini Calculator */}
            {showCalculator && (
              <ScalperMiniCalculator
                defaultPrice={effectiveEntryPrice || livePrice || ''}
                defaultAmount={entryAmount || '100'}
                availableCapital={trade.allocatedUsdt || '1000'}
                onApply={(calculatedQuantity, tradeAmount, entryPrice) => {
                  setCoinQuantityInput(calculatedQuantity);
                  if (tradeAmount) setEntryAmount(tradeAmount);
                  if (entryPrice) setEntryPriceInput(entryPrice);
                  setShowCalculator(false);
                }}
                onClose={() => setShowCalculator(false)}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Entry Price */}
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>سعر الدخول (Entry Price)</span>
                  {livePrice && (
                    <button
                      type="button"
                      onClick={() => setEntryPriceInput(livePrice)}
                      className="text-amber-500 hover:underline text-[11px] cursor-pointer"
                    >
                      استخدام اللحظي
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  dir="ltr"
                  value={entryPriceInput}
                  onChange={(e) => setEntryPriceInput(e.target.value)}
                  placeholder={livePrice ? trimTrailingZeros(livePrice) : "0.00"}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 font-mono text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Amount USDT */}
              <div>
                <span className="text-xs text-slate-500 block mb-1">مبلغ الصفقة (USDT)</span>
                <input
                  type="text"
                  dir="ltr"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  placeholder="100"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 font-mono text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Optional Coin Quantity */}
              <div>
                <span className="text-xs text-slate-500 block mb-1">كمية العملة (اختياري للتحويل المباشر)</span>
                <input
                  type="text"
                  dir="ltr"
                  value={coinQuantityInput}
                  onChange={(e) => setCoinQuantityInput(e.target.value)}
                  placeholder="محسوبة تلقائياً"
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 font-mono text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Quick Amount Presets */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">مبالغ جاهزة:</span>
              {[25, 50, 100, 250, 500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setEntryAmount(amt.toString())}
                  className={`px-2.5 py-1 rounded-lg font-mono font-medium transition cursor-pointer ${
                    entryAmount === amt.toString()
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>

            {/* Break-Even Preview */}
            {breakEvenPreview > 0 && (
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">سعر التعادل الحقيقي مع الرسوم:</span>
                <span className="font-mono font-bold text-amber-500">
                  {trimTrailingZeros(breakEvenPreview.toString())} USDT
                </span>
              </div>
            )}

            {/* Open Trade CTA */}
            <button
              type="button"
              onClick={() => onOpenTrade(trade.id, effectiveEntryPrice || livePrice || '0', entryAmount, coinQuantityInput)}
              disabled={!effectiveEntryPrice && !livePrice}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
            >
              <Zap className="w-5 h-5" />
              <span>شراء القاع وفتح مركز سكالبينج فوري (${entryAmount} USDT)</span>
            </button>
          </div>
        )}

        {/* SECTION 4: TARGET LADDER & TAKE-PROFIT CONTROLS */}
        <div className="space-y-3 mb-5 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-500" />
              سلم أهداف السكالبينج السريع (خروج لـ USDT)
            </h3>
            <span className="text-[11px] text-slate-500">حساب فوري للأرباح</span>
          </div>

          <div className="space-y-2">
            {targets.map((tgt, i) => (
              <div 
                key={i}
                className={`p-3 rounded-xl border flex items-center justify-between transition ${
                  tgt.isReached 
                    ? 'bg-emerald-500/15 border-emerald-500/40' 
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{tgt.label}</span>
                    <span className="font-mono text-xs text-emerald-400 font-bold">+{tgt.percent}%</span>
                    {tgt.isReached && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500 text-slate-950 font-bold">
                        تحقق 🎯
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    السعر المستهدف: {trimTrailingZeros(tgt.targetPrice.toString())} USDT
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-left font-mono" dir="ltr">
                    <span className="text-xs font-bold text-emerald-400">+{tgt.grossPnl.toFixed(2)} $</span>
                  </div>
                  {trade.status === 'in_trade' && (
                    <button
                      type="button"
                      onClick={() => onCloseTradeToUsdt(trade.id, tgt.targetPrice.toString(), 'target')}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer"
                    >
                      خروج
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5: REAL-WORLD OBSERVATIONS & SCALPING JOURNAL */}
        <div className="space-y-2 mb-5 p-4 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              📝 ملاحظات التجربة الميدانية والسكالبينج
            </h3>
            {isSavedNotice && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> تم الحفظ!
              </span>
            )}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="سجل ملاحظاتك حول حركة السعر، سرعة الارتداد، دقة القاع، وسلوك الخروج..."
            rows={2}
            className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveNotes}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>حفظ الملاحظات والإعدادات</span>
            </button>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (confirm('هل أنت متأكد من حذف هذه العملة من لوحة السكالبينج؟')) {
                onDeleteTrade(trade.id);
                onClose();
              }
            }}
            className="text-xs text-rose-500 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>إزالة من السكالبينج</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition cursor-pointer"
          >
            إغلاق البطاقة
          </button>
        </div>
      </div>
    </div>
  );
};

export const ScalperDetailModal: React.FC<ScalperDetailModalProps> = (props) => {
  if (!props.isOpen || !props.trade) return null;
  return <ScalperDetailModalContent {...props} trade={props.trade} />;
};
