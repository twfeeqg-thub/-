'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  RangeTrackedTrade, 
  RangeAnalysisResult, 
  RANGE_TIMEFRAME_OPTIONS, 
  SECTOR_PRESETS,
  DEFAULT_RANGE_ALERT_CONFIG,
  Binance24hTickerItem,
  STORAGE_KEY_RANGE_TRADES,
  STORAGE_KEY_RANGE_COSTS,
  STORAGE_KEY_RANGE_SAVED_COINS
} from '@/types/rangeScalper';
import { analyzeRangeFromMinuteKlines, calculateRangeBreakEven, fetchBinanceUsdtTickers } from '@/lib/rangeAnalysis';
import { RangeTradeCard } from './RangeTradeCard';
import { RangeTradeLedger } from './RangeTradeLedger';
import { trimTrailingZeros } from '@/lib/calculator';
import { soundAlert, AlertToneId } from '@/lib/soundAlert';
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
  Maximize2,
  Bookmark,
  DollarSign,
  Percent,
  Compass,
  Flame,
  Globe
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
  // 1. PERSISTED TRADES STATE (Initialized identically on SSR & Client)
  const [trades, setTrades] = useState<RangeTrackedTrade[]>([]);

  const persistTrades = useCallback((newTrades: RangeTrackedTrade[]) => {
    setTrades(newTrades);
    try {
      localStorage.setItem(STORAGE_KEY_RANGE_TRADES, JSON.stringify(newTrades));
    } catch {
      // Ignore
    }
  }, []);

  // 2. SAVED / PINNED COINS STATE
  const [savedCoins, setSavedCoins] = useState<string[]>(['NEAR', 'SOL', 'PEPE', 'FET', 'SUI']);

  const persistSavedCoins = (coins: string[]) => {
    setSavedCoins(coins);
    try {
      localStorage.setItem(STORAGE_KEY_RANGE_SAVED_COINS, JSON.stringify(coins));
    } catch {}
  };

  // 3. TRADE CAPITAL & DUAL COSTS INPUTS (نسبة % ومبلغ $)
  const [tradeCapitalInput, setTradeCapitalInput] = useState<string>('100');
  const capitalNum = parseFloat(tradeCapitalInput) || 100;

  // Entry Fee
  const [entryFeePercentInput, setEntryFeePercentInput] = useState<string>(defaultEntryFeePercent);
  const [entryFeeUsdtInput, setEntryFeeUsdtInput] = useState<string>(() => {
    const pct = parseFloat(defaultEntryFeePercent) || 0.1;
    return ((100 * pct) / 100).toFixed(2);
  });

  // Exit Fee
  const [exitFeePercentInput, setExitFeePercentInput] = useState<string>(defaultExitFeePercent);
  const [exitFeeUsdtInput, setExitFeeUsdtInput] = useState<string>(() => {
    const pct = parseFloat(defaultExitFeePercent) || 0.1;
    return ((100 * pct) / 100).toFixed(2);
  });

  // Slippage
  const [slippagePercentInput, setSlippagePercentInput] = useState<string>('0.1');
  const [slippageUsdtInput, setSlippageUsdtInput] = useState<string>('0.10');

  // Load saved state from localStorage safely on client mount (prevents SSR hydration mismatch)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const savedTrades = localStorage.getItem(STORAGE_KEY_RANGE_TRADES);
        if (savedTrades) {
          const parsed = JSON.parse(savedTrades);
          if (Array.isArray(parsed)) setTrades(parsed);
        }

        const savedC = localStorage.getItem(STORAGE_KEY_RANGE_SAVED_COINS);
        if (savedC) {
          const parsed = JSON.parse(savedC);
          if (Array.isArray(parsed)) setSavedCoins(parsed);
        }

        const savedCosts = localStorage.getItem(STORAGE_KEY_RANGE_COSTS);
        if (savedCosts) {
          const parsed = JSON.parse(savedCosts);
          if (parsed.entryFee) {
            setEntryFeePercentInput(parsed.entryFee);
            setEntryFeeUsdtInput(((capitalNum * (parseFloat(parsed.entryFee) || 0.1)) / 100).toFixed(2));
          }
          if (parsed.exitFee) {
            setExitFeePercentInput(parsed.exitFee);
            setExitFeeUsdtInput(((capitalNum * (parseFloat(parsed.exitFee) || 0.1)) / 100).toFixed(2));
          }
          if (parsed.slippage) {
            setSlippagePercentInput(parsed.slippage);
            setSlippageUsdtInput(((capitalNum * (parseFloat(parsed.slippage) || 0.1)) / 100).toFixed(2));
          }
        }
      } catch {
        // Ignore
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [capitalNum]);

  // Synchronize percent to USDT
  const handleUpdateFeePercent = (type: 'entry' | 'exit' | 'slippage', percentVal: string) => {
    const pNum = parseFloat(percentVal) || 0;
    const usdtVal = ((capitalNum * pNum) / 100).toFixed(2);

    if (type === 'entry') {
      setEntryFeePercentInput(percentVal);
      setEntryFeeUsdtInput(usdtVal);
    } else if (type === 'exit') {
      setExitFeePercentInput(percentVal);
      setExitFeeUsdtInput(usdtVal);
    } else {
      setSlippagePercentInput(percentVal);
      setSlippageUsdtInput(usdtVal);
    }

    try {
      localStorage.setItem(STORAGE_KEY_RANGE_COSTS, JSON.stringify({
        entryFee: type === 'entry' ? percentVal : entryFeePercentInput,
        exitFee: type === 'exit' ? percentVal : exitFeePercentInput,
        slippage: type === 'slippage' ? percentVal : slippagePercentInput,
      }));
    } catch {}
  };

  // Synchronize USDT to percent
  const handleUpdateFeeUsdt = (type: 'entry' | 'exit' | 'slippage', usdtVal: string) => {
    const uNum = parseFloat(usdtVal) || 0;
    const pVal = capitalNum > 0 ? ((uNum / capitalNum) * 100).toFixed(2) : '0.1';

    if (type === 'entry') {
      setEntryFeeUsdtInput(usdtVal);
      setEntryFeePercentInput(pVal);
    } else if (type === 'exit') {
      setExitFeeUsdtInput(usdtVal);
      setExitFeePercentInput(pVal);
    } else {
      setSlippageUsdtInput(usdtVal);
      setSlippagePercentInput(pVal);
    }

    try {
      localStorage.setItem(STORAGE_KEY_RANGE_COSTS, JSON.stringify({
        entryFee: type === 'entry' ? pVal : entryFeePercentInput,
        exitFee: type === 'exit' ? pVal : exitFeePercentInput,
        slippage: type === 'slippage' ? pVal : slippagePercentInput,
      }));
    } catch {}
  };

  // 4. COIN DISCOVERY & BINANCE SPOT TICKERS
  const [binanceTickers, setBinanceTickers] = useState<Binance24hTickerItem[]>([]);
  const [isLoadingTickers, setIsLoadingTickers] = useState<boolean>(false);
  const [activeSectorTab, setActiveSectorTab] = useState<string>('ai');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Fetch Binance all-pairs on mount
  useEffect(() => {
    let isMounted = true;
    const loadTickers = async () => {
      setIsLoadingTickers(true);
      try {
        const pairs = await fetchBinanceUsdtTickers();
        if (isMounted && pairs.length > 0) {
          setBinanceTickers(pairs);
        }
      } catch {
        // Fallback or ignore
      } finally {
        if (isMounted) setIsLoadingTickers(false);
      }
    };
    loadTickers();
    return () => {
      isMounted = false;
    };
  }, []);

  // 5. ANALYSIS CONTROLS
  const [selectedTimeframeMinutes, setSelectedTimeframeMinutes] = useState<number>(60);
  const [symbolInput, setSymbolInput] = useState<string>('NEAR');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [currentAnalysis, setCurrentAnalysis] = useState<RangeAnalysisResult | null>(null);

  // Active filter tab
  const [activeFilter, setActiveFilter] = useState<'all' | 'watching_trough' | 'in_trade'>('all');

  // Trigger automated 1m klines analysis with dual metrics
  const handleRunAnalysis = useCallback(async (targetSymbol?: string, targetMinutes?: number) => {
    const sym = (targetSymbol || symbolInput).trim().toUpperCase();
    if (!sym) return;

    const tf = targetMinutes !== undefined ? targetMinutes : selectedTimeframeMinutes;
    setIsAnalyzing(true);
    setAnalysisError(null);

    const entryF = parseFloat(entryFeePercentInput) || 0.1;
    const exitF = parseFloat(exitFeePercentInput) || 0.1;
    const slip = parseFloat(slippagePercentInput) || 0.1;
    const cap = parseFloat(tradeCapitalInput) || 100;

    try {
      const result = await analyzeRangeFromMinuteKlines(
        sym,
        tf,
        entryF,
        exitF,
        slip,
        cap
      );
      setCurrentAnalysis(result);
      setSymbolInput(result.symbol);

      // Save to recently searched / saved coins
      if (!savedCoins.includes(result.symbol)) {
        persistSavedCoins([result.symbol, ...savedCoins].slice(0, 20));
      }
    } catch (err: any) {
      setAnalysisError(err.message || 'فشل جلب بيانات الشموع من بينانس');
    } finally {
      setIsAnalyzing(false);
    }
  }, [symbolInput, selectedTimeframeMinutes, entryFeePercentInput, exitFeePercentInput, slippagePercentInput, tradeCapitalInput, savedCoins]);

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

    const existingIndex = trades.findIndex(
      (t) => t.binanceSymbol === currentAnalysis.binanceSymbol && t.status !== 'closed'
    );

    const tradeCap = currentAnalysis.tradeCapitalUsdt || 100;

    if (existingIndex >= 0) {
      const next = [...trades];
      next[existingIndex] = {
        ...next[existingIndex],
        timeframeMinutes: currentAnalysis.timeframeMinutes,
        troughPrice: currentAnalysis.troughPrice,
        peakPrice: currentAnalysis.peakPrice,
        breakEvenPrice: currentAnalysis.breakEvenPrice,
        tradeCapitalUsdt: tradeCap,
        grossSpreadPercent: currentAnalysis.grossSpreadPercent,
        grossSpreadUsdt: currentAnalysis.grossSpreadUsdt,
        netMarginPercent: currentAnalysis.netExpectedMarginPercent,
        netMarginUsdt: currentAnalysis.netExpectedMarginUsdt,
        entryFeePercent: currentAnalysis.entryFeePercent,
        entryFeeUsdt: currentAnalysis.entryFeeUsdt,
        exitFeePercent: currentAnalysis.exitFeePercent,
        exitFeeUsdt: currentAnalysis.exitFeeUsdt,
        slippagePercent: currentAnalysis.slippagePercent,
        slippageUsdt: currentAnalysis.slippageUsdt,
        totalCostPercent: currentAnalysis.totalCostPercent,
        totalCostUsdt: currentAnalysis.totalCostUsdt,
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
      alertConfig: { ...DEFAULT_RANGE_ALERT_CONFIG, enabled: false },
      notifyOnOldTroughReturn: false,
      tradeCapitalUsdt: tradeCap,
      troughPrice: currentAnalysis.troughPrice,
      peakPrice: currentAnalysis.peakPrice,
      breakEvenPrice: currentAnalysis.breakEvenPrice,
      grossSpreadPercent: currentAnalysis.grossSpreadPercent,
      grossSpreadUsdt: currentAnalysis.grossSpreadUsdt,
      entryFeePercent: currentAnalysis.entryFeePercent,
      entryFeeUsdt: currentAnalysis.entryFeeUsdt,
      exitFeePercent: currentAnalysis.exitFeePercent,
      exitFeeUsdt: currentAnalysis.exitFeeUsdt,
      slippagePercent: currentAnalysis.slippagePercent,
      slippageUsdt: currentAnalysis.slippageUsdt,
      totalCostPercent: currentAnalysis.totalCostPercent,
      totalCostUsdt: currentAnalysis.totalCostUsdt,
      netMarginPercent: currentAnalysis.netExpectedMarginPercent,
      netMarginUsdt: currentAnalysis.netExpectedMarginUsdt,
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

  const handleToggleTradeActive = (id: string) => {
    const next = trades.map((t) => (t.id === id ? { ...t, isActive: t.isActive === false } : t));
    persistTrades(next);
  };

  const handleToggleTradeAlerts = (id: string) => {
    const next = trades.map((t) => {
      if (t.id === id) {
        const nextEnabled = !t.alertsEnabled;
        return { 
          ...t, 
          alertsEnabled: nextEnabled,
          alertConfig: { ...(t.alertConfig || DEFAULT_RANGE_ALERT_CONFIG), enabled: nextEnabled }
        };
      }
      return t;
    });
    persistTrades(next);
  };

  const handleClearAllActive = () => {
    const next = trades.filter((t) => t.status === 'closed');
    persistTrades(next);
  };

  // Ledger history handlers
  const handleToggleOldTroughAlert = (id: string) => {
    const next = trades.map((t) =>
      t.id === id ? { ...t, notifyOnOldTroughReturn: !t.notifyOnOldTroughReturn } : t
    );
    persistTrades(next);
  };

  const handleDeleteHistoryItem = (id: string) => {
    const next = trades.filter((t) => t.id !== id);
    persistTrades(next);
  };

  const handleClearAllHistory = () => {
    const next = trades.filter((t) => t.status !== 'closed');
    persistTrades(next);
  };

  const handleReopenTradeAtTrough = (oldTrade: RangeTrackedTrade) => {
    const reopened: RangeTrackedTrade = {
      ...oldTrade,
      id: `range_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'watching_trough',
      createdAt: Date.now(),
      entryPrice: undefined,
      allocatedUsdt: undefined,
      coinQuantity: undefined,
      entryTimestamp: undefined,
      exitPrice: undefined,
      exitTimestamp: undefined,
      realizedGrossPnlUsdt: undefined,
      realizedNetPnlUsdt: undefined,
      realizedPnlPercent: undefined,
      holdingDurationMinutes: undefined,
    };
    const next = [reopened, ...trades];
    persistTrades(next);
  };

  // -------------------------------------------------------------
  // REAL-TIME SMART NOTIFICATION ENGINE (شروط التنبيه المتعددة)
  // -------------------------------------------------------------
  const lastAlertTimesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const now = Date.now();

    trades.forEach((trade) => {
      if (trade.isActive === false) return;
      const livePStr = livePrices[trade.binanceSymbol];
      if (!livePStr) return;
      const liveP = parseFloat(livePStr);
      if (isNaN(liveP) || liveP <= 0) return;

      const cfg = trade.alertConfig || DEFAULT_RANGE_ALERT_CONFIG;
      const isAlertActive = trade.alertsEnabled && cfg.enabled;

      // Helper to check repeat interval
      const canFire = (conditionKey: string): boolean => {
        const fullKey = `${trade.id}_${conditionKey}`;
        const lastTime = lastAlertTimesRef.current.get(fullKey) || 0;
        if (cfg.repeatMode === 'once') {
          return lastTime === 0;
        }
        const intervalMs = (cfg.repeatIntervalMinutes || 5) * 60 * 1000;
        return now - lastTime >= intervalMs;
      };

      const recordFired = (conditionKey: string) => {
        const fullKey = `${trade.id}_${conditionKey}`;
        lastAlertTimesRef.current.set(fullKey, now);
        soundAlert.playTone((cfg.toneId as AlertToneId) || 'celebration');
      };

      // 1. WATCHING TROUGH ALERTS
      if (trade.status === 'watching_trough' && isAlertActive) {
        // A. At Trough (عند القاع بدقة)
        if (cfg.triggerAtTrough && trade.troughPrice > 0) {
          const atTrough = liveP <= trade.troughPrice || ((liveP - trade.troughPrice) / trade.troughPrice) <= 0.002;
          if (atTrough && canFire('at_trough')) {
            recordFired('at_trough');
            systemNotification.sendNotification({
              title: `🎯 وصل السعر للقاع: ${trade.name}!`,
              body: `وصل سعر ${trade.name} بدقة لمنطقة القاع ($${liveP}). صافي الربح المتوقع للصعود: +$${trade.netMarginUsdt?.toFixed(2) || '—'} (+${trade.netMarginPercent.toFixed(2)}%). سعر التعادل: $${trade.breakEvenPrice.toFixed(4)}.`,
              tag: `trough-${trade.id}`,
              icon: '/pwa-192x192.png',
              badge: '/icon.svg',
            });
          }
        }

        // B. Near Trough (عند الاقتراب من القاع)
        if (cfg.triggerNearTrough && trade.troughPrice > 0) {
          const distPct = ((liveP - trade.troughPrice) / trade.troughPrice) * 100;
          if (distPct > 0 && distPct <= (cfg.nearTroughPercent || 0.5) && canFire('near_trough')) {
            recordFired('near_trough');
            systemNotification.sendNotification({
              title: `⏳ اقترب السعر من القاع: ${trade.name}!`,
              body: `السعر الآن ($${liveP}) على بعد ${distPct.toFixed(2)}% فقط من قاع الشراء ($${trade.troughPrice}). تأهب للشراء!`,
              tag: `near-trough-${trade.id}`,
              icon: '/pwa-192x192.png',
              badge: '/icon.svg',
            });
          }
        }

        // C. Bounce Confirmation (تأكيد الارتداد صعوداً من القاع)
        if (cfg.triggerBounceConfirmation && trade.troughPrice > 0) {
          const bouncePct = ((liveP - trade.troughPrice) / trade.troughPrice) * 100;
          if (bouncePct >= (cfg.bounceConfirmationPercent || 0.4) && bouncePct <= ((cfg.bounceConfirmationPercent || 0.4) + 0.5) && canFire('bounce')) {
            recordFired('bounce');
            systemNotification.sendNotification({
              title: `⚡ تأكد الارتداد صعوداً: ${trade.name}!`,
              body: `ارتد سعر ${trade.name} بنسبة +${bouncePct.toFixed(2)}% فوق القاع ($${trade.troughPrice}). إشارة دخول صاعدة قوية!`,
              tag: `bounce-${trade.id}`,
              icon: '/pwa-192x192.png',
              badge: '/icon.svg',
            });
          }
        }
      }

      // 2. IN-TRADE ALERTS (أثناء الصفقة)
      if (trade.status === 'in_trade' && isAlertActive) {
        // A. At Peak (عند القمة بدقة)
        if (cfg.triggerAtPeak && trade.peakPrice > 0) {
          if (liveP >= trade.peakPrice && canFire('at_peak')) {
            recordFired('at_peak');
            systemNotification.sendNotification({
              title: `🚀 وصل السعر للقمة المستهدفة: ${trade.name}!`,
              body: `حقق سعر ${trade.name} هدف القمة ($${liveP}). حان وقت جني الأرباح والخروج!`,
              tag: `peak-${trade.id}`,
              icon: '/pwa-192x192.png',
              badge: '/icon.svg',
            });
          }
        }

        // B. Near Peak (عند الاقتراب من القمة)
        if (cfg.triggerNearPeak && trade.peakPrice > 0) {
          const distPct = ((trade.peakPrice - liveP) / trade.peakPrice) * 100;
          if (distPct > 0 && distPct <= (cfg.nearPeakPercent || 0.5) && canFire('near_peak')) {
            recordFired('near_peak');
            systemNotification.sendNotification({
              title: `✨ اقترب السعر من القمة: ${trade.name}!`,
              body: `السعر الآن ($${liveP}) على بعد ${distPct.toFixed(2)}% فقط من قمة البيع ($${trade.peakPrice}). استعد لجني الأرباح.`,
              tag: `near-peak-${trade.id}`,
              icon: '/pwa-192x192.png',
              badge: '/icon.svg',
            });
          }
        }
      }

      // 3. CUSTOM PRICE ALERT (سعر مخصص يحدده المستخدم)
      if (isAlertActive && cfg.triggerCustomPrice && cfg.customPrice && cfg.customPrice > 0) {
        const diffRatio = Math.abs(liveP - cfg.customPrice) / cfg.customPrice;
        if (diffRatio <= 0.002 && canFire('custom_price')) {
          recordFired('custom_price');
          systemNotification.sendNotification({
            title: `🔔 وصل السعر المخصص: ${trade.name}!`,
            body: `وصل سعر ${trade.name} إلى السعر المخصص الذي حددته يدويًا ($${cfg.customPrice}).`,
            tag: `custom-${trade.id}`,
            icon: '/pwa-192x192.png',
            badge: '/icon.svg',
          });
        }
      }

      // 4. OLD TROUGH RETURN ALERT (للصفقات المنتهية)
      if (trade.status === 'closed' && trade.notifyOnOldTroughReturn && trade.troughPrice > 0) {
        const distRatio = Math.abs(liveP - trade.troughPrice) / trade.troughPrice;
        if (distRatio <= 0.003 && canFire('old_trough')) {
          recordFired('old_trough');
          systemNotification.sendNotification({
            title: `🔄 عودة لنفس القاع القديم: ${trade.name}!`,
            body: `عاد سعر ${trade.name} لملامسة القاع القديم ($${trade.troughPrice}) الذي حققت منه ربحاً سابقاً! فرصة ممتازة لتكرار الصفقة.`,
            tag: `old-trough-${trade.id}`,
            icon: '/pwa-192x192.png',
            badge: '/icon.svg',
          });
        }
      }
    });
  }, [trades, livePrices]);

  // Active trades and closed trades
  const activeTrades = useMemo(() => {
    return trades.filter((t) => t.status !== 'closed');
  }, [trades]);

  const closedTrades = useMemo(() => {
    return trades.filter((t) => t.status === 'closed');
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

  // Filtered coins based on sector tabs and search input
  const displayedCoinList = useMemo(() => {
    const q = searchFilter.trim().toUpperCase();

    // 1. Tab: All Binance Pairs
    if (activeSectorTab === 'all_binance') {
      if (!q) return binanceTickers.slice(0, 30).map((t) => t.baseAsset);
      return binanceTickers
        .filter((t) => t.baseAsset.includes(q))
        .slice(0, 40)
        .map((t) => t.baseAsset);
    }

    // 2. Tab: Saved Coins
    if (activeSectorTab === 'saved') {
      if (!q) return savedCoins;
      return savedCoins.filter((s) => s.includes(q));
    }

    // 3. Tab: Watchlist import
    if (activeSectorTab === 'watchlist') {
      const symbols = watchlistSymbols.map((s) => s.replace('USDT', ''));
      if (!q) return symbols;
      return symbols.filter((s) => s.includes(q));
    }

    // 4. Tab: Tracker import
    if (activeSectorTab === 'tracker') {
      const symbols = trackerSymbols.map((s) => s.replace('USDT', ''));
      if (!q) return symbols;
      return symbols.filter((s) => s.includes(q));
    }

    // 5. Standard Sector Presets
    const preset = SECTOR_PRESETS.find((p) => p.id === activeSectorTab);
    const baseList = preset ? preset.symbols : [];
    if (!q) return baseList;
    return baseList.filter((s) => s.includes(q));
  }, [activeSectorTab, searchFilter, binanceTickers, savedCoins, watchlistSymbols, trackerSymbols]);

  return (
    <div className="w-full max-w-7xl flex flex-col space-y-5 animate-fade-in" dir="rtl">
      {/* 1. TOP HEADER & SCREEN IDENTITY */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/25">
            <Layers className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100">
                صائد القيعان والمسار العرضي (Range Master)
              </h1>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-400/15 text-amber-600 dark:text-amber-400 border border-amber-400/30">
                1m شموع الدقيقة
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              رصد آلي للمسارات العرضية • حساب سعر التعادل • إدخال التكاليف (% و $) • تنبيهات ذكية متعددة الحالات
            </p>
          </div>
        </div>

        {/* Live WebSocket status and quick hops */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Binance Stream Toggle */}
          <button
            type="button"
            onClick={() => onToggleLiveStream(!isLiveStreamActive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              isLiveStreamActive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
            }`}
            title="حالة بث أسعار بينانس المباشرة"
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveStreamActive ? 'animate-pulse text-emerald-500' : ''}`} />
            <span>{isLiveStreamActive ? 'البث الموحد نشط' : 'البث متوقف'}</span>
          </button>

          {/* Quick Hops to Other Screens */}
          <button
            type="button"
            onClick={() => onNavigateToScalper()}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">السكالبينج</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTracker()}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-500" />
            <span className="hidden sm:inline">رصد الصعود</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToWatchlist}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            <LayoutList className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">المراقبة</span>
          </button>
        </div>
      </div>

      {/* 2. COIN DISCOVERY & SEARCH BAR (بحث شامل في كل أزواج بينانس والقطاعات) */}
      <div className="p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
              استكشاف العملات والقطاعات (جميع أزواج بينانس USDT)
            </h2>
            {isLoadingTickers && (
              <span className="text-[10px] text-amber-500 animate-pulse font-mono">
                جاري تحديث القائمة...
              </span>
            )}
          </div>

          {/* Quick Search within the sector/all coins */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث عن أي عملة (مثال: PEPE, SUI, SOL)..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pr-8 pl-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Sector Tabs Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
          {/* Tab: All Binance */}
          <button
            type="button"
            onClick={() => setActiveSectorTab('all_binance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSectorTab === 'all_binance'
                ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>جميع عملات بينانس ({binanceTickers.length || '300+'})</span>
          </button>

          {/* Sector Presets */}
          {SECTOR_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setActiveSectorTab(preset.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeSectorTab === preset.id
                  ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{preset.name}</span>
            </button>
          ))}

          {/* Tab: Saved Coins */}
          <button
            type="button"
            onClick={() => setActiveSectorTab('saved')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              activeSectorTab === 'saved'
                ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>المحفوظة ({savedCoins.length})</span>
          </button>

          {/* Tab: Watchlist import */}
          {watchlistSymbols.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveSectorTab('watchlist')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeSectorTab === 'watchlist'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>قائمة المراقبة ({watchlistSymbols.length})</span>
            </button>
          )}

          {/* Tab: Tracker import */}
          {trackerSymbols.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveSectorTab('tracker')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                activeSectorTab === 'tracker'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>رصد الصعود ({trackerSymbols.length})</span>
            </button>
          )}
        </div>

        {/* Coin Chips Grid */}
        <div className="flex flex-wrap items-center gap-1.5 max-h-36 overflow-y-auto pr-1">
          {displayedCoinList.length === 0 ? (
            <div className="text-xs text-slate-500 py-3">
              لا توجد عملات تطابق البحث. يمكنك كتابة أي رمز أعلاه لتحليله فوراً.
            </div>
          ) : (
            displayedCoinList.map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => {
                  setSymbolInput(sym);
                  handleRunAnalysis(sym);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition border cursor-pointer ${
                  symbolInput === sym
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-500'
                }`}
              >
                {sym}
              </button>
            ))
          )}
        </div>
      </div>

      {/* 3. ANALYSIS CONFIGURATION & DUAL COSTS INPUTS ($ and %) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
        {/* Left: Input Parameters Panel */}
        <div className="lg:col-span-5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  إعدادات التحليل والتكاليف (نسبة % ومبلغ $)
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                1m Klines API
              </span>
            </div>

            {/* Symbol & Timeframe inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  رمز العملة (يمكن كتابة أي عملة)
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

            {/* Trade Capital Input ($ USDT) */}
            <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 mb-3 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                  رأس المال المقترح للصفقة ($ USDT)
                </span>
                <span className="text-[10px] text-slate-500">
                  تُحسب المبالغ النقدية لجميع التكاليف والأرباح بناءً عليه
                </span>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={tradeCapitalInput}
                  onChange={(e) => setTradeCapitalInput(e.target.value)}
                  className="w-20 px-2 py-1 text-xs font-mono font-bold text-center rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                />
                <span className="text-xs font-bold text-slate-500">$</span>
              </div>
            </div>

            {/* Dual Costs Inputs (Both % and $ Fields) */}
            <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 mb-3">
              <span className="text-[10px] font-bold text-slate-500 block mb-2">
                إدخال التكاليف يدوياً (حقل للنسبة % وحقل للمبلغ $ متزامنان):
              </span>

              <div className="space-y-2">
                {/* Entry Fee Row */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">رسوم الشراء:</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        value={entryFeePercentInput}
                        onChange={(e) => handleUpdateFeePercent('entry', e.target.value)}
                        className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold text-center rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                      />
                      <span className="text-[10px] font-bold text-slate-500">%</span>
                    </div>
                    <span className="text-slate-400">=</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        value={entryFeeUsdtInput}
                        onChange={(e) => handleUpdateFeeUsdt('entry', e.target.value)}
                        className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold text-center rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                      />
                      <span className="text-[10px] font-bold text-slate-500">$</span>
                    </div>
                  </div>
                </div>

                {/* Exit Fee Row */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">رسوم البيع:</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        value={exitFeePercentInput}
                        onChange={(e) => handleUpdateFeePercent('exit', e.target.value)}
                        className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold text-center rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                      />
                      <span className="text-[10px] font-bold text-slate-500">%</span>
                    </div>
                    <span className="text-slate-400">=</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        value={exitFeeUsdtInput}
                        onChange={(e) => handleUpdateFeeUsdt('exit', e.target.value)}
                        className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold text-center rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                      />
                      <span className="text-[10px] font-bold text-slate-500">$</span>
                    </div>
                  </div>
                </div>

                {/* Slippage Row */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">الانزلاق السعري:</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        value={slippagePercentInput}
                        onChange={(e) => handleUpdateFeePercent('slippage', e.target.value)}
                        className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold text-center rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                      />
                      <span className="text-[10px] font-bold text-slate-500">%</span>
                    </div>
                    <span className="text-slate-400">=</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.01"
                        value={slippageUsdtInput}
                        onChange={(e) => handleUpdateFeeUsdt('slippage', e.target.value)}
                        className="w-16 px-1.5 py-0.5 text-xs font-mono font-bold text-center rounded-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700"
                      />
                      <span className="text-[10px] font-bold text-slate-500">$</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {analysisError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-1.5 mb-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{analysisError}</span>
              </div>
            )}
          </div>

          {/* Trigger Analysis Button */}
          <button
            type="button"
            onClick={() => handleRunAnalysis()}
            disabled={isAnalyzing}
            className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md shadow-cyan-500/20 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'جاري فحص شموع الدقيقة...' : 'فحص القناة العرضية وحساب الأرباح'}</span>
          </button>
        </div>

        {/* Right: Live Mathematical Analysis Result Preview (مع سعر التعادل والقيم المزدوجة) */}
        <div className="lg:col-span-7 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  نتيجة التحليل الرياضي وسعر التعادل
                </span>
              </div>
              {currentAnalysis && (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                  currentAnalysis.isViable
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-500'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-500'
                }`}>
                  {currentAnalysis.isViable ? '✅ صفقة مجدية اقتصادياً' : '⚠️ الهامش لا يغطي التكاليف'}
                </span>
              )}
            </div>

            {currentAnalysis ? (
              <div className="space-y-3">
                {/* Four Metrics: Trough, Peak, Break-Even, Net Margin */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/50">
                    <span className="text-[10px] text-slate-400 block mb-0.5">القاع المرصود (شراء)</span>
                    <span className="text-xs sm:text-sm font-black font-mono text-emerald-500">
                      ${currentAnalysis.troughPrice}
                    </span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">
                      (تكرار اللمس: {currentAnalysis.troughTouchesCount} مرات)
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/50">
                    <span className="text-[10px] text-slate-400 block mb-0.5">القمة المرصودة (بيع)</span>
                    <span className="text-xs sm:text-sm font-black font-mono text-cyan-400">
                      ${currentAnalysis.peakPrice}
                    </span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">
                      (تكرار اللمس: {currentAnalysis.peakTouchesCount} مرات)
                    </span>
                  </div>

                  {/* Break-Even Price Highlight (الملاحظة 3) */}
                  <div className="p-2.5 rounded-xl bg-amber-400/15 border border-amber-400/40">
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-bold block mb-0.5">سعر التعادل (Break-Even)</span>
                    <span className="text-xs sm:text-sm font-black font-mono text-amber-600 dark:text-amber-300">
                      ${currentAnalysis.breakEvenPrice.toFixed(4)}
                    </span>
                    <span className="text-[9px] text-amber-600/80 block mt-0.5">
                      (بعد كافة التكاليف: -${currentAnalysis.totalCostUsdt.toFixed(2)})
                    </span>
                  </div>

                  {/* Net Margin (الملاحظة 4: مبلغ ونسبة) */}
                  <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mb-0.5">صافي الربح المتوقع</span>
                    <span className="text-xs sm:text-sm font-black font-mono text-emerald-500">
                      +${currentAnalysis.netExpectedMarginUsdt.toFixed(2)} USDT
                    </span>
                    <span className="text-[9px] text-emerald-600/80 block mt-0.5 font-bold">
                      +{currentAnalysis.netExpectedMarginPercent.toFixed(2)}% صافي
                    </span>
                  </div>
                </div>

                {/* Extended Details Banner: Total Spread & Costs */}
                <div className="p-3 rounded-2xl bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-slate-700 dark:text-slate-300 font-bold block">
                      فحص {currentAnalysis.candlesCount} شمعة دقيقة (1m) لـ {currentAnalysis.symbol}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      فارق القناة الخام: +${currentAnalysis.grossSpreadUsdt.toFixed(2)} (+{currentAnalysis.grossSpreadPercent.toFixed(2)}%) • إجمالي التكاليف: -${currentAnalysis.totalCostUsdt.toFixed(2)} (-{currentAnalysis.totalCostPercent.toFixed(2)}%)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenChart(currentAnalysis.binanceSymbol)}
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
                هل يعجبك هذا المسار العرضي؟ يمكنك إضافته للبطاقات لمراقبة ارتداد القاع وتفعيل التنبيهات:
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
            <Layers className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              لا توجد بطاقات مسار عرضي نشطة
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              اختر أي عملة من القائمة بالأعلى أو اكتب رمز أي عملة أخرى واضغط على «إضافة لقائمة المراقبة النشطة» لمتابعة سعر التعادل والتنبيهات اللحظية.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredActiveTrades.map((trade) => (
              <RangeTradeCard
                key={trade.id}
                trade={trade}
                livePrice={livePrices[trade.binanceSymbol]}
                onUpdateTrade={handleUpdateTrade}
                onDeleteTrade={handleDeleteTrade}
                onToggleActive={handleToggleTradeActive}
                onToggleAlerts={handleToggleTradeAlerts}
                onOpenChart={onOpenChart}
                onNavigateToCalculator={onNavigateToCalculator}
                onNavigateToTracker={onNavigateToTracker}
                onNavigateToScalper={onNavigateToScalper}
              />
            ))}
          </div>
        )}
      </div>

      {/* 5. CLOSED TRADES LEDGER (سجل الصفقات المنتهية والأرباح المحققة وتنبيه القاع القديم) */}
      <RangeTradeLedger
        closedTrades={closedTrades}
        onToggleOldTroughAlert={handleToggleOldTroughAlert}
        onDeleteHistoryItem={handleDeleteHistoryItem}
        onClearAllHistory={handleClearAllHistory}
        onReopenTradeAtTrough={handleReopenTradeAtTrough}
        onNavigateToCalculator={onNavigateToCalculator}
        onOpenChart={onOpenChart}
      />
    </div>
  );
};
