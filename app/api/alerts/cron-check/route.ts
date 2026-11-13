import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getServerAlertBundles } from '@/lib/serverAlertsStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function configureVapid(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  const priv = process.env.VAPID_PRIVATE_KEY || '';
  const sub = process.env.VAPID_SUBJECT || 'mailto:alerts@example.com';
  if (!pub || !priv) return false;
  webpush.setVapidDetails(sub, pub, priv);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const authSecret = process.env.ALERT_SYNC_SECRET;
    if (authSecret) {
      const auth = req.headers.get('authorization') || '';
      if (auth !== `Bearer ${authSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));

    // Direct Web Push relay from Cloudflare Worker
    if (body.directDispatch && body.pushSubscription) {
      if (!configureVapid()) {
        return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 400 });
      }
      await webpush.sendNotification(
        body.pushSubscription,
        JSON.stringify({
          title: body.title || '🔔 تنبيه سعري',
          body: body.body || 'تحقق شرط السعر',
          tag: body.tag || 'cloud-alert',
          url: '/',
        })
      );
      return NextResponse.json({ success: true, dispatched: 1 });
    }

    // Standard scheduled check across in-memory bundles
    return await runServerPriceCheck();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Cron check failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return await runServerPriceCheck();
}

async function runServerPriceCheck() {
  const store = getServerAlertBundles();
  const activeBundles = Array.from(store.values()).filter(
    (b) => b.enabled && b.rules.length > 0
  );

  if (activeBundles.length === 0) {
    return NextResponse.json({ success: true, checked: 0, triggered: 0 });
  }

  const symbolsSet = new Set<string>();
  activeBundles.forEach((b) => b.rules.forEach((r) => symbolsSet.add(r.symbol.toUpperCase())));
  const syms = Array.from(symbolsSet);

  const res = await fetch(
    `https://data-api.binance.vision/api/v3/ticker/price?symbols=${encodeURIComponent(
      JSON.stringify(syms)
    )}`,
    { cache: 'no-store' }
  );

  if (!res.ok) {
    return NextResponse.json({ error: 'Failed to fetch Binance prices' }, { status: 502 });
  }

  const tickers: { symbol: string; price: string }[] = await res.json();
  const priceMap: Record<string, number> = {};
  tickers.forEach((t) => {
    priceMap[t.symbol] = parseFloat(t.price);
  });

  const vapidReady = configureVapid();
  const now = Date.now();
  let triggered = 0;

  for (const bundle of activeBundles) {
    for (const rule of bundle.rules) {
      const live = priceMap[rule.symbol.toUpperCase()];
      if (!live || isNaN(live)) continue;

      const hit =
        rule.direction === 'below' ? live <= rule.targetPrice : live >= rule.targetPrice;
      if (!hit) continue;

      const lastTime = bundle.firedMap[rule.id] || 0;
      if (rule.repeatMode === 'once' && lastTime > 0) continue;
      if (
        rule.repeatMode === 'continuous' &&
        now - lastTime < (rule.intervalSeconds || 60) * 1000
      ) {
        continue;
      }

      bundle.firedMap[rule.id] = now;
      triggered++;

      const tgToken = bundle.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
      if (bundle.telegramEnabled && tgToken && bundle.telegramChatId) {
        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: bundle.telegramChatId,
            text: `🎯 تنبيه سعري (${rule.symbol})\nالسعر الحالي: $${live}\nالشرط: ${rule.label}\nالمصدر: ${rule.source}`,
          }),
        }).catch(() => {});
      }

      if (vapidReady && bundle.pushSubscription) {
        await webpush
          .sendNotification(
            bundle.pushSubscription as webpush.PushSubscription,
            JSON.stringify({
              title: `🎯 تنبيه: ${rule.symbol}`,
              body: `السعر الآن $${live} — ${rule.label}`,
              tag: rule.id,
              url: '/',
            })
          )
          .catch(() => {});
      }
    }
  }

  return NextResponse.json({
    success: true,
    checked: syms.length,
    triggered,
  });
}
