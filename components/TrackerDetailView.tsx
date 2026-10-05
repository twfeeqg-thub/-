'use client';

import React, { useState, useEffect } from 'react';
import { TrackedCurrency, PriceSnapshot } from '@/types/tracker';
import { formatCurrencyPrice, formatPercent } from '@/lib/calculator';
import { 
  ArrowRight, 
  Radio, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  RotateCcw, 
  Calculator, 
  Camera, 
  Trash2, 
  Check, 
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useCurrentTimestamp } from '@/lib/time';

interface TrackerDetailViewProps {
  currency: TrackedCurrency;
  currentLivePrice: string;
  isLiveStreamActive: boolean;
  onToggleLiveStream: (active: boolean) => void;
  onBack: () => void;
  onUpdateBaseline: (newPrice: string) => void;
  onAddSnapshot: (price: string, label?: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
  onSendToCalculatorAsEntry: (currencyName: string, price: string) => void;
  onSendToCalculatorAsTest: (currencyName: string, price: string) => void;
  onOpenCalculatorForCurrency: (currencyName: string) => void;
}

export const TrackerDetailView: React.FC<TrackerDetailViewProps> = ({
  currency,
  currentLivePrice,
  isLiveStreamActive,
  onToggleLiveStream,
  onBack,
  onUpdateBaseline,
  onAddSnapshot,
  onDeleteSnapshot,
  onSendToCalculatorAsEntry,
  onSendToCalculatorAsTest,
  onOpenCalculatorForCurrency,
}) => {
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [copySuccessMsg, setCopySuccessMsg] = useState<string | null>(null);
  const currentTime = useCurrentTimestamp();

  // Numbers
  const baseNum = parseFloat(currency.baselinePrice);
  const liveNum = parseFloat(currentLivePrice || currency.baselinePrice);
  const netChange = liveNum - baseNum;
  const percentChange = baseNum > 0 ? (netChange / baseNum) * 100 : 0;
  const isGain = netChange >= 0;

  const peakNum = currency.peakPrice ? parseFloat(currency.peakPrice) : baseNum;
  const peakPercent = baseNum > 0 ? ((peakNum - baseNum) / baseNum) * 100 : 0;

  const troughNum = currency.troughPrice ? parseFloat(currency.troughPrice) : baseNum;
  const troughPercent = baseNum > 0 ? ((troughNum - baseNum) / baseNum) * 100 : 0;

  // Exact Elapsed Time string
  const getExactElapsed = () => {
    const diffSec = Math.max(0, Math.floor((currentTime - currency.baselineTimestamp) / 1000));
    const hours = Math.floor(diffSec / 3600);
    const minutes = Math.floor((diffSec % 3600) / 60);
    const seconds = diffSec % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours} ساعة`);
    if (minutes > 0 || hours > 0) parts.push(`${minutes} دقيقة`);
    parts.push(`${seconds} ثانية`);
    return parts.join(' و ');
  };

  // Date formatted
  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleAddSnapshotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddSnapshot(currentLivePrice || currency.baselinePrice, snapshotLabel.trim() || undefined);
    setSnapshotLabel('');
    showToast('تمت إضافة لقطة جديدة للسجل بنجاح');
  };

  const showToast = (msg: string) => {
    setCopySuccessMsg(msg);
    setTimeout(() => {
      setCopySuccessMsg(null);
    }, 2000);
  };

  return (
    <div className="w-full max-w-4xl flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {copySuccessMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4" />
          <span>{copySuccessMsg}</span>
        </div>
      )}

      {/* Navigation Header */}
      <header className="flex items-center justify-between p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
            <span>لوحة الرصد</span>
          </button>

          <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-3">
            <span className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-black text-xs flex items-center justify-center border border-amber-500/30">
              {currency.name.slice(0, 3)}
            </span>
            <div>
              <h1 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{currency.name}</span>
                <span className="text-xs font-mono text-slate-400 font-normal">({currency.binanceSymbol})</span>
              </h1>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                سجل رصد الصعود والقمة والقاع
              </span>
            </div>
          </div>
        </div>

        {/* Live Stream Switch & Calculator Link */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleLiveStream(!isLiveStreamActive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-xs active:scale-95 ${
              isLiveStreamActive
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveStreamActive ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
            <span>{isLiveStreamActive ? 'البث المباشر نشط' : 'البث متوقف'}</span>
          </button>

          <button
            onClick={() => onOpenCalculatorForCurrency(currency.name)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition cursor-pointer shadow-sm shadow-amber-500/20 active:scale-95"
            title="فتح حاسبة الصفقات والتعادل لهذه العملة"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>حاسبة الفروقات</span>
          </button>
        </div>
      </header>

      {/* Live Big Metric Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Metric 1: Current Live Price */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              السعر المباشر الآن (Binance)
            </span>
            <span className="font-mono text-[10px]">USDT</span>
          </div>

          <div className="text-2xl sm:text-3xl font-mono font-black text-slate-900 dark:text-slate-100 tracking-tight text-left py-1" dir="ltr">
            {formatCurrencyPrice(liveNum)}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">التغير منذ الرصد:</span>
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded-lg text-xs ${
                isGain
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              }`}
              dir="ltr"
            >
              {isGain ? '+' : ''}{formatPercent(percentChange)} ({isGain ? '+' : ''}{formatCurrencyPrice(netChange)} USDT)
            </span>
          </div>
        </div>

