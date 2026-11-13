/**
 * نظام إدارة سجل وتكرار التنبيهات الموحد لكافة أجزاء التطبيق
 * تم إلغاء الأقفال العامة المخفية (Hidden Global Locks) بناءً على طلب المستخدم:
 * تفعيل التنبيه من أي شاشة يفعّله مباشرة في المركز الموحد بدون قفل سري يعطله.
 */

export type AlertTypeId =
  | 'bottomDetection'
  | 'reboundBounce'
  | 'targetExit'
  | 'chartLines'
  | 'trailingPeak'
  | 'breakEvenStop';

export interface SingleAlertConfig {
  id: AlertTypeId;
  name: string;
  description: string;
  iconName: string;
  enabled: boolean;
  repeatMode: 'once' | 'continuous';
  intervalSeconds: number;
}

export type AppAlertSettings = Record<AlertTypeId, SingleAlertConfig>;

export const DEFAULT_ALERT_SETTINGS: AppAlertSettings = {
  bottomDetection: {
    id: 'bottomDetection',
    name: 'تنبيه رصد القاع',
    description: 'إصدار تنبيه صوتي وإشعار عند تسجيل العملة لقاع مستهدف في صائد القيعان',
    iconName: 'TrendingDown',
    enabled: true,
    repeatMode: 'once',
    intervalSeconds: 60,
  },
  reboundBounce: {
    id: 'reboundBounce',
    name: 'تنبيه تأكيد الارتداد',
    description: 'تنبيه عند ارتداد السعر صعوداً بنسبة مؤكدة فوق القاع الأخير',
    iconName: 'Zap',
    enabled: true,
    repeatMode: 'once',
    intervalSeconds: 60,
  },
  targetExit: {
    id: 'targetExit',
    name: 'تنبيه المستهدف وسعر الخروج',
    description: 'تنبيه فوري عند وصول السعر إلى المستهدف المحدد في المراقبة أو الحاسبة أو الشارت',
    iconName: 'Target',
    enabled: true,
    repeatMode: 'once',
    intervalSeconds: 60,
  },
  chartLines: {
    id: 'chartLines',
    name: 'تنبيه خطوط الشارت المرسومة',
    description: 'تنبيه عند ملامسة السعر لأي خط أفقي مخصص مرسوم على الشارت',
    iconName: 'Sliders',
    enabled: true,
    repeatMode: 'once',
    intervalSeconds: 60,
  },
  trailingPeak: {
    id: 'trailingPeak',
    name: 'تنبيه القمة وجني الأرباح',
    description: 'تحذير عند اقتراب أو وصول السعر إلى القمة المستهدفة',
    iconName: 'AlertTriangle',
    enabled: true,
    repeatMode: 'once',
    intervalSeconds: 60,
  },
  breakEvenStop: {
    id: 'breakEvenStop',
    name: 'تنبيه التعادل والمستويات المخصصة',
    description: 'تنبيه عند تجاوز سعر مخصص أو مستوى التعادل',
    iconName: 'ShieldAlert',
    enabled: true,
    repeatMode: 'once',
    intervalSeconds: 60,
  },
};

export const STORAGE_KEY_APP_ALERT_SETTINGS = 'price_calc_v0_unified_alert_settings';
export const STORAGE_KEY_ALERT_FIRING_HISTORY = 'price_calc_v0_alert_firing_history';

const lastTriggerTimestamps = new Map<string, number>();
const firedOnceSet = new Set<string>();

function loadFiringHistoryFromStorage() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ALERT_FIRING_HISTORY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.firedOnce)) {
        parsed.firedOnce.forEach((k: string) => firedOnceSet.add(k));
      }
      if (parsed.timestamps && typeof parsed.timestamps === 'object') {
        Object.entries(parsed.timestamps).forEach(([k, v]) => {
          if (typeof v === 'number') {
            lastTriggerTimestamps.set(k, v);
          }
        });
      }
    }
  } catch {
    // Ignore
  }
}

