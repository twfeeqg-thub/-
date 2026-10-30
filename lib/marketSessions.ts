import { MarketSession, GLOBAL_MARKET_SESSIONS } from '@/types/marketSessions';

export interface MakkahTimeInfo {
  hours: number;
  minutes: number;
  seconds: number;
  decimalHours: number; // e.g. 14.5 for 14:30
  formattedTime: string; // e.g. "02:30:15 م"
  formatted24h: string;  // e.g. "14:30"
}

// توقيت افتراضي ثابت ونظيف لمطابقة العرض الأولي بين الخادم والعميل (SSR)
export const DEFAULT_INITIAL_MAKKAH_TIME: MakkahTimeInfo = {
  hours: 12,
  minutes: 0,
  seconds: 0,
  decimalHours: 12.0,
  formattedTime: '12:00:00 م',
  formatted24h: '12:00',
};

/**
 * حساب الوقت الحالي بدقة بتوقيت مكة المكرمة (GMT+3)
 */
export function getCurrentMakkahTime(): MakkahTimeInfo {
  const now = new Date();
  
  // حساب توقيت UTC ثم إضافة 3 ساعات لمكة المكرمة
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
  const makkahDate = new Date(utcMs + (3 * 3600000));

  const hours = makkahDate.getHours();
  const minutes = makkahDate.getMinutes();
  const seconds = makkahDate.getSeconds();
  const decimalHours = hours + (minutes / 60) + (seconds / 3600);

  const h12 = hours % 12 || 12;
  const ampm = hours >= 12 ? 'م' : 'ص';
  const pad = (n: number) => String(n).padStart(2, '0');

  return {
    hours,
    minutes,
    seconds,
    decimalHours,
    formattedTime: `${pad(h12)}:${pad(minutes)}:${pad(seconds)} ${ampm}`,
    formatted24h: `${pad(hours)}:${pad(minutes)}`,
  };
}

/**
 * فحص هل الجلسة مفتوحة حالياً بالنظر إلى وقت مكة المكرمة
 */
export function isSessionOpen(session: MarketSession, currentDecimalHour: number): boolean {
  if (session.startHourMakkah < session.endHourMakkah) {
    return currentDecimalHour >= session.startHourMakkah && currentDecimalHour < session.endHourMakkah;
  }
  // إذا كانت الجلسة تعبر منتصف الليل
  return currentDecimalHour >= session.startHourMakkah || currentDecimalHour < session.endHourMakkah;
}

/**
 * حساب الوقت المتبقي للافتتاح أو الإغلاق بالساعات والدقائق
 */
export function getSessionCountdown(session: MarketSession, currentDecimalHour: number): {
  isOpen: boolean;
  text: string;
  minutesRemaining: number;
} {
  const open = isSessionOpen(session, currentDecimalHour);
  let targetHour = open ? session.endHourMakkah : session.startHourMakkah;
  
  let diff = targetHour - currentDecimalHour;
  if (diff < 0) diff += 24;

  const totalMinutes = Math.round(diff * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  const timeStr = h > 0 ? `${h}س ${m}د` : `${m} دقيقة`;

  return {
    isOpen: open,
    text: open ? `تغلق بعد ${timeStr}` : `تفتتح بعد ${timeStr}`,
    minutesRemaining: totalMinutes,
  };
}

/**
 * فحص هل نحن الآن في فترة التداخل الذهبي (لندن + نيويورك = ذروة السيولة العالمية)
 * بتوقيت مكة: من 16:30 إلى 19:30
 */
export function isGoldenOverlapActive(currentDecimalHour: number): boolean {
  return currentDecimalHour >= 16.5 && currentDecimalHour < 19.5;
}

/**
 * تقدير مستوى السيولة العالمية اللحظية
 */
export function getLiquidityLevel(currentDecimalHour: number): {
  level: 'ultra' | 'high' | 'medium' | 'low';
  title: string;
  badgeClass: string;
  description: string;
} {
  // فحص التداخل الذهبي
  if (isGoldenOverlapActive(currentDecimalHour)) {
    return {
      level: 'ultra',
      title: 'ذروة السيولة العالمية 🔥',
      badgeClass: 'bg-amber-500 text-slate-950 font-black animate-pulse border border-amber-400',
      description: 'تداخل لندن مع نيويورك: أقصى زخم وأعلى أحجام تداول في اليوم، وقت مثالي لاقتناص السكالبينج السريع.',
    };
  }

  // فحص كم سوق مفتوح الآن
  let openCount = 0;
  GLOBAL_MARKET_SESSIONS.forEach((s) => {
    if (isSessionOpen(s, currentDecimalHour)) openCount++;
  });

  if (openCount >= 2) {
    return {
      level: 'high',
      title: 'سيولة مرتفعة ⚡',
      badgeClass: 'bg-emerald-500 text-slate-950 font-black border border-emerald-400',
      description: 'جلستان نشطتان في نفس الوقت: تدفق سيولة قوي وتحركات واضحة المعالم.',
    };
  }

  if (openCount === 1) {
    return {
      level: 'medium',
      title: 'سيولة معتدلة 🟢',
      badgeClass: 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30',
      description: 'سوق رئيسي واحد نشط: حركة منتظمة ومسارات عرضية مستقرة.',
    };
  }

  return {
    level: 'low',
    title: 'فترة هدوء السيولة 💤',
    badgeClass: 'bg-slate-500/20 text-slate-400 font-bold border border-slate-500/30',
    description: 'فترة انتقال خاملة بين الجلسات الرئيسية، التذبذب أضعف.',
  };
}
