/**
 * محرك وسجل التنبيهات الموحد ثنائي الاتجاه (Unified Two-Way Alert Engine)
 * يجمع ويزامن جميع تنبيهات التطبيق الخمسة:
 * 1. قائمة المراقبة (Watchlist)
 * 2. صائد القيعان والمسار العرضي (Range Master)
 * 3. الحاسبة والمراقبة اللحظية (Calculator)
 * 4. خطوط الشارت الأفقية وهدف الخروج (Chart Lines & Exit Target)
 * 5. مواعيد البورصات وتدفق السيولة (Market Sessions)
 */

import { CurrencyItem, STORAGE_KEY_CURRENCIES } from '@/types/currency';
import { WatchlistItem, STORAGE_KEY_WATCHLIST } from '@/types/watchlist';
import {
  RangeTrackedTrade,
  DEFAULT_RANGE_ALERT_CONFIG,
  STORAGE_KEY_RANGE_TRADES,
} from '@/types/rangeScalper';
import {
  MarketAlertConfig,
  DEFAULT_MARKET_ALERT_CONFIG,
  STORAGE_KEY_MARKET_ALERT_CONFIG,
} from '@/types/marketSessions';
import { soundAlert, AlertToneId } from '@/lib/soundAlert';
import { systemNotification } from '@/lib/systemNotification';
import {
  canTriggerAlert,
  recordAlertTriggered,
  resetAlertTrigger,
  clearAllAlertFiringHistory,
} from '@/lib/alertSettings';
import { trimTrailingZeros } from '@/lib/calculator';

export type UnifiedAlertSource =
  | 'watchlist'
  | 'range_master'
  | 'calculator'
  | 'chart_lines'
  | 'market_sessions';

export interface UnifiedAlertItem {
  id: string;
  source: UnifiedAlertSource;
  sourceLabel: string;
  symbol: string;
  displayName: string;
  enabled: boolean;
  conditionSummary: string;
  repeatMode: 'once' | 'continuous';
  intervalSeconds: number;
  toneId: AlertToneId;
  targetPrice?: number;
  direction?: 'above' | 'below' | 'range';
  meta?: {
    watchlistItemId?: string;
    rangeTradeId?: string;
    currencyId?: string;
    chartKind?: 'line' | 'exit';
    chartSymbol?: string;
    lineId?: string;
    label?: string;
  };
}

export const EVENT_UNIFIED_ALERTS_CHANGED = 'crypto_unified_alerts_changed';
export const EVENT_RANGE_TRADES_CHANGED = 'crypto_range_trades_changed';
export const EVENT_CHART_ALERTS_CHANGED = 'crypto_chart_alerts_changed';
export const EVENT_MARKET_ALERTS_CHANGED = 'crypto_market_alerts_changed';
export const EVENT_OPEN_UNIFIED_ALERTS = 'crypto_open_unified_alerts';

export const STORAGE_KEY_RANGE_ALERT_TIMESTAMPS = 'price_calc_v0_range_alert_timestamps';
export const STORAGE_KEY_MARKET_FIRED_ALERTS = 'price_calc_v0_market_sessions_fired_alerts';

export function emitUnifiedAlertsChanged(source?: UnifiedAlertSource) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_UNIFIED_ALERTS_CHANGED, { detail: { source } }));
}

export function openUnifiedAlertsCenter(initialTab: UnifiedAlertSource | 'all' | 'cloud' = 'all') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_OPEN_UNIFIED_ALERTS, { detail: { tab: initialTab } }));
}

function safeParseJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface StoredChartLine {
  id: string;
  price: number;
  color: string;
  style: string;
  thickness: number;
  label?: string;
  hasAlert?: boolean;
  alertDirection?: 'above' | 'below';
  alertFired?: boolean;
  alertRepeatMode?: 'once' | 'continuous';
  alertIntervalSeconds?: number;
  alertToneId?: AlertToneId;
}

interface StoredExitAlert {
  price: string;
  active: boolean;
  fired?: boolean;
  repeatMode?: 'once' | 'continuous';
  intervalSeconds?: number;
  toneId?: AlertToneId;
}

function getAllChartAlertKeys(): {
  lineKeys: { storageKey: string; symbol: string; lines: StoredChartLine[] }[];
  exitKeys: { storageKey: string; symbol: string; exit: StoredExitAlert }[];
} {
  const lineKeys: { storageKey: string; symbol: string; lines: StoredChartLine[] }[] = [];
  const exitKeys: { storageKey: string; symbol: string; exit: StoredExitAlert }[] = [];
  if (typeof window === 'undefined') return { lineKeys, exitKeys };

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith('tv_custom_lines_')) {
        const sym = k.replace('tv_custom_lines_', '').toUpperCase();
        const lines = safeParseJson<StoredChartLine[]>(k, []);
        if (Array.isArray(lines) && lines.length > 0) {
          lineKeys.push({ storageKey: k, symbol: sym, lines });
        }
      } else if (k.startsWith('tv_exit_alert_')) {
        const sym = k.replace('tv_exit_alert_', '').toUpperCase();
        const exit = safeParseJson<StoredExitAlert | null>(k, null);
        if (exit && exit.price) {
          exitKeys.push({ storageKey: k, symbol: sym, exit });
        }
      }
    }
  } catch {
    // Ignore storage enumeration issues
  }

  return { lineKeys, exitKeys };
}

