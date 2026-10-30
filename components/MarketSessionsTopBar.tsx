'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  MarketSession, 
  GLOBAL_MARKET_SESSIONS, 
  MarketAlertConfig, 
  DEFAULT_MARKET_ALERT_CONFIG,
  STORAGE_KEY_MARKET_BAR_COLLAPSED,
  STORAGE_KEY_MARKET_ALERT_CONFIG
} from '@/types/marketSessions';
import { 
  getCurrentMakkahTime, 
  DEFAULT_INITIAL_MAKKAH_TIME,
  isSessionOpen, 
  getSessionCountdown, 
  isGoldenOverlapActive, 
  getLiquidityLevel,
  MakkahTimeInfo
} from '@/lib/marketSessions';
import { MarketAlertSettingsModal } from './MarketAlertSettingsModal';
import { soundAlert, AlertToneId } from '@/lib/soundAlert';
import { systemNotification } from '@/lib/systemNotification';
import { 
  Globe, 
  Clock, 
  Flame, 
  ChevronDown, 
  ChevronUp, 
  Bell, 
  BellOff, 
  Sliders, 
  Zap, 
  Layers, 
  Calculator, 
  TrendingUp, 
  LayoutList,
  Sparkles
} from 'lucide-react';

interface MarketSessionsTopBarProps {
  onNavigateToScreen?: (screen: 'range_master' | 'scalper' | 'calculator' | 'tracker' | 'watchlist') => void;
  activeScreen?: string;
  marketVolatilityDirection?: 'up' | 'down' | 'neutral';
  onRestoreBinanceFab?: () => void;
  isBinanceFabHidden?: boolean;
}

