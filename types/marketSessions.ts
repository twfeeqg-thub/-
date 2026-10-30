export interface MarketSession {
  id: 'sydney' | 'tokyo' | 'london' | 'newyork';
  name: string;
  city: string;
  flag: string;
  startHourMakkah: number;  // بتوقيت مكة (0-23.99)
  endHourMakkah: number;    // بتوقيت مكة (0-23.99)
  color: string;
  accentBg: string;
  borderColor: string;
  description: string;
}

// أوقات الجلسات العالمية الأربعة الكبرى بتوقيت مكة المكرمة (GMT+3)
export const GLOBAL_MARKET_SESSIONS: MarketSession[] = [
  {
    id: 'sydney',
    name: 'جلسة سيدني',
    city: 'Sydney',
    flag: '🇦🇺',
    startHourMakkah: 1.0,     // 01:00 فجراً
    endHourMakkah: 10.0,      // 10:00 صباحاً
    color: '#38bdf8',         // سماوي
    accentBg: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    description: 'افتتاح يوم التداول الجديد، بداية هادئة وتأسيس نطاقات آسيا',
  },
  {
    id: 'tokyo',
    name: 'جلسة طوكيو (آسيا)',
    city: 'Tokyo / Asian',
    flag: '🇯🇵',
    startHourMakkah: 3.0,     // 03:00 فجراً
    endHourMakkah: 12.0,      // 12:00 ظهراً
    color: '#a855f7',         // أرجواني
    accentBg: 'rgba(168, 85, 247, 0.15)',
    borderColor: 'rgba(168, 85, 247, 0.4)',
    description: 'سيولة آسيوية نشطة، تركيز على العملات التكنولوجية وبداية الزخم',
  },
  {
    id: 'london',
    name: 'جلسة لندن (أوروبا)',
    city: 'London / Europe',
    flag: '🇬🇧',
    startHourMakkah: 11.0,    // 11:00 صباحاً
    endHourMakkah: 19.5,      // 07:30 مساءً
    color: '#3b82f6',         // أزرق ملكي
    accentBg: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    description: 'أكبر مركز مالي، انفجار في أحجام التداول والكسر السعري',
  },
  {
    id: 'newyork',
    name: 'جلسة نيويورك (أمريكا)',
    city: 'New York / US',
    flag: '🇺🇸',
    startHourMakkah: 16.5,    // 04:30 عصراً
    endHourMakkah: 23.0,      // 11:00 ليلاً
    color: '#f59e0b',         // ذهبي / كهرماني
    accentBg: 'rgba(245, 158, 11, 0.18)',
    borderColor: 'rgba(245, 158, 11, 0.5)',
    description: 'سيولة وول ستريت المؤسسية، حركة قوية وتذبذبات عنيفة',
  },
];

export interface MarketAlertConfig {
  enabled: boolean;                      // مفتاح التفعيل العام (مغلق افتراضياً: false)
  notifyOnSessionOpen: boolean;          // تنبيه عند افتتاح أي جلسة
  notifyOnSessionClose: boolean;         // تنبيه عند إغلاق أي جلسة
  notifyOnGoldenOverlap: boolean;        // تنبيه عند دخول فترة التداخل الذهبي (لندن + نيويورك)
  preOpenNoticeMinutes: number;          // إشعار قبل الافتتاح بعدة دقائق (مثلاً 15 دقيقة)
  soundTone: string;                     // نغمة الصوت
}

export const DEFAULT_MARKET_ALERT_CONFIG: MarketAlertConfig = {
  enabled: false,                        // الوضع الافتراضي لجميع التنبيهات مغلق
  notifyOnSessionOpen: true,
  notifyOnSessionClose: false,
  notifyOnGoldenOverlap: true,
  preOpenNoticeMinutes: 15,
  soundTone: 'bell',
};

export const STORAGE_KEY_MARKET_BAR_COLLAPSED = 'price_calc_v0_market_bar_collapsed';
export const STORAGE_KEY_MARKET_ALERT_CONFIG = 'price_calc_v0_market_alert_config';