/**
 * تجميع كافة التنبيهات من جميع شاشات التطبيق في قائمة موحدة واحدة
 */
export function collectAllUnifiedAlerts(): UnifiedAlertItem[] {
  if (typeof window === 'undefined') return [];
  const items: UnifiedAlertItem[] = [];

  // 1. قائمة المراقبة (Watchlist)
  const watchlist = safeParseJson<WatchlistItem[]>(STORAGE_KEY_WATCHLIST, []);
  watchlist.forEach((wl) => {
    if (wl.hasAlert || (wl.alertPrice && parseFloat(wl.alertPrice) > 0)) {
      const priceNum = wl.alertPrice ? parseFloat(wl.alertPrice) : undefined;
      const dirLabel = wl.alertDirection === 'below' ? 'هبوط ≤' : 'صعود ≥';
      items.push({
        id: `wl_${wl.id}`,
        source: 'watchlist',
        sourceLabel: 'قائمة المراقبة',
        symbol: wl.symbol,
        displayName: wl.name,
        enabled: Boolean(wl.hasAlert && priceNum && priceNum > 0),
        conditionSummary: priceNum
          ? `${dirLabel} $${trimTrailingZeros(priceNum.toString())}`
          : 'لم يُحدد سعر مستهدف',
        repeatMode: wl.alertRepeatMode || 'once',
        intervalSeconds: wl.alertIntervalSeconds || 60,
        toneId: (wl.alertToneId as AlertToneId) || 'bell',
        targetPrice: priceNum,
        direction: wl.alertDirection || 'above',
        meta: { watchlistItemId: wl.id },
      });
    }
  });

  // 2. صائد القيعان (Range Master)
  const rangeTrades = safeParseJson<RangeTrackedTrade[]>(STORAGE_KEY_RANGE_TRADES, []);
  rangeTrades.forEach((rt) => {
    if (rt.isActive === false) return;
    const cfg = rt.alertConfig || DEFAULT_RANGE_ALERT_CONFIG;
    const isClosedOld = rt.status === 'closed';
    const isEnabled = isClosedOld
      ? Boolean(rt.notifyOnOldTroughReturn)
      : Boolean(rt.alertsEnabled && cfg.enabled);

    const activeConds: string[] = [];
    if (isClosedOld) {
      activeConds.push(`عودة للقاع القديم ($${trimTrailingZeros(rt.troughPrice.toString())})`);
    } else {
      if (rt.status === 'watching_trough') {
        if (cfg.triggerAtTrough) activeConds.push(`القاع $${trimTrailingZeros(rt.troughPrice.toString())}`);
        if (cfg.triggerNearTrough) activeConds.push(`قرب القاع (+${cfg.nearTroughPercent}%)`);
        if (cfg.triggerBounceConfirmation) activeConds.push(`ارتداد (+${cfg.bounceConfirmationPercent}%)`);
      } else if (rt.status === 'in_trade') {
        if (cfg.triggerAtPeak) activeConds.push(`القمة $${trimTrailingZeros(rt.peakPrice.toString())}`);
        if (cfg.triggerNearPeak) activeConds.push(`قرب القمة (-${cfg.nearPeakPercent}%)`);
      }
      if (cfg.triggerCustomPrice && cfg.customPrice && cfg.customPrice > 0) {
        activeConds.push(`سعر مخصص $${trimTrailingZeros(cfg.customPrice.toString())}`);
      }
    }

    items.push({
      id: `rm_${rt.id}`,
      source: 'range_master',
      sourceLabel: 'صائد القيعان',
      symbol: rt.binanceSymbol,
      displayName: rt.name,
      enabled: isEnabled,
      conditionSummary: activeConds.length > 0 ? activeConds.join(' · ') : 'مراقبة المسار العرضي',
      repeatMode: cfg.repeatMode || 'once',
      intervalSeconds: (cfg.repeatIntervalMinutes || 5) * 60,
      toneId: (cfg.toneId as AlertToneId) || 'celebration',
      targetPrice: rt.status === 'in_trade' ? rt.peakPrice : rt.troughPrice,
      direction: 'range',
      meta: { rangeTradeId: rt.id },
    });
  });

  // 3. الحاسبة (Calculator Live Monitoring)
  const currencies = safeParseJson<CurrencyItem[]>(STORAGE_KEY_CURRENCIES, []);
  currencies.forEach((curr) => {
    const targetNum = curr.targetPrice ? parseFloat(curr.targetPrice) : NaN;
    if (curr.isMonitoringActive || (!isNaN(targetNum) && targetNum > 0)) {
      const cleanName = curr.name.trim().toUpperCase();
      const pair = curr.binanceSymbol
        ? curr.binanceSymbol.toUpperCase()
        : cleanName.endsWith('USDT')
        ? cleanName
        : `${cleanName}USDT`;
      const dirLabel = curr.targetDirection === 'below' ? 'هبوط ≤' : 'صعود ≥';

      items.push({
        id: `calc_${curr.id}`,
        source: 'calculator',
        sourceLabel: 'الحاسبة اللحظية',
        symbol: pair,
        displayName: cleanName,
        enabled: Boolean(curr.isMonitoringActive && !isNaN(targetNum) && targetNum > 0),
        conditionSummary:
          !isNaN(targetNum) && targetNum > 0
            ? `${dirLabel} $${trimTrailingZeros(targetNum.toString())}`
            : 'المراقبة نشطة بدون سعر هدف',
        repeatMode: curr.alertRepeatMode || 'once',
        intervalSeconds: curr.alertIntervalSeconds || 60,
        toneId: (curr.alertToneId as AlertToneId) || soundAlert.getActiveTone(),
        targetPrice: !isNaN(targetNum) ? targetNum : undefined,
        direction: curr.targetDirection || 'above',
        meta: { currencyId: curr.id },
      });
    }
  });

  // 4. خطوط الشارت وهدف الخروج (Chart Lines & Exit Target)
  const { lineKeys, exitKeys } = getAllChartAlertKeys();
  lineKeys.forEach(({ symbol, lines }) => {
    lines.forEach((line) => {
      const dirLabel = line.alertDirection === 'below' ? 'هبوط ≤' : 'صعود ≥';
      const labelText = line.label ? `${line.label} · ` : '';
      items.push({
        id: `chart_line_${symbol}_${line.id}`,
        source: 'chart_lines',
        sourceLabel: 'خطوط الشارت',
        symbol,
        displayName: symbol.replace('USDT', ''),
        enabled: Boolean(line.hasAlert),
        conditionSummary: `${labelText}${dirLabel} $${trimTrailingZeros(line.price.toString())}`,
        repeatMode: line.alertRepeatMode || 'once',
        intervalSeconds: line.alertIntervalSeconds || 60,
        toneId: (line.alertToneId as AlertToneId) || 'bell',
        targetPrice: line.price,
        direction: line.alertDirection || 'above',
        meta: {
          chartKind: 'line',
          chartSymbol: symbol,
          lineId: line.id,
          label: line.label,
        },
      });
    });
  });

  exitKeys.forEach(({ symbol, exit }) => {
    const pNum = parseFloat(exit.price);
    if (!isNaN(pNum) && pNum > 0) {
      items.push({
        id: `chart_exit_${symbol}`,
        source: 'chart_lines',
        sourceLabel: 'هدف خروج الشارت',
        symbol,
        displayName: symbol.replace('USDT', ''),
        enabled: Boolean(exit.active),
        conditionSummary: `هدف خروج $${trimTrailingZeros(pNum.toString())}`,
        repeatMode: exit.repeatMode || 'once',
        intervalSeconds: exit.intervalSeconds || 60,
        toneId: (exit.toneId as AlertToneId) || soundAlert.getActiveTone(),
        targetPrice: pNum,
        direction: 'above',
        meta: {
          chartKind: 'exit',
          chartSymbol: symbol,
        },
      });
    }
  });

  // 5. شريط البورصات والسيولة (Market Sessions)
  const marketCfg = safeParseJson<MarketAlertConfig>(
    STORAGE_KEY_MARKET_ALERT_CONFIG,
    DEFAULT_MARKET_ALERT_CONFIG
  );
  const marketParts: string[] = [];
  if (marketCfg.notifyOnSessionOpen) marketParts.push('افتتاح البورصات');
  if (marketCfg.notifyOnGoldenOverlap) marketParts.push('ذروة السيولة');
  if (marketCfg.preOpenNoticeMinutes) marketParts.push(`قبل الافتتاح بـ ${marketCfg.preOpenNoticeMinutes}د`);

  items.push({
    id: 'market_sessions_global',
    source: 'market_sessions',
    sourceLabel: 'شريط البورصات',
    symbol: 'SESSIONS',
    displayName: 'البورصات العالمية',
    enabled: Boolean(marketCfg.enabled),
    conditionSummary: marketParts.length > 0 ? marketParts.join(' · ') : 'تنبيهات الجلسات',
    repeatMode: 'once',
    intervalSeconds: 3600,
    toneId: (marketCfg.soundTone as AlertToneId) || 'bell',
    meta: {},
  });

  return items;
}

