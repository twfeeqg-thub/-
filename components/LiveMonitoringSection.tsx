'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Radio, 
  Target, 
  Bell, 
  BellOff, 
  Volume2, 
  VolumeX, 
  TrendingUp, 
  TrendingDown, 
  ArrowRightLeft, 
  Sparkles,
  Zap,
  Edit2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { soundAlert } from '@/lib/soundAlert';
import { formatCurrencyPrice } from '@/lib/calculator';

interface LiveMonitoringSectionProps {
  currencyName: string;
  binanceSymbol?: string;
  onChangeBinanceSymbol?: (symbol: string) => void;
  isActive: boolean;
  onToggleActive: (active: boolean) => void;
  targetPrice: string;
  onChangeTargetPrice: (price: string) => void;
  targetDirection: 'above' | 'below';
  onChangeTargetDirection: (dir: 'above' | 'below') => void;
  onApplyPriceAsEntry: (price: string) => void;
  onAddPriceAsTest: (price: string) => void;
  breakEvenPrice?: number;
}

const POPULAR_SYMBOLS = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'PEPE'];

/**
 * دالة لتنظيف واستخراج رمز صالح لـ Binance
 */
function resolveBinanceSymbol(name: string, customSymbol?: string): string {
  if (customSymbol && customSymbol.trim()) {
    const cleanCustom = customSymbol.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleanCustom) {
      return cleanCustom.endsWith('USDT') || cleanCustom.endsWith('USDC') ? cleanCustom : `${cleanCustom}USDT`;
    }
  }

  const cleanName = name.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleanName && cleanName.length >= 2) {
    return cleanName.endsWith('USDT') || cleanName.endsWith('USDC') ? cleanName : `${cleanName}USDT`;
  }

  // إذا كان اسم العملة بالعربية أو غير صالح، الافتراضي هو BTCUSDT
  return 'BTCUSDT';
}

