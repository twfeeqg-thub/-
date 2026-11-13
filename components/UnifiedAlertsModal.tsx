'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  BellOff,
  X,
  Minimize2,
  Maximize2,
  RotateCcw,
  GripHorizontal,
  ArrowUpRight,
  Volume2,
  VolumeX,
  Send,
  Cloud,
  RefreshCw,
  Copy,
  Check,
  Repeat,
  Clock,
  Radio,
  Trash2,
  Smartphone,
} from 'lucide-react';
import {
  UnifiedAlertItem,
  UnifiedAlertSource,
  collectAllUnifiedAlerts,
  toggleUnifiedAlert,
  updateUnifiedAlertConfig,
  resetAllUnifiedFiringHistory,
  EVENT_UNIFIED_ALERTS_CHANGED,
  EVENT_RANGE_TRADES_CHANGED,
  EVENT_CHART_ALERTS_CHANGED,
  EVENT_MARKET_ALERTS_CHANGED,
  EVENT_OPEN_UNIFIED_ALERTS,
} from '@/lib/unifiedAlerts';
import {
  CloudAlertsConfig,
  getCloudAlertsConfig,
  saveCloudAlertsConfig,
  buildCloudAlertRules,
  subscribeBrowserWebPush,
  syncAlertsToExternalServer,
} from '@/lib/cloudAlertsSync';
import { CLOUDFLARE_WORKER_SOURCE } from '@/lib/cloudflareWorkerTemplate';
import { soundAlert, ALERT_TONE_OPTIONS, AlertToneId } from '@/lib/soundAlert';
import { systemNotification } from '@/lib/systemNotification';
import { useSystemNotification } from '@/hooks/useSystemNotification';
import { trimTrailingZeros } from '@/lib/calculator';

export type UnifiedAlertsFilterTab = UnifiedAlertSource | 'all' | 'cloud';

interface UnifiedAlertsModalProps {
  isOpen: boolean;
  initialTab?: UnifiedAlertsFilterTab;
  livePrices?: Record<string, string>;
  onClose: () => void;
  onNavigateToSource: (item: UnifiedAlertItem) => void;
}

const DEFAULT_SIZE = { width: 540, height: 640 };
const emptySubscribe = () => () => {};

function getCenteredPosition(): { x: number; y: number } {
  if (typeof window === 'undefined') return { x: 24, y: 56 };
  const w = Math.min(DEFAULT_SIZE.width, window.innerWidth - 24);
  const h = Math.min(DEFAULT_SIZE.height, window.innerHeight - 80);
  return {
    x: Math.max(12, Math.round((window.innerWidth - w) / 2)),
    y: Math.max(16, Math.round((window.innerHeight - h) / 2)),
  };
}

export const UnifiedAlertsModal: React.FC<UnifiedAlertsModalProps> = (props) => {
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  if (!mounted || !props.isOpen) return null;
  return <UnifiedAlertsModalInner {...props} />;
};