export function getUnifiedActiveAlertsCount(): number {
  return collectAllUnifiedAlerts().filter((a) => a.enabled).length;
}

/**
 * استخراج كافة رموز العملات التي تحتوي على تنبيه نشط من أي شاشة لضمان بثها في الخلفية
 */
export function listAllActiveMonitoredSymbols(): string[] {
  const alerts = collectAllUnifiedAlerts();
  const syms = new Set<string>();
  alerts.forEach((a) => {
    if (a.enabled && a.symbol && a.symbol !== 'SESSIONS') {
      syms.add(a.symbol.toUpperCase());
    }
  });

  // Include active range trades even if watching range without alerts yet
  const rangeTrades = safeParseJson<RangeTrackedTrade[]>(STORAGE_KEY_RANGE_TRADES, []);
  rangeTrades.forEach((rt) => {
    if (rt.isActive !== false && rt.binanceSymbol) {
      syms.add(rt.binanceSymbol.toUpperCase());
    }
  });

  return Array.from(syms);
}

/**
 * تشغيل أو إيقاف أي تنبيه من المركز الموحد مع المزامنة الفورية لشاشاته الأصلية (ثنائي الاتجاه)
 */
export function toggleUnifiedAlert(item: UnifiedAlertItem, nextEnabled: boolean): void {
  if (typeof window === 'undefined') return;

  if (item.source === 'watchlist' && item.meta?.watchlistItemId) {
    const list = safeParseJson<WatchlistItem[]>(STORAGE_KEY_WATCHLIST, []);
    const next = list.map((w) =>
      w.id === item.meta!.watchlistItemId ? { ...w, hasAlert: nextEnabled } : w
    );
    localStorage.setItem(STORAGE_KEY_WATCHLIST, JSON.stringify(next));
    if (nextEnabled) {
      resetAlertTrigger('targetExit', `wl_${item.meta.watchlistItemId}`);
    }
    emitUnifiedAlertsChanged('watchlist');
  } else if (item.source === 'range_master' && item.meta?.rangeTradeId) {
    const trades = safeParseJson<RangeTrackedTrade[]>(STORAGE_KEY_RANGE_TRADES, []);
    const next = trades.map((rt) => {
      if (rt.id !== item.meta!.rangeTradeId) return rt;
      if (rt.status === 'closed') {
        return { ...rt, notifyOnOldTroughReturn: nextEnabled };
      }
      return {
        ...rt,
        alertsEnabled: nextEnabled,
        alertConfig: { ...(rt.alertConfig || DEFAULT_RANGE_ALERT_CONFIG), enabled: nextEnabled },
      };
    });
    localStorage.setItem(STORAGE_KEY_RANGE_TRADES, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT_RANGE_TRADES_CHANGED));
    emitUnifiedAlertsChanged('range_master');
  } else if (item.source === 'calculator' && item.meta?.currencyId) {
    const currencies = safeParseJson<CurrencyItem[]>(STORAGE_KEY_CURRENCIES, []);
    const next = currencies.map((c) =>
      c.id === item.meta!.currencyId ? { ...c, isMonitoringActive: nextEnabled } : c
    );
    localStorage.setItem(STORAGE_KEY_CURRENCIES, JSON.stringify(next));
    if (nextEnabled) {
      resetAlertTrigger('targetExit', item.symbol);
    }
    emitUnifiedAlertsChanged('calculator');
  } else if (item.source === 'chart_lines' && item.meta?.chartSymbol) {
    const sym = item.meta.chartSymbol;
    if (item.meta.chartKind === 'line' && item.meta.lineId) {
      const k = `tv_custom_lines_${sym}`;
      const lines = safeParseJson<StoredChartLine[]>(k, []);
      const next = lines.map((l) =>
        l.id === item.meta!.lineId
          ? { ...l, hasAlert: nextEnabled, alertFired: nextEnabled ? false : l.alertFired }
          : l
      );
      localStorage.setItem(k, JSON.stringify(next));
      if (nextEnabled) {
        resetAlertTrigger('chartLines', `${sym}_${item.meta.lineId}`);
      }
    } else if (item.meta.chartKind === 'exit') {
      const k = `tv_exit_alert_${sym}`;
      const exit = safeParseJson<StoredExitAlert | null>(k, null);
      if (exit) {
        localStorage.setItem(k, JSON.stringify({ ...exit, active: nextEnabled, fired: false }));
      }
      if (nextEnabled) {
        resetAlertTrigger('targetExit', `chart_exit_${sym}`);
      }
    }
    window.dispatchEvent(new CustomEvent(EVENT_CHART_ALERTS_CHANGED, { detail: { symbol: sym } }));
    emitUnifiedAlertsChanged('chart_lines');
  } else if (item.source === 'market_sessions') {
    const cfg = safeParseJson<MarketAlertConfig>(
      STORAGE_KEY_MARKET_ALERT_CONFIG,
      DEFAULT_MARKET_ALERT_CONFIG
    );
    const next = { ...cfg, enabled: nextEnabled };
    localStorage.setItem(STORAGE_KEY_MARKET_ALERT_CONFIG, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT_MARKET_ALERTS_CHANGED, { detail: next }));
    emitUnifiedAlertsChanged('market_sessions');
  }

  if (nextEnabled) {
    soundAlert.enableBackgroundKeepAlive();
  }
}

