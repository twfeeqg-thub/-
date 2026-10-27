/**
 * نظام إدارة إعدادات وتخصيص التنبيهات الموحد لكافة أجزاء التطبيق
 * جميع التنبيهات مغلقة افتراضياً (Default: OFF) وفق طلب المستخدم
 */

export type AlertTypeId = 
  | 'bottomDetection'   // تنبيه رصد القاع
  | 'reboundBounce'     // تنبيه تأكيد الارتداد
  | 'targetExit'        // تنبيه وصول السعر للمستهدف أو الخروج
  | 'chartLines'        // تنبيه خطوط الشارت المرسومة
  | 'trailingPeak'      // تنبيه تراجع القمة لتأمين الأرباح
  | 'breakEvenStop';    // تنبيه كسر التعادل ووقف الخسارة

export interface SingleAlertConfig {
  id: AlertTypeId;
  name: string;
  description: string;
  iconName: string;
  enabled: boolean;                  // الوضع الافتراضي مغلق (false)
  repeatMode: 'once' | 'continuous'; // 'once' (مرة واحدة) أو 'continuous' (باستمرار)
  intervalSeconds: number;           // الفاصل الزمني للتكرار بالثواني (افتراضي: 60)
}

export type AppAlertSettings = Record<AlertTypeId, SingleAlertConfig>;

export const DEFAULT_ALERT_SETTINGS: AppAlertSettings = {
  bottomDetection: {
    id: 'bottomDetection',
    name: 'تنبيه رصد القاع',
    description: 'إصدار تنبيه صوتي وإشعار عند تسجيل العملة لقاع أدنى جديد في رادار الرصد',
    iconName: 'TrendingDown',
    enabled: false, // مغلق افتراضياً
    repeatMode: 'once',
    intervalSeconds: 60,
  },
  reboundBounce: {
    id: 'reboundBounce',
    name: 'تنبيه تأكيد الارتداد',
    description: 'تنبيه عند ارتداد السعر صعوداً بنسبة مؤكدة فوق القاع الأخير لاقتناص الفرصة',
    iconName: 'Zap',
    enabled: false, // مغلق افتراضياً
    repeatMode: 'once',
    intervalSeconds: 60,
  },
  targetExit: {
    id: 'targetExit',
    name: 'تنبيه المستهدف وسعر الخروج',
    description: 'تنبيه فوري عند وصول السعر إلى المستهدف المحدد أو هدف الخروج من الصفقة',
    iconName: 'Target',
    enabled: false, // مغلق افتراضياً
    repeatMode: 'once',
    intervalSeconds: 60,
  },
  chartLines: {
    id: 'chartLines',
    name: 'تنبيه خطوط الشارت المرسومة',
    description: 'تنبيه عند ملامسة السعر لأي خط أفقي مخصص مرسوم على شارت TradingView',
    iconName: 'Sliders',
    enabled: false, // مغلق افتراضياً
    repeatMode: 'once',
    intervalSeconds: 60,
  },
  trailingPeak: {
    id: 'trailingPeak',
    name: 'تنبيه تراجع القمة (حماية الربح)',
    description: 'تحذير عند تراجع السعر عن أعلى قمة حققها أثناء الصفقة لجني الأرباح فوراً',
    iconName: 'AlertTriangle',
    enabled: false, // مغلق افتراضياً
    repeatMode: 'once',
    intervalSeconds: 60,
  },
  breakEvenStop: {
    id: 'breakEvenStop',
    name: 'تنبيه كسر التعادل ووقف الخسارة',
    description: 'تنبيه عند هبوط السعر تحت مستوى التعادل لتجنب تحمل خسائر في الصفقة',
    iconName: 'ShieldAlert',
    enabled: false, // مغلق افتراضياً
    repeatMode: 'once',
    intervalSeconds: 60,
  },
};

export const STORAGE_KEY_APP_ALERT_SETTINGS = 'price_calc_v0_unified_alert_settings';

// سجل زمني لآخر إطلاق للتنبيهات للتحكم بالتكرار
const lastTriggerTimestamps = new Map<string, number>();
const firedOnceSet = new Set<string>();

type Listener = (settings: AppAlertSettings) => void;
const listeners = new Set<Listener>();

export function getAlertSettings(): AppAlertSettings {
  if (typeof window === 'undefined') return DEFAULT_ALERT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_APP_ALERT_SETTINGS);
    if (!raw) return DEFAULT_ALERT_SETTINGS;
    const parsed = JSON.parse(raw);
    // دمج الإعدادات المحفوظة مع الإعدادات الافتراضية لضمان وجود كافة المفاتيح
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
 * فحص ما إذا كان التنبيه مفعلاً ومسموحاً بإطلاقه الآن بناءً على خيارات التكرار
 */
export function canTriggerAlert(typeId: AlertTypeId, instanceId: string = 'global'): boolean {
  const settings = getAlertSettings();
  const config = settings[typeId];
  if (!config || !config.enabled) {
    // التنبيه مغلق
    return false;
  }

  const key = `${typeId}_${instanceId}`;
  const now = Date.now();

  if (config.repeatMode === 'once') {
    if (firedOnceSet.has(key)) {
      return false; // أُطلق مرة واحدة بالفعل
    }
    return true;
  }

  // وضع التكرار باستمرار (continuous)
  const lastTime = lastTriggerTimestamps.get(key) || 0;
  const intervalMs = (config.intervalSeconds || 60) * 1000;
  return now - lastTime >= intervalMs;
}

/**
 * تسجيل حدوث التنبيه لتطبيق قيود الفاصل الزمني والتكرار
 */
export function recordAlertTriggered(typeId: AlertTypeId, instanceId: string = 'global'): void {
  const key = `${typeId}_${instanceId}`;
  firedOnceSet.add(key);
  lastTriggerTimestamps.set(key, Date.now());
}

/**
 * إعادة تعيين حالة التنبيه لعملة أو خط معين
 */
export function resetAlertTrigger(typeId: AlertTypeId, instanceId: string = 'global'): void {
  const key = `${typeId}_${instanceId}`;
  firedOnceSet.delete(key);
  lastTriggerTimestamps.delete(key);
}
