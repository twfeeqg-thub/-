import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BINANCE_HOSTS = [
  'https://data-api.binance.vision',
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api3.binance.com',
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawSymbol = searchParams.get('symbol') || 'BTCUSDT';
    
    // Sanitize symbol: keep only letters and numbers, uppercase
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

    // Try multiple hosts in order
    for (const host of BINANCE_HOSTS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(`${host}/api/v3/ticker/24hr?symbol=${sanitized}`, {
          cache: 'no-store',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BinancePriceProxy/2.0)',
            'Accept': 'application/json',
          },
        });
        clearTimeout(timeoutId);

        const data = await res.json();

        if (res.ok && (data.lastPrice || data.price)) {
          return NextResponse.json({
            symbol: sanitized,
            price: data.lastPrice || data.price,
            priceChangePercent: data.priceChangePercent || '0',
            source: host,
          }, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
            }
          });
        }

        if (data.code === -1121 || data.code === -1100) {
          return NextResponse.json(
            { error: data.msg || 'Invalid symbol', code: data.code, symbol: sanitized },
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
      { error: lastError || 'Failed to reach Binance servers', symbol: sanitized },
      { status: errorCode }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