/**
 * تحديث إعدادات التكرار والنغمة لأي تنبيه مباشرة من المركز الموحد ومزامنتها مع شاشته الأصلية
 */
export function updateUnifiedAlertConfig(
  item: UnifiedAlertItem,
  patch: {
    repeatMode?: 'once' | 'continuous';
    intervalSeconds?: number;
    toneId?: AlertToneId;
  }
): void {
  if (typeof window === 'undefined') return;

  if (item.source === 'watchlist' && item.meta?.watchlistItemId) {
    const list = safeParseJson<WatchlistItem[]>(STORAGE_KEY_WATCHLIST, []);
    const next = list.map((w) => {
      if (w.id !== item.meta!.watchlistItemId) return w;
      return {
        ...w,
        alertRepeatMode: patch.repeatMode ?? w.alertRepeatMode ?? 'once',
        alertIntervalSeconds: patch.intervalSeconds ?? w.alertIntervalSeconds ?? 60,
        alertToneId: patch.toneId ?? w.alertToneId ?? 'bell',
      };
    });
    localStorage.setItem(STORAGE_KEY_WATCHLIST, JSON.stringify(next));
    if (patch.repeatMode === 'continuous') {
      resetAlertTrigger('targetExit', `wl_${item.meta.watchlistItemId}`);
    }
    emitUnifiedAlertsChanged('watchlist');
  } else if (item.source === 'range_master' && item.meta?.rangeTradeId) {
    const trades = safeParseJson<RangeTrackedTrade[]>(STORAGE_KEY_RANGE_TRADES, []);
    const next = trades.map((rt) => {
      if (rt.id !== item.meta!.rangeTradeId) return rt;
      const prevCfg = rt.alertConfig || DEFAULT_RANGE_ALERT_CONFIG;
      return {
        ...rt,
        alertConfig: {
          ...prevCfg,
          repeatMode: patch.repeatMode ?? prevCfg.repeatMode,
          repeatIntervalMinutes:
            patch.intervalSeconds !== undefined
              ? Math.max(1, Math.round(patch.intervalSeconds / 60))
              : prevCfg.repeatIntervalMinutes,
          toneId: patch.toneId ?? prevCfg.toneId,
        },
      };
    });
    localStorage.setItem(STORAGE_KEY_RANGE_TRADES, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT_RANGE_TRADES_CHANGED));
    emitUnifiedAlertsChanged('range_master');
  } else if (item.source === 'calculator' && item.meta?.currencyId) {
    const currencies = safeParseJson<CurrencyItem[]>(STORAGE_KEY_CURRENCIES, []);
    const next = currencies.map((c) => {
      if (c.id !== item.meta!.currencyId) return c;
      return {
        ...c,
        alertRepeatMode: patch.repeatMode ?? c.alertRepeatMode ?? 'once',
        alertIntervalSeconds: patch.intervalSeconds ?? c.alertIntervalSeconds ?? 60,
        alertToneId: patch.toneId ?? c.alertToneId ?? soundAlert.getActiveTone(),
      };
    });
    localStorage.setItem(STORAGE_KEY_CURRENCIES, JSON.stringify(next));
    if (patch.repeatMode === 'continuous') {
      resetAlertTrigger('targetExit', item.symbol);
    }
    emitUnifiedAlertsChanged('calculator');
  } else if (item.source === 'chart_lines' && item.meta?.chartSymbol) {
    const sym = item.meta.chartSymbol;
    if (item.meta.chartKind === 'line' && item.meta.lineId) {
      const k = `tv_custom_lines_${sym}`;
      const lines = safeParseJson<StoredChartLine[]>(k, []);
      const next = lines.map((l) => {
        if (l.id !== item.meta!.lineId) return l;
        return {
          ...l,
          alertRepeatMode: patch.repeatMode ?? l.alertRepeatMode ?? 'once',
          alertIntervalSeconds: patch.intervalSeconds ?? l.alertIntervalSeconds ?? 60,
          alertToneId: patch.toneId ?? l.alertToneId ?? 'bell',
          alertFired: patch.repeatMode === 'continuous' ? false : l.alertFired,
        };
      });
      localStorage.setItem(k, JSON.stringify(next));
    } else if (item.meta.chartKind === 'exit') {
      const k = `tv_exit_alert_${sym}`;
      const exit = safeParseJson<StoredExitAlert | null>(k, null);
      if (exit) {
        localStorage.setItem(
          k,
          JSON.stringify({
            ...exit,
            repeatMode: patch.repeatMode ?? exit.repeatMode ?? 'once',
            intervalSeconds: patch.intervalSeconds ?? exit.intervalSeconds ?? 60,
            toneId: patch.toneId ?? exit.toneId ?? soundAlert.getActiveTone(),
          })
        );
      }
    }
    window.dispatchEvent(new CustomEvent(EVENT_CHART_ALERTS_CHANGED, { detail: { symbol: sym } }));
    emitUnifiedAlertsChanged('chart_lines');
  } else if (item.source === 'market_sessions') {
    const cfg = safeParseJson<MarketAlertConfig>(
      STORAGE_KEY_MARKET_ALERT_CONFIG,
      DEFAULT_MARKET_ALERT_CONFIG
    );
    const next = {
      ...cfg,
      soundTone: patch.toneId ?? cfg.soundTone,
    };
    localStorage.setItem(STORAGE_KEY_MARKET_ALERT_CONFIG, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT_MARKET_ALERTS_CHANGED, { detail: next }));
    emitUnifiedAlertsChanged('market_sessions');
  }
}

