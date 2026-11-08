import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BINANCE_HOSTS = [
  'https://data-api.binance.vision',
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api3.binance.com',
];

// Map chart interval param to Binance interval
function normalizeInterval(rawInterval?: string | null): string {
  if (!rawInterval) return '15m';
  const val = rawInterval.toLowerCase().trim();
  if (val === '1' || val === '1m') return '1m';
  if (val === '5' || val === '5m') return '5m';
  if (val === '15' || val === '15m') return '15m';
  if (val === '30' || val === '30m') return '30m';
  if (val === '60' || val === '1h') return '1h';
  if (val === '240' || val === '4h') return '4h';
  if (val === 'd' || val === '1d') return '1d';
  if (val === 'w' || val === '1w') return '1w';
  return '15m';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawSymbol = searchParams.get('symbol') || 'BTCUSDT';
    const interval = normalizeInterval(searchParams.get('interval'));
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '300', 10), 50), 1000);

    // Sanitize symbol
    let sanitized = rawSymbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!sanitized) {
      sanitized = 'BTCUSDT';
    } else {
      const knownQuotes = ['USDT', 'USDC', 'FDUSD', 'BUSD', 'EUR', 'TRY'];
      const hasQuote = knownQuotes.some((q) => sanitized.endsWith(q) && sanitized.length > q.length);
      if (!hasQuote) {
        sanitized = `${sanitized}USDT`;
      }
    }

    let lastError: string | null = null;
    let errorCode: number = 500;

    for (const host of BINANCE_HOSTS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`${host}/api/v3/klines?symbol=${sanitized}&interval=${interval}&limit=${limit}`, {
          cache: 'no-store',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BinanceKlinesProxy/2.0)',
            'Accept': 'application/json',
          },
        });
        clearTimeout(timeoutId);

        const data = await res.json();

        if (res.ok && Array.isArray(data)) {
          // Binance format: [openTime, open, high, low, close, volume, closeTime, quoteAssetVolume, trades, ...]
          const candles = data.map((item: (string | number)[]) => {
            const timeSec = Math.floor(Number(item[0]) / 1000);
            return {
              time: timeSec,
              open: parseFloat(String(item[1])),
              high: parseFloat(String(item[2])),
              low: parseFloat(String(item[3])),
              close: parseFloat(String(item[4])),
              volume: parseFloat(String(item[5])),
            };
          }).filter(c => !isNaN(c.time) && !isNaN(c.close));

          return NextResponse.json({
            symbol: sanitized,
            interval,
            candles,
            source: host,
          }, {
            headers: {
              'Cache-Control': 'public, max-age=5, stale-while-revalidate=10',
            }
          });
        }

        if (data.code === -1121 || data.code === -1100) {
          return NextResponse.json(
            { error: data.msg || 'Invalid symbol', code: data.code, symbol: sanitized, candles: [] },
            { status: 400 }
          );
        }

        lastError = data.msg || res.statusText;
        errorCode = res.status;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : 'Timeout/Network error';
      }
    }

    return NextResponse.json(
      { error: lastError || 'Failed to reach Binance klines servers', symbol: sanitized, candles: [] },
      { status: errorCode }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMsg, candles: [] }, { status: 500 });
  }
}