export const LiveMonitoringSection: React.FC<LiveMonitoringSectionProps> = ({
  currencyName,
  binanceSymbol,
  onChangeBinanceSymbol,
  isActive,
  onToggleActive,
  targetPrice,
  onChangeTargetPrice,
  targetDirection,
  onChangeTargetDirection,
  onApplyPriceAsEntry,
  onAddPriceAsTest,
  breakEvenPrice,
}) => {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [targetReached, setTargetReached] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isEditingSymbol, setIsEditingSymbol] = useState(false);
  const [customInputSymbol, setCustomInputSymbol] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [browserNotificationEnabled, setBrowserNotificationEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission === 'granted';
    }
    return false;
  });

  const wsRef = useRef<WebSocket | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAlertTimeRef = useRef<number>(0);

  // Symbol resolution
  const formattedSymbol = resolveBinanceSymbol(currencyName, binanceSymbol);

  // Request browser notification permission
  const handleRequestNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setBrowserNotificationEnabled(perm === 'granted');
    } catch {
      // Ignore
    }
  };

  // Toggle sound alert
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundAlert.setMuted(!next);
  };

  // Check if target condition is satisfied
  const checkTargetReached = useCallback((livePrice: number) => {
    if (!targetPrice) return;
    const targetNum = parseFloat(targetPrice);
    if (isNaN(targetNum) || targetNum <= 0) return;

    const isReached = targetDirection === 'above' 
      ? livePrice >= targetNum 
      : livePrice <= targetNum;

    if (isReached) {
      setTargetReached(true);
      const now = Date.now();
      // Throttle audio/push alerts to at most once every 10 seconds
      if (now - lastAlertTimeRef.current > 10000) {
        lastAlertTimeRef.current = now;
        if (soundEnabled) {
          soundAlert.playTargetReachedAlert();
        }
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`🎯 وصل السعر للهدف (${formattedSymbol})!`, {
              body: `السعر الحالي ${livePrice} وصل إلى سعرك المستهدف ${targetNum} USDT.`,
              icon: '/icons/icon-192x192.png',
            });
          } catch {
            // Ignore
          }
        }
      }
    }
  }, [targetPrice, targetDirection, soundEnabled, formattedSymbol]);

  // Fetch price from REST API with strict timeout
  const fetchPriceRest = useCallback(async (symbol: string) => {
    setIsRefreshing(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`/api/binance/price?symbol=${symbol}`, {
        cache: 'no-store',
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);

      if (res && res.ok) {
        const data = await res.json();
        if (data.price) {
          const p = parseFloat(data.price);
          if (!isNaN(p)) {
            setPrevPrice((old) => (old !== null ? old : p));
            setCurrentPrice(p);
            setConnectionStatus('connected');
            setErrorMessage(null);
            if (data.priceChangePercent) {
              const cp = parseFloat(data.priceChangePercent);
              if (!isNaN(cp)) setPriceChange24h(cp);
            }
            checkTargetReached(p);
            setIsRefreshing(false);
            return true;
          }
        }
      } else if (res) {
        const errData = await res.json().catch(() => null);
        setConnectionStatus('error');
        setErrorMessage(errData?.error || `تعذر جلب السعر لـ ${symbol}`);
        setIsRefreshing(false);
        return false;
      } else {
        // Request failed or timed out
        setConnectionStatus('error');
        setErrorMessage('تعذر الاتصال ببيانات الأسعار، يرجى التأكد من تشغيل الإنترنت.');
        setIsRefreshing(false);
        return false;
      }
    } catch (e: unknown) {
      setConnectionStatus('error');
      setErrorMessage(e instanceof Error ? e.message : 'خطأ في الاتصال');
    }
    setIsRefreshing(false);
    return false;
  }, [checkTargetReached]);

  // Connect & Setup Polling
  useEffect(() => {
    if (!isActive) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    const pairLower = formattedSymbol.toLowerCase();

    // Initial immediate fetch
    const initTimer = setTimeout(() => {
      fetchPriceRest(formattedSymbol);
    }, 0);

    // Optional background WebSocket stream for live second-by-second updates
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`wss://stream.binance.com:9443/ws/${pairLower}@ticker`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.c) {
            const newPrice = parseFloat(data.c);
            const changeP = parseFloat(data.P);
            if (!isNaN(newPrice)) {
              setPrevPrice((old) => (old !== null ? old : newPrice));
              setCurrentPrice(newPrice);
              setConnectionStatus('connected');
              setErrorMessage(null);
              if (!isNaN(changeP)) {
                setPriceChange24h(changeP);
              }
              checkTargetReached(newPrice);
            }
          }
        } catch {
          // Ignore parse errors
        }
      };
    } catch {
      // WebSocket failed, polling will seamlessly handle everything
    }

    // Reliable background interval every 3 seconds
    pollTimerRef.current = setInterval(() => {
      fetchPriceRest(formattedSymbol);
    }, 3000);

    return () => {
      clearTimeout(initTimer);
      if (ws) {
        ws.close();
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [isActive, formattedSymbol, checkTargetReached, fetchPriceRest]);

  // Save custom symbol
  const handleSaveCustomSymbol = (sym: string) => {
    const clean = sym.trim().toUpperCase().replace(/[^a-zA-Z0-9]/g, '');
    if (clean && onChangeBinanceSymbol) {
      const finalSymbol = clean.endsWith('USDT') || clean.endsWith('USDC') ? clean : `${clean}USDT`;
      onChangeBinanceSymbol(finalSymbol);
      setIsEditingSymbol(false);
      setErrorMessage(null);
      setConnectionStatus('connecting');
      fetchPriceRest(finalSymbol);
    }
  };

  // Determine display status
  const displayStatus = !isActive ? 'disconnected' : connectionStatus;

  // Determine price color flash
  const priceColorClass = prevPrice && currentPrice
    ? currentPrice > prevPrice
      ? 'text-emerald-500'
      : currentPrice < prevPrice
      ? 'text-rose-500'
      : 'text-amber-500'
    : 'text-amber-500';

  return (
    <div className="rounded-2xl border transition-all duration-200 overflow-hidden bg-white/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Top Banner / Master Toggle Bar */}
      <div className="p-3.5 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
              isActive
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            <Radio className={`w-4 h-4 ${isActive ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                وضع المراقبة اللحظية من Binance
              </h3>
              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                }`}
              >
                {isActive ? 'نَشِط 🟢' : 'مُعطّل (يدوي فقط)'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {isActive
                ? 'مراقبة سعر السوق المباشر وتنبيهك عند الوصول للهدف'
                : 'اضغط لتفعيل المراقبة المباشرة من بينانس مع التنبيه بالصوت'}
            </p>
          </div>
        </div>

        {/* Master ON/OFF Switch */}
        <button
          type="button"
          onClick={() => onToggleActive(!isActive)}
          className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
            isActive ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
          }`}
          role="switch"
          aria-checked={isActive}
          title={isActive ? 'إيقاف وضع المراقبة' : 'تشغيل وضع المراقبة'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              isActive ? 'translate-x-1' : 'translate-x-7'
            }`}
          />
        </button>
      </div>

      {/* Active Monitoring Panel */}
      {isActive && (
        <div className="p-3.5 space-y-3.5 animate-in fade-in duration-200">
          {/* Target Reached Visual Alert Banner */}
          {targetReached && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500/20 via-amber-500/20 to-emerald-500/20 border-2 border-emerald-500/40 text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2 animate-bounce">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500 animate-spin" />
                <div>
                  <h4 className="text-xs font-bold">🎯 تم تحقيق السعر المستهدف بنجاح!</h4>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                    السعر الحالي ({currentPrice}) بلغ أو تجاوز هدفك ({targetPrice} USDT).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTargetReached(false)}
                className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition cursor-pointer"
              >
                تم الاطلاع
              </button>
            </div>
          )}

          {/* Symbol Selector & Quick Pairs */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <span>زوج بينانس المربوط:</span>
                <span className="font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {formattedSymbol}
                </span>
              </span>

              <button
                type="button"
                onClick={() => {
                  setCustomInputSymbol(formattedSymbol.replace('USDT', ''));
                  setIsEditingSymbol(!isEditingSymbol);
                }}
                className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>{isEditingSymbol ? 'إلغاء' : 'تغيير الرمز'}</span>
              </button>
            </div>

            {/* Custom Symbol Input */}
            {isEditingSymbol ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveCustomSymbol(customInputSymbol);
                }}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  type="text"
                  value={customInputSymbol}
                  onChange={(e) => setCustomInputSymbol(e.target.value.toUpperCase())}
                  placeholder="مثال: SOL أو PEPE"
                  className="flex-1 h-8 px-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-amber-500"
                  dir="ltr"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 h-8 bg-amber-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-amber-400 transition cursor-pointer"
                >
                  حفظ
                </button>
              </form>
            ) : (
              /* Popular quick symbols */
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-slate-400">سريع:</span>
                {POPULAR_SYMBOLS.map((sym) => {
                  const fullPair = `${sym}USDT`;
                  const isCurrent = formattedSymbol === fullPair;
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => handleSaveCustomSymbol(sym)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md border transition cursor-pointer ${
                        isCurrent
                          ? 'bg-amber-500 text-slate-950 font-bold border-amber-500 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                      }`}
                    >
                      {sym}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Error Message if Symbol is invalid or connection failed */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <div className="text-[11px] leading-tight">{errorMessage}</div>
              </div>
              <button
                type="button"
                onClick={() => fetchPriceRest(formattedSymbol)}
                className="px-2 py-1 rounded bg-rose-500/20 text-rose-600 hover:bg-rose-500/30 text-[10px] font-bold cursor-pointer shrink-0"
              >
                إعادة المحاولة 🔄
              </button>
            </div>
          )}

          {/* Live Price Display Card */}
          <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {formattedSymbol}
                </span>
                
                {/* Connection Status Badge */}
                <button
                  type="button"
                  onClick={() => fetchPriceRest(formattedSymbol)}
                  className="text-[10px] px-1.5 py-0.5 rounded-md font-mono bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 flex items-center gap-1 cursor-pointer hover:opacity-80 transition"
                  title="اضغط للتحديث الفوري"
                >
                  {displayStatus === 'connected' ? (
                    <>
                      <span>🟢 متصل ببينانس</span>
                      {isRefreshing && <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-500" />}
                    </>
                  ) : displayStatus === 'connecting' ? (
                    <>
                      <RefreshCw className="w-2.5 h-2.5 animate-spin text-amber-500" />
                      <span>جاري الاتصال...</span>
                    </>
                  ) : (
                    <>
                      <span>🔴 خطأ بالاتصال</span>
                      <RefreshCw className="w-2.5 h-2.5 text-rose-500" />
                    </>
                  )}
                </button>

                {priceChange24h !== null && (
                  <span
                    className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${
                      priceChange24h >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                    dir="ltr"
                  >
                    {priceChange24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {priceChange24h > 0 ? `+${priceChange24h.toFixed(2)}%` : `${priceChange24h.toFixed(2)}%`}
                  </span>
                )}
              </div>
              {/* Current Price */}
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl font-mono font-black tracking-tight ${priceColorClass}`} dir="ltr">
                  {currentPrice !== null ? formatCurrencyPrice(currentPrice) : '---'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                  USDT
                </span>
              </div>
            </div>

            {/* Quick Actions with live price */}
            {currentPrice !== null ? (
              <div className="flex items-center gap-1.5 self-end">
                <button
                  type="button"
                  onClick={() => onApplyPriceAsEntry(currentPrice.toString())}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-medium transition cursor-pointer active:scale-95"
                  title="استخدام السعر الحالي كسعر دخول في الحاسبة"
                >
                  <Zap className="w-3 h-3" />
                  <span>كسعر دخول</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAddPriceAsTest(currentPrice.toString())}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-xs font-medium transition cursor-pointer active:scale-95"
                  title="إضافة السعر الحالي في خانات أسعار الاختبار"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>كسعر اختبار</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fetchPriceRest(formattedSymbol)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs shadow-sm hover:bg-amber-400 transition cursor-pointer active:scale-95 self-end"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>تحديث السعر الآن</span>
              </button>
            )}
          </div>

          {/* Target Price Configuration */}
          <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-500" />
                <span>السعر المستهدف للتنبيه (Target Price) 🎯</span>
              </label>

              {/* Target direction toggle */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px]">
                <button
                  type="button"
                  onClick={() => onChangeTargetDirection('above')}
                  className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                    targetDirection === 'above'
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="تنبيه عند الصعود أو الوصول لسعر الهدف"
                >
                  صعود (≥)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeTargetDirection('below')}
                  className={`px-2 py-0.5 rounded-md font-bold transition cursor-pointer ${
                    targetDirection === 'below'
                      ? 'bg-rose-500 text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="تنبيه عند الهبوط أو الوصول لسعر الهدف"
                >
                  هبوط (≤)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Input for target price */}
              <div className="sm:col-span-2 relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={targetPrice}
                  onChange={(e) => {
                    onChangeTargetPrice(e.target.value);
                    setTargetReached(false);
                  }}
                  placeholder="مثال: 68500"
                  className="w-full h-10 px-3 pr-8 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm font-mono font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition"
                  dir="ltr"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                  USDT
                </span>
              </div>

              {/* Set Break-Even as Target shortcut */}
              {breakEvenPrice && breakEvenPrice > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    onChangeTargetPrice(breakEvenPrice.toString());
                    setTargetReached(false);
                  }}
                  className="h-10 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                  title="تحديد سعر التعادل المحسوب كهدف للتنبيه"
                >
                  <Target className="w-3.5 h-3.5 text-amber-500" />
                  <span>هدف التعادل</span>
                </button>
              ) : (
                <div className="h-10 flex items-center justify-center text-[10px] text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                  أدخل بيانات الصفقة
                </div>
              )}
            </div>
          </div>

          {/* Sound & Notification Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              {/* Sound Toggle */}
              <button
                type="button"
                onClick={toggleSound}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition cursor-pointer ${
                  soundEnabled
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700'
                }`}
                title={soundEnabled ? 'صوت التنبيه مفعل (اضغط للكتم)' : 'صوت التنبيه مكتوم (اضغط للتفعيل)'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-500" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{soundEnabled ? 'صوت التنبيه مفعل 🔔' : 'صوت التنبيه مكتوم 🔇'}</span>
              </button>

              {/* Notification Permission */}
              <button
                type="button"
                onClick={handleRequestNotification}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition cursor-pointer ${
                  browserNotificationEnabled
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                }`}
                title="إشعارات المتصفح والنظام"
              >
                {browserNotificationEnabled ? <Bell className="w-3.5 h-3.5 text-emerald-500" /> : <BellOff className="w-3.5 h-3.5" />}
                <span>{browserNotificationEnabled ? 'إشعارات المتصفح مفعلة' : 'طلب إذن إشعارات النظام'}</span>
              </button>
            </div>

            {/* Test sound button */}
            <button
              type="button"
              onClick={() => soundAlert.playTargetReachedAlert()}
              className="text-[11px] text-slate-500 hover:text-amber-500 underline transition cursor-pointer"
            >
              تجربة صوت الرنين
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