/**
 * تصفير سجل إطلاق التنبيهات في كافة الشاشات ليتمكن المستخدم من إعادة تشغيل تنبيهات "مرة واحدة"
 */
export function resetAllUnifiedFiringHistory(): void {
  if (typeof window === 'undefined') return;
  clearAllAlertFiringHistory();

  try {
    localStorage.removeItem(STORAGE_KEY_RANGE_ALERT_TIMESTAMPS);
    localStorage.removeItem(STORAGE_KEY_MARKET_FIRED_ALERTS);

    const { lineKeys, exitKeys } = getAllChartAlertKeys();
    lineKeys.forEach(({ storageKey, lines }) => {
      const reset = lines.map((l) => ({ ...l, alertFired: false }));
      localStorage.setItem(storageKey, JSON.stringify(reset));
    });
    exitKeys.forEach(({ storageKey, exit }) => {
      localStorage.setItem(storageKey, JSON.stringify({ ...exit, fired: false }));
    });
  } catch {
    // Ignore
  }

  window.dispatchEvent(new CustomEvent(EVENT_CHART_ALERTS_CHANGED));
  window.dispatchEvent(new CustomEvent(EVENT_RANGE_TRADES_CHANGED));
  window.dispatchEvent(new CustomEvent(EVENT_MARKET_ALERTS_CHANGED));
  emitUnifiedAlertsChanged();
}

