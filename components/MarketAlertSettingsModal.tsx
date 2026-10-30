'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MarketAlertConfig } from '@/types/marketSessions';
import { soundAlert, ALERT_TONE_OPTIONS, AlertToneId } from '@/lib/soundAlert';
import { 
  Bell, 
  BellOff, 
  X, 
  Check, 
  Flame, 
  Globe 
} from 'lucide-react';
import { SoundToneSelector } from './SoundToneSelector';

interface MarketAlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: MarketAlertConfig;
  onSaveConfig: (newConfig: MarketAlertConfig) => void;
}

const MarketAlertSettingsModalContent: React.FC<Omit<MarketAlertSettingsModalProps, 'isOpen'>> = ({
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
        {/* HEADER - Always pinned at top */}
        <div className="flex-shrink-0 flex items-center justify-between p-3.5 sm:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl flex items-center justify-center font-bold flex-shrink-0 ${
              enabled ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
            }`}>
              <Globe className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100 leading-tight">
                تنبيهات البورصات وتدفق السيولة
              </h3>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                تنبيه صوتي وإشعار عند افتتاح الجلسات أو ذروة السيولة
              </p>
            </div>
          </div>

          {/* Close X Button - prominent and easily clickable on mobile */}
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

        {/* BODY - Smoothly scrollable on all screen sizes */}
        <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain touch-pan-y space-y-3.5 flex-1 text-xs">
          {/* Master Toggle */}
          <div className="p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl flex-shrink-0 ${enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                {enabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  مفتاح تنبيهات الجلسات (مغلق افتراضياً)
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {enabled ? 'التنبيهات مفعلة وستنطلق في المواعيد المحددة' : 'التنبيهات معطلة ومغلقة تماماً'}
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

          {/* Trigger Cases */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1">
              حالات التنبيه المطلوبة:
            </span>

            {/* Case 1: Golden Overlap */}
            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer gap-2">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={notifyOnGoldenOverlap}
                  onChange={(e) => setNotifyOnGoldenOverlap(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer flex-shrink-0"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                    <Flame className="w-3.5 h-3.5 text-amber-500 fill-current" />
                    <span>تنبيه ذروة السيولة العالمية (لندن + نيويورك)</span>
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    يومياً من 04:30 عصراً حتى 07:30 مساءً بتوقيت مكة
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex-shrink-0">
                سكالبينج
              </span>
            </label>

            {/* Case 2: Session Open */}
            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer gap-2">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={notifyOnSessionOpen}
                  onChange={(e) => setNotifyOnSessionOpen(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer flex-shrink-0"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    تنبيه عند افتتاح أي جلسة بورصة رئيسية
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    إشعار لحظي فور افتتاح سيدني، طوكيو، لندن، أو نيويورك
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 flex-shrink-0">
                افتتاح
              </span>
            </label>

            {/* Case 3: Session Close */}
            <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer gap-2">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={notifyOnSessionClose}
                  onChange={(e) => setNotifyOnSessionClose(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer flex-shrink-0"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    تنبيه عند إغلاق الجلسة ودخول فترة الهدوء
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    للحذر من تراجع السيولة وإغلاق الصفقات المعلقة
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-400 flex-shrink-0">
                إغلاق
              </span>
            </label>

            {/* Case 4: Pre-open reminder */}
            <div className="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  تذكير مبكر قبل افتتاح السوق بعدة دقائق
                </span>
                <span className="text-[10px] text-slate-500 block">
                  للاستعداد وفتح الشاشات قبل بدء التحركات
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
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

          {/* Sound Selection with Native Device Tone & Custom File Upload */}
          <div className="p-3 sm:p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40">
            <SoundToneSelector
              selectedTone={selectedTone}
              onSelectTone={setSelectedTone}
              title="نغمة التنبيه الصوتي للجلسات:"
            />
          </div>
        </div>

        {/* FOOTER - Always pinned at bottom */}
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

export const MarketAlertSettingsModal: React.FC<MarketAlertSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!isOpen || !mounted) return null;

  return (
    <MarketAlertSettingsModalContent
      onClose={onClose}
      config={config}
      onSaveConfig={onSaveConfig}
    />
  );
};
