'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowRight, 
  Calculator, 
  Zap, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2, 
  TrendingUp, 
  TrendingDown,
  Layers,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  Eye,
  EyeOff,
  Sliders
} from 'lucide-react';
import { CoinAvatar } from './CoinAvatar';
import { trimTrailingZeros } from '@/lib/calculator';
import { useTheme } from '@/context/ThemeContext';

interface TradingViewChartModalProps {
  isOpen: boolean;
  symbol: string; // e.g. 'BTCUSDT' or 'BTC'
  currencyName: string; // e.g. 'BTC'
  description?: string;
  entryPrice?: string;
  breakEvenPrice?: string;
  coinQuantity?: string;
  tradeAmount?: string;
  livePrice?: string;
  testPrices?: string[];
  testPriceTimestamps?: number[];
  onClose: () => void;
  onNavigateToCalculator?: (currencyName: string) => void;
  onNavigateToScalper?: (symbolName: string) => void;
}

// Format timestamp helper
function formatTimestamp(ts?: number): string {
  if (!ts) return 'الآن';
  try {
    const d = new Date(ts);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
  } catch {
    return 'الآن';
  }
}

export const TradingViewChartModal: React.FC<TradingViewChartModalProps> = ({
  isOpen,
  symbol,
  currencyName,
  description,
  entryPrice,
  breakEvenPrice,
  coinQuantity,
  tradeAmount,
  livePrice,
  testPrices = [],
  testPriceTimestamps = [],
  onClose,
  onNavigateToCalculator,
  onNavigateToScalper,
}) => {
  const { resolvedTheme } = useTheme();

  // 1. Theme Auto-Inheritance with Manual Toggle
  const [manualThemeOverride, setManualThemeOverride] = useState<'dark' | 'light' | null>(null);
  const chartTheme = manualThemeOverride ?? (resolvedTheme || 'dark');

  const toggleChartTheme = () => {
    setManualThemeOverride((prev) => {
      const current = prev ?? (resolvedTheme || 'dark');
      return current === 'dark' ? 'light' : 'dark';
    });
  };

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFloatingHudCollapsed, setIsFloatingHudCollapsed] = useState(false);
  const [showInChartLevels, setShowInChartLevels] = useState(true);
  const [showTestPricesDrawer, setShowTestPricesDrawer] = useState(false);
  const [showTvTip, setShowTvTip] = useState(false);

  // Clean symbol for Binance (e.g. BTCUSDT)
  const cleanSymbol = symbol.trim().toUpperCase();
  const binanceSymbol = cleanSymbol.endsWith('USDT') ? cleanSymbol : `${cleanSymbol}USDT`;
  const baseAsset = currencyName.trim().toUpperCase() || binanceSymbol.replace('USDT', '');

  // Numbers parsing
  const entryNum = entryPrice ? parseFloat(entryPrice) : NaN;
  const beNum = breakEvenPrice ? parseFloat(breakEvenPrice) : NaN;
  const currentPriceNum = livePrice ? parseFloat(livePrice) : NaN;

  // 2. Break-Even Spread Percentage from Entry Price
  const breakEvenSpreadPercent = useMemo(() => {
    if (isNaN(entryNum) || entryNum <= 0 || isNaN(beNum) || beNum <= 0) {
      return null;
    }
    return ((beNum - entryNum) / entryNum) * 100;
  }, [entryNum, beNum]);

  // Live Net P&L
  const pnlData = useMemo(() => {
    if (isNaN(entryNum) || entryNum <= 0 || isNaN(currentPriceNum) || currentPriceNum <= 0) {
      return null;
    }
    const diff = currentPriceNum - entryNum;
    const percent = (diff / entryNum) * 100;
    const qty = coinQuantity ? parseFloat(coinQuantity) : (tradeAmount ? parseFloat(tradeAmount) / entryNum : 100 / entryNum);
    const usdt = diff * qty;
    return {
      percent,
      usdt,
      isProfit: diff >= 0,
    };
  }, [entryNum, currentPriceNum, coinQuantity, tradeAmount]);

  // Distance from Break-Even
  const beDistancePercent = useMemo(() => {
    if (isNaN(beNum) || beNum <= 0 || isNaN(currentPriceNum) || currentPriceNum <= 0) {
      return null;
    }
    return ((currentPriceNum - beNum) / beNum) * 100;
  }, [beNum, currentPriceNum]);

  // Clean test prices list paired with timestamps
  const activeTestPrices = useMemo(() => {
    const list: Array<{ price: string; timestamp?: number; num: number }> = [];
    testPrices.forEach((tp, idx) => {
      const trimmed = tp?.trim();
      if (!trimmed) return;
      const num = parseFloat(trimmed);
      if (!isNaN(num) && num > 0) {
        list.push({
          price: trimmed,
          timestamp: testPriceTimestamps[idx],
          num,
        });
      }
    });
    return list;
  }, [testPrices, testPriceTimestamps]);

  // Relative vertical positioning for In-Chart Level Lines
  // Position is clamped comfortably between 18% and 78% from top
  const levelLinePositions = useMemo(() => {
    if (!entryNum || isNaN(entryNum)) return null;

    // If both entry and break-even exist
    if (beNum && !isNaN(beNum)) {
      if (currentPriceNum && !isNaN(currentPriceNum)) {
        const minP = Math.min(entryNum, beNum, currentPriceNum) * 0.995;
        const maxP = Math.max(entryNum, beNum, currentPriceNum) * 1.005;
        const range = maxP - minP || 1;

        // In charts: higher price = closer to top (lower % top)
        const entryTop = Math.max(16, Math.min(80, 80 - ((entryNum - minP) / range) * 60));
        const beTop = Math.max(16, Math.min(80, 80 - ((beNum - minP) / range) * 60));
        return { entryTop, beTop };
      }
      return { entryTop: 62, beTop: 45 };
    }
    return { entryTop: 55, beTop: null };
  }, [entryNum, beNum, currentPriceNum]);

  // Copy helper
  const handleCopyPrice = (val: string, fieldId: string) => {
    if (!val) return;
    try {
      navigator.clipboard.writeText(val);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      // Ignore
    }
  };


  // Official TradingView embed URL with Binance feed & dynamic theme
  const iframeSrc = useMemo(() => {
    const isDark = chartTheme === 'dark';
    const toolbarColor = isDark ? '0f172a' : 'ffffff';
    return `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_advanced_chart&symbol=BINANCE%3A${encodeURIComponent(
      binanceSymbol
    )}&interval=15&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=${toolbarColor}&studies=%5B%5D&theme=${chartTheme}&style=1&timezone=Etc%2FUTC&locale=ar_AE`;
  }, [binanceSymbol, chartTheme]);

  if (!isOpen) return null;

  const isDark = chartTheme === 'dark';

  return (
    <div 
      className={`fixed inset-0 z-50 flex flex-col transition-colors duration-200 ${
        isFullscreen ? 'p-0' : 'p-1 sm:p-2'
      } ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-950'}`}
      dir="rtl"
    >
      <div 
        className={`relative flex flex-col w-full h-full overflow-hidden transition-all duration-200 ${
          isFullscreen 
            ? 'rounded-none border-0' 
            : 'rounded-2xl border shadow-2xl ' + (isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300')
        }`}
      >
        {/* ========================================================================= */}
        {/* 1. TOP HEADER HUD (NORMAL MODE)                                           */}
        {/* ========================================================================= */}
        {!isFullscreen && (
          <header 
            className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b shrink-0 transition-colors ${
              isDark ? 'bg-slate-900/95 border-slate-800 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
            }`}
          >
            {/* Right: Back Button + Coin Identity */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition border cursor-pointer shadow-xs ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-950 border-slate-300'
                }`}
                title="العودة لشاشة المراقبة"
              >
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">رجوع</span>
              </button>

              <div className="flex items-center gap-2">
                <CoinAvatar symbol={baseAsset} size="md" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-base tracking-tight">
                      {binanceSymbol}
                    </span>
                    <span className="text-[10px] font-black font-mono px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      BINANCE
                    </span>
                  </div>
                  {livePrice && (
                    <div className="flex items-center gap-1.5 text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                      <span>${trimTrailingZeros(livePrice)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Middle: Entry, Break-Even & Break-Even Spread % */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1">
              {/* Entry Price Badge */}
              <div 
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs border ${
                  isDark ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-500 shrink-0" />
                <span className="font-bold text-[11px] text-slate-500 dark:text-slate-400">الدخول:</span>
                <span className="font-mono font-black" dir="ltr">
                  {entryPrice ? `$${trimTrailingZeros(entryPrice)}` : '—'}
                </span>
                {entryPrice && (
                  <button
                    type="button"
                    onClick={() => handleCopyPrice(entryPrice, 'entry')}
                    className="p-0.5 text-slate-400 hover:text-amber-500 transition cursor-pointer"
                    title="نسخ سعر الدخول"
                  >
                    {copiedField === 'entry' ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>

              {/* Break-Even Price Badge + Spread % */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="font-bold text-amber-600 dark:text-amber-300 text-[11px]">التعادل:</span>
                <span className="font-mono font-black text-amber-600 dark:text-amber-400" dir="ltr">
                  {breakEvenPrice ? `$${trimTrailingZeros(breakEvenPrice)}` : '—'}
                </span>

                {/* Direct Break-Even Spread % from Entry */}
                {breakEvenSpreadPercent !== null && (
                  <span 
                    className="font-mono font-black text-[11px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40"
                    title="النسبة المئوية للفارق السعري بين سعر الدخول وسعر التعادل لتغطية الرسوم"
                  >
                    +{breakEvenSpreadPercent.toFixed(2)}%
                  </span>
                )}

                {breakEvenPrice && (
                  <button
                    type="button"
                    onClick={() => handleCopyPrice(breakEvenPrice, 'be')}
                    className="p-0.5 text-amber-600/80 dark:text-amber-400/80 hover:text-amber-500 transition cursor-pointer"
                    title="نسخ سعر التعادل"
                  >
                    {copiedField === 'be' ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>

              {/* Net P&L Badge */}
              {pnlData && (
                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-mono text-xs font-black border ${
                  pnlData.isProfit 
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400'
                }`}>
                  {pnlData.isProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <span>{pnlData.isProfit ? '+' : ''}{pnlData.percent.toFixed(2)}%</span>
                  <span className="text-[10px] opacity-90 hidden sm:inline">
                    ({pnlData.isProfit ? '+' : ''}{pnlData.usdt.toFixed(2)}$)
                  </span>
                </div>
              )}
            </div>

            {/* Left: Toggles & Navigation */}
            <div className="flex items-center gap-1.5">
              {/* In-Chart Lines Toggle */}
              {(entryPrice || breakEvenPrice) && (
                <button
                  type="button"
                  onClick={() => setShowInChartLevels((prev) => !prev)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    showInChartLevels
                      ? 'bg-blue-600/15 border-blue-500/40 text-blue-600 dark:text-blue-300'
                      : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
                  }`}
                  title={showInChartLevels ? 'إخفاء خطوط الدخول والتعادل على الشارت' : 'إظهار خطوط الدخول والتعادل على الشارت'}
                >
                  {showInChartLevels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span className="hidden lg:inline text-[11px]">خطوط المستويات</span>
                </button>
              )}

              {/* Test Prices Drawer Toggle */}
              {activeTestPrices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTestPricesDrawer((prev) => !prev)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    showTestPricesDrawer 
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-300'
                      : isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-800'
                  }`}
                  title="عرض قائمة أسعار الاختبار مع الطوابع الزمنية"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px]">أسعار الاختبار ({activeTestPrices.length})</span>
                </button>
              )}

              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleChartTheme}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                }`}
                title={isDark ? 'تبديل لخلفية بيضاء (Light Theme)' : 'تبديل لخلفية سوداء (Dark Theme)'}
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                <span className="text-[11px] hidden md:inline">{isDark ? 'خلفية بيضاء' : 'خلفية سوداء'}</span>
              </button>

              {/* TV Tools Info Popover Toggle */}
              <button
                type="button"
                onClick={() => setShowTvTip((prev) => !prev)}
                className={`p-1.5 rounded-xl border transition cursor-pointer ${
                  showTvTip 
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' 
                    : isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900'
                }`}
                title="شرح أدوات TradingView ورسم الخطوط"
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>

              {onNavigateToCalculator && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToCalculator(baseAsset);
                    onClose();
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-950 border-slate-300'
                  }`}
                  title="فتح في حاسبة التعادل"
                >
                  <Calculator className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">الحاسبة</span>
                </button>
              )}

              {onNavigateToScalper && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToScalper(baseAsset);
                    onClose();
                  }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 hover:text-slate-950 border-slate-300'
                  }`}
                  title="فتح في لوحة السكالبينج"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline">السكالبينج</span>
                </button>
              )}

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-sm"
                title="تفعيل وضع ملء الشاشة الكامل"
              >
                <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>ملء الشاشة</span>
              </button>
            </div>
          </header>
        )}

        {/* ========================================================================= */}
        {/* TRADINGVIEW TOOLS GUIDANCE BANNER                                         */}
        {/* ========================================================================= */}
        {showTvTip && (
          <div 
            className={`border-b p-3 text-xs shrink-0 transition-all ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-300 text-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 font-black text-amber-600 dark:text-amber-400">
                  <Sliders className="w-4 h-4" />
                  <span>دليل أدوات الخطوط وقائمة (+) في TradingView:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  • <strong>زر (+) بجانب المؤشر:</strong> في ويدجت TradingView المضمن، يرتبط زر (+) بحسابات الوساطة المباشرة (Broker Orders) لفتح صفقات فورية داخل الحساب المسجل.
                </p>
                <p className="text-[11px] leading-relaxed">
                  • <strong>أداة رسم الخط الأفقي المتقدمة (Alt + H):</strong> متاحة كاملة في الشريط الجانبي الأيسر للشارت (الأيقونة الثانية: Lines). بمجرد رسم أي خط يظهر لك شريط تحكم كامل لاختيار اللون، وسُمك الخط (1-4px)، ونمط التنقيط (متقطع/متصل)، وإضافة نص توضيحي وكتابة السعر بدقة!
                </p>
                <p className="text-[11px] leading-relaxed text-blue-600 dark:text-blue-400">
                  • <strong>خطوط المستويات الذكية:</strong> قمنا أيضاً بتثبيت خطوط أفقية تفاعلية داخل الشارت بالأسفل توضح سعر الدخول والتعادل تلقائياً دون الحاجة لرسم يدوي!
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowTvTip(false)}
                className="text-slate-400 hover:text-white px-2 py-1 rounded-md text-xs cursor-pointer"
              >
                إغلاق ✕
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TEST PRICES DRAWER (أسعار الاختبار مع الطابع الزمني)                      */}
        {/* ========================================================================= */}
        {showTestPricesDrawer && activeTestPrices.length > 0 && (
          <div 
            className={`border-b px-3 py-2 shrink-0 transition-colors ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="font-black text-xs">أسعار الاختبار المسجلة ({activeTestPrices.length}) مع الطابع الزمني:</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTestPricesDrawer(false)}
                className="text-xs text-slate-400 hover:text-amber-500 cursor-pointer"
              >
                إغلاق ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-1">
              {activeTestPrices.map((item, idx) => {
                const diffFromEntry = !isNaN(entryNum) && entryNum > 0 ? ((item.num - entryNum) / entryNum) * 100 : null;
                const isGain = diffFromEntry !== null && diffFromEntry >= 0;
                return (
                  <div 
                    key={`tp-${idx}-${item.price}`}
                    className={`p-2 rounded-xl border flex flex-col gap-1 transition-all ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400">مستهدف #{idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyPrice(item.price, `tp-${idx}`)}
                        className="text-slate-400 hover:text-amber-500 cursor-pointer"
                        title="نسخ السعر"
                      >
                        {copiedField === `tp-${idx}` ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-white" dir="ltr">
                        ${trimTrailingZeros(item.price)}
                      </span>
                      {diffFromEntry !== null && (
                        <span className={`font-mono font-bold text-[11px] ${isGain ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {isGain ? '+' : ''}{diffFromEntry.toFixed(2)}%
                        </span>
                      )}
                    </div>

                    {/* Timestamp display */}
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      <Clock className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                      <span>{formatTimestamp(item.timestamp)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. MAIN TRADINGVIEW IFRAME + IN-CHART HORIZONTAL LEVEL LINES               */}
        {/* ========================================================================= */}
        <div className={`relative flex-1 w-full h-full min-h-[350px] ${isDark ? 'bg-slate-950' : 'bg-white'}`}>
          <iframe
            key={`${binanceSymbol}-${chartTheme}`}
            src={iframeSrc}
            className="w-full h-full border-0 block"
            title={`TradingView Chart for ${binanceSymbol}`}
            allow="fullscreen; clipboard-write"
            loading="lazy"
          />

          {/* ======================================================================= */}
          {/* IN-CHART HORIZONTAL LEVEL LINES (سعر الدخول وسعر التعادل داخل الشارت)    */}
          {/* ======================================================================= */}
          {showInChartLevels && levelLinePositions && (
            <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden" dir="rtl">
              {/* ENTRY PRICE HORIZONTAL LINE (خط سعر الدخول الأفقي) */}
              {entryPrice && (
                <div 
                  className="absolute left-0 right-0 flex items-center transition-all duration-300 pointer-events-auto"
                  style={{ top: `${levelLinePositions.entryTop}%` }}
                >
                  {/* Glowing Horizontal Line across Chart */}
                  <div className="flex-1 h-[2px] bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)] border-t border-cyan-400/80" />

                  {/* Level Tag on the Right Price Scale */}
                  <div 
                    className="flex items-center gap-1.5 px-2 py-0.5 ml-1 rounded-l-md font-mono font-black text-xs bg-cyan-600 text-white shadow-lg border border-cyan-400 select-none cursor-pointer"
                    onClick={() => handleCopyPrice(entryPrice, 'entry-line')}
                    title="سعر الدخول - انقر للنسخ"
                  >
                    <span className="font-sans text-[10px] font-bold">دخول</span>
                    <span dir="ltr">${trimTrailingZeros(entryPrice)}</span>
                    {copiedField === 'entry-line' && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              )}

              {/* BREAK-EVEN PRICE HORIZONTAL LINE (خط سعر التعادل الأفقي) */}
              {breakEvenPrice && levelLinePositions.beTop !== null && (
                <div 
                  className="absolute left-0 right-0 flex items-center transition-all duration-300 pointer-events-auto"
                  style={{ top: `${levelLinePositions.beTop}%` }}
                >
                  {/* Dashed Golden Horizontal Line across Chart */}
                  <div className="flex-1 h-0 border-t-2 border-dashed border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />

                  {/* Level Tag on the Right Price Scale */}
                  <div 
                    className="flex items-center gap-1.5 px-2 py-0.5 ml-1 rounded-l-md font-mono font-black text-xs bg-amber-500 text-slate-950 shadow-lg border border-amber-300 select-none cursor-pointer"
                    onClick={() => handleCopyPrice(breakEvenPrice, 'be-line')}
                    title="سعر التعادل - انقر للنسخ"
                  >
                    <span className="font-sans text-[10px] font-bold">تعادل</span>
                    <span dir="ltr">${trimTrailingZeros(breakEvenPrice)}</span>
                    {breakEvenSpreadPercent !== null && (
                      <span className="text-[10px] font-mono font-black bg-slate-950/20 px-1 rounded-xs">
                        +{breakEvenSpreadPercent.toFixed(1)}%
                      </span>
                    )}
                    {copiedField === 'be-line' && <Check className="w-3 h-3 text-slate-950" />}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================================= */}
          {/* 3. FLOATING HUD CARD IN CORNER (FULLSCREEN MODE)                         */}
          {/* ======================================================================= */}
          {isFullscreen && (
            <div 
              className="absolute top-3 right-3 z-40 max-w-sm transition-all select-none"
              dir="rtl"
            >
              {!isFloatingHudCollapsed ? (
                /* Expanded Floating Card */
                <div 
                  className={`p-3 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all ${
                    isDark 
                      ? 'bg-slate-900/90 border-slate-700/80 text-white shadow-[0_8px_30px_rgb(0,0,0,0.5)]' 
                      : 'bg-white/95 border-slate-300 text-slate-950 shadow-[0_8px_30px_rgb(0,0,0,0.15)]'
                  }`}
                >
                  {/* Top Bar of Floating HUD */}
                  <div className="flex items-center justify-between gap-3 pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <CoinAvatar symbol={baseAsset} size="sm" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-sm tracking-tight">
                            {binanceSymbol}
                          </span>
                          {livePrice && (
                            <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400" dir="ltr">
                              ${trimTrailingZeros(livePrice)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Controls: Theme Toggle + Level Lines + Collapse + Exit Fullscreen */}
                    <div className="flex items-center gap-1">
                      {/* Level lines toggle */}
                      {(entryPrice || breakEvenPrice) && (
                        <button
                          type="button"
                          onClick={() => setShowInChartLevels((prev) => !prev)}
                          className={`p-1.5 rounded-lg border transition cursor-pointer ${
                            showInChartLevels
                              ? 'bg-blue-600/20 border-blue-500/40 text-blue-400'
                              : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                          }`}
                          title={showInChartLevels ? 'إخفاء خطوط المستويات' : 'إظهار خطوط المستويات'}
                        >
                          {showInChartLevels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      {/* Theme toggle */}
                      <button
                        type="button"
                        onClick={toggleChartTheme}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          isDark 
                            ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' 
                            : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                        }`}
                        title={isDark ? 'خلفية بيضاء' : 'خلفية سوداء'}
                      >
                        {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                      </button>

                      {/* Collapse HUD to mini pill */}
                      <button
                        type="button"
                        onClick={() => setIsFloatingHudCollapsed(true)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          isDark 
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' 
                            : 'bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-950'
                        }`}
                        title="تصغير البطاقة العائمة"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Exit Fullscreen */}
                      <button
                        type="button"
                        onClick={() => setIsFullscreen(false)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-xs"
                        title="خروج من ملء الشاشة"
                      >
                        <Minimize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span className="text-[11px]">إنهاء</span>
                      </button>
                    </div>
                  </div>

                  {/* Body of Floating HUD: Entry, BreakEven, and Spread % */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Entry Price */}
                    <div className={`p-1.5 rounded-xl border ${isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                          <span>الدخول:</span>
                        </span>
                        {entryPrice && (
                          <button
                            type="button"
                            onClick={() => handleCopyPrice(entryPrice, 'entry-float')}
                            className="hover:text-amber-500 cursor-pointer"
                            title="نسخ السعر"
                          >
                            {copiedField === 'entry-float' ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                          </button>
                        )}
                      </div>
                      <span className="font-mono font-black text-xs" dir="ltr">
                        {entryPrice ? `$${trimTrailingZeros(entryPrice)}` : '—'}
                      </span>
                    </div>

                    {/* Break-Even Price */}
                    <div className="p-1.5 rounded-xl border bg-amber-500/10 border-amber-500/30">
                      <div className="flex items-center justify-between text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-0.5">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>التعادل:</span>
                        </span>
                        {breakEvenPrice && (
                          <button
                            type="button"
                            onClick={() => handleCopyPrice(breakEvenPrice, 'be-float')}
                            className="hover:text-amber-500 cursor-pointer"
                            title="نسخ سعر التعادل"
                          >
                            {copiedField === 'be-float' ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                          </button>
                        )}
                      </div>
                      <span className="font-mono font-black text-xs text-amber-600 dark:text-amber-400" dir="ltr">
                        {breakEvenPrice ? `$${trimTrailingZeros(breakEvenPrice)}` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Percentage Difference between Entry and Break-Even */}
                  {breakEvenSpreadPercent !== null && (
                    <div className="mt-2 py-1 px-2 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-[11px] font-bold text-amber-600 dark:text-amber-300">
                      <span>فارق التعادل عن الدخول:</span>
                      <span className="font-mono font-black" dir="ltr">
                        +{breakEvenSpreadPercent.toFixed(2)}%
                      </span>
                    </div>
                  )}

                  {/* Live P&L in Floating HUD */}
                  {pnlData && (
                    <div className={`mt-2 py-1 px-2.5 rounded-xl font-mono text-xs font-black flex items-center justify-between border ${
                      pnlData.isProfit 
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400'
                    }`}>
                      <span className="font-sans text-[11px] font-bold">الربح الصافي حالياً:</span>
                      <div className="flex items-center gap-1.5" dir="ltr">
                        <span>{pnlData.isProfit ? '+' : ''}{pnlData.percent.toFixed(2)}%</span>
                        <span className="text-[10px] opacity-90">({pnlData.isProfit ? '+' : ''}{pnlData.usdt.toFixed(2)}$)</span>
                      </div>
                    </div>
                  )}

                  {/* Test Prices quick view button */}
                  {activeTestPrices.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {activeTestPrices.length} أسعار اختبار مسجلة
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowTestPricesDrawer((prev) => !prev)}
                        className="text-[10px] font-bold text-amber-500 hover:underline cursor-pointer"
                      >
                        {showTestPricesDrawer ? 'إخفاء' : 'عرض الأسعار'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Collapsed Floating Mini Pill (Takes minimal space) */
                <div 
                  className={`flex items-center gap-2 p-1.5 px-3 rounded-full border shadow-xl backdrop-blur-xl transition-all cursor-pointer ${
                    isDark 
                      ? 'bg-slate-900/90 border-slate-700 text-white shadow-black/50' 
                      : 'bg-white/95 border-slate-300 text-slate-950 shadow-slate-300/50'
                  }`}
                  onClick={() => setIsFloatingHudCollapsed(false)}
                  title="انقر لتوسيع بطاقة بيانات الصفقة"
                >
                  <CoinAvatar symbol={baseAsset} size="xs" />
                  <span className="font-mono font-black text-xs">{baseAsset}</span>
                  {livePrice && (
                    <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400" dir="ltr">
                      ${trimTrailingZeros(livePrice)}
                    </span>
                  )}
                  {breakEvenSpreadPercent !== null && (
                    <span className="font-mono font-black text-[10px] text-amber-500">
                      BE: +{breakEvenSpreadPercent.toFixed(1)}%
                    </span>
                  )}
                  {pnlData && (
                    <span className={`font-mono font-black text-[11px] ${pnlData.isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {pnlData.isProfit ? '+' : ''}{pnlData.percent.toFixed(1)}%
                    </span>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