/**
 * حزمة الإطلاق الموحدة: صوت + اهتزاز + إشعار نظام عبر Service Worker
 */
export function dispatchUnifiedNotification(params: {
  title: string;
  body: string;
  tag: string;
  toneId?: AlertToneId;
  requireInteraction?: boolean;
}) {
  soundAlert.playTone(params.toneId || soundAlert.getActiveTone());
  systemNotification.sendNotification({
    title: params.title,
    body: params.body,
    tag: params.tag,
    icon: '/pwa-192x192.png',
    badge: '/icon.svg',
    renotify: true,
    requireInteraction: params.requireInteraction ?? true,
    vibrate: [250, 100, 250, 100, 400],
  });
}

/**
 * المحرك المركزي الدائم لفحص التنبيهات بالخلفية لكل من:
 * 1. صائد القيعان (حتى خارج شاشة صائد القيعان)
 * 2. الحاسبة اللحظية (حتى خارج شاشة الحاسبة)
 * 3. خطوط الشارت وهدف الخروج (حتى بعد إغلاق نافذة الشارت)
 */
export function evaluateBackgroundAlertsForSymbol(symbol: string, priceNum: number): void {
  if (typeof window === 'undefined' || !symbol || isNaN(priceNum) || priceNum <= 0) return;
  const upperSym = symbol.toUpperCase();
  const now = Date.now();

  // A. فحص تنبيهات صائد القيعان (Range Master) مركزياً
  const rangeTrades = safeParseJson<RangeTrackedTrade[]>(STORAGE_KEY_RANGE_TRADES, []);
  if (rangeTrades.length > 0) {
    const timestamps = safeParseJson<Record<string, number>>(STORAGE_KEY_RANGE_ALERT_TIMESTAMPS, {});
    let timestampsChanged = false;

    rangeTrades.forEach((trade) => {
      if (trade.isActive === false || trade.binanceSymbol.toUpperCase() !== upperSym) return;
      const cfg = trade.alertConfig || DEFAULT_RANGE_ALERT_CONFIG;
      const isAlertActive = Boolean(trade.alertsEnabled && cfg.enabled);

      const canFireRange = (conditionKey: string): boolean => {
        const fullKey = `${trade.id}_${conditionKey}`;
        const lastTime = timestamps[fullKey] || 0;
        if (cfg.repeatMode === 'once') {
          return lastTime === 0;
        }
        const intervalMs = Math.max(1, cfg.repeatIntervalMinutes || 5) * 60 * 1000;
        return now - lastTime >= intervalMs;
      };

      const markRangeFired = (conditionKey: string, title: string, body: string, tag: string) => {
        timestamps[`${trade.id}_${conditionKey}`] = now;
        timestampsChanged = true;
        dispatchUnifiedNotification({
          title,
          body,
          tag,
          toneId: (cfg.toneId as AlertToneId) || 'celebration',
        });
      };

      if (trade.status === 'watching_trough' && isAlertActive) {
        if (cfg.triggerAtTrough && trade.troughPrice > 0) {
          const atTrough =
            priceNum <= trade.troughPrice ||
            (priceNum - trade.troughPrice) / trade.troughPrice <= 0.002;
          if (atTrough && canFireRange('at_trough')) {
            markRangeFired(
              'at_trough',
              `🎯 وصل السعر للقاع: ${trade.name}!`,
              `وصل سعر ${trade.name} لمنطقة القاع ($${priceNum}). صافي الربح المتوقع: +$${trade.netMarginUsdt?.toFixed(2) || '—'} (+${trade.netMarginPercent.toFixed(2)}%).`,
              `trough-${trade.id}`
            );
          }
        }
        if (cfg.triggerNearTrough && trade.troughPrice > 0) {
          const distPct = ((priceNum - trade.troughPrice) / trade.troughPrice) * 100;
          if (distPct > 0 && distPct <= (cfg.nearTroughPercent || 0.5) && canFireRange('near_trough')) {
            markRangeFired(
              'near_trough',
              `⏳ اقترب السعر من القاع: ${trade.name}!`,
              `السعر الآن ($${priceNum}) على بعد ${distPct.toFixed(2)}% فقط من قاع الشراء ($${trade.troughPrice}).`,
              `near-trough-${trade.id}`
            );
          }
        }
        if (cfg.triggerBounceConfirmation && trade.troughPrice > 0) {
          const bouncePct = ((priceNum - trade.troughPrice) / trade.troughPrice) * 100;
          if (
            bouncePct >= (cfg.bounceConfirmationPercent || 0.4) &&
            bouncePct <= (cfg.bounceConfirmationPercent || 0.4) + 0.5 &&
            canFireRange('bounce')
          ) {
            markRangeFired(
              'bounce',
              `⚡ تأكد الارتداد صعوداً: ${trade.name}!`,
              `ارتد سعر ${trade.name} بنسبة +${bouncePct.toFixed(2)}% فوق القاع ($${trade.troughPrice}).`,
              `bounce-${trade.id}`
            );
          }
        }
      }

      if (trade.status === 'in_trade' && isAlertActive) {
        if (cfg.triggerAtPeak && trade.peakPrice > 0 && priceNum >= trade.peakPrice && canFireRange('at_peak')) {
          markRangeFired(
            'at_peak',
            `🚀 وصل السعر للقمة المستهدفة: ${trade.name}!`,
            `حقق سعر ${trade.name} هدف القمة ($${priceNum}). حان وقت جني الأرباح والخروج!`,
            `peak-${trade.id}`
          );
        }
        if (cfg.triggerNearPeak && trade.peakPrice > 0) {
          const distPct = ((trade.peakPrice - priceNum) / trade.peakPrice) * 100;
          if (distPct > 0 && distPct <= (cfg.nearPeakPercent || 0.5) && canFireRange('near_peak')) {
            markRangeFired(
              'near_peak',
              `✨ اقترب السعر من القمة: ${trade.name}!`,
              `السعر الآن ($${priceNum}) على بعد ${distPct.toFixed(2)}% فقط من قمة البيع ($${trade.peakPrice}).`,
              `near-peak-${trade.id}`
            );
          }
        }
      }

      if (isAlertActive && cfg.triggerCustomPrice && cfg.customPrice && cfg.customPrice > 0) {
        const diffRatio = Math.abs(priceNum - cfg.customPrice) / cfg.customPrice;
        if (diffRatio <= 0.002 && canFireRange('custom_price')) {
          markRangeFired(
            'custom_price',
            `🔔 وصل السعر المخصص: ${trade.name}!`,
            `وصل سعر ${trade.name} إلى السعر المخصص ($${cfg.customPrice}).`,
            `custom-${trade.id}`
          );
        }
      }

      if (trade.status === 'closed' && trade.notifyOnOldTroughReturn && trade.troughPrice > 0) {
        const distRatio = Math.abs(priceNum - trade.troughPrice) / trade.troughPrice;
        if (distRatio <= 0.003 && canFireRange('old_trough')) {
          markRangeFired(
            'old_trough',
            `🔄 عودة لنفس القاع القديم: ${trade.name}!`,
            `عاد سعر ${trade.name} لملامسة القاع القديم ($${trade.troughPrice}).`,
            `old-trough-${trade.id}`
          );
        }
      }
    });

    if (timestampsChanged) {
      try {
        localStorage.setItem(STORAGE_KEY_RANGE_ALERT_TIMESTAMPS, JSON.stringify(timestamps));
      } catch {
        // Ignore
      }
    }
  }

  // B. فحص تنبيهات الحاسبة اللحظية (Calculator) مركزياً
  const currencies = safeParseJson<CurrencyItem[]>(STORAGE_KEY_CURRENCIES, []);
  currencies.forEach((curr) => {
    if (!curr.isMonitoringActive || !curr.targetPrice) return;
    const cleanName = curr.name.trim().toUpperCase();
    const pair = curr.binanceSymbol
      ? curr.binanceSymbol.toUpperCase()
      : cleanName.endsWith('USDT')
      ? cleanName
      : `${cleanName}USDT`;

    if (pair !== upperSym) return;
    const targetNum = parseFloat(curr.targetPrice);
    if (isNaN(targetNum) || targetNum <= 0) return;

    const dir = curr.targetDirection || 'above';
    const isReached = dir === 'above' ? priceNum >= targetNum : priceNum <= targetNum;
    if (
      isReached &&
      canTriggerAlert(
        'targetExit',
        pair,
        curr.alertRepeatMode || 'once',
        curr.alertIntervalSeconds || 60
      )
    ) {
      recordAlertTriggered('targetExit', pair);
      dispatchUnifiedNotification({
        title: `🎯 وصل السعر للهدف (${pair})!`,
        body: `السعر الحالي ${priceNum} USDT وصل إلى سعرك المستهدف ${targetNum} USDT (${dir === 'above' ? 'صعوداً 📈' : 'هبوطاً 📉'}).`,
        tag: `target-${pair}`,
        toneId: (curr.alertToneId as AlertToneId) || soundAlert.getActiveTone(),
      });
    }
  });

  // C. فحص خطوط الشارت الأفقية وهدف خروج الشارت (حتى بعد إغلاق نافذة الشارت)
  const lineKey = `tv_custom_lines_${upperSym}`;
  const customLines = safeParseJson<StoredChartLine[]>(lineKey, []);
  if (customLines.length > 0) {
    let linesMutated = false;
    const nextLines = customLines.map((cl) => {
      if (!cl.hasAlert) return cl;
      const repeatMode = cl.alertRepeatMode || 'once';
      if (repeatMode === 'once' && cl.alertFired) return cl;

      const dir = cl.alertDirection || 'above';
      const triggered = dir === 'above' ? priceNum >= cl.price : priceNum <= cl.price;
      const uniqueLineId = `${upperSym}_${cl.id}`;

      if (
        triggered &&
        canTriggerAlert('chartLines', uniqueLineId, repeatMode, cl.alertIntervalSeconds || 60)
      ) {
        recordAlertTriggered('chartLines', uniqueLineId);
        dispatchUnifiedNotification({
          title: `🔔 ملامسة خط الشارت: ${cl.label || upperSym}`,
          body: `السعر الحالي $${priceNum} تخطى الخط المحدد عند $${cl.price}`,
          tag: `line_${cl.id}`,
          toneId: (cl.alertToneId as AlertToneId) || 'bell',
        });
        if (repeatMode === 'once') {
          linesMutated = true;
          return { ...cl, alertFired: true };
        }
      }
      return cl;
    });

    if (linesMutated) {
      try {
        localStorage.setItem(lineKey, JSON.stringify(nextLines));
        window.dispatchEvent(
          new CustomEvent(EVENT_CHART_ALERTS_CHANGED, { detail: { symbol: upperSym } })
        );
      } catch {
        // Ignore
      }
    }
  }

  const exitKey = `tv_exit_alert_${upperSym}`;
  const exitAlert = safeParseJson<StoredExitAlert | null>(exitKey, null);
  if (exitAlert && exitAlert.active && exitAlert.price) {
    const exitNum = parseFloat(exitAlert.price);
    if (!isNaN(exitNum) && exitNum > 0) {
      const repeatMode = exitAlert.repeatMode || 'once';
      if (!(repeatMode === 'once' && exitAlert.fired)) {
        const uniqueExitId = `chart_exit_${upperSym}`;
        if (
          priceNum >= exitNum &&
          canTriggerAlert('targetExit', uniqueExitId, repeatMode, exitAlert.intervalSeconds || 60)
        ) {
          recordAlertTriggered('targetExit', uniqueExitId);
          dispatchUnifiedNotification({
            title: `🎯 وصول هدف خروج الشارت: ${upperSym}`,
            body: `وصل السعر إلى $${priceNum} (هدف الخروج: $${exitNum})`,
            tag: `exit_${upperSym}`,
            toneId: (exitAlert.toneId as AlertToneId) || soundAlert.getActiveTone(),
          });
          if (repeatMode === 'once') {
            try {
              localStorage.setItem(exitKey, JSON.stringify({ ...exitAlert, fired: true }));
              window.dispatchEvent(
                new CustomEvent(EVENT_CHART_ALERTS_CHANGED, { detail: { symbol: upperSym } })
              );
            } catch {
              // Ignore
            }
          }
        }
      }
    }
  }
}
