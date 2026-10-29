export type RangeTradeStatus = 'watching_trough' | 'in_trade' | 'closed';

export interface RangeTimeframeOption {
  id: string;
  label: string;
  minutes: number;
}

export const RANGE_TIMEFRAME_OPTIONS: RangeTimeframeOption[] = [
  { id: '30m', label: '30 دقيقة (30 شمعة)', minutes: 30 },
  { id: '1h', label: '1 ساعة (60 شمعة)', minutes: 60 },
  { id: '2h', label: '2 ساعة (120 شمعة)', minutes: 120 },
  { id: '4h', label: '4 ساعات (240 شمعة)', minutes: 240 },
  { id: '8h', label: '8 ساعات (480 شمعة)', minutes: 480 },
];

export interface SectorPreset {
  id: string;
  name: string;
  description: string;
  symbols: string[];
}

export const SECTOR_PRESETS: SectorPreset[] = [
  {
    id: 'ai',
    name: 'الذكاء الاصطناعي (AI)',
    description: 'عملات مشاريع وحوسبة الذكاء الاصطناعي ذات الحركة النشطة',
    symbols: ['NEAR', 'FET', 'RENDER', 'TAO', 'GRT', 'WLD', 'AGIX'],
  },
  {
    id: 'meme',
    name: 'عملات الميم (Memes)',
    description: 'تذبذبات قوية ومستويات ارتداد متكررة وسريعة',
    symbols: ['DOGE', 'SHIB', 'PEPE', 'WIF', 'FLOKI', 'BONK', 'BOME'],
  },
  {
    id: 'infra',
    name: 'البنية التحتية والطبقة 1/2',
    description: 'شبكات البلوكشين الرئيسية والطبقات الثانية ذات السيولة المؤسسية',
    symbols: ['SOL', 'ETH', 'BNB', 'AVAX', 'SUI', 'APT', 'ARB', 'OP', 'LINK'],
  },
  {
    id: 'high_liq',
    name: 'سيولة وتذبذب عرضي مستقر',
    description: 'أزواج ذات عمق سيولة ممتاز لمسارات عرضية واضحة المعالم',
    symbols: ['BTC', 'SOL', 'XRP', 'ADA', 'MATIC', 'DOT', 'LTC'],
  },
];

export interface RangeAnalysisResult {
  symbol: string;
  binanceSymbol: string;
  timeframeMinutes: number;
  candlesCount: number;
  troughPrice: number;       // أدنى قاع تم رصده في شموع الدقيقة
  peakPrice: number;         // أعلى قمة تم رصدها في شموع الدقيقة
  currentPrice: number;
  grossSpreadPercent: number; // ((peak - trough) / trough) * 100
  distanceToTroughPercent: number; // ((current - trough) / trough) * 100
  distanceToPeakPercent: number;   // ((peak - current) / current) * 100
  troughTouchesCount: number; // كم مرة لامس السعر منطقة القاع (تأكيد القناة)
  peakTouchesCount: number;   // كم مرة لامس السعر منطقة القمة
  entryFeePercent: number;
  exitFeePercent: number;
  slippagePercent: number;
  totalCostPercent: number;   // مجموع الرسوم والانزلاق
  netExpectedMarginPercent: number; // هامش الربح الصافي بعد التكاليف
  isViable: boolean;          // هل النطاق يغطي التكاليف ويوفر ربحاً صافياً؟
  lastFetchedAt: number;
}

export interface RangeTrackedTrade {
  id: string;
  name: string;              // e.g. "NEAR"
  binanceSymbol: string;     // e.g. "NEARUSDT"
  timeframeMinutes: number;  // e.g. 60
  status: RangeTradeStatus;
  createdAt: number;
  isActive: boolean;         // تفعيل / غلق
  alertsEnabled: boolean;    // تنبيه القاع: مغلق افتراضياً (false)
  notifyOnOldTroughReturn?: boolean; // تنبيه إذا عاد السعر لنفس القاع القديم

  // المستويات العرضية المعتمدة
  troughPrice: number;       // سعر القاع المستهدف للشراء
  peakPrice: number;         // سعر القمة المستهدف للبيع
  grossSpreadPercent: number;
  entryFeePercent: number;
  exitFeePercent: number;
  slippagePercent: number;
  netMarginPercent: number;

  // تفاصيل الصفقة عند الدخول
  entryPrice?: number;
  allocatedUsdt?: number;
  coinQuantity?: number;
  entryTimestamp?: number;
  breakEvenPrice?: number;

  // تفاصيل الخروج وتوثيق الربح
  exitPrice?: number;
  exitTimestamp?: number;
  realizedPnlUsdt?: number;
  realizedPnlPercent?: number;
  holdingDurationMinutes?: number;
  notes?: string;
}

export const STORAGE_KEY_RANGE_TRADES = 'price_calc_v0_range_trades';
export const STORAGE_KEY_RANGE_COSTS = 'price_calc_v0_range_costs';
