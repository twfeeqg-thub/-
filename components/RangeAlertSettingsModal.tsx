'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RangeAlertConfig, DEFAULT_RANGE_ALERT_CONFIG } from '@/types/rangeScalper';
import { AlertToneId } from '@/lib/soundAlert';
import { SoundToneSelector } from './SoundToneSelector';
import { 
  Bell, 
  BellOff, 
  X, 
  Check, 
  Radio, 
  ArrowUpRight, 
  ArrowDownRight, 
  RotateCw, 
  Crosshair,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

interface RangeAlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencyName: string;
  binanceSymbol: string;
  troughPrice: number;
  peakPrice: number;
  currentAlertConfig?: RangeAlertConfig;
  onSaveConfig: (newConfig: RangeAlertConfig) => void;
}

const RangeAlertSettingsModalContent: React.FC<Omit<RangeAlertSettingsModalProps, 'isOpen'>> = ({
  onClose,
  currencyName,
  binanceSymbol,
  troughPrice,
  peakPrice,
  currentAlertConfig,
  onSaveConfig,
}) => {
  const initialConfig = currentAlertConfig || DEFAULT_RANGE_ALERT_CONFIG;

  const [enabled, setEnabled] = useState<boolean>(initialConfig.enabled);
  const [triggerAtTrough, setTriggerAtTrough] = useState<boolean>(initialConfig.triggerAtTrough);
  const [triggerNearTrough, setTriggerNearTrough] = useState<boolean>(initialConfig.triggerNearTrough);
  const [nearTroughPercent, setNearTroughPercent] = useState<number>(initialConfig.nearTroughPercent || 0.5);
  const [triggerBounceConfirmation, setTriggerBounceConfirmation] = useState<boolean>(initialConfig.triggerBounceConfirmation);
  const [bounceConfirmationPercent, setBounceConfirmationPercent] = useState<number>(initialConfig.bounceConfirmationPercent || 0.4);
  const [triggerAtPeak, setTriggerAtPeak] = useState<boolean>(initialConfig.triggerAtPeak);
  const [triggerNearPeak, setTriggerNearPeak] = useState<boolean>(initialConfig.triggerNearPeak);
  const [nearPeakPercent, setNearPeakPercent] = useState<number>(initialConfig.nearPeakPercent || 0.5);
  const [triggerCustomPrice, setTriggerCustomPrice] = useState<boolean>(initialConfig.triggerCustomPrice);
  const [customPrice, setCustomPrice] = useState<string>(initialConfig.customPrice ? initialConfig.customPrice.toString() : '');
  const [repeatMode, setRepeatMode] = useState<'once' | 'continuous'>(initialConfig.repeatMode);
  const [repeatIntervalMinutes, setRepeatIntervalMinutes] = useState<number>(initialConfig.repeatIntervalMinutes || 5);
  const [selectedTone, setSelectedTone] = useState<AlertToneId>((initialConfig.toneId as AlertToneId) || 'system');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    const config: RangeAlertConfig = {
      enabled,
      triggerAtTrough,
      triggerNearTrough,
      nearTroughPercent: Number(nearTroughPercent) || 0.5,
      triggerBounceConfirmation,
      bounceConfirmationPercent: Number(bounceConfirmationPercent) || 0.4,
      triggerAtPeak,
      triggerNearPeak,
      nearPeakPercent: Number(nearPeakPercent) || 0.5,
      triggerCustomPrice,
      customPrice: parseFloat(customPrice) || undefined,
      repeatMode,
      repeatIntervalMinutes: Number(repeatIntervalMinutes) || 5,
      toneId: selectedTone,
    };
    onSaveConfig(config);
    onClose();
  };

  // أسعار استرشادية للحالات
  const nearTroughPriceEstimate = troughPrice * (1 + (nearTroughPercent / 100));
  const bouncePriceEstimate = troughPrice * (1 + (bounceConfirmationPercent / 100));
  const nearPeakPriceEstimate = peakPrice * (1 - (nearPeakPercent / 100));

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto animate-fade-in"
      dir="rtl"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg my-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER - Always pinned at top */}
        <div className="flex-shrink-0 flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 sticky top-0 z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center font-bold flex-shrink-0 ${
              enabled ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 truncate">
                  تنبيهات {currencyName}
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  {binanceSymbol}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                تحديد حالات وشروط التنبيه بدقة عند القاع والقمة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition cursor-pointer flex-shrink-0"
            aria-label="إغلاق النافذة"
            title="إغلاق"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain touch-pan-y space-y-3.5 flex-1 text-xs">
          {/* 1. MASTER TOGGLE (مفتاح التفعيل الرئيسي) */}
          <div className="p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl flex-shrink-0 ${enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                {enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  مفتاح التنبيه الذكي للعملة
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {enabled ? 'تنبيهات العملة تعمل وتراقب السوق' : 'التنبيهات متوقفة حالياً'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ${
                enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabled ? '-translate-x-6' : '-translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* 2. TRIGGER CONDITIONS (شروط وحالات التنبيه) */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
              حالات التنبيه المفعلة:
            </span>

            {/* A. DIPS & TROUGHS SECTION (القيعان والدخول) */}
            <div className="p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/5 space-y-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span>شروط القاع والدخول (الشراء)</span>
              </span>

              {/* Condition 1: عند القاع بدقة */}
              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-850 transition cursor-pointer gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={triggerAtTrough}
                    onChange={(e) => setTriggerAtTrough(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer flex-shrink-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      عند ملامسة القاع المستهدف بدقة
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                      السعر: ${troughPrice} USDT
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 flex-shrink-0">
                  شراء مثالي
                </span>
              </label>

              {/* Condition 2: عند الاقتراب من القاع */}
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={triggerNearTrough}
                      onChange={(e) => setTriggerNearTrough(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer flex-shrink-0"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        عند الاقتراب من القاع (تأهب مسبق)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        تنبيه قبل الوصول للقاع للاستعداد
                      </span>
                    </div>
                  </label>
                  <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 flex-shrink-0">
                    ~${nearTroughPriceEstimate.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center gap-2 pl-6">
                  <span className="text-[11px] text-slate-500">فارق الاقتراب:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5"
                    value={nearTroughPercent}
                    onChange={(e) => setNearTroughPercent(parseFloat(e.target.value) || 0.5)}
                    className="w-16 px-2 py-0.5 text-xs font-mono font-bold text-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                  <span className="text-xs text-slate-500 font-bold">% فوق القاع</span>
                </div>
              </div>

              {/* Condition 3: عند تأكيد الارتداد عن القاع */}
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={triggerBounceConfirmation}
                      onChange={(e) => setTriggerBounceConfirmation(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer flex-shrink-0"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        عند تأكيد الارتداد صعوداً من القاع 🚀
                      </span>
                      <span className="text-[10px] text-slate-500">
                        تأكيد الصعود بدلاً من اصطياد السكاكين الساقطة
                      </span>
                    </div>
                  </label>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                    +${bouncePriceEstimate.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center gap-2 pl-6">
                  <span className="text-[11px] text-slate-500">نسبة الارتداد:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5"
                    value={bounceConfirmationPercent}
                    onChange={(e) => setBounceConfirmationPercent(parseFloat(e.target.value) || 0.4)}
                    className="w-16 px-2 py-0.5 text-xs font-mono font-bold text-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                  <span className="text-xs text-slate-500 font-bold">% صعوداً من القاع</span>
                </div>
              </div>
            </div>

            {/* B. PEAKS & TARGETS SECTION (القمم وجني الأرباح) */}
            <div className="p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/5 space-y-2">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>شروط القمة والخروج (جني الأرباح)</span>
              </span>

              {/* Condition 4: عند القمة بدقة */}
              <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-850 transition cursor-pointer gap-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={triggerAtPeak}
                    onChange={(e) => setTriggerAtPeak(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer flex-shrink-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      عند ملامسة القمة المستهدفة بدقة
                    </span>
                    <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                      السعر: ${peakPrice} USDT
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex-shrink-0">
                  بيع وجني ربح
                </span>
              </label>

              {/* Condition 5: عند الاقتراب من القمة */}
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={triggerNearPeak}
                      onChange={(e) => setTriggerNearPeak(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer flex-shrink-0"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        عند الاقتراب من القمة (استعداد للخروج)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        تنبيه قبل بلوغ القمة لحماية الأرباح
                      </span>
                    </div>
                  </label>
                  <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 flex-shrink-0">
                    ~${nearPeakPriceEstimate.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center gap-2 pl-6">
                  <span className="text-[11px] text-slate-500">فارق الاقتراب:</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="5"
                    value={nearPeakPercent}
                    onChange={(e) => setNearPeakPercent(parseFloat(e.target.value) || 0.5)}
                    className="w-16 px-2 py-0.5 text-xs font-mono font-bold text-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                  />
                  <span className="text-xs text-slate-500 font-bold">% قبل القمة</span>
                </div>
              </div>

              {/* Condition 6: عند سعر مخصص يدوي */}
              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={triggerCustomPrice}
                    onChange={(e) => setTriggerCustomPrice(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer flex-shrink-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      عند سعر يدوي مخصص من قبلك
                    </span>
                    <span className="text-[10px] text-slate-500">
                      اكتب أي سعر محدد تفضله
                    </span>
                  </div>
                </label>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    disabled={!triggerCustomPrice}
                    className="w-24 px-2 py-1 text-xs font-mono font-bold text-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 disabled:opacity-50"
                  />
                  <span className="text-xs font-bold text-slate-500">$</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. REPEAT & FREQUENCY SECTION */}
          <div className="p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
              تكرار إرسال التنبيه:
            </span>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setRepeatMode('once')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  repeatMode === 'once'
                    ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                مرة واحدة فقط (صامت بعدها)
              </button>

              <button
                type="button"
                onClick={() => setRepeatMode('continuous')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  repeatMode === 'continuous'
                    ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                باستمرار عند الملامسة
              </button>
            </div>

            {repeatMode === 'continuous' && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500">
                  الفاصل الزمني بين التنبيهات المتكررة:
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={repeatIntervalMinutes}
                    onChange={(e) => setRepeatIntervalMinutes(parseInt(e.target.value, 10) || 5)}
                    className="w-16 px-2 py-0.5 text-xs font-mono font-bold text-center rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                  />
                  <span className="text-xs text-slate-500 font-bold">دقيقة</span>
                </div>
              </div>
            )}
          </div>

          {/* 4. SOUND TONE SELECTION WITH NATIVE DEVICE TONE & CUSTOM FILE UPLOAD */}
          <div className="p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
            <SoundToneSelector
              selectedTone={selectedTone}
              onSelectTone={setSelectedTone}
              title="نغمة التنبيه الصوتي للعملة:"
            />
          </div>
        </div>

        {/* MODAL FOOTER - Always pinned at bottom */}
        <div className="flex-shrink-0 p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 flex items-center justify-between gap-3 sticky bottom-0 z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleSave();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-amber-400/20"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>حفظ إعدادات التنبيه</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export const RangeAlertSettingsModal: React.FC<RangeAlertSettingsModalProps> = (props) => {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!props.isOpen || !mounted) return null;

  return <RangeAlertSettingsModalContent {...props} />;
};
