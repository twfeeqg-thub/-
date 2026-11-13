import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const results: {
      telegram?: { ok: boolean; error?: string };
      webPush?: { ok: boolean; error?: string };
    } = {};

    // 1. Test Telegram Bot Delivery
    if (body.channel === 'telegram' || body.channel === 'both') {
      const token =
        (typeof body.telegramBotToken === 'string' && body.telegramBotToken.trim()) ||
        process.env.TELEGRAM_BOT_TOKEN ||
        '';
      const chatId = typeof body.telegramChatId === 'string' ? body.telegramChatId.trim() : '';

      if (!token || !chatId) {
        results.telegram = {
          ok: false,
          error: 'يرجى إدخال رمز البوت (Bot Token) ومعرف المحادثة (Chat ID) أولاً.',
        };
      } else {
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text:
              '🔔 اختبار ناجح من «بوت مراقبة صعود العملات»!\nسيصلك هذا التنبيه فوراً على تليغرام عند تحقق أهداف الأسعار حتى لو كان التطبيق مغلقاً بالكامل.',
          }),
        });
        const tgData = await tgRes.json().catch(() => ({}));
        if (tgRes.ok && tgData.ok) {
          results.telegram = { ok: true };
        } else {
          results.telegram = {
            ok: false,
            error: tgData.description || `Telegram HTTP ${tgRes.status}`,
          };
        }
      }
    }

    // 2. Test Web Push Delivery
    if (body.channel === 'webpush' || body.channel === 'both') {
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
      const privateKey = process.env.VAPID_PRIVATE_KEY || '';
      const subject = process.env.VAPID_SUBJECT || 'mailto:alerts@example.com';

      if (!publicKey || !privateKey) {
        results.webPush = {
          ok: false,
          error: 'مفاتيح VAPID غير مهيأة في متغيرات الخادم.',
        };
      } else if (!body.pushSubscription) {
        results.webPush = {
          ok: false,
          error: 'لا يوجد اشتراك Web Push مسجل لهذا المتصفح بعد.',
        };
      } else {
        webpush.setVapidDetails(subject, publicKey, privateKey);
        await webpush.sendNotification(
          body.pushSubscription,
          JSON.stringify({
            title: '🔔 اختبار إشعار المتصفح السحابي (Web Push)',
            body: 'تم الربط بنجاح! ستصلك إشعارات الأسعار حتى لو كان التطبيق مغلقاً.',
            tag: 'cloud-push-test',
            url: '/',
          })
        );
        results.webPush = { ok: true };
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'فشل إرسال الاختبار',
      },
      { status: 500 }
    );
  }
}
