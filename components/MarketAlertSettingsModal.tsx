'use client';

import React, { useState } from 'react';
import { MarketAlertConfig, DEFAULT_MARKET_ALERT_CONFIG } from '@/types/marketSessions';
import { soundAlert, ALERT_TONE_OPTIONS, AlertToneId } from '@/lib/soundAlert';
import { 
  Bell, 
  BellOff, 
  X, 
  Check, 
  Volume2, 
  Sliders, 
  Sparkles,
  Flame,
  Globe,
  Clock
} from 'lucide-react';

interface MarketAlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: MarketAlertConfig;
  onSaveConfig: (newConfig: MarketAlertConfig) => void;
}

export const MarketAlertSettingsModal: React.FC<MarketAlertSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [enabled, setEnabled] = useState<boolean>(config.enabled);
  const [notifyOnSessionOpen, setNotifyOnSessionOpen] = useState<boolean>(config.notifyOnSessionOpen);
  const [notifyOnSessionClose, setNotifyOnSessionClose] = useState<boolean>(config.notifyOnSessionClose);
  const [notifyOnGoldenOverlap, setNotifyOnGoldenOverlap] = useState<boolean>(config.notifyOnGoldenOverlap);
  const [preOpenNoticeMinutes, setPreOpenNoticeMinutes] = useState<number>(config.preOpenNoticeMinutes || 15);
  const [selectedTone, setSelectedTone] = useState<AlertToneId>((config.soundTone as AlertToneId) || 'bell');

  if (!isOpen) return null;

  const handleTestTone = (tone: AlertToneId) => {
    soundAlert.playTone(tone);
  };

  const handleSave = () => {
    onSaveConfig({
      enabled,
      notifyOnSessionOpen,
      notifyOnSessionClose,
      notifyOnGoldenOverlap,
      preOpenNoticeMinutes: Number(preOpenNoticeMinutes) || 15,
      soundTone: selectedTone,
    });
    onClose();
  };

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
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold ${
              enabled ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                تنبيهات البورصات وتدفق السيولة العالمية
              </h3>
              <p className="text-xs text-slate-500">
                تنبيه صوتي وإشعار عند افتتاح الجلسات أو دخول ذروة السيولة
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

        {/* BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Master Toggle */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                {enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  مفتاح تنبيهات الجلسات (مغلق افتراضياً)
                </span>
                <span className="text-[11px] text-slate-500">
                  {enabled ? 'التنبيهات مفعلة وستنطلق في المواعيد المحددة' : 'التنبيهات معطلة ومغلقة تماماً'}
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

          {/* Trigger Cases */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
              حالات التنبيه المطلوبة:
            </span>

            {/* Case 1: Golden Overlap */}
            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={notifyOnGoldenOverlap}
                  onChange={(e) => setNotifyOnGoldenOverlap(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-500 fill-current" />
                    <span>تنبيه دخول ذروة السيولة العالمية (لندن + نيويورك)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    يومياً من 04:30 عصراً حتى 07:30 مساءً بتوقيت مكة
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                موصى به للسكالبينج
              </span>
            </label>

            {/* Case 2: Session Open */}
            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={notifyOnSessionOpen}
                  onChange={(e) => setNotifyOnSessionOpen(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    تنبيه عند افتتاح أي جلسة بورصة رئيسية
                  </span>
                  <span className="text-[10px] text-slate-500">
                    إشعار لحظي فور افتتاح سيدني، طوكيو، لندن، أو نيويورك
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500">
                افتتاح
              </span>
            </label>

            {/* Case 3: Session Close */}
            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={notifyOnSessionClose}
                  onChange={(e) => setNotifyOnSessionClose(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    تنبيه عند إغلاق الجلسة ودخول فترة الهدوء
                  </span>
                  <span className="text-[10px] text-slate-500">
                    للحذر من تراجع السيولة وإغلاق الصفقات المعلقة
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-400">
                إغلاق
              </span>
            </label>

            {/* Case 4: Pre-open reminder */}
            <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  تذكير مبكر قبل افتتاح السوق بعدة دقائق
                </span>
                <span className="text-[10px] text-slate-500">
                  للاستعداد وفتح الشاشات قبل بدء التحركات العنيفة
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="5"
                  max="60"
                  step="5"
                  value={preOpenNoticeMinutes}
                  onChange={(e) => setPreOpenNoticeMinutes(Number(e.target.value) || 15)}
                  className="w-16 px-2 py-1 text-xs font-mono font-bold text-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700"
                />
                <span className="text-xs text-slate-500 font-bold">دقيقة</span>
              </div>
            </div>
          </div>

          {/* Sound Selection */}
          <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
              نغمة التنبيه الصوتي للجلسات:
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
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
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
