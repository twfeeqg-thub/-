'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  RangeTrackedTrade, 
  RangeAnalysisResult, 
  RANGE_TIMEFRAME_OPTIONS, 
  SECTOR_PRESETS,
  STORAGE_KEY_RANGE_TRADES,
  STORAGE_KEY_RANGE_COSTS
} from '@/types/rangeScalper';
import { analyzeRangeFromMinuteKlines } from '@/lib/rangeAnalysis';
import { RangeTradeCard } from './RangeTradeCard';
import { RangeTradeLedger } from './RangeTradeLedger';
import { trimTrailingZeros } from '@/lib/calculator';
import { soundAlert } from '@/lib/soundAlert';
import { canTriggerAlert, recordAlertTriggered } from '@/lib/alertSettings';
import { systemNotification } from '@/lib/systemNotification';
import { 
  Layers, 
  Search, 
  Plus, 
  Radio, 
  Calculator, 
  TrendingUp, 
  Zap, 
  LayoutList, 
  Palette, 
  Clock, 
  Sliders, 
  Check, 
  CheckCircle2,
  AlertCircle, 
  Sparkles,
  RefreshCw,
  Trash2,
  Maximize2
} from 'lucide-react';

interface RangeScalperDashboardProps {
  livePrices: Record<string, string>;
  isLiveStreamActive: boolean;
  watchlistSymbols?: string[];
  trackerSymbols?: string[];
  defaultEntryFeePercent?: string;
  defaultExitFeePercent?: string;
  onToggleLiveStream: (active: boolean) => void;
  onOpenChart: (symbol: string) => void;
  onNavigateToCalculator: (name: string, price: string) => void;
  onNavigateToTracker: (symbol?: string) => void;
  onNavigateToScalper: (symbol?: string) => void;
  onNavigateToWatchlist: () => void;
  onOpenThemeCustomizer: () => void;
  onRegisterSymbolsForStream?: (symbols: string[]) => void;
}

