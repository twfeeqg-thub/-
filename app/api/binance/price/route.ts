import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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


    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${sanitized}`, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BinancePriceProxy/1.0)',
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { 
          error: data.msg || `Binance API error: ${res.statusText}`,
          symbol: sanitized,
          code: data.code || res.status
        },
        { status: res.status }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
