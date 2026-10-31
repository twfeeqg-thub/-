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
    symbols: ['NEAR', 'FET', 'RENDER', 'TAO', 'GRT', 'WLD', 'AGIX', 'ARKM', 'IO', 'OCEAN', 'JASMY', 'PHB'],
  },
  {
    id: 'meme',
    name: 'عملات الميم (Memes)',
    description: 'تذبذبات قوية ومستويات ارتداد متكررة وسريعة',
    symbols: ['DOGE', 'SHIB', 'PEPE', 'WIF', 'FLOKI', 'BONK', 'BOME', 'MEME', '1000SATS', 'NEIRO', 'PEOPLE'],
  },
  {
    id: 'infra',
    name: 'البنية التحتية والطبقة 1/2',
    description: 'شبكات البلوكشين الرئيسية والطبقات الثانية ذات السيولة المؤسسية',
    symbols: ['SOL', 'ETH', 'BNB', 'AVAX', 'SUI', 'APT', 'ARB', 'OP', 'LINK', 'DOT', 'NEAR', 'INJ', 'SEI', 'TIA', 'POL'],
  },
  {
    id: 'high_liq',
    name: 'سيولة وتذبذب عرضي مستقر',
    description: 'أزواج ذات عمق سيولة ممتاز لمسارات عرضية واضحة المعالم',
    symbols: ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'BNB', 'LTC', 'BCH', 'TRX', 'LINK'],
  },
  {
    id: 'defi',
    name: 'التمويل اللامركزي (DeFi)',
    description: 'بروتوكولات السيولة والتداول اللامركزي النشطة',
    symbols: ['UNI', 'AAVE', 'MKR', 'PENDLE', 'CRV', 'RUNE', 'SNX', 'DYDX', 'CAKE', 'COMP'],
  },
];

export interface RangeAlertConfig {
  enabled: boolean;                      // مفتاح التفعيل العام للتنبيه (مغلق افتراضياً false)
  triggerAtTrough: boolean;              // 1. عند القاع بدقة
  triggerNearTrough: boolean;            // 2. عند الاقتراب من القاع
  nearTroughPercent: number;             // نسبة الاقتراب من القاع (مثلاً 0.5%)
  triggerBounceConfirmation: boolean;   // 3. عند تأكيد الارتداد صعوداً من القاع
  bounceConfirmationPercent: number;    // نسبة الارتداد فوق القاع (مثلاً 0.4%)
  triggerAtPeak: boolean;                // 4. عند القمة بدقة
  triggerNearPeak: boolean;              // 5. عند الاقتراب من القمة (لجني الربح)
  nearPeakPercent: number;               // نسبة الاقتراب من القمة (مثلاً 0.5%)
  triggerCustomPrice: boolean;           // 6. عند سعر مخصص يحدده المستخدم
  customPrice?: number;                  // قيمة السعر المخصص
  repeatMode: 'once' | 'continuous';     // تكرار التنبيه (مرة واحدة أو مستمر)
  repeatIntervalMinutes: number;         // الفاصل الزمني للتكرار بالدقائق
  toneId?: string;                       // نغمة الصوت المختارة
}

export const DEFAULT_RANGE_ALERT_CONFIG: RangeAlertConfig = {
  enabled: false,                        // الوضع الافتراضي لجميع التنبيهات مغلق
  triggerAtTrough: true,
  triggerNearTrough: false,
  nearTroughPercent: 0.5,
  triggerBounceConfirmation: true,
  bounceConfirmationPercent: 0.4,
  triggerAtPeak: true,
  triggerNearPeak: false,
  nearPeakPercent: 0.5,
  triggerCustomPrice: false,
  customPrice: 0,
  repeatMode: 'once',
  repeatIntervalMinutes: 5,
  toneId: 'celebration',
};