const UnifiedAlertsModalInner: React.FC<UnifiedAlertsModalProps> = ({
  initialTab = 'all',
  livePrices = {},
  onClose,
  onNavigateToSource,
}) => {
  const {
    isGranted: notifGranted,
    isDenied: notifDenied,
    requestPermission: requestNotifPermission,
    sendTestNotification,
    isTesting: isNotifTesting,
  } = useSystemNotification();

  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<UnifiedAlertsFilterTab>(initialTab);
  const [alerts, setAlerts] = useState<UnifiedAlertItem[]>(() => collectAllUnifiedAlerts());
  const [isMuted, setIsMuted] = useState(() => soundAlert.getMuted());
  const [isKeepAlive, setIsKeepAlive] = useState(() => soundAlert.isBackgroundAudioActive());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Cloud Config State
  const [cloudConfig, setCloudConfig] = useState<CloudAlertsConfig>(() => getCloudAlertsConfig());
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [showWorkerGuide, setShowWorkerGuide] = useState(false);
  const [copiedWorkerCode, setCopiedWorkerCode] = useState(false);

  // Floating Window Position
  const [position, setPosition] = useState<{ x: number; y: number }>(() => getCenteredPosition());
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ startX: 0, startY: 0, origX: 0, origY: 0 });
  const hasMovedDuringDragRef = useRef(false);

  const centerWindow = useCallback(() => {
    setPosition(getCenteredPosition());
  }, []);

  const refreshAllAlerts = useCallback(() => {
    setAlerts(collectAllUnifiedAlerts());
    setIsMuted(soundAlert.getMuted());
    setIsKeepAlive(soundAlert.isBackgroundAudioActive());
  }, []);

  useEffect(() => {
    const handler = () => refreshAllAlerts();
    const openHandler = (e: Event) => {
      const customEvt = e as CustomEvent<{ tab?: UnifiedAlertsFilterTab }>;
      if (customEvt?.detail?.tab) {
        setActiveTab(customEvt.detail.tab);
      }
      setIsMinimized(false);
      refreshAllAlerts();
    };

    window.addEventListener(EVENT_UNIFIED_ALERTS_CHANGED, handler);
    window.addEventListener(EVENT_RANGE_TRADES_CHANGED, handler);
    window.addEventListener(EVENT_CHART_ALERTS_CHANGED, handler);
    window.addEventListener(EVENT_MARKET_ALERTS_CHANGED, handler);
    window.addEventListener(EVENT_OPEN_UNIFIED_ALERTS, openHandler);

    return () => {
      window.removeEventListener(EVENT_UNIFIED_ALERTS_CHANGED, handler);
      window.removeEventListener(EVENT_RANGE_TRADES_CHANGED, handler);
      window.removeEventListener(EVENT_CHART_ALERTS_CHANGED, handler);
      window.removeEventListener(EVENT_MARKET_ALERTS_CHANGED, handler);
      window.removeEventListener(EVENT_OPEN_UNIFIED_ALERTS, openHandler);
    };
  }, [refreshAllAlerts]);

  // Drag Handling (Window Header & Minimized Floating Pill)
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragOffsetRef.current.startX;
      const dy = e.clientY - dragOffsetRef.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMovedDuringDragRef.current = true;
      }

      const maxX = Math.max(16, window.innerWidth - (isMinimized ? 260 : Math.min(DEFAULT_SIZE.width, window.innerWidth - 24)));
      const maxY = Math.max(16, window.innerHeight - (isMinimized ? 56 : 120));

      setPosition({
        x: Math.max(8, Math.min(maxX, dragOffsetRef.current.origX + dx)),
        y: Math.max(8, Math.min(maxY, dragOffsetRef.current.origY + dy)),
      });
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [isMinimized]);

  const startDrag = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('select')) return;
    isDraggingRef.current = true;
    hasMovedDuringDragRef.current = false;
    dragOffsetRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    };
  };

  const showNotice = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const activeAlertsCount = useMemo(() => alerts.filter((a) => a.enabled).length, [alerts]);

  const filteredAlerts = useMemo(() => {
    if (activeTab === 'all') return alerts;
    if (activeTab === 'cloud') return [];
    return alerts.filter((a) => a.source === activeTab);
  }, [alerts, activeTab]);

  const cloudRulesCount = useMemo(() => buildCloudAlertRules(alerts).length, [alerts]);

  const handleEnableBackgroundAndNotify = async () => {
    const perm = await requestNotifPermission();
    soundAlert.enableBackgroundKeepAlive();
    setIsKeepAlive(true);
    if (perm === 'granted') {
      soundAlert.playTargetReachedAlert();
      await sendTestNotification();
      showNotice('تم تفعيل إشعارات النظام والصوت وإبقاء الخلفية نشطة');
    } else {
      showNotice('تم رفض إذن الإشعارات من المتصفح، يرجى السماح من إعدادات الموقع');
    }
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    soundAlert.setMuted(next);
    setIsMuted(next);
    showNotice(next ? 'تم كتم الصوت مؤقتاً' : 'تم تشغيل الصوت');
  };

  const handleToggleKeepAlive = () => {
    if (isKeepAlive) {
      soundAlert.disableBackgroundKeepAlive();
      setIsKeepAlive(false);
      showNotice('تم إيقاف مسار الخلفية الصامت');
    } else {
      soundAlert.enableBackgroundKeepAlive();
      setIsKeepAlive(true);
      showNotice('تم تفعيل مسار إبقاء الصفحة نشطة في الخلفية');
    }
  };

  const handleResetWindowPosition = () => {
    centerWindow();
    showNotice('تم تصفير موضع النافذة إلى المنتصف');
  };

  const handleResetFiringLog = () => {
    resetAllUnifiedFiringHistory();
    refreshAllAlerts();
    showNotice('تم تصفير سجل الإطلاق: ستعمل تنبيهات المرة الواحدة مجدداً عند تحقق شروطها');
  };

  const handleToggleItem = (item: UnifiedAlertItem) => {
    const nextEnabled = !item.enabled;
    toggleUnifiedAlert(item, nextEnabled);
    refreshAllAlerts();
    if (nextEnabled) {
      setIsKeepAlive(true);
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        systemNotification.requestPermission();
      }
    }
  };

  const handleUpdateCloudField = <K extends keyof CloudAlertsConfig>(
    key: K,
    val: CloudAlertsConfig[K]
  ) => {
    setCloudConfig((prev) => {
      const next = { ...prev, [key]: val };
      saveCloudAlertsConfig(next);
      return next;
    });
  };

  const handleRegisterWebPush = async () => {
    const res = await subscribeBrowserWebPush();
    if (res.success && res.subscription) {
      const next: CloudAlertsConfig = {
        ...cloudConfig,
        webPushEnabled: true,
        pushSubscription: res.subscription,
      };
      setCloudConfig(next);
      saveCloudAlertsConfig(next);
      showNotice('تم تسجيل اشتراك Web Push السحابي لهذا الجهاز');
    } else {
      showNotice(res.error || 'تعذر تفعيل Web Push');
    }
  };

  const handleSyncCloudNow = async () => {
    setIsSyncingCloud(true);
    const res = await syncAlertsToExternalServer(cloudConfig);
    setCloudConfig(getCloudAlertsConfig());
    setIsSyncingCloud(false);
    showNotice(res.message);
  };

  const handleTestCloudChannel = async (channel: 'telegram' | 'webpush') => {
    setIsTestingCloud(true);
    try {
      const res = await fetch('/api/alerts/test-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          telegramChatId: cloudConfig.telegramChatId,
          telegramBotToken: cloudConfig.telegramBotToken,
          pushSubscription: cloudConfig.pushSubscription,
        }),
      });
      const data = await res.json();
      const chResult = channel === 'telegram' ? data.results?.telegram : data.results?.webPush;
      if (chResult?.ok) {
        showNotice(
          channel === 'telegram'
            ? 'تم إرسال رسالة اختبار تليغرام بنجاح'
            : 'تم إرسال إشعار Web Push التجريبي بنجاح'
        );
      } else {
        showNotice(chResult?.error || data.error || 'فشل إرسال الاختبار');
      }
    } catch {
      showNotice('تعذر الاتصال بخادم الاختبار');
    } finally {
      setIsTestingCloud(false);
    }
  };

  const handleCopyWorker = async () => {
    try {
      await navigator.clipboard.writeText(CLOUDFLARE_WORKER_SOURCE);
      setCopiedWorkerCode(true);
      setTimeout(() => setCopiedWorkerCode(false), 2000);
    } catch {
      showNotice('تعذر النسخ التلقائي');
    }
  };

  const modalWidth = Math.min(DEFAULT_SIZE.width, window.innerWidth - 20);
  const modalMaxHeight = Math.min(DEFAULT_SIZE.height, window.innerHeight - 32);

  // MINIMIZED FLOATING PILL (حالة الإخفاء / التصغير)
  if (isMinimized) {
    return createPortal(
      <div
        dir="rtl"
        onPointerDown={startDrag}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          touchAction: 'none',
        }}
        className="fixed z-[99990] flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 text-white border border-amber-500/50 shadow-2xl backdrop-blur-xl select-none cursor-grab active:cursor-grabbing"
      >
        <GripHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
        <Bell className={`w-4 h-4 shrink-0 ${activeAlertsCount > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
        <span className="text-xs font-bold whitespace-nowrap">
          مركز التنبيهات
        </span>
        <span className="text-xs font-mono tabular-nums font-bold text-amber-400 whitespace-nowrap">
          {activeAlertsCount} نشط
        </span>

        <div className="flex items-center gap-1 pr-1 border-r border-slate-700">
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="px-2 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-[11px] hover:bg-amber-400 transition cursor-pointer flex items-center gap-1 whitespace-nowrap"
            title="إظهار مركز التنبيهات"
          >
            <Maximize2 className="w-3 h-3" />
            <span>إظهار</span>
          </button>
          <button
            type="button"
            onClick={centerWindow}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="تصفير الموضع"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
            title="إغلاق"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>,
      document.body
    );
  }

  // FULL FLOATING CONTROL CENTER WINDOW
  return createPortal(
    <div
      dir="rtl"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${modalWidth}px`,
        maxHeight: `${modalMaxHeight}px`,
      }}
      className="fixed z-[99990] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
    >
      {/* 1. DRAGGABLE HEADER WITH FULL WINDOW CONTROLS */}
      <div
        onPointerDown={startDrag}
        style={{ touchAction: 'none' }}
        className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 select-none cursor-grab active:cursor-grabbing shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <GripHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
          <Bell className="w-4 h-4 text-amber-500 shrink-0" />
          <h2 className="text-xs sm:text-sm font-extrabold truncate">
            مركز تحكم التنبيهات الموحّد
          </h2>
          <span className="text-xs font-mono tabular-nums font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
            · {activeAlertsCount} نشط
          </span>
        </div>

        {/* Window Controls: تصفير · إخفاء · إغلاق */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleResetWindowPosition}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer whitespace-nowrap"
            title="تصفير موضع النافذة إلى المنتصف"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تصفير الموضع</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 transition cursor-pointer whitespace-nowrap"
            title="إخفاء مؤقت (تصغير لشريط عائم)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>إخفاء</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
            title="إغلاق النافذة"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. SYSTEM NOTIFICATION, SOUND & BACKGROUND KEEP-ALIVE STRIP */}
      <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {!notifGranted ? (
              <button
                type="button"
                onClick={handleEnableBackgroundAndNotify}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition cursor-pointer whitespace-nowrap"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>{notifDenied ? 'الإذن محظور (افتح إعدادات المتصفح)' : 'تفعيل إشعارات النظام والخلفية'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  soundAlert.playTargetReachedAlert();
                  sendTestNotification();
                }}
                disabled={isNotifTesting}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-bold text-[11px] transition cursor-pointer whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isNotifTesting ? 'جاري الاختبار...' : 'اختبار صوت + اهتزاز + إشعار'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleKeepAlive}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-xl border text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                isKeepAlive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
              }`}
              title="تشغيل مسار صامت لإبقاء التطبيق نشطاً في الخلفية عند تصغيره"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{isKeepAlive ? 'الخلفية نشطة' : 'تفعيل الخلفية'}</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleMute}
              className={`p-1.5 rounded-xl border transition cursor-pointer ${
                isMuted
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-500'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
              }`}
              title={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleResetFiringLog}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer whitespace-nowrap"
              title="تصفير سجل الإطلاق لتكرار تنبيهات المرة الواحدة"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>تصفير الإطلاق</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1">
            {statusMessage}
          </div>
        )}
      </div>

      {/* 3. SOURCE FILTER TABS */}
      <div className="flex items-center gap-1 px-3 py-2 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none shrink-0">
        {(
          [
            { id: 'all', label: `الكل (${alerts.length})` },
            { id: 'watchlist', label: 'المراقبة' },
            { id: 'range_master', label: 'صائد القيعان' },
            { id: 'calculator', label: 'الحاسبة' },
            { id: 'chart_lines', label: 'الشارت' },
            { id: 'market_sessions', label: 'البورصات' },
            { id: 'cloud', label: 'الخادم الخارجي ☁️' },
          ] as { id: UnifiedAlertsFilterTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. SCROLLABLE BODY */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
        {activeTab === 'cloud' ? (
          /* CLOUD EXTERNAL SERVER PANEL (Web Push + Telegram Bot + Cloudflare Worker) */
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-cyan-500" />
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">
                      مراقبة الخادم الخارجي عند إغلاق التطبيق تماماً
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {cloudRulesCount} قاعدة سعرية نشطة جاهزة للمزامنة عبر Web Push وتليغرام
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateCloudField('enabled', !cloudConfig.enabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    cloudConfig.enabled ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      cloudConfig.enabled ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSyncCloudNow}
                  disabled={isSyncingCloud}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer whitespace-nowrap"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCloud ? 'animate-spin' : ''}`} />
                  <span>{isSyncingCloud ? 'جاري المزامنة...' : `مزامنة القواعد الآن (${cloudRulesCount})`}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRegisterWebPush}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold transition cursor-pointer whitespace-nowrap"
                >
                  <Smartphone className="w-3.5 h-3.5 text-cyan-500" />
                  <span>{cloudConfig.pushSubscription ? 'تحديث اشتراك Web Push' : 'ربط إشعار المتصفح السحابي'}</span>
                </button>
              </div>

              {cloudConfig.lastSyncedAt && (
                <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  آخر مزامنة: {new Date(cloudConfig.lastSyncedAt).toLocaleTimeString('ar-SA')} · {cloudConfig.lastSyncStatus}
                </div>
              )}
            </div>

            {/* Telegram Bot Setup */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  1. قناة بوت تليغرام (وصول فوري 100% على أندرويد وآيفون)
                </span>
                <button
                  type="button"
                  onClick={() => handleUpdateCloudField('telegramEnabled', !cloudConfig.telegramEnabled)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition ${
                    cloudConfig.telegramEnabled
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {cloudConfig.telegramEnabled ? 'مفعل' : 'معطل'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">معرف المحادثة (Chat ID)</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={cloudConfig.telegramChatId}
                    onChange={(e) => handleUpdateCloudField('telegramChatId', e.target.value)}
                    placeholder="مثال: 123456789"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">توكن البوت (اختياري إذا ضُبط بالخادم)</label>
                  <input
                    type="password"
                    dir="ltr"
                    value={cloudConfig.telegramBotToken}
                    onChange={(e) => handleUpdateCloudField('telegramBotToken', e.target.value)}
                    placeholder="من @BotFather"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTestCloudChannel('telegram')}
                  disabled={isTestingCloud}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-600 dark:text-sky-300 border border-sky-500/30 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>اختبار إرسال تليغرام</span>
                </button>

                {cloudConfig.pushSubscription && (
                  <button
                    type="button"
                    onClick={() => handleTestCloudChannel('webpush')}
                    disabled={isTestingCloud}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-300 border border-purple-500/30 font-bold text-[11px] cursor-pointer whitespace-nowrap"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    <span>اختبار Web Push</span>
                  </button>
                )}
              </div>
            </div>

            {/* Cloudflare Worker URL & Free Code Template */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  2. ربط خادم Cloudflare Worker المجاني (يعمل كل دقيقة)
                </span>
                <button
                  type="button"
                  onClick={() => setShowWorkerGuide((prev) => !prev)}
                  className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer whitespace-nowrap"
                >
                  {showWorkerGuide ? 'إخفاء الكود والدليل' : 'عرض كود Worker المجاني'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">رابط Worker (اختياري)</label>
                  <input
                    type="url"
                    dir="ltr"
                    value={cloudConfig.workerUrl}
                    onChange={(e) => handleUpdateCloudField('workerUrl', e.target.value)}
                    placeholder="https://alerts.yourname.workers.dev"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-1">مفتاح الحماية (Sync Secret)</label>
                  <input
                    type="password"
                    dir="ltr"
                    value={cloudConfig.syncSecret}
                    onChange={(e) => handleUpdateCloudField('syncSecret', e.target.value)}
                    placeholder="اختياري"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 font-mono text-xs"
                  />
                </div>
              </div>

              {showWorkerGuide && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    أنشئ حساباً مجانياً في Cloudflare Workers، وأنشئ مخزن KV باسم ALERTS_KV، واضبط Cron Trigger على كل دقيقة (* * * * *)، ثم الصق الكود التالي وانشر الرابط هنا:
                  </p>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleCopyWorker}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-white font-bold text-[11px] cursor-pointer"
                    >
                      {copiedWorkerCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedWorkerCode ? 'تم النسخ!' : 'نسخ كود العامل (Worker)'}</span>
                    </button>
                  </div>
                  <pre
                    dir="ltr"
                    className="p-2.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-[10px] max-h-48 overflow-auto border border-slate-800"
                  >
                    {CLOUDFLARE_WORKER_SOURCE}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <BellOff className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              لا توجد تنبيهات مضافة في هذا القسم حالياً
            </p>
            <p className="text-[11px] text-slate-500">
              أضف هدفاً من قائمة المراقبة أو صائد القيعان أو الحاسبة أو ارسم خطاً على الشارت وسيظهر هنا فوراً
            </p>
          </div>
        ) : (
          filteredAlerts.map((item) => {
            const liveP = item.symbol !== 'SESSIONS' ? livePrices[item.symbol] : undefined;
            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition space-y-2.5 ${
                  item.enabled
                    ? 'bg-white dark:bg-slate-900 border-amber-500/40'
                    : 'bg-slate-50/70 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 opacity-80'
                }`}
              >
                {/* Row 1: Symbol + Metadata + Master Two-Way Switch */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="font-mono font-extrabold text-slate-950 dark:text-slate-50">
                        {item.displayName}
                      </span>
                      <span aria-hidden="true" className="text-slate-400">·</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {item.sourceLabel}
                      </span>
                      {liveP && (
                        <>
                          <span aria-hidden="true" className="text-slate-400">·</span>
                          <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-bold" dir="ltr">
                            ${trimTrailingZeros(liveP)}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-mono tabular-nums mt-0.5">
                      {item.conditionSummary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateToSource(item);
                        setIsMinimized(true);
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer whitespace-nowrap"
                      title="الانتقال إلى الشاشة المصدر"
                    >
                      <span>فتح</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleItem(item)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        item.enabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                      title={item.enabled ? 'إيقاف التنبيه' : 'تشغيل التنبيه'}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                          item.enabled ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Row 2: Repeat Mode, Interval & Sound Tone Controls */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                  {item.source !== 'market_sessions' && (
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          updateUnifiedAlertConfig(item, { repeatMode: 'once' });
                          refreshAllAlerts();
                        }}
                        className={`px-2 py-1 rounded-md font-bold transition cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                          item.repeatMode === 'once'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <Repeat className="w-3 h-3" />
                        <span>مرة واحدة</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateUnifiedAlertConfig(item, { repeatMode: 'continuous' });
                          refreshAllAlerts();
                        }}
                        className={`px-2 py-1 rounded-md font-bold transition cursor-pointer whitespace-nowrap ${
                          item.repeatMode === 'continuous'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>متكرر</span>
                      </button>
                    </div>
                  )}

                  {item.source !== 'market_sessions' && item.repeatMode === 'continuous' && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <select
                        value={item.intervalSeconds}
                        onChange={(e) => {
                          updateUnifiedAlertConfig(item, { intervalSeconds: Number(e.target.value) });
                          refreshAllAlerts();
                        }}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] font-bold"
                      >
                        {item.source === 'range_master' ? (
                          <>
                            <option value={60}>كل 1د</option>
                            <option value={180}>كل 3د</option>
                            <option value={300}>كل 5د</option>
                            <option value={600}>كل 10د</option>
                          </>
                        ) : (
                          <>
                            <option value={15}>كل 15ث</option>
                            <option value={30}>كل 30ث</option>
                            <option value={60}>كل 1د</option>
                            <option value={180}>كل 3د</option>
                            <option value={300}>كل 5د</option>
                            <option value={600}>كل 10د</option>
                          </>
                        )}
                      </select>
                    </div>
                  )}

                  {/* Tone Selector + Preview */}
                  <div className="flex items-center gap-1 mr-auto">
                    <select
                      value={item.toneId}
                      onChange={(e) => {
                        const tone = e.target.value as AlertToneId;
                        updateUnifiedAlertConfig(item, { toneId: tone });
                        soundAlert.playTone(tone);
                        refreshAllAlerts();
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold max-w-[140px]"
                    >
                      {ALERT_TONE_OPTIONS.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => soundAlert.playTone(item.toneId)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-amber-500 cursor-pointer"
                      title="استماع للنغمة"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>,
    document.body
  );
};
