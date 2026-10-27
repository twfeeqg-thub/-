'use client';

import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Trash2, 
  SlidersHorizontal, 
  Info, 
  Palette, 
  Sun, 
  Moon, 
  Laptop, 
  Bell, 
  BellOff, 
  Smartphone, 
  Send,
  TrendingDown,
  Zap,
  Target,
  Sliders,
  AlertTriangle,
  ShieldAlert,
  Repeat,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { FeeCalculationMethod, ThemeMode, AccentColor } from '@/types/currency';
import { useTheme } from '@/context/ThemeContext';
import { useSystemNotification } from '@/hooks/useSystemNotification';
import { 
  getAlertSettings, 
  saveAlertSettings, 
  DEFAULT_ALERT_SETTINGS, 
  AppAlertSettings, 
  AlertTypeId 
} from '@/lib/alertSettings';

export interface DefaultFeeSettings {
  entryFeePercent: string;
  exitFeePercent: string;
  entryFeeFixed: string;
  exitFeeFixed: string;
  feeMethod?: FeeCalculationMethod; // 'cumulative' | 'separate'
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: DefaultFeeSettings;
  onSaveDefaults: (settings: DefaultFeeSettings) => void;
  onClearDefaults: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  onSaveDefaults,
  onClearDefaults,
}) => {
  const { themeMode, setThemeMode, accentColor, setAccentColor } = useTheme();
  const { 
    isGranted: notifGranted, 
    isDenied: notifDenied, 
    requestPermission: requestNotifPermission, 
    sendTestNotification, 
    isTesting: isNotifTesting 
  } = useSystemNotification();

  const [form, setForm] = useState<DefaultFeeSettings>({ 
    ...currentSettings,
    feeMethod: currentSettings.feeMethod || 'cumulative'
  });
  const [alertConfigs, setAlertConfigs] = useState<AppAlertSettings>(() => getAlertSettings());
  const [expandedAlertId, setExpandedAlertId] = useState<AlertTypeId | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleToggleAlert = (id: AlertTypeId) => {
    setAlertConfigs((prev) => {
      const nextEnabled = !prev[id].enabled;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          enabled: nextEnabled,
        },
      };
    });
    // Automatically expand the card when enabled so user can configure repeat/interval
    if (!alertConfigs[id].enabled) {
      setExpandedAlertId(id);
    }
  };

  const handleRepeatModeChange = (id: AlertTypeId, mode: 'once' | 'continuous') => {
    setAlertConfigs((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        repeatMode: mode,
      },
    }));
  };

  const handleIntervalChange = (id: AlertTypeId, seconds: number) => {
    setAlertConfigs((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        intervalSeconds: seconds,
      },
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveDefaults(form);
    saveAlertSettings(alertConfigs);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleClear = () => {
    onClearDefaults();
    setForm({
      entryFeePercent: '',
      exitFeePercent: '',
      entryFeeFixed: '',
      exitFeeFixed: '',
      feeMethod: 'cumulative',
    });
    setAlertConfigs(DEFAULT_ALERT_SETTINGS);
    saveAlertSettings(DEFAULT_ALERT_SETTINGS);
  };

  const accentOptions: { key: AccentColor; name: string; bgClass: string; borderClass: string }[] = [
    { key: 'amber', name: 'ذهبي Binance', bgClass: 'bg-amber-500', borderClass: 'border-amber-500' },
    { key: 'emerald', name: 'أخضر زمردي', bgClass: 'bg-emerald-500', borderClass: 'border-emerald-500' },
    { key: 'cyan', name: 'أزرق سيبراني', bgClass: 'bg-cyan-500', borderClass: 'border-cyan-500' },
    { key: 'violet', name: 'بنفسجي عصري', bgClass: 'bg-violet-500', borderClass: 'border-violet-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl p-5 text-right flex flex-col gap-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              إعدادات التطبيق والمظهر
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* القسم 1: المظهر والألوان (Theme & Accent) */}
        <div className="space-y-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-500" />
              <span>مظهر التطبيق والوضع الليلي</span>
            </span>
          </div>

          {/* Theme Mode: Light / Dark / System */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setThemeMode('system')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                themeMode === 'system'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>تلقائي</span>
            </button>

            <button
              type="button"
              onClick={() => setThemeMode('dark')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                themeMode === 'dark'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>داكن</span>
            </button>

            <button
              type="button"
              onClick={() => setThemeMode('light')}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border ${
                themeMode === 'light'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>فاتح</span>
            </button>
          </div>

          {/* Accent Color Themes */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block">
              لون الثيم المخصص:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {accentOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setAccentColor(opt.key)}
                  className={`p-2 rounded-xl border text-right transition flex items-center justify-between cursor-pointer ${
                    accentColor === opt.key
                      ? 'bg-white dark:bg-slate-900 border-slate-400 dark:border-slate-600 shadow-xs ring-1 ring-amber-500/40'
                      : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-3.5 h-3.5 rounded-full ${opt.bgClass} shadow-xs`}></span>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{opt.name}</span>
                  </div>
                  {accentColor === opt.key && <Check className="w-3.5 h-3.5 text-amber-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          {/* Method Selection: Cumulative vs Separate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                طريقة حساب الرسوم
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                {form.feeMethod === 'separate' ? 'منفصل (مستقل)' : 'تراكمي (مركّب)'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, feeMethod: 'cumulative' })}
                className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  (form.feeMethod || 'cumulative') === 'cumulative'
                    ? 'bg-amber-500/15 border-amber-500 text-slate-900 dark:text-slate-100 shadow-xs ring-1 ring-amber-500/30'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">تراكمي (مركّب)</span>
                  {(form.feeMethod || 'cumulative') === 'cumulative' && (
                    <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  خصم رسوم الشراء من كمية العملة، واقتطاع رسوم البيع من ناتج الصفقة.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, feeMethod: 'separate' })}
                className={`p-2.5 rounded-xl border text-right transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  form.feeMethod === 'separate'
                    ? 'bg-amber-500/15 border-amber-500 text-slate-900 dark:text-slate-100 shadow-xs ring-1 ring-amber-500/30'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">منفصل (مستقل)</span>
                  {form.feeMethod === 'separate' && (
                    <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  الرسوم كبند مستقل دون إنقاص الكمية (مثل سداد الرسوم بـ BNB أو رصيد منفصل).
                </p>
              </button>
            </div>
          </div>

          {/* Default Percentage Fees */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              النسب المئوية الافتراضية (%)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
                  دخول (%)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="مثال: 0.1"
                  value={form.entryFeePercent}
                  onChange={(e) => setForm({ ...form, entryFeePercent: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 text-left font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
                  خروج (%)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="مثال: 0.1"
                  value={form.exitFeePercent}
                  onChange={(e) => setForm({ ...form, exitFeePercent: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 text-left font-mono"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Default Fixed Fees */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              المبالغ الثابتة الافتراضية (USDT)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
                  دخول (USDT)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="مثال: 0.05"
                  value={form.entryFeeFixed}
                  onChange={(e) => setForm({ ...form, entryFeeFixed: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 text-left font-mono"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1">
                  خروج (USDT)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="مثال: 0.05"
                  value={form.exitFeeFixed}
                  onChange={(e) => setForm({ ...form, exitFeeFixed: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-amber-500 text-left font-mono"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* Desktop & Mobile Push Notification API Settings */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>إشعارات النظام (Desktop / Mobile Push)</span>
              </span>
              {notifGranted ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  مفعلة
                </span>
              ) : notifDenied ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-rose-500/15 text-rose-500 border border-rose-500/30">
                  محظورة بالمتصفح
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                  في انتظار الإذن
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              تضمن هذه الميزة ظهور تنبيهات وصول الأسعار وأهداف السكالبينج في شريط إشعارات نظام التشغيل (ويندوز / ماك / أندرويد) حتى عندما يكون المتصفح مصغراً أو التبويب غير نشط.
            </p>

            <div className="flex items-center gap-2 pt-1">
              {!notifGranted ? (
                <button
                  type="button"
                  onClick={requestNotifPermission}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>تفعيل إشعارات سطح المكتب والهاتف</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={sendTestNotification}
                  disabled={isNotifTesting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-300 dark:hover:bg-slate-600 transition cursor-pointer"
                >
                  <Send className={`w-3.5 h-3.5 text-amber-500 ${isNotifTesting ? 'animate-bounce' : ''}`} />
                  <span>{isNotifTesting ? 'جاري إرسال الإشعار التجريبي...' : 'إرسال إشعار تجريبي لاختبار الخلفية 🚀'}</span>
                </button>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* قسم إدارة التنبيهات المخصص (Alerts Control Center - الوضع الافتراضي مغلق) */}
          {/* ========================================================================= */}
          <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-black text-slate-900 dark:text-slate-100">
                  تخصيص التنبيهات الفردية
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                مغلقة افتراضياً
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              يمكنك هنا تفعيل أو تعطيل كل تنبيه بشكل مستقل، وتحديد وضع التكرار (مرة واحدة أو باستمرار) مع ضبط الفاصل الزمني للتكرار.
            </p>

            <div className="space-y-2.5">
              {(Object.keys(alertConfigs) as AlertTypeId[]).map((typeId) => {
                const cfg = alertConfigs[typeId];
                const isExpanded = expandedAlertId === typeId || cfg.enabled;

                const getIcon = () => {
                  switch (typeId) {
                    case 'bottomDetection':
                      return <TrendingDown className="w-4 h-4 text-amber-500 shrink-0" />;
                    case 'reboundBounce':
                      return <Zap className="w-4 h-4 text-emerald-500 shrink-0" />;
                    case 'targetExit':
                      return <Target className="w-4 h-4 text-pink-500 shrink-0" />;
                    case 'chartLines':
                      return <Sliders className="w-4 h-4 text-cyan-500 shrink-0" />;
                    case 'trailingPeak':
                      return <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />;
                    case 'breakEvenStop':
                      return <ShieldAlert className="w-4 h-4 text-violet-500 shrink-0" />;
                    default:
                      return <Bell className="w-4 h-4 text-amber-500 shrink-0" />;
                  }
                };

                return (
                  <div
                    key={typeId}
                    className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                      cfg.enabled
                        ? 'bg-white dark:bg-slate-900/90 border-amber-500/40 shadow-xs'
                        : 'bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-85'
                    }`}
                  >
                    {/* Header Row: Icon, Title & Toggle Switch */}
                    <div className="p-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getIcon()}
                        <div className="min-w-0">
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block truncate">
                            {cfg.name}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                            {cfg.description}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleAlert(typeId)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          cfg.enabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        title={cfg.enabled ? 'إيقاف هذا التنبيه' : 'تفعيل هذا التنبيه'}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            cfg.enabled ? '-translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Expandable Configuration Panel when Enabled */}
                    {cfg.enabled && (
                      <div className="p-2.5 pt-0 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 space-y-2 mt-1">
                        {/* Repeat Mode Choice: Once vs Continuous */}
                        <div className="space-y-1 pt-1.5">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <Repeat className="w-3 h-3 text-amber-500" />
                            <span>تكرار التنبيه:</span>
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleRepeatModeChange(typeId, 'once')}
                              className={`py-1 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                                cfg.repeatMode === 'once'
                                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <span>مرة واحدة فقط</span>
                              {cfg.repeatMode === 'once' && <Check className="w-3 h-3 stroke-[2.5]" />}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRepeatModeChange(typeId, 'continuous')}
                              className={`py-1 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer border ${
                                cfg.repeatMode === 'continuous'
                                  ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <span>تكرار مستمر</span>
                              {cfg.repeatMode === 'continuous' && <Check className="w-3 h-3 stroke-[2.5]" />}
                            </button>
                          </div>
                        </div>

                        {/* Interval Selector if Continuous */}
                        {cfg.repeatMode === 'continuous' && (
                          <div className="space-y-1 pt-1 animate-in fade-in duration-150">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-500" />
                                <span>الفاصل الزمني للتكرار:</span>
                              </span>
                              <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                                {cfg.intervalSeconds < 60
                                  ? `كل ${cfg.intervalSeconds} ثانية`
                                  : `كل ${Math.round(cfg.intervalSeconds / 60)} دقيقة`}
                              </span>
                            </div>

                            <div className="grid grid-cols-6 gap-1">
                              {[
                                { sec: 15, label: '15ث' },
                                { sec: 30, label: '30ث' },
                                { sec: 60, label: '1د' },
                                { sec: 180, label: '3د' },
                                { sec: 300, label: '5د' },
                                { sec: 600, label: '10د' },
                              ].map(({ sec, label }) => (
                                <button
                                  key={sec}
                                  type="button"
                                  onClick={() => handleIntervalChange(typeId, sec)}
                                  className={`py-1 rounded-lg text-[10px] font-mono font-bold transition border cursor-pointer ${
                                    cfg.intervalSeconds === sec
                                      ? 'bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-300'
                                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400'
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition cursor-pointer active:scale-95"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  تم الحفظ بنجاح
                </>
              ) : (
                'حفظ الإعدادات'
              )}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
              title="إعادة ضبط للافتراضي"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
