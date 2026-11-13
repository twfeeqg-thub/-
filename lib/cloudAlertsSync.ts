/**
 * خدمة مزامنة التنبيهات السحابية للخادم الخارجي المجاني
 * (Cloudflare Worker Cron + Web Push VAPID + Telegram Bot API)
 * تعمل عندما يكون التطبيق والمتصفح مغلقين بالكامل.
 */

import { collectAllUnifiedAlerts, UnifiedAlertItem } from '@/lib/unifiedAlerts';

export const STORAGE_KEY_CLOUD_ALERTS_CONFIG = 'price_calc_v0_cloud_alerts_config';

export interface CloudAlertRulePayload {
  id: string;
  symbol: string;
  source: string;
  label: string;
  direction: 'above' | 'below';
  targetPrice: number;
  repeatMode: 'once' | 'continuous';
  intervalSeconds: number;
}

export interface CloudAlertsConfig {
  enabled: boolean;
  syncKeyId: string;
  workerUrl: string;
  syncSecret: string;
  webPushEnabled: boolean;
  pushSubscription: PushSubscriptionJSON | null;
  telegramEnabled: boolean;
  telegramChatId: string;
  telegramBotToken: string;
  lastSyncedAt?: number;
  lastSyncStatus?: string;
}

function generateSyncKeyId(): string {
  return `u_${Math.random().toString(36).substring(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

export function getCloudAlertsConfig(): CloudAlertsConfig {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      syncKeyId: 'ssr_placeholder',
      workerUrl: '',
      syncSecret: '',
      webPushEnabled: false,
      pushSubscription: null,
      telegramEnabled: false,
      telegramChatId: '',
      telegramBotToken: '',
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLOUD_ALERTS_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: Boolean(parsed.enabled),
        syncKeyId: parsed.syncKeyId || generateSyncKeyId(),
        workerUrl: parsed.workerUrl || '',
        syncSecret: parsed.syncSecret || '',
        webPushEnabled: Boolean(parsed.webPushEnabled),
        pushSubscription: parsed.pushSubscription || null,
        telegramEnabled: Boolean(parsed.telegramEnabled),
        telegramChatId: parsed.telegramChatId || '',
        telegramBotToken: parsed.telegramBotToken || '',
        lastSyncedAt: parsed.lastSyncedAt,
        lastSyncStatus: parsed.lastSyncStatus,
      };
    }
  } catch {
    // Ignore
  }

  const fresh: CloudAlertsConfig = {
    enabled: false,
    syncKeyId: generateSyncKeyId(),
    workerUrl: '',
    syncSecret: '',
    webPushEnabled: false,
    pushSubscription: null,
    telegramEnabled: false,
    telegramChatId: '',
    telegramBotToken: '',
  };
  saveCloudAlertsConfig(fresh);
  return fresh;
}

export function saveCloudAlertsConfig(cfg: CloudAlertsConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CLOUD_ALERTS_CONFIG, JSON.stringify(cfg));
  } catch {
    // Ignore
  }
}

export function buildCloudAlertRules(unifiedItems?: UnifiedAlertItem[]): CloudAlertRulePayload[] {
  const items = unifiedItems || collectAllUnifiedAlerts();
  const rules: CloudAlertRulePayload[] = [];

  items.forEach((item) => {
    if (!item.enabled || !item.symbol || item.symbol === 'SESSIONS') return;
    if (!item.targetPrice || isNaN(item.targetPrice) || item.targetPrice <= 0) return;

    const dir: 'above' | 'below' =
      item.direction === 'below'
        ? 'below'
        : item.direction === 'range'
        ? 'below'
        : 'above';

    rules.push({
      id: item.id,
      symbol: item.symbol.toUpperCase(),
      source: item.sourceLabel,
      label: `${item.displayName} (${item.conditionSummary})`,
      direction: dir,
      targetPrice: item.targetPrice,
      repeatMode: item.repeatMode,
      intervalSeconds: item.intervalSeconds,
    });
  });

  return rules;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeBrowserWebPush(): Promise<{
  success: boolean;
  subscription?: PushSubscriptionJSON;
  error?: string;
}> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'المتصفح الحالي لا يدعم إشعارات Web Push السحابية.' };
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return { success: false, error: 'يرجى منح إذن الإشعارات من المتصفح أولاً.' };
    }

    const vapidRes = await fetch('/api/alerts/vapid');
    const vapidData = await vapidRes.json();
    if (!vapidData?.publicKey) {
      return {
        success: false,
        error: 'مفاتيح VAPID السحابية غير مضبوطة في الخادم بعد (يمكنك استخدام تليغرام فوراً أو إضافة مفاتيح VAPID في البيئة).',
      };
    }

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const appServerKey = urlBase64ToUint8Array(vapidData.publicKey);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      });
    }

    return { success: true, subscription: sub.toJSON() };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'تعذر تسجيل اشتراك Web Push',
    };
  }
}

export async function syncAlertsToExternalServer(
  customConfig?: CloudAlertsConfig
): Promise<{ success: boolean; rulesCount: number; message: string }> {
  const cfg = customConfig || getCloudAlertsConfig();
  const rules = buildCloudAlertRules();

  try {
    const res = await fetch('/api/alerts/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        syncKeyId: cfg.syncKeyId,
        enabled: cfg.enabled,
        workerUrl: cfg.workerUrl?.trim() || undefined,
        syncSecret: cfg.syncSecret?.trim() || undefined,
        pushSubscription: cfg.webPushEnabled ? cfg.pushSubscription : null,
        telegramEnabled: cfg.telegramEnabled,
        telegramChatId: cfg.telegramChatId?.trim() || '',
        telegramBotToken: cfg.telegramBotToken?.trim() || undefined,
        rules,
      }),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      const updated: CloudAlertsConfig = {
        ...cfg,
        lastSyncedAt: Date.now(),
        lastSyncStatus: data.forwardedToWorker
          ? `تمت المزامنة مع Cloudflare Worker (${rules.length} تنبيه)`
          : `تمت المزامنة مع الخادم الداخلي (${rules.length} تنبيه)`,
      };
      saveCloudAlertsConfig(updated);
      return {
        success: true,
        rulesCount: rules.length,
        message: updated.lastSyncStatus || 'تمت المزامنة بنجاح',
      };
    }

    return {
      success: false,
      rulesCount: rules.length,
      message: data.error || 'فشلت المزامنة مع الخادم',
    };
  } catch (err) {
    return {
      success: false,
      rulesCount: rules.length,
      message: err instanceof Error ? err.message : 'تعذر الاتصال بالخادم',
    };
  }
}
