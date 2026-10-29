'use client';

import React, { useState } from 'react';
import { RangeAlertConfig, DEFAULT_RANGE_ALERT_CONFIG } from '@/types/rangeScalper';
import { soundAlert, ALERT_TONE_OPTIONS, AlertToneId } from '@/lib/soundAlert';
import { 
  Bell, 
  BellOff, 
  X, 
  Check, 
  Volume2, 
  Radio, 
  Sliders, 
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

export const RangeAlertSettingsModal: React.FC<RangeAlertSettingsModalProps> = ({
  isOpen,
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
  const [selectedTone, setSelectedTone] = useState<AlertToneId>((initialConfig.toneId as AlertToneId) || 'celebration');

  if (!isOpen) return null;

  const handleTestTone = (tone: AlertToneId) => {
    soundAlert.playTone(tone);
  };

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

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in"
      dir="rtl"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold ${
              enabled ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                  إعدادات التنبيه الذكي لـ {currencyName}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  {binanceSymbol}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                تحديد حالات وشروط التنبيه بدقة عند القاع والقمة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* 1. MASTER TOGGLE (مفتاح التفعيل الرئيسي) */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                {enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  الحالة العامة للتنبيه
                </span>
                <span className="text-[11px] text-slate-500">
                  {enabled ? 'التنبيهات مفعلة وستنطلق عند تحقق الشروط المحددة' : 'التنبيهات معطلة ومغلقة افتراضياً'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
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

          {/* 2. TRIGGER CONDITIONS SECTION */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                شروط وحالات إطلاق التنبيه:
              </span>
              <span className="text-[10px] text-slate-500">
                القاع: ${troughPrice} • القمة: ${peakPrice}
              </span>
            </div>

            <div className="space-y-2">
              {/* Condition 1: عند القاع بدقة */}
              <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={triggerAtTrough}
                    onChange={(e) => setTriggerAtTrough(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
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
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500">
                  شراء مثالي
                </span>
              </label>

              {/* Condition 2: عند الاقتراب من القاع */}
              <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={triggerNearTrough}
                      onChange={(e) => setTriggerNearTrough(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
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
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      value={nearTroughPercent}
                      onChange={(e) => setNearTroughPercent(parseFloat(e.target.value) || 0.5)}
                      disabled={!triggerNearTrough}
                      className="w-16 px-2 py-1 text-xs font-mono font-bold text-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 disabled:opacity-50"
                    />
                    <span className="text-xs font-bold text-slate-500">%</span>
                  </div>
                </div>
                {triggerNearTrough && (
                  <p className="text-[10px] text-slate-400 font-mono pr-7">
                    ينطلق التنبيه عند وصول السعر إلى: ~${nearTroughPriceEstimate.toFixed(4)} USDT
                  </p>
                )}
              </div>

              {/* Condition 3: تأكيد الارتداد صعوداً من القاع */}
              <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={triggerBounceConfirmation}
                      onChange={(e) => setTriggerBounceConfirmation(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        تأكيد الارتداد صعوداً بعد القاع (Bounce)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        التأكد من ارتداد السعر وتفادي كسر القاع
                      </span>
                    </div>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      value={bounceConfirmationPercent}
                      onChange={(e) => setBounceConfirmationPercent(parseFloat(e.target.value) || 0.4)}
                      disabled={!triggerBounceConfirmation}
                      className="w-16 px-2 py-1 text-xs font-mono font-bold text-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 disabled:opacity-50"
                    />
                    <span className="text-xs font-bold text-slate-500">%</span>
                  </div>
                </div>
                {triggerBounceConfirmation && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono pr-7">
                    ينطلق التنبيه بعد الارتداد وتخطي سعر: ~${bouncePriceEstimate.toFixed(4)} USDT
                  </p>
                )}
              </div>

              {/* Condition 4: عند القمة بدقة */}
              <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={triggerAtPeak}
                    onChange={(e) => setTriggerAtPeak(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                      عند وصول القمة المستهدفة بدقة
                    </span>
                    <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">
                      السعر: ${peakPrice} USDT
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-500">
                  جني ربح
                </span>
              </label>

              {/* Condition 5: عند الاقتراب من القمة */}
              <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={triggerNearPeak}
                      onChange={(e) => setTriggerNearPeak(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        عند الاقتراب من القمة (قبل الانعكاس)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        تنبيه قبل القمة للخروج الآمن
                      </span>
                    </div>
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="10"
                      value={nearPeakPercent}
                      onChange={(e) => setNearPeakPercent(parseFloat(e.target.value) || 0.5)}
                      disabled={!triggerNearPeak}
                      className="w-16 px-2 py-1 text-xs font-mono font-bold text-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 disabled:opacity-50"
                    />
                    <span className="text-xs font-bold text-slate-500">%</span>
                  </div>
                </div>
                {triggerNearPeak && (
                  <p className="text-[10px] text-slate-400 font-mono pr-7">
                    ينطلق التنبيه عند وصول السعر إلى: ~${nearPeakPriceEstimate.toFixed(4)} USDT
                  </p>
                )}
              </div>

              {/* Condition 6: عند سعر مخصص يدوي */}
              <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={triggerCustomPrice}
                      onChange={(e) => setTriggerCustomPrice(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                        تنبيه عند سعر مخصص يدوي
                      </span>
                      <span className="text-[10px] text-slate-500">
                        اكتب أي سعر محدد تفضله
                      </span>
                    </div>
                  </label>
                  <div className="flex items-center gap-1">
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
          </div>

          {/* 3. REPEAT & FREQUENCY SECTION */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
              تكرار إرسال التنبيه:
            </span>
            <div className="grid grid-cols-2 gap-2 mb-3">
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
                    onChange={(e) => setRepeatIntervalMinutes(Number(e.target.value) || 5)}
                    className="w-16 px-2 py-1 text-xs font-mono font-bold text-center rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                  />
                  <span className="text-xs text-slate-500">دقائق</span>
                </div>
              </div>
            )}
          </div>

          {/* 4. SOUND TONE SELECTION */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
              نغمة التنبيه الصوتي:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALERT_TONE_OPTIONS.map((opt) => (
                <div
                  key={opt.id}
                  className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                    selectedTone === opt.id
                      ? 'bg-amber-400/15 border-amber-500 text-slate-950 dark:text-amber-300 font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                  onClick={() => setSelectedTone(opt.id)}
                >
                  <span className="text-[11px] truncate">{opt.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTestTone(opt.id);
                    }}
                    className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    title="استماع للنغمة"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-amber-400/20"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            <span>حفظ إعدادات التنبيه</span>
          </button>
        </div>
      </div>
    </div>
  );
};
