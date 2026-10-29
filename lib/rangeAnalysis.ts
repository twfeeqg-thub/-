import { RangeAnalysisResult, Binance24hTickerItem } from '@/types/rangeScalper';

interface BinanceKlineRaw {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
}

/**
 * حساب سعر التعادل بدقة بناءً على سعر الدخول والرسوم التراكمية
 */
export function calculateRangeBreakEven(
  entryPrice: number, 
  entryFeePercent = 0.1, 
  exitFeePercent = 0.1,
  slippagePercent = 0
): number {
  if (entryPrice <= 0) return 0;
  const buyFee = (entryFeePercent + (slippagePercent / 2)) / 100;
  const sellFee = (exitFeePercent + (slippagePercent / 2)) / 100;
  if (sellFee >= 1) return entryPrice * 2;
  return (entryPrice * (1 + buyFee)) / (1 - sellFee);
}

/**
 * جلب شموع الدقيقة (1m) مباشرة من Binance وحساب القمم والقيعان الحقيقية
 * مع حساب سعر التعادل والقيم النقدية والمئوية المزدوجة
 */
export async function analyzeRangeFromMinuteKlines(
  symbol: string,
  minutes: number,
  entryFeePercent = 0.1,
  exitFeePercent = 0.1,
  slippagePercent = 0.1,
  tradeCapitalUsdt = 100
): Promise<RangeAnalysisResult> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const pair = cleanSymbol.endsWith('USDT') ? cleanSymbol : `${cleanSymbol}USDT`;
  const baseName = pair.replace('USDT', '');

  // Binance limit: max 1000 klines
  const limit = Math.min(Math.max(15, minutes), 1000);
  const endpoint = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1m&limit=${limit}`;

  try {
    const res = await fetch(endpoint, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Binance API Error: HTTP ${res.status}`);
    }

    const rawData = await res.json();
    if (!Array.isArray(rawData) || rawData.length === 0) {
      throw new Error('لا توجد بيانات شموع متاحة لهذه العملة');
    }

    let minLow = Infinity;
    let maxHigh = -Infinity;
    let currentPrice = 0;

    const highs: number[] = [];
    const lows: number[] = [];

    rawData.forEach((item: any[], index: number) => {
      const high = parseFloat(item[2]);
      const low = parseFloat(item[3]);
      const close = parseFloat(item[4]);

      if (!isNaN(high) && high > maxHigh) maxHigh = high;
      if (!isNaN(low) && low < minLow) minLow = low;

      if (!isNaN(high)) highs.push(high);
      if (!isNaN(low)) lows.push(low);

      if (index === rawData.length - 1 && !isNaN(close)) {
        currentPrice = close;
      }
    });

    if (minLow === Infinity || maxHigh === -Infinity || minLow <= 0) {
      throw new Error('فشل قراءة القمم والقيعان بشكل صحيح');
    }

    // حساب عدد مرات ملامسة منطقة القاع ومنطقة القمة (لتأكيد هل المسار عرضي متكرر)
    const troughZoneThreshold = minLow * 1.004; // ضمن 0.4% من القاع
    const peakZoneThreshold = maxHigh * 0.996;   // ضمن 0.4% من القمة

    let troughTouchesCount = 0;
    let peakTouchesCount = 0;

    lows.forEach((l) => {
      if (l <= troughZoneThreshold) troughTouchesCount++;
    });

    highs.forEach((h) => {
      if (h >= peakZoneThreshold) peakTouchesCount++;
    });

    // الحسابات المئوية والمالية المزدوجة
    const grossSpreadPercent = ((maxHigh - minLow) / minLow) * 100;
    const grossSpreadUsdt = (tradeCapitalUsdt * grossSpreadPercent) / 100;

    const entryFeeUsdt = (tradeCapitalUsdt * entryFeePercent) / 100;
    const exitFeeUsdt = (tradeCapitalUsdt * exitFeePercent) / 100;
    const slippageUsdt = (tradeCapitalUsdt * slippagePercent) / 100;

    const totalCostPercent = entryFeePercent + exitFeePercent + slippagePercent;
    const totalCostUsdt = entryFeeUsdt + exitFeeUsdt + slippageUsdt;

    const netExpectedMarginPercent = grossSpreadPercent - totalCostPercent;
    const netExpectedMarginUsdt = grossSpreadUsdt - totalCostUsdt;

    const breakEvenPrice = calculateRangeBreakEven(minLow, entryFeePercent, exitFeePercent, slippagePercent);

    const distanceToTroughPercent = currentPrice > 0 ? ((currentPrice - minLow) / minLow) * 100 : 0;
    const distanceToTroughUsdt = (tradeCapitalUsdt * distanceToTroughPercent) / 100;

    const distanceToPeakPercent = currentPrice > 0 ? ((maxHigh - currentPrice) / currentPrice) * 100 : 0;
    const distanceToPeakUsdt = (tradeCapitalUsdt * distanceToPeakPercent) / 100;

    const isViable = netExpectedMarginPercent >= 0.25;

    return {
      symbol: baseName,
      binanceSymbol: pair,
      timeframeMinutes: minutes,
      candlesCount: rawData.length,
      troughPrice: minLow,
      peakPrice: maxHigh,
      currentPrice: currentPrice || minLow,
      tradeCapitalUsdt,
      breakEvenPrice,
      grossSpreadPercent,
      grossSpreadUsdt,
      distanceToTroughPercent,
      distanceToTroughUsdt,
      distanceToPeakPercent,
      distanceToPeakUsdt,
      troughTouchesCount: Math.max(1, troughTouchesCount),
      peakTouchesCount: Math.max(1, peakTouchesCount),
      entryFeePercent,
      entryFeeUsdt,
      exitFeePercent,
      exitFeeUsdt,
      slippagePercent,
      slippageUsdt,
      totalCostPercent,
      totalCostUsdt,
      netExpectedMarginPercent,
      netExpectedMarginUsdt,
      isViable,
      lastFetchedAt: Date.now(),
    };
  } catch (err) {
    throw err;
  }
}

