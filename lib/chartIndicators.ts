import { UTCTimestamp } from 'lightweight-charts';

export interface CandleData {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LinePoint {
  time: UTCTimestamp;
  value: number;
}

export interface HistogramPoint {
  time: UTCTimestamp;
  value: number;
  color?: string;
}

// Simple Moving Average (SMA)
export function calculateSMA(candles: CandleData[], period: number): LinePoint[] {
  if (candles.length < period) return [];
  const result: LinePoint[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    result.push({
      time: candles[i].time,
      value: sum / period,
    });
  }
  return result;
}

// Exponential Moving Average (EMA)
export function calculateEMA(candles: CandleData[], period: number): LinePoint[] {
  if (candles.length < period) return [];
  const result: LinePoint[] = [];
  const k = 2 / (period + 1);

  // Initial SMA for first value
  let initialSum = 0;
  for (let i = 0; i < period; i++) {
    initialSum += candles[i].close;
  }
  let prevEma = initialSum / period;
  result.push({ time: candles[period - 1].time, value: prevEma });

  for (let i = period; i < candles.length; i++) {
    const currentClose = candles[i].close;
    const currentEma = currentClose * k + prevEma * (1 - k);
    result.push({ time: candles[i].time, value: currentEma });
    prevEma = currentEma;
  }
  return result;
}

// Bollinger Bands (SMA 20, 2 StdDev)
export function calculateBollingerBands(candles: CandleData[], period = 20, stdDevMult = 2): {
  upper: LinePoint[];
  middle: LinePoint[];
  lower: LinePoint[];
} {
  if (candles.length < period) return { upper: [], middle: [], lower: [] };

  const upper: LinePoint[] = [];
  const middle: LinePoint[] = [];
  const lower: LinePoint[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    const mean = sum / period;

    let varianceSum = 0;
    for (let j = 0; j < period; j++) {
      varianceSum += Math.pow(candles[i - j].close - mean, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);

    middle.push({ time: candles[i].time, value: mean });
    upper.push({ time: candles[i].time, value: mean + stdDevMult * stdDev });
    lower.push({ time: candles[i].time, value: mean - stdDevMult * stdDev });
  }

  return { upper, middle, lower };
}

// Relative Strength Index (RSI 14)
export function calculateRSI(candles: CandleData[], period = 14): LinePoint[] {
  if (candles.length <= period) return [];
  const result: LinePoint[] = [];

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change >= 0) gains += change;
    else losses -= change;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - 100 / (1 + rs);
  result.push({ time: candles[period].time, value: rsi });

  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - 100 / (1 + rs);
    result.push({ time: candles[i].time, value: rsi });
  }

  return result;
}

// MACD (12, 26, 9)
export function calculateMACD(
  candles: CandleData[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): {
  macdLine: LinePoint[];
  signalLine: LinePoint[];
  histogram: HistogramPoint[];
} {
  const fastEma = calculateEMA(candles, fastPeriod);
  const slowEma = calculateEMA(candles, slowPeriod);

  // Align timestamps
  const slowMap = new Map(slowEma.map(p => [p.time, p.value]));
  const macdLine: LinePoint[] = [];

  for (const fast of fastEma) {
    const slowVal = slowMap.get(fast.time);
    if (slowVal !== undefined) {
      macdLine.push({ time: fast.time, value: fast.value - slowVal });
    }
  }

  if (macdLine.length < signalPeriod) {
    return { macdLine, signalLine: [], histogram: [] };
  }

  // Calculate EMA of macdLine for signal line
  const k = 2 / (signalPeriod + 1);
  let initSum = 0;
  for (let i = 0; i < signalPeriod; i++) {
    initSum += macdLine[i].value;
  }
  let prevSignal = initSum / signalPeriod;

  const signalLine: LinePoint[] = [{ time: macdLine[signalPeriod - 1].time, value: prevSignal }];
  const histogram: HistogramPoint[] = [{
    time: macdLine[signalPeriod - 1].time,
    value: macdLine[signalPeriod - 1].value - prevSignal,
    color: macdLine[signalPeriod - 1].value - prevSignal >= 0 ? '#10b981' : '#f43f5e'
  }];

  for (let i = signalPeriod; i < macdLine.length; i++) {
    const currentMacd = macdLine[i].value;
    const currentSignal = currentMacd * k + prevSignal * (1 - k);
    signalLine.push({ time: macdLine[i].time, value: currentSignal });

    const diff = currentMacd - currentSignal;
    histogram.push({
      time: macdLine[i].time,
      value: diff,
      color: diff >= 0 ? '#10b981' : '#f43f5e'
    });

    prevSignal = currentSignal;
  }

  return { macdLine, signalLine, histogram };
}

// Volume with colors matching candle direction
export function formatVolumeData(candles: CandleData[]): HistogramPoint[] {
  return candles.map((c) => ({
    time: c.time,
    value: c.volume,
    color: c.close >= c.open ? 'rgba(16, 185, 129, 0.45)' : 'rgba(244, 63, 94, 0.45)',
  }));
}
