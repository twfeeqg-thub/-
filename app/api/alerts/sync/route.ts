import { NextRequest, NextResponse } from 'next/server';
import { getServerAlertBundles } from '@/lib/serverAlertsStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const syncKeyId = String(body.syncKeyId || 'default').trim();
    const rules = Array.isArray(body.rules) ? body.rules : [];

    const store = getServerAlertBundles();
    const existing = store.get(syncKeyId);

    store.set(syncKeyId, {
      syncKeyId,
      enabled: Boolean(body.enabled),
      pushSubscription: body.pushSubscription || null,
      telegramEnabled: Boolean(body.telegramEnabled),
      telegramChatId: body.telegramChatId ? String(body.telegramChatId) : '',
      telegramBotToken: body.telegramBotToken ? String(body.telegramBotToken) : undefined,
      rules,
      firedMap: existing?.firedMap || {},
      updatedAt: Date.now(),
    });

    const targetWorkerUrl =
      (typeof body.workerUrl === 'string' && body.workerUrl.trim()) ||
      process.env.CLOUDFLARE_WORKER_SYNC_URL ||
      '';

    let forwardedToWorker = false;
    let workerError: string | undefined;

    if (targetWorkerUrl) {
      const cleanUrl = targetWorkerUrl.replace(/\/+$/, '');
      const syncEndpoint = cleanUrl.endsWith('/sync') ? cleanUrl : `${cleanUrl}/sync`;
      const secret =
        (typeof body.syncSecret === 'string' && body.syncSecret.trim()) ||
        process.env.ALERT_SYNC_SECRET ||
        '';

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (secret) {
        headers.Authorization = `Bearer ${secret}`;
      }

      const workerRes = await fetch(syncEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          syncKeyId,
          enabled: Boolean(body.enabled),
          pushSubscription: body.pushSubscription || null,
          telegramEnabled: Boolean(body.telegramEnabled),
          telegramChatId: body.telegramChatId ? String(body.telegramChatId) : '',
          telegramBotToken: body.telegramBotToken ? String(body.telegramBotToken) : undefined,
          rules,
        }),
      });

      if (workerRes.ok) {
        forwardedToWorker = true;
      } else {
        workerError = `Cloudflare Worker HTTP ${workerRes.status}`;
      }
    }

    if (targetWorkerUrl && !forwardedToWorker) {
      return NextResponse.json(
        {
          success: false,
          error: workerError || 'تعذر الاتصال بخادم Cloudflare Worker',
          rulesCount: rules.length,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      forwardedToWorker,
      rulesCount: rules.length,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'فشل معالجة المزامنة',
      },
      { status: 500 }
    );
  }
}
