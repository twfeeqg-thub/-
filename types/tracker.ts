export interface PriceSnapshot {
  id: string;
  price: string;
  timestamp: number;
  label?: string; // مثلاً: "نقطة رصد أصلية", "قمة جديدة", "اختراق", إلخ
}

export interface TrackedCurrency {
  id: string;
  name: string; // e.g. "SOL"
  binanceSymbol: string; // e.g. "SOLUSDT"
  baselinePrice: string; // سعر الرصد المرجعي
  baselineTimestamp: number; // وقت تسجيل نقطة الرصد بالمللي ثانية
  createdAt: number;
  notes?: string;
  // أعلى سعر وأدنى سعر وصلته العملة منذ وقت الرصد
  peakPrice?: string;
  peakTimestamp?: number;
  troughPrice?: string;
  troughTimestamp?: number;
  // سجل اللقطات والنقاط التاريخية المحفوظة
  snapshots?: PriceSnapshot[];
}

export const STORAGE_KEY_TRACKER = 'price_calc_v0_tracker';
export const STORAGE_KEY_TRACKER_ACTIVE = 'price_calc_v0_tracker_active_currency';
export const STORAGE_KEY_TRACKER_STREAM = 'price_calc_v0_tracker_stream_active';
export const MAX_TRACKED_CURRENCIES = 25;
