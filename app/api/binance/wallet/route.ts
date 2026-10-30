import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({
      configured: false,
      message: 'لم يتم تعيين مفاتيح بينانس (BINANCE_API_KEY و BINANCE_API_SECRET) في متغيرات الخادم الآمنة (.env).',
    });
  }

  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}&recvWindow=10000`;
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(queryString)
      .digest('hex');

    const response = await fetch(`https://api.binance.com/api/v3/account?${queryString}&signature=${signature}`, {
      headers: {
        'X-MBX-APIKEY': apiKey,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      return NextResponse.json(
        {
          configured: true,
          success: false,
          error: errJson.msg || `فشل الاتصال بمنصة بينانس (${response.status})`,
        },
        { status: 400 }
      );
    }

    const accountData = await response.json();
    const balances: Array<{ asset: string; free: string; locked: string }> = accountData.balances || [];

    // جلب أرصدة العملات المستقرة الأساسية
    const usdtAsset = balances.find((b) => b.asset === 'USDT');
    const usdcAsset = balances.find((b) => b.asset === 'USDC');
    const fdusdAsset = balances.find((b) => b.asset === 'FDUSD');

    const usdtFree = usdtAsset ? parseFloat(usdtAsset.free) : 0;
    const usdtLocked = usdtAsset ? parseFloat(usdtAsset.locked) : 0;
    const usdcFree = usdcAsset ? parseFloat(usdcAsset.free) : 0;
    const fdusdFree = fdusdAsset ? parseFloat(fdusdAsset.free) : 0;

    return NextResponse.json({
      configured: true,
      success: true,
      usdtFree,
      usdtLocked,
      usdtTotal: usdtFree + usdtLocked,
      stableTotal: usdtFree + usdcFree + fdusdFree,
      canTrade: accountData.canTrade,
      accountType: accountData.accountType,
      updateTime: accountData.updateTime,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'خطأ غير متوقع أثناء الاتصال بـ Binance API';
    return NextResponse.json(
      {
        configured: true,
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
