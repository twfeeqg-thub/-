import { RangeAnalysisResult } from '@/types/rangeScalper';

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
 * جلب شموع الدقيقة (1m) مباشرة من Binance وحساب القمم والقيعان الحقيقية
 * @param symbol رمز التداول على بينانس مثل 'NEARUSDT'
 * @param minutes عدد الدقائق المطلوب تحليلها (مثلاً 60 لـ 1 ساعة)
 * @param entryFeePercent نسبة رسوم الشراء
 * @param exitFeePercent نسبة رسوم البيع
 * @param slippagePercent نسبة الانزلاق السعري المتوقع
 */
export async function analyzeRangeFromMinuteKlines(
  symbol: string,
  minutes: number,
  entryFeePercent = 0.1,
  exitFeePercent = 0.1,
  slippagePercent = 0.1
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

    const grossSpreadPercent = ((maxHigh - minLow) / minLow) * 100;
    const totalCostPercent = entryFeePercent + exitFeePercent + slippagePercent;
    const netExpectedMarginPercent = grossSpreadPercent - totalCostPercent;

    const distanceToTroughPercent = currentPrice > 0 ? ((currentPrice - minLow) / minLow) * 100 : 0;
    const distanceToPeakPercent = currentPrice > 0 ? ((maxHigh - currentPrice) / currentPrice) * 100 : 0;

    const isViable = netExpectedMarginPercent >= 0.25; // تعتبر مجدية إذا كان الربح الصافي بعد التكاليف ربع بالمائة على الأقل

    return {
      symbol: baseName,
      binanceSymbol: pair,
      timeframeMinutes: minutes,
      candlesCount: rawData.length,
      troughPrice: minLow,
      peakPrice: maxHigh,
      currentPrice: currentPrice || minLow,
      grossSpreadPercent,
      distanceToTroughPercent,
      distanceToPeakPercent,
      troughTouchesCount: Math.max(1, troughTouchesCount),
      peakTouchesCount: Math.max(1, peakTouchesCount),
      entryFeePercent,
      exitFeePercent,
      slippagePercent,
      totalCostPercent,
      netExpectedMarginPercent,
      isViable,
      lastFetchedAt: Date.now(),
    };
  } catch (err) {
    // في حال حدوث خطأ في الاتصال، يتم حساب نتائج استرشادية بناءً على السعر التقريبي
    throw err;
  }
}

/**
 * حساب سعر التعادل بناءً على سعر الدخول والرسوم التراكمية
 */
export function calculateRangeBreakEven(entryPrice: number, entryFeePercent = 0.1, exitFeePercent = 0.1): number {
  if (entryPrice <= 0) return 0;
  const buyFee = entryFeePercent / 100;
  const sellFee = exitFeePercent / 100;
  return (entryPrice * (1 + buyFee)) / (1 - sellFee);
}