export const RangeScalperDashboard: React.FC<RangeScalperDashboardProps> = ({
  livePrices,
  isLiveStreamActive,
  watchlistSymbols = [],
  trackerSymbols = [],
  defaultEntryFeePercent = '0.1',
  defaultExitFeePercent = '0.1',
  onToggleLiveStream,
  onOpenChart,
  onNavigateToCalculator,
  onNavigateToTracker,
  onNavigateToScalper,
  onNavigateToWatchlist,
  onOpenThemeCustomizer,
  onRegisterSymbolsForStream,
}) => {
  // 1. PERSISTED TRADES STATE
  const [trades, setTrades] = useState<RangeTrackedTrade[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RANGE_TRADES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const persistTrades = useCallback((newTrades: RangeTrackedTrade[]) => {
    setTrades(newTrades);
    try {
      localStorage.setItem(STORAGE_KEY_RANGE_TRADES, JSON.stringify(newTrades));
    } catch {
      // Ignore
    }
  }, []);

  // 2. COST SETTINGS (MANUAL INPUTS)
  const [entryFeeInput, setEntryFeeInput] = useState<string>(() => {
    if (typeof window === 'undefined') return defaultEntryFeePercent;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RANGE_COSTS);
      if (saved) return JSON.parse(saved).entryFee || defaultEntryFeePercent;
    } catch {}
    return defaultEntryFeePercent;
  });

  const [exitFeeInput, setExitFeeInput] = useState<string>(() => {
    if (typeof window === 'undefined') return defaultExitFeePercent;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_RANGE_COSTS);
      if (saved) return JSON.parse(saved).exitFee || defaultExitFeePercent;
    } catch {}
    return defaultExitFeePercent;
  });

  const [slippageInput, setSlippageInput] = useState<string>('0.1');

  const persistCosts = (entry: string, exit: string, slip: string) => {
    try {
      localStorage.setItem(STORAGE_KEY_RANGE_COSTS, JSON.stringify({ entryFee: entry, exitFee: exit, slippage: slip }));
    } catch {}
  };

  // 3. ANALYSIS CONTROLS
  const [selectedTimeframeMinutes, setSelectedTimeframeMinutes] = useState<number>(60);
  const [symbolInput, setSymbolInput] = useState<string>('NEAR');
  const [activeSectorTab, setActiveSectorTab] = useState<string>('ai');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<RangeAnalysisResult | null>(null);

  // Active filter tab
  const [activeFilter, setActiveFilter] = useState<'all' | 'watching_trough' | 'in_trade'>('all');

  // Trigger automated 1m klines analysis
  const handleRunAnalysis = useCallback(async (targetSymbol?: string, targetMinutes?: number) => {
    const sym = (targetSymbol || symbolInput).trim().toUpperCase();
    if (!sym) return;

    const tf = targetMinutes !== undefined ? targetMinutes : selectedTimeframeMinutes;
    setIsAnalyzing(true);
    setAnalysisError(null);

    const entryF = parseFloat(entryFeeInput) || 0.1;
    const exitF = parseFloat(exitFeeInput) || 0.1;
    const slip = parseFloat(slippageInput) || 0.1;

    try {
      const result = await analyzeRangeFromMinuteKlines(
        sym,
        tf,
        entryF,
        exitF,
        slip
      );
      setCurrentAnalysis(result);
    } catch (err: any) {
      setAnalysisError(err.message || 'فشل جلب بيانات الشموع من بينانس');
    } finally {
      setIsAnalyzing(false);
    }
  }, [symbolInput, selectedTimeframeMinutes, entryFeeInput, exitFeeInput, slippageInput]);

  // Auto-run analysis once on initial load for default symbol
  const hasRunInitialRef = useRef(false);
  useEffect(() => {
    if (!hasRunInitialRef.current) {
      hasRunInitialRef.current = true;
      handleRunAnalysis('NEAR', 60);
    }
  }, [handleRunAnalysis]);

  // Sync symbols with Binance WebSocket safely without feedback loop
  const onRegisterSymbolsRef = useRef(onRegisterSymbolsForStream);
  useEffect(() => {
    onRegisterSymbolsRef.current = onRegisterSymbolsForStream;
  });

  const registeredSymbolsKey = useMemo(() => {
    const list = trades.map((t) => t.binanceSymbol);
    if (currentAnalysis) {
      list.push(currentAnalysis.binanceSymbol);
    }
    return Array.from(new Set(list)).sort().join(',');
  }, [trades, currentAnalysis]);

  useEffect(() => {
    if (onRegisterSymbolsRef.current) {
      const symbols = registeredSymbolsKey ? registeredSymbolsKey.split(',') : [];
      onRegisterSymbolsRef.current(symbols);
    }
  }, [registeredSymbolsKey]);

  // Add analyzed coin to active tracked cards
  const handleAddAnalyzedToMonitoring = () => {
    if (!currentAnalysis) return;

    // Check if already in tracking
    const existingIndex = trades.findIndex(
      (t) => t.binanceSymbol === currentAnalysis.binanceSymbol && t.status !== 'closed'
    );

    if (existingIndex >= 0) {
      // Update existing
      const next = [...trades];
      next[existingIndex] = {
        ...next[existingIndex],
        timeframeMinutes: currentAnalysis.timeframeMinutes,
        troughPrice: currentAnalysis.troughPrice,
        peakPrice: currentAnalysis.peakPrice,
        grossSpreadPercent: currentAnalysis.grossSpreadPercent,
        netMarginPercent: currentAnalysis.netExpectedMarginPercent,
        entryFeePercent: currentAnalysis.entryFeePercent,
        exitFeePercent: currentAnalysis.exitFeePercent,
        slippagePercent: currentAnalysis.slippagePercent,
      };
      persistTrades(next);
      return;
    }

    const newTrade: RangeTrackedTrade = {
      id: `range_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: currentAnalysis.symbol,
      binanceSymbol: currentAnalysis.binanceSymbol,
      timeframeMinutes: currentAnalysis.timeframeMinutes,
      status: 'watching_trough',
      createdAt: Date.now(),
      isActive: true,
      alertsEnabled: false, // مغلق افتراضياً كما طلب المستخدم صراحة
      notifyOnOldTroughReturn: false,
      troughPrice: currentAnalysis.troughPrice,
      peakPrice: currentAnalysis.peakPrice,
      grossSpreadPercent: currentAnalysis.grossSpreadPercent,
      entryFeePercent: currentAnalysis.entryFeePercent,
      exitFeePercent: currentAnalysis.exitFeePercent,
      slippagePercent: currentAnalysis.slippagePercent,
      netMarginPercent: currentAnalysis.netExpectedMarginPercent,
    };

    const next = [newTrade, ...trades];
    persistTrades(next);
  };

  // Trade management handlers
  const handleUpdateTrade = (updated: RangeTrackedTrade) => {
    const next = trades.map((t) => (t.id === updated.id ? updated : t));
    persistTrades(next);
  };

  const handleDeleteTrade = (id: string) => {
    const next = trades.filter((t) => t.id !== id);
    persistTrades(next);
  };

  const handleToggleActive = (id: string) => {
    const next = trades.map((t) => {
      if (t.id === id) {
        return { ...t, isActive: t.isActive === false ? true : false };
      }
      return t;
    });
    persistTrades(next);
  };

  const handleToggleAlerts = (id: string) => {
    const next = trades.map((t) => {
      if (t.id === id) {
        return { ...t, alertsEnabled: !t.alertsEnabled };
      }
      return t;
    });
    persistTrades(next);
  };

  const handleToggleOldTroughAlert = (id: string) => {
    const next = trades.map((t) => {
      if (t.id === id) {
        return { ...t, notifyOnOldTroughReturn: !t.notifyOnOldTroughReturn };
      }
      return t;
    });
    persistTrades(next);
  };

  const handleReopenTradeAtTrough = (item: RangeTrackedTrade) => {
    const reopened: RangeTrackedTrade = {
      ...item,
      id: `range_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'watching_trough',
      createdAt: Date.now(),
      isActive: true,
      alertsEnabled: true,
      entryPrice: undefined,
      entryTimestamp: undefined,
      exitPrice: undefined,
      exitTimestamp: undefined,
      realizedPnlUsdt: undefined,
      realizedPnlPercent: undefined,
    };
    const next = [reopened, ...trades];
    persistTrades(next);
  };

  const handleClearAllHistory = () => {
    const next = trades.filter((t) => t.status !== 'closed');
    persistTrades(next);
  };

  const handleClearAllActive = () => {
    if (confirm('هل تريد حذف جميع بطاقات المراقبة النشطة الحالية؟')) {
      const next = trades.filter((t) => t.status === 'closed');
      persistTrades(next);
    }
  };

  // -------------------------------------------------------------
  // REAL-TIME NOTIFICATION CHECK (عند ملامسة القاع أو القاع القديم)
  // -------------------------------------------------------------
  const firedAlertsRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    trades.forEach((trade) => {
      if (trade.isActive === false) return;
      const livePStr = livePrices[trade.binanceSymbol];
      if (!livePStr) return;
      const liveP = parseFloat(livePStr);
      if (isNaN(liveP) || liveP <= 0) return;

      // 1. Trough Alert when watching (Only if alertsEnabled is true)
      if (trade.status === 'watching_trough' && trade.alertsEnabled && trade.troughPrice > 0) {
        const distRatio = Math.abs(liveP - trade.troughPrice) / trade.troughPrice;
        const reachedTrough = liveP <= trade.troughPrice || distRatio <= 0.003; // ضمن 0.3% من القاع

        const alertKey = `trough_${trade.id}`;
        if (reachedTrough && !firedAlertsRef.current.has(alertKey)) {
          firedAlertsRef.current.add(alertKey);
          if (canTriggerAlert('reboundBounce', trade.id)) {
            recordAlertTriggered('reboundBounce', trade.id);
            soundAlert.playBounceAlert();
            systemNotification.sendNotification({
              title: `🎯 وصل السعر للقاع: ${trade.name}!`,
              body: `وصل سعر ${trade.name} إلى منطقة القاع العرضي ($${liveP}). صافي الربح المتوقع للصعود: +${trade.netMarginPercent.toFixed(2)}%.`,
              tag: `range-trough-${trade.id}`,
              icon: '/pwa-192x192.png',
              badge: '/icon.svg',
            });
          }
        }
      }

      // 2. Old Trough Return Alert on closed items
      if (trade.status === 'closed' && trade.notifyOnOldTroughReturn && trade.troughPrice > 0) {
        const distRatio = Math.abs(liveP - trade.troughPrice) / trade.troughPrice;
        const returned = liveP <= trade.troughPrice || distRatio <= 0.003;
        const alertKey = `old_trough_${trade.id}`;

        if (returned && !firedAlertsRef.current.has(alertKey)) {
          firedAlertsRef.current.add(alertKey);
          if (canTriggerAlert('reboundBounce', `old_${trade.id}`)) {
            recordAlertTriggered('reboundBounce', `old_${trade.id}`);
            soundAlert.playTone('chime');
            systemNotification.sendNotification({
              title: `🔄 عودة لنفس القاع القديم: ${trade.name}!`,
              body: `عاد سعر ${trade.name} لملامسة القاع القديم ($${trade.troughPrice}) الذي حققت منه ربحاً سابقاً! فرصة لتكرار الصفقة.`,
              tag: `range-old-trough-${trade.id}`,
              icon: '/pwa-192x192.png',
              badge: '/icon.svg',
            });
          }
        }
      }
    });
  }, [trades, livePrices]);

  // Filtered active trades
  const activeTrades = useMemo(() => {
    return trades.filter((t) => t.status !== 'closed');
  }, [trades]);

  const filteredActiveTrades = useMemo(() => {
    if (activeFilter === 'watching_trough') {
      return activeTrades.filter((t) => t.status === 'watching_trough');
    }
    if (activeFilter === 'in_trade') {
      return activeTrades.filter((t) => t.status === 'in_trade');
    }
    return activeTrades;
  }, [activeTrades, activeFilter]);

  const closedTrades = useMemo(() => {
    return trades.filter((t) => t.status === 'closed');
  }, [trades]);

  // Combined imported symbols
  const importedCoins = useMemo(() => {
    const list = [...watchlistSymbols, ...trackerSymbols];
    return Array.from(new Set(list)).filter(Boolean);
  }, [watchlistSymbols, trackerSymbols]);

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3" dir="rtl">
      {/* 1. TOP HEADER & ZERO-FRICTION NAVIGATION BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
            <Layers className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                صائد القيعان والمسار العرضي
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                Range Master
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              رصد آلي للقيعان والقمم الأفقية بدقة شموع الدقيقة (1m) وحساب مسبق لصافي الربح بعد الرسوم والانزلاق
            </p>
          </div>
        </div>

        {/* FAST HOP NAVIGATION TO OTHER SCREENS */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Hop: Calculator */}
          <button
            type="button"
            onClick={() => onNavigateToCalculator('', '')}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/15 text-slate-700 dark:text-slate-300 hover:text-amber-500 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="الانتقال إلى حاسبة التعادل"
          >
            <Calculator className="w-4 h-4 text-amber-500" />
            <span>حاسبة التعادل</span>
          </button>

          {/* Quick Hop: Scalper */}
          <button
            type="button"
            onClick={() => onNavigateToScalper()}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/15 text-slate-700 dark:text-slate-300 hover:text-amber-500 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="الانتقال إلى شاشة السكالبينج"
          >
            <Zap className="w-4 h-4 text-emerald-500" />
            <span>السكالبينج</span>
          </button>

          {/* Quick Hop: Tracker */}
          <button
            type="button"
            onClick={() => onNavigateToTracker()}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/15 text-slate-700 dark:text-slate-300 hover:text-amber-500 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="الانتقال إلى شاشة رصد الصعود"
          >
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <span>رصد الصعود</span>
          </button>

          {/* Quick Hop: Watchlist */}
          <button
            type="button"
            onClick={onNavigateToWatchlist}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/15 text-slate-700 dark:text-slate-300 hover:text-amber-500 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="الانتقال إلى قائمة المراقبة"
          >
            <LayoutList className="w-4 h-4 text-purple-500" />
            <span>قائمة المراقبة</span>
          </button>

          {/* Theme customizer */}
          <button
            type="button"
            onClick={onOpenThemeCustomizer}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="ألوان وثيمات التطبيق"
          >
            <Palette className="w-4 h-4 text-amber-500" />
          </button>

          {/* Live Stream Toggle */}
          <button
            type="button"
            onClick={() => onToggleLiveStream(!isLiveStreamActive)}
            className={`flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
              isLiveStreamActive
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-500'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveStreamActive ? 'animate-pulse text-emerald-500' : ''}`} />
            <span>{isLiveStreamActive ? 'بث متصل' : 'البث متوقف'}</span>
          </button>
        </div>
      </div>

      {/* 2. SECTOR PRESETS & COIN DISCOVERY RIBBON */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              استكشاف قطاعات العملات ذات التذبذب العرضي:
            </span>
          </div>

          {/* Sector Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {SECTOR_PRESETS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSectorTab(sec.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  activeSectorTab === sec.id
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {sec.name}
              </button>
            ))}

            {importedCoins.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveSectorTab('imported')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  activeSectorTab === 'imported'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                مستوردة ({importedCoins.length})
              </button>
            )}
          </div>
        </div>

        {/* Quick Sector Coins Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {activeSectorTab === 'imported' ? (
            importedCoins.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => {
                  setSymbolInput(sym);
                  handleRunAnalysis(sym);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition border cursor-pointer ${
                  symbolInput === sym
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-500'
                }`}
              >
                {sym}
              </button>
            ))
          ) : (
            SECTOR_PRESETS.find((s) => s.id === activeSectorTab)?.symbols.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => {
                  setSymbolInput(sym);
                  handleRunAnalysis(sym);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition border cursor-pointer ${
                  symbolInput === sym
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-500'
                }`}
              >
                {sym}
              </button>
            ))
          )}
        </div>
      </div>

      {/* 3. ANALYSIS CONFIGURATION & PREVIEW ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        {/* Left/Middle: Analysis Config Panel */}
        <div className="lg:col-span-5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  معايير التحليل الدقيق (شموع الدقيقة 1m)
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Binance Klines API
              </span>
            </div>

            {/* Symbol & Timeframe inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  رمز العملة المراد فحصها
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={symbolInput}
                    onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleRunAnalysis()}
                    placeholder="مثال: SOL أو NEAR"
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  الفريم الزمني (بشموع الدقيقة)
                </label>
                <select
                  value={selectedTimeframeMinutes}
                  onChange={(e) => {
                    const tf = Number(e.target.value);
                    setSelectedTimeframeMinutes(tf);
                    handleRunAnalysis(symbolInput, tf);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  {RANGE_TIMEFRAME_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.minutes}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Manual Costs Input (Fees + Slippage) */}
            <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 mb-3">
              <span className="text-[10px] font-bold text-slate-500 block mb-1.5">
                إدخال التكاليف يدوياً لخصمها من هامش الربح:
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">رسوم الشراء %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={entryFeeInput}
                    onChange={(e) => {
                      setEntryFeeInput(e.target.value);
                      persistCosts(e.target.value, exitFeeInput, slippageInput);
                    }}
                    className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">رسوم البيع %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={exitFeeInput}
                    onChange={(e) => {
                      setExitFeeInput(e.target.value);
                      persistCosts(entryFeeInput, e.target.value, slippageInput);
                    }}
                    className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">انزلاق سعري %</label>
                  <input
                    type="number"
                    step="0.01"
                    value={slippageInput}
                    onChange={(e) => {
                      setSlippageInput(e.target.value);
                      persistCosts(entryFeeInput, exitFeeInput, e.target.value);
                    }}
                    className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-center"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleRunAnalysis()}
            disabled={isAnalyzing}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'جاري فحص الشموع...' : `تحليل قيعان وقمم ${symbolInput} الآن`}</span>
          </button>
        </div>

        {/* Right: Live Mathematical Analysis Result Preview */}
        <div className="lg:col-span-7 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  نتيجة التحليل الرياضي للقناة العرضية
                </span>
              </div>
              {currentAnalysis && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                  currentAnalysis.isViable
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400'
                }`}>
                  {currentAnalysis.isViable ? '✅ فرصة مجدية بعد التكاليف' : '⚠️ الهامش ضعيف بعد الرسوم'}
                </span>
              )}
            </div>

            {analysisError ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{analysisError}</span>
              </div>
            ) : currentAnalysis ? (
              <div className="space-y-3">
                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block mb-0.5">أدنى قاع مرصود</span>
                    <span className="text-sm sm:text-base font-black font-mono text-emerald-500">
                      ${trimTrailingZeros(currentAnalysis.troughPrice.toString())}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      ({currentAnalysis.troughTouchesCount} ملامسة للقاع)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block mb-0.5">أعلى قمة مرصودة</span>
                    <span className="text-sm sm:text-base font-black font-mono text-rose-500">
                      ${trimTrailingZeros(currentAnalysis.peakPrice.toString())}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      ({currentAnalysis.peakTouchesCount} ملامسة للقمة)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-[10px] text-slate-500 block mb-0.5">نطاق القناة الإجمالي</span>
                    <span className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-slate-100">
                      +{currentAnalysis.grossSpreadPercent.toFixed(2)}%
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      (رسوم: -{currentAnalysis.totalCostPercent.toFixed(2)}%)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mb-0.5">صافي الربح المتوقع</span>
                    <span className="text-sm sm:text-base font-black font-mono text-emerald-500">
                      +{currentAnalysis.netExpectedMarginPercent.toFixed(2)}%
                    </span>
                    <span className="text-[9px] text-emerald-600/70 block mt-0.5">
                      (بعد خصم كافة التكاليف)
                    </span>
                  </div>
                </div>

                {/* Analysis note & quick chart view */}
                <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-700 dark:text-slate-300 font-bold block">
                      فحص {currentAnalysis.candlesCount} شمعة دقيقة (1m) لـ {currentAnalysis.symbol}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      السعر الحالي يبعد بنسبة {currentAnalysis.distanceToTroughPercent.toFixed(2)}% عن القاع
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenChart(currentAnalysis.symbol)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:text-cyan-400 font-bold text-xs transition cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>عرض الشارت</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-500">
                جاري إعداد التحليل المالي...
              </div>
            )}
          </div>

          {currentAnalysis && (
            <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                هل يعجبك هذا المسار العرضي؟ يمكنك إضافته للبطاقات لمراقبة ارتداد القاع لحظياً:
              </span>
              <button
                type="button"
                onClick={handleAddAnalyzedToMonitoring}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ إضافة لقائمة المراقبة النشطة</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. ACTIVE RANGE CARDS GRID */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100">
              بطاقات المسار العرضي النشطة ({activeTrades.length})
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'watching_trough', label: 'انتظار القاع' },
                { id: 'in_trade', label: 'صفقات نشطة' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id as typeof activeFilter)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeFilter === tab.id
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Clear all active */}
            {activeTrades.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllActive}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                title="مسح جميع البطاقات النشطة"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {filteredActiveTrades.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
            <Layers className="w-10 h-10 mx-auto text-amber-500/40 mb-2" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
              لا توجد بطاقات مراقبة نشطة حالياً
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-3">
              اختر إحدى العملات من القطاعات أعلاه أو أدخل رمز العملة واضغط «+ إضافة لقائمة المراقبة النشطة».
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredActiveTrades.map((t) => (
              <RangeTradeCard
                key={t.id}
                trade={t}
                livePrice={livePrices[t.binanceSymbol]}
                onUpdateTrade={handleUpdateTrade}
                onDeleteTrade={handleDeleteTrade}
                onToggleActive={handleToggleActive}
                onToggleAlerts={handleToggleAlerts}
                onOpenChart={onOpenChart}
                onNavigateToCalculator={onNavigateToCalculator}
                onNavigateToTracker={onNavigateToTracker}
                onNavigateToScalper={onNavigateToScalper}
              />
            ))}
          </div>
        )}
      </div>

      {/* 5. COMPLETED TRADES LEDGER & OLD TROUGH MEMORY */}
      <RangeTradeLedger
        closedTrades={closedTrades}
        onToggleOldTroughAlert={handleToggleOldTroughAlert}
        onDeleteHistoryItem={handleDeleteTrade}
        onClearAllHistory={handleClearAllHistory}
        onReopenTradeAtTrough={handleReopenTradeAtTrough}
        onNavigateToCalculator={onNavigateToCalculator}
        onOpenChart={onOpenChart}
      />
    </div>
  );
};