function saveFiringHistoryToStorage() {
  if (typeof window === 'undefined') return;
  try {
    const timestampsObj: Record<string, number> = {};
    lastTriggerTimestamps.forEach((v, k) => {
      timestampsObj[k] = v;
    });
    const payload = {
      firedOnce: Array.from(firedOnceSet),
      timestamps: timestampsObj,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY_ALERT_FIRING_HISTORY, JSON.stringify(payload));
  } catch {
    // Ignore
  }
}

loadFiringHistoryFromStorage();

type Listener = (settings: AppAlertSettings) => void;
const listeners = new Set<Listener>();

export function getAlertSettings(): AppAlertSettings {
  if (typeof window === 'undefined') return DEFAULT_ALERT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_APP_ALERT_SETTINGS);
    if (!raw) return DEFAULT_ALERT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      bottomDetection: { ...DEFAULT_ALERT_SETTINGS.bottomDetection, ...(parsed.bottomDetection || {}) },
      reboundBounce: { ...DEFAULT_ALERT_SETTINGS.reboundBounce, ...(parsed.reboundBounce || {}) },
      targetExit: { ...DEFAULT_ALERT_SETTINGS.targetExit, ...(parsed.targetExit || {}) },
      chartLines: { ...DEFAULT_ALERT_SETTINGS.chartLines, ...(parsed.chartLines || {}) },
      trailingPeak: { ...DEFAULT_ALERT_SETTINGS.trailingPeak, ...(parsed.trailingPeak || {}) },
      breakEvenStop: { ...DEFAULT_ALERT_SETTINGS.breakEvenStop, ...(parsed.breakEvenStop || {}) },
    };
  } catch {
    return DEFAULT_ALERT_SETTINGS;
  }
}

export function saveAlertSettings(settings: AppAlertSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_APP_ALERT_SETTINGS, JSON.stringify(settings));
    listeners.forEach((fn) => fn(settings));
  } catch (err) {
    console.error('Failed to save alert settings', err);
  }
}

export function subscribeAlertSettings(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * فحص التكرار بالاعتماد على المعرف الفريد للتنبيه دون أي أقفال عامة مخفية تعطل الشاشات
 */
export function canTriggerAlert(
  typeId: AlertTypeId,
  instanceId: string = 'global',
  overrideRepeatMode?: 'once' | 'continuous',
  overrideIntervalSeconds?: number
): boolean {
  const settings = getAlertSettings();
  const config = settings[typeId];
  const repeatMode = overrideRepeatMode || config?.repeatMode || 'once';
  const intervalSeconds = overrideIntervalSeconds ?? config?.intervalSeconds ?? 60;

  const key = `${typeId}_${instanceId}`;
  const now = Date.now();

  if (repeatMode === 'once') {
    return !firedOnceSet.has(key);
  }

  const lastTime = lastTriggerTimestamps.get(key) || 0;
  const intervalMs = Math.max(5, intervalSeconds) * 1000;
  return now - lastTime >= intervalMs;
}

export function recordAlertTriggered(typeId: AlertTypeId, instanceId: string = 'global'): void {
  const key = `${typeId}_${instanceId}`;
  firedOnceSet.add(key);
  lastTriggerTimestamps.set(key, Date.now());
  saveFiringHistoryToStorage();
}

export function resetAlertTrigger(typeId: AlertTypeId, instanceId: string = 'global'): void {
  const key = `${typeId}_${instanceId}`;
  firedOnceSet.delete(key);
  lastTriggerTimestamps.delete(key);
  saveFiringHistoryToStorage();
}

export function clearAllAlertFiringHistory(): void {
  firedOnceSet.clear();
  lastTriggerTimestamps.clear();
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY_ALERT_FIRING_HISTORY);
    } catch {
      // Ignore
    }
  }
}

export function isAlertInstanceFiredOnce(typeId: AlertTypeId, instanceId: string): boolean {
  return firedOnceSet.has(`${typeId}_${instanceId}`);
}
