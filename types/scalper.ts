export type ScalpStatus = 'watching' | 'in_trade' | 'closed';

export interface ScalpTarget {
  percent: number;
  label: string;
}

export interface ScalpTrade {
  id: string;
  name: string;             // e.g. "SOL"
  binanceSymbol: string;    // e.g. "SOLUSDT"
  status: ScalpStatus;
  createdAt: number;
  isActive?: boolean;       // تفعيل أو إيقاف الصفقة مؤقتاً (تفعيل/غلق)
  alertsEnabled?: boolean;  // تفعيل أو كتم التنبيهات الخاصة بهذه الصفقة (افتراضياً: مغلق false)

  // Parameters for Hunting / Watching
  dipPrice?: string;        // أدنى قاع تم رصده
  dipTimestamp?: number;
  bounceTriggerPercent?: number; // e.g. 0.3% فوق القاع
  
  // Parameters for In-Trade
  entryPrice?: string;
  allocatedUsdt?: string;
  coinQuantity?: string;
  entryTimestamp?: number;
  breakEvenPrice?: string;
  
  // Live Extremes during Trade
  peakSinceEntry?: string;
  peakTimestamp?: number;
  trailingDropAlertPercent?: number; // e.g. 0.35% تراجع عن القمة لتأمين الربح

  // Targets
  target1Percent?: number; // default 0.6%
  target2Percent?: number; // default 1.2%
  target3Percent?: number; // default 2.0%
  stopLossPercent?: number; // default 0.8%

  // Closure / Exit Details
  exitPrice?: string;
  exitTimestamp?: number;
  realizedPnlUsdt?: number;
  realizedPnlPercent?: number;
  exitReason?: 'target' | 'trailing_peak' | 'manual_usdt' | 'breakeven' | 'stop_loss' | 'time_limit';
  holdingDurationMinutes?: number;

  // Real-world observations / notes
  notes?: string;

  // Mini Chart & Sparkline price points history (last 20-30 points)
  priceHistory?: number[];
}

export interface DayPerformanceItem {
  date: string;          // YYYY-MM-DD
  dayLabel: string;      // e.g. "الأحد", "اليوم"
  realizedPnlUsdt: number;
  tradesCount: number;
  winCount: number;
}

export interface ScalperSessionStats {
  availableCapitalUsdt: string;
  initialCapitalUsdt: string;
  completedScalps: number;
  winningScalps: number;
  totalRealizedPnlUsdt: number;
  totalRealizedVolumeUsdt: number;
  avgDurationMinutes: number;
  // History for Daily & Weekly Recharts reporting
  historyDays?: DayPerformanceItem[];
}

export const STORAGE_KEY_SCALPER_TRADES = 'price_calc_v0_scalper_trades';
export const STORAGE_KEY_SCALPER_SESSION = 'price_calc_v0_scalper_session';
export const STORAGE_KEY_SCALPER_STREAM = 'price_calc_v0_scalper_stream_active';
