/**
 * قالب جاهز للنشر المجاني على Cloudflare Workers (خطة مجانية 100,000 طلب يومياً + Cron كل دقيقة)
 * يراقب أسعار بينانس حتى بعد إغلاق المتصفح والهاتف كلياً، ويرسل:
 * 1. رسالة فورية عبر بوت تليغرام (Telegram Bot API)
 * 2. إشارة Web Push لتمرير إشعار النظام إلى التطبيق (عبر نقطة الترحيل أو الاشتراك المباشر)
 */

export const CLOUDFLARE_WORKER_SOURCE = `// Cloudflare Worker — مراقب الأسعار الخارجي المجاني 24/7
// المتطلبات في لوحة Cloudflare:
// 1. أنشئ KV Namespace باسم: ALERTS_KV واربطه بالـ Worker
// 2. أضف Cron Trigger: * * * * * (كل دقيقة واحدة)
// 3. أضف المتغيرات الاختيارية في Variables/Secrets:
//    - TELEGRAM_BOT_TOKEN (توكن البوت من @BotFather)
//    - SYNC_SECRET (كلمة سر اختيارية لحماية المزامنة)
//    - APP_RELAY_PUSH_URL (اختياري: رابط /api/alerts/cron-check في تطبيقك لإرسال Web Push)

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    if (url.pathname === '/sync' && request.method === 'POST') {
      if (env.SYNC_SECRET) {
        const auth = request.headers.get('Authorization') || '';
        if (auth !== \`Bearer \${env.SYNC_SECRET}\`) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors });
        }
      }

      const payload = await request.json();
      const keyId = payload.syncKeyId || 'default';
      await env.ALERTS_KV.put(\`user:\${keyId}\`, JSON.stringify({
        ...payload,
        updatedAt: Date.now(),
      }));

      // Maintain registry of active keys
      const indexRaw = await env.ALERTS_KV.get('active_keys');
      const keys = indexRaw ? JSON.parse(indexRaw) : [];
      if (!keys.includes(keyId)) {
        keys.push(keyId);
        await env.ALERTS_KV.put('active_keys', JSON.stringify(keys));
      }

      return new Response(JSON.stringify({ success: true, count: (payload.rules || []).length }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true, service: 'crypto-alerts-worker' }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404, headers: cors });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runPriceCheck(env));
  },
};

async function runPriceCheck(env) {
  const indexRaw = await env.ALERTS_KV.get('active_keys');
  if (!indexRaw) return;
  const keys = JSON.parse(indexRaw);
  if (!Array.isArray(keys) || keys.length === 0) return;

  const userConfigs = [];
  const symbolsSet = new Set();

  for (const keyId of keys) {
    const raw = await env.ALERTS_KV.get(\`user:\${keyId}\`);
    if (!raw) continue;
    const cfg = JSON.parse(raw);
    if (cfg.enabled && Array.isArray(cfg.rules) && cfg.rules.length > 0) {
      userConfigs.push({ keyId, cfg });
      cfg.rules.forEach((r) => symbolsSet.add(r.symbol.toUpperCase()));
    }
  }

  if (symbolsSet.size === 0) return;

  // Fetch live prices from Binance
  const syms = Array.from(symbolsSet);
  const res = await fetch(
    \`https://data-api.binance.vision/api/v3/ticker/price?symbols=\${encodeURIComponent(JSON.stringify(syms))}\`
  );
  if (!res.ok) return;
  const tickers = await res.json();
  const priceMap = {};
  tickers.forEach((t) => {
    priceMap[t.symbol] = parseFloat(t.price);
  });

  const now = Date.now();

  for (const { keyId, cfg } of userConfigs) {
    const firedRaw = await env.ALERTS_KV.get(\`fired:\${keyId}\`);
    const firedMap = firedRaw ? JSON.parse(firedRaw) : {};
    let changed = false;

    for (const rule of cfg.rules) {
      const livePrice = priceMap[rule.symbol.toUpperCase()];
      if (!livePrice || isNaN(livePrice)) continue;

      const hit = rule.direction === 'below'
        ? livePrice <= rule.targetPrice
        : livePrice >= rule.targetPrice;

      if (!hit) continue;

      const lastTime = firedMap[rule.id] || 0;
      if (rule.repeatMode === 'once' && lastTime > 0) continue;
      if (rule.repeatMode === 'continuous' && now - lastTime < (rule.intervalSeconds || 60) * 1000) continue;

      firedMap[rule.id] = now;
      changed = true;

      const message = \`🎯 تنبيه سعري (\${rule.symbol})\\nالسعر الحالي: $\${livePrice}\\nالشرط: \${rule.label}\\nالمصدر: \${rule.source}\`;

      // 1. Send Telegram Bot Message
      const tgToken = cfg.telegramBotToken || env.TELEGRAM_BOT_TOKEN;
      if (cfg.telegramEnabled && tgToken && cfg.telegramChatId) {
        await fetch(\`https://api.telegram.org/bot\${tgToken}/sendMessage\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cfg.telegramChatId,
            text: message,
          }),
        });
      }

      // 2. Relay Web Push to Next.js VAPID endpoint (if configured)
      if (cfg.webPushEnabled && cfg.pushSubscription && env.APP_RELAY_PUSH_URL) {
        await fetch(env.APP_RELAY_PUSH_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(env.SYNC_SECRET ? { Authorization: \`Bearer \${env.SYNC_SECRET}\` } : {}),
          },
          body: JSON.stringify({
            directDispatch: true,
            pushSubscription: cfg.pushSubscription,
            title: \`🎯 تنبيه: \${rule.symbol}\`,
            body: \`السعر الآن $\${livePrice} — \${rule.label}\`,
            tag: rule.id,
          }),
        });
      }
    }

    if (changed) {
      await env.ALERTS_KV.put(\`fired:\${keyId}\`, JSON.stringify(firedMap));
    }
  }
}
`;