        {/* Metric 2: Baseline Point */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-amber-500" />
              نقطة الرصد المرجعية (نقطة الصفر)
            </span>
            <span className="font-mono text-[10px]">USDT</span>
          </div>

          <div className="text-2xl sm:text-3xl font-mono font-black text-amber-600 dark:text-amber-400 tracking-tight text-left py-1" dir="ltr">
            {formatCurrencyPrice(baseNum)}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" />
              <span>المدة المنقضية:</span>
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
              {getExactElapsed()}
            </span>
          </div>
        </div>

        {/* Metric 3: Peak & Trough Summary */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              سجل القمة والقاع منذ الرصد
            </span>
          </div>

          <div className="space-y-1.5 py-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                أعلى قمة (Peak):
              </span>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm" dir="ltr">
                  {formatCurrencyPrice(peakNum)}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                  +{formatPercent(peakPercent)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                أدنى قاع (Low):
              </span>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="font-bold text-rose-600 dark:text-rose-400 text-sm" dir="ltr">
                  {formatCurrencyPrice(troughNum)}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
                  {formatPercent(troughPercent)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400 text-left" dir="ltr">
            وقت الرصد: {formatTimestamp(currency.baselineTimestamp)}
          </div>
        </div>
      </div>

      {/* Control Actions & Calculator Exporter */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-amber-500" />
            <span>تصدير الأسعار مباشرة إلى حاسبة الفروقات والصفقات</span>
          </h2>
          <span className="text-[10px] text-slate-400">
            بنقرة واحدة انقل أي سعر إلى حاسبة الفروقات لحساب أرباح كميتك وسعر التعادل
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Action 1: Export Baseline to Entry */}
          <button
            type="button"
            onClick={() => {
              onSendToCalculatorAsEntry(currency.name, currency.baselinePrice);
              showToast(`تم تعيين سعر الرصد (${currency.baselinePrice}) كسعر دخول في الحاسبة`);
            }}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 hover:border-amber-500 hover:bg-amber-500/10 text-right transition cursor-pointer flex flex-col gap-1"
          >
            <span className="text-[10px] text-slate-500 dark:text-slate-400">نقطة الرصد المرجعية:</span>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400" dir="ltr">
                {currency.baselinePrice}
              </span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                تعيين كسعر دخول 📥
              </span>
            </div>
          </button>

          {/* Action 2: Export Peak to Test */}
          <button
            type="button"
            onClick={() => {
              onSendToCalculatorAsTest(currency.name, String(peakNum));
              showToast(`تمت إضافة القمة (${peakNum}) كسعر اختبار في الحاسبة`);
            }}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 hover:border-emerald-500 hover:bg-emerald-500/10 text-right transition cursor-pointer flex flex-col gap-1"
          >
            <span className="text-[10px] text-slate-500 dark:text-slate-400">أعلى قمة تم تسجيلها:</span>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400" dir="ltr">
                {peakNum}
              </span>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                اختبار كهدف ربح 🎯
              </span>
            </div>
          </button>

          {/* Action 3: Export Live Price to Test */}
          <button
            type="button"
            onClick={() => {
              onSendToCalculatorAsTest(currency.name, String(liveNum));
              showToast(`تمت إضافة السعر اللحظي (${liveNum}) كسعر اختبار في الحاسبة`);
            }}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/50 hover:border-sky-500 hover:bg-sky-500/10 text-right transition cursor-pointer flex flex-col gap-1"
          >
            <span className="text-[10px] text-slate-500 dark:text-slate-400">السعر اللحظي الحالي:</span>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-sky-600 dark:text-sky-400" dir="ltr">
                {liveNum}
              </span>
              <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">
                اختبار السعر الآن 🎯
              </span>
            </div>
          </button>

          {/* Action 4: Reset Baseline to Now */}
          <button
            type="button"
            onClick={() => {
              onUpdateBaseline(String(liveNum));
              showToast('تم تحديث نقطة الرصد وتصفير العداد على السعر الحالي بنجاح');
            }}
            className="p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 text-right transition cursor-pointer flex flex-col gap-1 active:scale-95"
          >
            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">بدء موجة جديدة:</span>
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-xs text-amber-700 dark:text-amber-300" dir="ltr">
                {liveNum}
              </span>
              <span className="text-[10px] font-bold text-amber-800 dark:text-amber-200 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                تثبيت كنقطة رصد ⏱️
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Snapshots Log Table */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              سجل اللقطات والنقاط المحفوظة
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              ({currency.snapshots?.length || 0})
            </span>
          </div>

          {/* Add Snapshot Input Form */}
          <form onSubmit={handleAddSnapshotSubmit} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="ملاحظة اختيارية (مثال: اختراق قمة)"
              value={snapshotLabel}
              onChange={(e) => setSnapshotLabel(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500 hover:text-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>حفظ لقطة الآن</span>
            </button>
          </form>
        </div>

        {/* Snapshots List */}
        {(!currency.snapshots || currency.snapshots.length === 0) ? (
          <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            لا توجد لقطات محفوظة بعد في سجل هذه العملة. يمكنك تسجيل لقطات يدوية لمقارنتها في أي وقت.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {currency.snapshots.map((snap) => {
              const snapNum = parseFloat(snap.price);
              const snapDiff = snapNum - baseNum;
              const snapPercent = baseNum > 0 ? (snapDiff / baseNum) * 100 : 0;
              const isSnapGain = snapDiff >= 0;

              return (
                <div key={snap.id} className="p-2.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100" dir="ltr">
                      {formatCurrencyPrice(snapNum)} USDT
                    </span>
                    <span
                      className={`font-mono font-bold text-[10px] px-1.5 py-0.2 rounded ${
                        isSnapGain
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}
                      dir="ltr"
                    >
                      {isSnapGain ? '+' : ''}{formatPercent(snapPercent)}
                    </span>
                    {snap.label && (
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        {snap.label}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatTimestamp(snap.timestamp)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSendToCalculatorAsTest(currency.name, snap.price)}
                      className="p-1 rounded text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition text-[11px] font-bold"
                      title="إرسال هذا السعر كهدف اختبار للحاسبة"
                    >
                      <Target className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSnapshot(snap.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                      title="حذف هذه اللقطة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