export const MarketSessionsTopBar: React.FC<MarketSessionsTopBarProps> = ({
  onNavigateToScreen,
  activeScreen,
  marketVolatilityDirection = 'up',
  onRestoreBinanceFab,
  isBinanceFabHidden,
}) => {
  // Live Makkah Time (initialized with static constant for SSR matching, then synced on client mount)
  const [makkahTime, setMakkahTime] = useState<MakkahTimeInfo>(DEFAULT_INITIAL_MAKKAH_TIME);

  // Helper to determine session volatility direction and visual label
  const getSessionVolatility = useCallback((session: MarketSession, isOpen: boolean) => {
    if (!isOpen) {
      return { direction: 'neutral' as const, label: 'خامل (السوق مغلق)' };
    }
    if (isGoldenOverlapActive(makkahTime.decimalHours) && (session.id === 'london' || session.id === 'newyork')) {
      if (marketVolatilityDirection === 'down') {
        return { direction: 'down' as const, label: 'ذروة تذبذب هابطة ⚠️' };
      }
      return { direction: 'up' as const, label: 'ذروة تذبذب صاعدة 🔥' };
    }
    if (marketVolatilityDirection === 'down') {
      return { direction: 'down' as const, label: 'تذبذب نشط هابط 🔴' };
    }
    return { direction: 'up' as const, label: 'تذبذب نشط صاعد 🟢' };
  }, [makkahTime.decimalHours, marketVolatilityDirection]);

  // Collapse / Expand State
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Alert Config State
  const [alertConfig, setAlertConfig] = useState<MarketAlertConfig>(DEFAULT_MARKET_ALERT_CONFIG);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);

  // Load saved preferences and sync initial live time safely on client mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setMakkahTime(getCurrentMakkahTime());
      try {
        const savedCollapsed = localStorage.getItem(STORAGE_KEY_MARKET_BAR_COLLAPSED);
        if (savedCollapsed !== null) {
          setIsCollapsed(savedCollapsed === 'true');
        }

        const savedAlerts = localStorage.getItem(STORAGE_KEY_MARKET_ALERT_CONFIG);
        if (savedAlerts) {
          const parsed = JSON.parse(savedAlerts);
          setAlertConfig(parsed);
        }
      } catch {
        // Ignore
      }
    }, 0);

    const interval = setInterval(() => {
      setMakkahTime(getCurrentMakkahTime());
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleToggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem(STORAGE_KEY_MARKET_BAR_COLLAPSED, String(next));
    } catch {}
  };

  const handleSaveAlertConfig = (newConfig: MarketAlertConfig) => {
    setAlertConfig(newConfig);
    try {
      localStorage.setItem(STORAGE_KEY_MARKET_ALERT_CONFIG, JSON.stringify(newConfig));
    } catch {}
  };

  // Liquidity Info
  const liquidity = useMemo(() => {
    return getLiquidityLevel(makkahTime.decimalHours);
  }, [makkahTime.decimalHours]);

  const isOverlap = useMemo(() => {
    return isGoldenOverlapActive(makkahTime.decimalHours);
  }, [makkahTime.decimalHours]);

  // Percentage position of current time on 24h bar (0% at 00:00, 100% at 24:00)
  const timelinePercent = (makkahTime.decimalHours / 24) * 100;

  // -------------------------------------------------------------
  // REAL-TIME SESSION ALERT MONITOR (إطلاق التنبيهات المعتمدة)
  // -------------------------------------------------------------
  const firedSessionAlertsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!alertConfig.enabled) return;

    const currentHour = makkahTime.hours;
    const currentMinute = makkahTime.minutes;
    const todayDateKey = new Date().toDateString();

    // 1. Golden Overlap Alert
    if (alertConfig.notifyOnGoldenOverlap && isOverlap) {
      const overlapKey = `${todayDateKey}_golden_overlap`;
      if (!firedSessionAlertsRef.current.has(overlapKey)) {
        firedSessionAlertsRef.current.add(overlapKey);
        soundAlert.playTone((alertConfig.soundTone as AlertToneId) || 'bell');
        systemNotification.sendNotification({
          title: '🔥 بدأت ذروة السيولة العالمية (لندن + نيويورك)!',
          body: 'تداخل الجلستين الأكبر في العالم الآن بتوقيت مكة. فرصة مثالية لاقتناص تحركات واقتناص قيعان السكالبينج.',
          tag: 'golden-overlap-alert',
          icon: '/pwa-192x192.png',
          badge: '/icon.svg',
        });
      }
    }

    // 2. Session Open / Close / Pre-open Alerts
    GLOBAL_MARKET_SESSIONS.forEach((session) => {
      const countdown = getSessionCountdown(session, makkahTime.decimalHours);

      // A. Pre-open notice
      if (!countdown.isOpen && countdown.minutesRemaining === alertConfig.preOpenNoticeMinutes) {
        const preKey = `${todayDateKey}_${session.id}_pre_${currentHour}_${currentMinute}`;
        if (!firedSessionAlertsRef.current.has(preKey)) {
          firedSessionAlertsRef.current.add(preKey);
          soundAlert.playTone((alertConfig.soundTone as AlertToneId) || 'bell');
          systemNotification.sendNotification({
            title: `⏳ اقترب افتتاح ${session.name}!`,
            body: `تبقى ${countdown.minutesRemaining} دقيقة على افتتاح بورصة ${session.city}. استعد لدخول السيولة.`,
            tag: `pre-open-${session.id}`,
            icon: '/pwa-192x192.png',
            badge: '/icon.svg',
          });
        }
      }

      // B. Exact Open Notice
      if (alertConfig.notifyOnSessionOpen && countdown.isOpen && countdown.minutesRemaining > (session.endHourMakkah - session.startHourMakkah) * 60 - 2) {
        const openKey = `${todayDateKey}_${session.id}_open`;
        if (!firedSessionAlertsRef.current.has(openKey)) {
          firedSessionAlertsRef.current.add(openKey);
          soundAlert.playTone((alertConfig.soundTone as AlertToneId) || 'bell');
          systemNotification.sendNotification({
            title: `🟢 افتتحت الآن ${session.name}!`,
            body: `بدأت الآن جلسة ${session.city}. تدفق السيولة وبدء تنفيذ أوامر السوق.`,
            tag: `open-${session.id}`,
            icon: '/pwa-192x192.png',
            badge: '/icon.svg',
          });
        }
      }
    });
  }, [makkahTime, alertConfig, isOverlap]);

  return (
    <div 
      className="sticky top-1 sm:top-2 z-40 w-full max-w-7xl mb-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-md transition-all overflow-hidden"
      dir="rtl"
      suppressHydrationWarning
    >
      {/* 1. TOP ULTRA-COMPACT CONTROL BAR (دائماً ظاهر) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 sm:px-4 text-xs border-b border-slate-200/60 dark:border-slate-800/60">
        {/* Left: Clock & Time Identity */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-xs">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 dark:text-slate-100 font-mono text-xs sm:text-sm" suppressHydrationWarning>
                {makkahTime.formattedTime}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                توقيت مكة (GMT+3)
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Active Markets Status Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {GLOBAL_MARKET_SESSIONS.map((session) => {
            const open = isSessionOpen(session, makkahTime.decimalHours);
            const vol = getSessionVolatility(session, open);
            return (
              <div
                key={session.id}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold border transition ${
                  open
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'bg-slate-100/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/60 text-slate-400'
                }`}
                title={`${session.description} • حالة التذبذب: ${vol.label}`}
              >
                <span>{session.flag}</span>
                <span className="truncate">{session.name.replace('جلسة ', '')}</span>

                {/* 1. Market Open Status Indicator */}
                <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-emerald-500' : 'bg-slate-400'}`} />

                {/* 2. Visual Volatility Fluctuation Indicator (نقطة خضراء أو حمراء توضح تقلب السعر والتذبذب) */}
                <span
                  className={`w-2 h-2 rounded-full transition-all ${
                    vol.direction === 'up'
                      ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse'
                      : vol.direction === 'down'
                      ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse'
                      : 'bg-slate-400/40'
                  }`}
                  title={`حالة التذبذب اللحظية: ${vol.label}`}
                />
              </div>
            );
          })}
        </div>

        {/* Right: Liquidity Badge, Alert Toggle, Collapse Toggle */}
        <div className="flex items-center gap-1.5">
          {/* Restore Binance Floating Widget if hidden by user */}
          {isBinanceFabHidden && onRestoreBinanceFab && (
            <button
              type="button"
              onClick={onRestoreBinanceFab}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#F3BA2F]/15 border border-[#F3BA2F]/40 text-amber-600 dark:text-amber-400 text-[11px] font-bold hover:bg-[#F3BA2F]/25 transition cursor-pointer"
              title="إظهار أيقونة بينانس العائمة مجدداً"
            >
              <span>🟡 بينانس</span>
            </button>
          )}

          {/* Current Liquidity Badge */}
          <span className={`text-[10px] sm:text-[11px] px-2 py-0.5 rounded-md ${liquidity.badgeClass}`} suppressHydrationWarning>
            {liquidity.title}
          </span>

          {/* Alert Config Trigger */}
          <button
            type="button"
            onClick={() => setIsAlertModalOpen(true)}
            className={`flex items-center gap-1 p-1 sm:px-2 sm:py-1 rounded-lg border transition cursor-pointer text-[11px] font-bold ${
              alertConfig.enabled
                ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border-slate-200 dark:border-slate-700'
            }`}
            title="إعدادات تنبيهات افتتاح الأسواق وتدفق السيولة"
          >
            {alertConfig.enabled ? <Bell className="w-3.5 h-3.5 fill-current" /> : <BellOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{alertConfig.enabled ? 'تنبيه الجلسات' : 'تنبيه (مغلق)'}</span>
          </button>

          {/* Quick Collapse/Expand Button */}
          <button
            type="button"
            onClick={handleToggleCollapsed}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={isCollapsed ? 'توسيع الشريط الزمني للبورصات' : 'طي الشريط الزمني'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. EXPANDED 24-HOUR TIMELINE & LIQUIDITY LANES */}
      {!isCollapsed && (
        <div className="p-3 sm:p-4 bg-slate-50/50 dark:bg-slate-950/40 animate-fade-in space-y-3">
          {/* Time markers bar (00:00 to 24:00) */}
          <div className="relative w-full">
            <div className="flex justify-between text-[9px] font-mono text-slate-400 px-1 mb-1" dir="ltr">
              <span>00:00</span>
              <span>03:00</span>
              <span>06:00</span>
              <span>09:00</span>
              <span>12:00</span>
              <span>15:00</span>
              <span>18:00</span>
              <span>21:00</span>
              <span>24:00</span>
            </div>

            {/* 24-Hour Timeline Master Container */}
            <div className="relative h-14 sm:h-16 w-full rounded-xl bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 overflow-hidden" dir="ltr">
              {/* Hour Grid Lines */}
              {[...Array(24)].map((_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-r border-slate-300/40 dark:border-slate-700/40 pointer-events-none"
                  style={{ left: `${((i / 24) * 100).toFixed(3)}%` }}
                />
              ))}

              {/* Golden Overlap Highlight Zone (16:30 to 19:30) */}
              <div
                className="absolute top-0 bottom-0 bg-amber-400/25 border-x border-amber-400/60 z-10 pointer-events-none flex items-center justify-center"
                style={{
                  left: `${((16.5 / 24) * 100).toFixed(3)}%`,
                  width: `${(((19.5 - 16.5) / 24) * 100).toFixed(3)}%`,
                }}
                title="فترة التداخل الذهبي: لندن + نيويورك (أعلى ذروة سيولة في اليوم)"
              >
                <div className="hidden sm:flex items-center gap-1 text-[9px] font-black text-amber-600 dark:text-amber-300 bg-white/70 dark:bg-slate-950/70 px-1.5 py-0.5 rounded shadow-xs">
                  <Flame className="w-2.5 h-2.5 fill-current" />
                  <span>ذروة السيولة 🔥</span>
                </div>
              </div>

              {/* Market Session Bars (4 Tracks) */}
              {GLOBAL_MARKET_SESSIONS.map((session, idx) => {
                const open = isSessionOpen(session, makkahTime.decimalHours);
                const leftPct = ((session.startHourMakkah / 24) * 100).toFixed(3);
                const widthPct = (((session.endHourMakkah - session.startHourMakkah) / 24) * 100).toFixed(3);
                const topPct = idx * 25; // 4 rows

                return (
                  <div
                    key={session.id}
                    className={`absolute rounded transition-all flex items-center px-1.5 ${
                      open 
                        ? 'border shadow-xs z-15 font-black ring-1 ring-white/20' 
                        : 'opacity-70 z-5'
                    }`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: `${topPct}%`,
                      height: '24%',
                      backgroundColor: session.accentBg,
                      borderColor: session.borderColor,
                    }}
                    title={`${session.name} (${session.city}): من ${session.startHourMakkah}:00 إلى ${session.endHourMakkah}:00 بتوقيت مكة`}
                  >
                    <div className="flex items-center gap-1 truncate text-[9px] font-bold" style={{ color: session.color }}>
                      <span>{session.flag}</span>
                      <span className="truncate">{session.name}</span>
                    </div>
                  </div>
                );
              })}

              {/* Current Time Needle Indicator (المؤشر الحي بتوقيت مكة) */}
              <div
                className="absolute top-0 bottom-0 z-30 pointer-events-none transition-all duration-500 flex flex-col items-center"
                style={{ left: `${timelinePercent.toFixed(3)}%` }}
                suppressHydrationWarning
              >
                {/* Needle glowing line */}
                <div className="w-0.5 h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]" />
                {/* Needle pulsing point */}
                <div className="absolute -top-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950 shadow-md animate-ping" />
                <div className="absolute -top-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950 shadow-md" />
              </div>
            </div>
          </div>

          {/* 3. SESSION DETAILS CARDS & ZERO-FRICTION WORKSPACE HOPS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
            {/* Quick Session Statuses */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
              {GLOBAL_MARKET_SESSIONS.map((session) => {
                const countdown = getSessionCountdown(session, makkahTime.decimalHours);
                const vol = getSessionVolatility(session, countdown.isOpen);
                return (
                  <div 
                    key={session.id}
                    className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800"
                    suppressHydrationWarning
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 flex items-center gap-1">
                        <span>{session.flag}</span>
                        <span>{session.name.replace('جلسة ', '')}</span>
                      </span>
                      <div className="flex items-center gap-1">
                        {/* Volatility Status Badge */}
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded flex items-center gap-1 ${
                          vol.direction === 'up'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : vol.direction === 'down'
                            ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }`} title={`حالة التذبذب: ${vol.label}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            vol.direction === 'up'
                              ? 'bg-emerald-500 animate-pulse'
                              : vol.direction === 'down'
                              ? 'bg-rose-500 animate-pulse'
                              : 'bg-slate-400'
                          }`} />
                          <span>{vol.direction === 'up' ? 'صاعد' : vol.direction === 'down' ? 'هابط' : 'خامل'}</span>
                        </span>

                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                          countdown.isOpen 
                            ? 'bg-emerald-500/15 text-emerald-500' 
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                        }`}>
                          {countdown.isOpen ? 'مفتوح' : 'مغلق'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 block font-mono" suppressHydrationWarning>
                      {countdown.text}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Zero-friction hop actions to current workflows */}
            {onNavigateToScreen && (
              <div className="flex items-center gap-1 sm:self-center border-t sm:border-t-0 sm:border-r border-slate-200 dark:border-slate-800 pt-2 sm:pt-0 sm:pr-3">
                <span className="text-[10px] font-bold text-slate-400 hidden lg:inline ml-1">
                  اغتنم السيولة في:
                </span>

                <button
                  type="button"
                  onClick={() => onNavigateToScreen('range_master')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeScreen === 'range_master'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                  title="الانتقال إلى صائد القيعان والمسار العرضي"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>صائد القيعان</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateToScreen('scalper')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeScreen === 'scalper'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                  title="الانتقال إلى لوحة السكالبينج السريعة"
                >
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  <span>السكالبينج</span>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateToScreen('tracker')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeScreen === 'tracker'
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                  title="الانتقال إلى رادار رصد الصعود"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-500" />
                  <span className="hidden sm:inline">رصد الصعود</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. MODAL FOR ADVANCED SESSION ALERTS */}
      <MarketAlertSettingsModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        config={alertConfig}
        onSaveConfig={handleSaveAlertConfig}
      />
    </div>
  );
};