export interface RangeAnalysisResult {
  symbol: string;
  binanceSymbol: string;
  timeframeMinutes: number;
  candlesCount: number;
  troughPrice: number;                  // أدنى قاع تم رصده في شموع الدقيقة
  peakPrice: number;                    // أعلى قمة تم رصدها في شموع الدقيقة
  currentPrice: number;
  tradeCapitalUsdt: number;             // رأس مال التجربة بالدولار
  breakEvenPrice: number;               // سعر التعادل بعد التكاليف
  grossSpreadPercent: number;           // فارق القناة بالـ %
  grossSpreadUsdt: number;              // فارق القناة بالدولار $
  distanceToTroughPercent: number;      // البعد عن القاع بالـ %
  distanceToTroughUsdt: number;         // البعد عن القاع بالدولار $
  distanceToPeakPercent: number;        // البعد عن القمة بالـ %
  distanceToPeakUsdt: number;           // البعد عن القمة بالدولار $
  troughTouchesCount: number;           // كم مرة لامس السعر منطقة القاع (تأكيد القناة)
  peakTouchesCount: number;             // كم مرة لامس السعر منطقة القمة
  entryFeePercent: number;
  entryFeeUsdt: number;
  exitFeePercent: number;
  exitFeeUsdt: number;
  slippagePercent: number;
  slippageUsdt: number;
  totalCostPercent: number;             // مجموع الرسوم والانزلاق %
  totalCostUsdt: number;                // مجموع الرسوم والانزلاق $
  netExpectedMarginPercent: number;     // هامش الربح الصافي بعد التكاليف %
  netExpectedMarginUsdt: number;        // هامش الربح الصافي بعد التكاليف $
  isViable: boolean;                    // هل النطاق يغطي التكاليف ويوفر ربحاً صافياً؟
  lastFetchedAt: number;
}

export interface RangeTrackedTrade {
  id: string;
  name: string;                         // e.g. "NEAR"
  binanceSymbol: string;                // e.g. "NEARUSDT"
  timeframeMinutes: number;             // e.g. 60
  status: RangeTradeStatus;
  createdAt: number;
  isActive: boolean;                    // تفعيل / غلق الصفقة
  alertsEnabled: boolean;               // تنبيه عام: مغلق افتراضياً (false)
  alertConfig: RangeAlertConfig;        // تفاصيل وإعدادات شروط التنبيه المتطورة
  notifyOnOldTroughReturn?: boolean;    // تنبيه إذا عاد السعر لنفس القاع القديم

  // رأس مال الصفقة المقدر
  tradeCapitalUsdt: number;

  // المستويات العرضية المعتمدة وسعر التعادل
  troughPrice: number;                  // سعر القاع المستهدف للشراء
  peakPrice: number;                    // سعر القمة المستهدف للبيع
  breakEvenPrice: number;               // سعر التعادل المحسوب بدقة
  grossSpreadPercent: number;
  grossSpreadUsdt: number;
  
  // التكاليف (نسبة ومبلغ)
  entryFeePercent: number;
  entryFeeUsdt: number;
  exitFeePercent: number;
  exitFeeUsdt: number;
  slippagePercent: number;
  slippageUsdt: number;
  totalCostPercent: number;
  totalCostUsdt: number;
  netMarginPercent: number;
  netMarginUsdt: number;

  // تفاصيل الصفقة عند الدخول
  entryPrice?: number;
  allocatedUsdt?: number;
  coinQuantity?: number;
  entryTimestamp?: number;

  // تفاصيل الخروج وتوثيق الربح الصافي بعد التكاليف
  exitPrice?: number;
  exitTimestamp?: number;
  realizedGrossPnlUsdt?: number;
  realizedNetPnlUsdt?: number;          // الربح الصافي بعد خصم كافة التكاليف
  realizedPnlUsdt?: number;             // توافق خلفي مع السجلات السابقة
  realizedPnlPercent?: number;          // نسبة الربح الصافي
  holdingDurationMinutes?: number;
  notes?: string;
}

export interface Binance24hTickerItem {
  symbol: string;
  baseAsset: string;
  lastPrice: string;
  priceChangePercent: string;
  volumeUsdt: number;
  highPrice: string;
  lowPrice: string;
}

export const STORAGE_KEY_RANGE_TRADES = 'price_calc_v0_range_trades';
export const STORAGE_KEY_RANGE_COSTS = 'price_calc_v0_range_costs';
export const STORAGE_KEY_RANGE_SAVED_COINS = 'price_calc_v0_range_saved_coins';
export const STORAGE_KEY_RANGE_LAST_STATE = 'price_calc_v0_range_last_state';

export interface RangeLastState {
  lastSymbol?: string;
  lastTimeframeMinutes?: number;
  tradeCapitalInput?: string;
  entryFeePercentInput?: string;
  exitFeePercentInput?: string;
  slippagePercentInput?: string;
  lastAnalysis?: RangeAnalysisResult | null;
}