// ذاكرة تخزين مؤقتة لقائمة عملات بينانس لتسريع البحث
let cachedBinanceTickers: Binance24hTickerItem[] | null = null;
let lastTickersFetchTime = 0;

/**
 * جلب جميع أزواج USDT النشطة من بينانس للبحث والاستكشاف
 */
export async function fetchBinanceUsdtTickers(): Promise<Binance24hTickerItem[]> {
  const now = Date.now();
  // استخدام الكاش لمدة 45 ثانية
  if (cachedBinanceTickers && (now - lastTickersFetchTime < 45000)) {
    return cachedBinanceTickers;
  }

  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/24hr', {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!res.ok) {
      if (cachedBinanceTickers) return cachedBinanceTickers;
      throw new Error(`Binance 24hr API Error: ${res.status}`);
    }

    const data: any[] = await res.json();
    if (!Array.isArray(data)) return cachedBinanceTickers || [];

    const usdtPairs: Binance24hTickerItem[] = [];

    data.forEach((item) => {
      const sym: string = item.symbol || '';
      if (sym.endsWith('USDT') && !sym.includes('UPUSDT') && !sym.includes('DOWNUSDT')) {
        const quoteVolume = parseFloat(item.quoteVolume || '0');
        // تصفية الأزواج الميتة (أكثر من 50,000 دولار حجم تداول يومي)
        if (quoteVolume > 50000) {
          usdtPairs.push({
            symbol: sym,
            baseAsset: sym.replace('USDT', ''),
            lastPrice: item.lastPrice,
            priceChangePercent: item.priceChangePercent,
            volumeUsdt: quoteVolume,
            highPrice: item.highPrice,
            lowPrice: item.lowPrice,
          });
        }
      }
    });

    // ترتيب الأزواج حسب حجم التداول
    usdtPairs.sort((a, b) => b.volumeUsdt - a.volumeUsdt);

    cachedBinanceTickers = usdtPairs;
    lastTickersFetchTime = now;
    return usdtPairs;
  } catch (err) {
    if (cachedBinanceTickers) return cachedBinanceTickers;
    return [];
  }
}
