'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  calculateAll, 
  TrackInputs, 
  FullCalculationResult,
  trimTrailingZeros
} from '@/lib/calculator';
import { 
  CurrencyItem, 
  MAX_CURRENCIES, 
  MAX_TEST_PRICES,
  STORAGE_KEY_CURRENCIES, 
  STORAGE_KEY_DEFAULTS 
} from '@/types/currency';
import { 
  TrackedCurrency, 
  PriceSnapshot, 
  STORAGE_KEY_TRACKER, 
  STORAGE_KEY_TRACKER_STREAM 
} from '@/types/tracker';
import { 
  ScalpTrade, 
  ScalperSessionStats, 
  STORAGE_KEY_SCALPER_TRADES, 
  STORAGE_KEY_SCALPER_SESSION 
} from '@/types/scalper';
import { CurrencyDashboard } from '@/components/CurrencyDashboard';
import { FloatingContainer } from '@/components/FloatingContainer';
import { TradeDataSection } from '@/components/TradeDataSection';
import { BreakEvenSection } from '@/components/BreakEvenSection';
import { TestPricesSection } from '@/components/TestPricesSection';
import { ProfitLossChart } from '@/components/ProfitLossChart';
import { LiveMonitoringSection } from '@/components/LiveMonitoringSection';
import { SettingsModal, DefaultFeeSettings } from '@/components/SettingsModal';
import { WorkspaceBackground } from '@/components/WorkspaceBackground';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { WindowMode } from '@/components/WindowHeader';
import { TrackerDashboard } from '@/components/TrackerDashboard';
import { TrackerDetailView } from '@/components/TrackerDetailView';
import { ScalperDashboard } from '@/components/ScalperDashboard';
import { ThemeCustomizerModal } from '@/components/ThemeCustomizerModal';
import { BreakEvenComparisonDrawer } from '@/components/BreakEvenComparisonDrawer';
import { WatchlistDashboard } from '@/components/WatchlistDashboard';
import { RangeScalperDashboard } from '@/components/RangeScalperDashboard';
import { MarketSessionsTopBar } from '@/components/MarketSessionsTopBar';
import { TradingViewChartModal } from '@/components/TradingViewChartModal';
import { 
  WatchlistItem, 
  WatchlistCategory, 
  WatchlistFlagColor, 
  STORAGE_KEY_WATCHLIST, 
  DEFAULT_WATCHLIST_ITEMS 
} from '@/types/watchlist';
import { systemNotification } from '@/lib/systemNotification';
import { canTriggerAlert, recordAlertTriggered } from '@/lib/alertSettings';
import { Calculator, TrendingUp, Palette, Zap, Columns3, Settings, Radio, LayoutList, Layers } from 'lucide-react';

export default function CalculatorPage() {
  // Navigation Tabs: 'calculator' | 'tracker' | 'scalper' | 'watchlist' | 'range_master'
  const [activeMainTab, setActiveMainTab] = useState<'calculator' | 'tracker' | 'scalper' | 'watchlist' | 'range_master'>('range_master');
  const [rangeStreamSymbols, setRangeStreamSymbols] = useState<string[]>([]);

  const handleRegisterRangeSymbols = useCallback((symbols: string[]) => {
    setRangeStreamSymbols((prev) => {
      if (prev.length === symbols.length && prev.every((s, i) => s === symbols[i])) {
        return prev;
      }
      return symbols;
    });
  }, []);

  // Window State for Calculator
  const [windowMode, setWindowMode] = useState<WindowMode>('normal');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isThemeCustomizerOpen, setIsThemeCustomizerOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [isCalculatorReadOnly, setIsCalculatorReadOnly] = useState(false);

  // Default fee settings from localStorage
  const [defaultFees, setDefaultFees] = useState<DefaultFeeSettings>({
    entryFeePercent: '',
    exitFeePercent: '',
    entryFeeFixed: '',
    exitFeeFixed: '',
    feeMethod: 'cumulative',
  });

  // Currencies list (max 25)
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  // Currently active currency ID (null = showing Currency Dashboard)
  const [activeCurrencyId, setActiveCurrencyId] = useState<string | null>(null);

  // Tracked Currencies list for Feature #2
  const [trackedCurrencies, setTrackedCurrencies] = useState<TrackedCurrency[]>([]);
  const [activeTrackedId, setActiveTrackedId] = useState<string | null>(null);
  const [isTrackerStreamActive, setIsTrackerStreamActive] = useState<boolean>(true);
  const [trackerLivePrices, setTrackerLivePrices] = useState<Record<string, string>>({});
  const trackerWsRef = useRef<WebSocket | null>(null);

  // Scalper Feature State
  const [scalpTrades, setScalpTrades] = useState<ScalpTrade[]>([]);
  const [scalperSession, setScalperSession] = useState<ScalperSessionStats>({
    availableCapitalUsdt: '1000',
    initialCapitalUsdt: '1000',
    completedScalps: 0,
    winningScalps: 0,
    totalRealizedPnlUsdt: 0,
    totalRealizedVolumeUsdt: 0,
    avgDurationMinutes: 0,
  });

  // Watchlist Feature State (Screen #4 TradingView style)
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);

  // Active TradingView Chart Modal State
  const [activeChartItem, setActiveChartItem] = useState<{
    symbol: string;
    currencyName: string;
    description?: string;
    entryPrice?: string;
    breakEvenPrice?: string;
    coinQuantity?: string;
    tradeAmount?: string;
    testPrices?: string[];
    testPriceTimestamps?: number[];
  } | null>(null);

  // Load saved default fees, currencies, tracked currencies, and scalper trades
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        // Load default fees
        const savedDefaults = localStorage.getItem(STORAGE_KEY_DEFAULTS);
        if (savedDefaults) {
          setDefaultFees(JSON.parse(savedDefaults));
        }

        // Load currencies
        const savedCurrencies = localStorage.getItem(STORAGE_KEY_CURRENCIES);
        if (savedCurrencies) {
          const parsed: CurrencyItem[] = JSON.parse(savedCurrencies);
          if (Array.isArray(parsed)) {
            setCurrencies(parsed.slice(0, MAX_CURRENCIES));
          }
        }

        // Load tracked currencies
        const savedTracker = localStorage.getItem(STORAGE_KEY_TRACKER);
        if (savedTracker) {
          const parsed: TrackedCurrency[] = JSON.parse(savedTracker);
          if (Array.isArray(parsed)) {
            setTrackedCurrencies(parsed);
          }
        }

        // Load scalper trades (فارغة تماماً افتراضياً وبدون أي صفقات أولية مسبقة)
        const savedScalper = localStorage.getItem(STORAGE_KEY_SCALPER_TRADES);
        if (savedScalper) {
          try {
            const parsed: ScalpTrade[] = JSON.parse(savedScalper);
            if (Array.isArray(parsed)) {
              // مسح أي صفقات تجريبية قديمة بدأت بـ scalp_init_
              const userAddedTrades = parsed.filter((t) => !t.id.startsWith('scalp_init_'));
              setScalpTrades(userAddedTrades);
              localStorage.setItem(STORAGE_KEY_SCALPER_TRADES, JSON.stringify(userAddedTrades));
            } else {
              setScalpTrades([]);
            }
          } catch {
            setScalpTrades([]);
          }
        } else {
          setScalpTrades([]);
        }

        // Load scalper session stats
        const savedSession = localStorage.getItem(STORAGE_KEY_SCALPER_SESSION);
        if (savedSession) {
          setScalperSession(JSON.parse(savedSession));
        }

        // Load Watchlist Items (Screen #4 TradingView style)
        const savedWatchlist = localStorage.getItem(STORAGE_KEY_WATCHLIST);
        if (savedWatchlist) {
          const parsed: WatchlistItem[] = JSON.parse(savedWatchlist);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setWatchlistItems(parsed);
          } else {
            setWatchlistItems(DEFAULT_WATCHLIST_ITEMS);
            localStorage.setItem(STORAGE_KEY_WATCHLIST, JSON.stringify(DEFAULT_WATCHLIST_ITEMS));
          }
        } else {
          setWatchlistItems(DEFAULT_WATCHLIST_ITEMS);
          localStorage.setItem(STORAGE_KEY_WATCHLIST, JSON.stringify(DEFAULT_WATCHLIST_ITEMS));
        }

        const savedStreamState = localStorage.getItem(STORAGE_KEY_TRACKER_STREAM);
        if (savedStreamState !== null) {
          setIsTrackerStreamActive(savedStreamState === 'true');
        }
      } catch {
        // Ignore storage errors in restricted contexts
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Helper to persist currencies
  const persistCurrencies = useCallback((items: CurrencyItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENCIES, JSON.stringify(items));
    } catch {
      // Ignore
    }
  }, []);

  // Helper to persist tracked currencies
  const persistTrackedCurrencies = useCallback((items: TrackedCurrency[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_TRACKER, JSON.stringify(items));
    } catch {
      // Ignore
    }
  }, []);

  // Helper to persist scalper trades
  const persistScalpTrades = useCallback((items: ScalpTrade[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_SCALPER_TRADES, JSON.stringify(items));
    } catch {
      // Ignore
    }
  }, []);

  // Helper to persist scalper session
  const persistScalperSession = useCallback((stats: ScalperSessionStats) => {
    try {
      localStorage.setItem(STORAGE_KEY_SCALPER_SESSION, JSON.stringify(stats));
    } catch {
      // Ignore
    }
  }, []);

  // Helper to persist watchlist items
  const persistWatchlistItems = useCallback((items: WatchlistItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_WATCHLIST, JSON.stringify(items));
    } catch {
      // Ignore
    }
  }, []);

  // Reorder currencies via drag & drop
  const handleReorderCurrencies = useCallback((newCurrencies: CurrencyItem[]) => {
    setCurrencies(newCurrencies);
    persistCurrencies(newCurrencies);
  }, [persistCurrencies]);

  // Reorder tracked currencies via drag & drop
  const handleReorderTrackedCurrencies = useCallback((newCurrencies: TrackedCurrency[]) => {
    setTrackedCurrencies(newCurrencies);
    persistTrackedCurrencies(newCurrencies);
  }, [persistTrackedCurrencies]);

  // Add currency (max 25)
  const handleAddCurrency = (name: string, coinQuantity?: string) => {
    if (currencies.length >= MAX_CURRENCIES) return;

    const newCurrency: CurrencyItem = {
      id: `curr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim().toUpperCase(),
      createdAt: Date.now(),
      entryPrice: '',
      tradeAmount: '',
      coinQuantity: coinQuantity || '',
      entryFeePercent: defaultFees.entryFeePercent || '',
      exitFeePercent: defaultFees.exitFeePercent || '',
      entryFeeFixed: defaultFees.entryFeeFixed || '',
      exitFeeFixed: defaultFees.exitFeeFixed || '',
      feeMethod: defaultFees.feeMethod || 'cumulative',
      testPrices: [''],
    };

    const updated = [...currencies, newCurrency];
    setCurrencies(updated);
    persistCurrencies(updated);
    setActiveCurrencyId(newCurrency.id);
  };

  // Delete currency
  const handleDeleteCurrency = (id: string) => {
    const updated = currencies.filter((c) => c.id !== id);
    setCurrencies(updated);
    persistCurrencies(updated);
    if (activeCurrencyId === id) {
      setActiveCurrencyId(null);
    }
  };

  // Active currency object
  const activeCurrency = useMemo(() => {
    if (!activeCurrencyId) return null;
    return currencies.find((c) => c.id === activeCurrencyId) || null;
  }, [currencies, activeCurrencyId]);

  // Update fields of the currently active currency (moves card to top if monitoring is activated)
  const updateActiveCurrency = useCallback((fields: Partial<CurrencyItem>) => {
    if (!activeCurrencyId) return;

    setCurrencies((prev) => {
      let next = prev.map((c) => {
        if (c.id === activeCurrencyId) {
          return { ...c, ...fields };
        }
        return c;
      });

      // إذا تم تفعيل نظام المراقبة لهذه العملة، انقلها إلى أعلى القائمة مباشرة
      if (fields.isMonitoringActive === true) {
        const targetIdx = next.findIndex((c) => c.id === activeCurrencyId);
        if (targetIdx > 0) {
          const [activatedItem] = next.splice(targetIdx, 1);
          next = [activatedItem, ...next];
        }
      }

      persistCurrencies(next);
      return next;
    });
  }, [activeCurrencyId, persistCurrencies]);

  // Reset inputs for the active currency only
  const handleResetActiveCurrency = () => {
    if (!activeCurrencyId) return;
    updateActiveCurrency({
      entryPrice: '',
      tradeAmount: '',
      coinQuantity: '',
      entryFeePercent: defaultFees.entryFeePercent || '',
      exitFeePercent: defaultFees.exitFeePercent || '',
      entryFeeFixed: defaultFees.entryFeeFixed || '',
      exitFeeFixed: defaultFees.exitFeeFixed || '',
      feeMethod: defaultFees.feeMethod || 'cumulative',
      testPrices: [''],
    });
  };

  // Test prices handlers for active currency (max 10) with Timestamp tracking
  const handleAddTestPrice = () => {
    if (!activeCurrency || activeCurrency.testPrices.length >= MAX_TEST_PRICES) return;
    const now = Date.now();
    updateActiveCurrency({
      testPrices: [...activeCurrency.testPrices, ''],
      testPriceTimestamps: [...(activeCurrency.testPriceTimestamps || []), now],
    });
  };

  const handleAddTestPriceWithVal = (val: string) => {
    if (!activeCurrency) return;
    const current = activeCurrency.testPrices.filter((p) => p.trim() !== '');
    if (current.includes(val) || current.length >= MAX_TEST_PRICES) return;
    const now = Date.now();
    updateActiveCurrency({
      testPrices: [...current, val],
      testPriceTimestamps: [...(activeCurrency.testPriceTimestamps || []), now],
    });
  };

  const handleRemoveTestPrice = (index: number) => {
    if (!activeCurrency || activeCurrency.testPrices.length <= 1) {
      updateActiveCurrency({ testPrices: [''], testPriceTimestamps: [Date.now()] });
      return;
    }
    const updated = activeCurrency.testPrices.filter((_, i) => i !== index);
    const updatedTs = (activeCurrency.testPriceTimestamps || []).filter((_, i) => i !== index);
    updateActiveCurrency({ testPrices: updated, testPriceTimestamps: updatedTs });
  };

  const handleChangeTestPrice = (index: number, val: string) => {
    if (!activeCurrency) return;
    const updated = [...activeCurrency.testPrices];
    updated[index] = val;
    const updatedTs = [...(activeCurrency.testPriceTimestamps || [])];
    updatedTs[index] = Date.now();
    updateActiveCurrency({ testPrices: updated, testPriceTimestamps: updatedTs });
  };

  // Apply live Binance price into active currency inputs
  const handleApplyLivePriceAsEntry = (price: string) => {
    if (!activeCurrency) return;
    updateActiveCurrency({ entryPrice: price });
  };

  const handleAddLivePriceAsTest = (price: string) => {
    if (!activeCurrency) return;
    const current = activeCurrency.testPrices.filter((p) => p.trim() !== '');
    if (current.length >= MAX_TEST_PRICES) return;
    const now = Date.now();
    updateActiveCurrency({ 
      testPrices: [...current, price],
      testPriceTimestamps: [...(activeCurrency.testPriceTimestamps || []), now],
    });
  };

  // Full calculation results for active currency
  const calculationResult: FullCalculationResult = useMemo(() => {
    if (!activeCurrency) {
      return {
        hasValidBaseInputs: false,
        percentTrack: { hasTrack: false, isValid: false, quantity: 0, breakEvenPrice: 0, testResults: [] },
        fixedTrack: { hasTrack: false, isValid: false, quantity: 0, breakEvenPrice: 0, testResults: [] },
      };
    }

    const inputs: TrackInputs = {
      entryPrice: activeCurrency.entryPrice,
      tradeAmount: activeCurrency.tradeAmount,
      coinQuantity: activeCurrency.coinQuantity,
      entryFeePercent: activeCurrency.entryFeePercent,
      exitFeePercent: activeCurrency.exitFeePercent,
      entryFeeFixed: activeCurrency.entryFeeFixed,
      exitFeeFixed: activeCurrency.exitFeeFixed,
      feeMethod: activeCurrency.feeMethod || defaultFees.feeMethod || 'cumulative',
    };
    return calculateAll(inputs, activeCurrency.testPrices);
  }, [activeCurrency, defaultFees.feeMethod]);

  // Save or clear default fees
  const handleSaveDefaults = (newDefaults: DefaultFeeSettings) => {
    setDefaultFees(newDefaults);
    try {
      localStorage.setItem(STORAGE_KEY_DEFAULTS, JSON.stringify(newDefaults));
    } catch {
      // Ignore
    }
  };

  const handleClearDefaults = () => {
    setDefaultFees({
      entryFeePercent: '',
      exitFeePercent: '',
      entryFeeFixed: '',
      exitFeeFixed: '',
      feeMethod: 'cumulative',
    });
    try {
      localStorage.removeItem(STORAGE_KEY_DEFAULTS);
    } catch {
      // Ignore
    }
  };

  const hasDefaultsSaved = Boolean(
    defaultFees.entryFeePercent ||
    defaultFees.exitFeePercent ||
    defaultFees.entryFeeFixed ||
    defaultFees.exitFeeFixed
  );

  // ----------------------------------------------------
  // TRACKER FEATURE #2 HANDLERS & LOGIC
  // ----------------------------------------------------

  const activeTrackedCurrency = useMemo(() => {
    if (!activeTrackedId) return null;
    return trackedCurrencies.find((tc) => tc.id === activeTrackedId) || null;
  }, [trackedCurrencies, activeTrackedId]);

  const handleToggleTrackerStream = (active: boolean) => {
    setIsTrackerStreamActive(active);
    try {
      localStorage.setItem(STORAGE_KEY_TRACKER_STREAM, String(active));
    } catch {
      // Ignore
    }
  };

  const handleAddTrackedCurrency = (name: string, baselinePrice: string, coinQuantity?: string) => {
    const cleanSym = name.trim().toUpperCase();
    const pair = cleanSym.endsWith('USDT') ? cleanSym : `${cleanSym}USDT`;
    const newTC: TrackedCurrency = {
      id: `track_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: cleanSym,
      binanceSymbol: pair,
      baselinePrice,
      baselineTimestamp: Date.now(),
      createdAt: Date.now(),
      coinQuantity: coinQuantity || undefined,
      peakPrice: baselinePrice,
      peakTimestamp: Date.now(),
      troughPrice: baselinePrice,
      troughTimestamp: Date.now(),
      snapshots: [],
    };

    const next = [newTC, ...trackedCurrencies];
    setTrackedCurrencies(next);
    persistTrackedCurrencies(next);
    setActiveTrackedId(newTC.id);
  };

  const handleUpdateTrackedQuantity = (newQuantity: string) => {
    if (!activeTrackedId) return;
    setTrackedCurrencies((prev) => {
      const next = prev.map((tc) => {
        if (tc.id === activeTrackedId) {
          return {
            ...tc,
            coinQuantity: newQuantity.trim() || undefined,
          };
        }
        return tc;
      });
      persistTrackedCurrencies(next);
      return next;
    });
  };

  const handleDeleteTrackedCurrency = (id: string) => {
    const next = trackedCurrencies.filter((tc) => tc.id !== id);
    setTrackedCurrencies(next);
    persistTrackedCurrencies(next);
    if (activeTrackedId === id) {
      setActiveTrackedId(null);
    }
  };

  const handleUpdateBaseline = (newPrice: string) => {
    if (!activeTrackedId) return;
    setTrackedCurrencies((prev) => {
      const next = prev.map((tc) => {
        if (tc.id === activeTrackedId) {
          return {
            ...tc,
            baselinePrice: newPrice,
            baselineTimestamp: Date.now(),
            peakPrice: newPrice,
            peakTimestamp: Date.now(),
            troughPrice: newPrice,
            troughTimestamp: Date.now(),
          };
        }
        return tc;
      });
      persistTrackedCurrencies(next);
      return next;
    });
  };

  const handleAddSnapshot = (price: string, label?: string) => {
    if (!activeTrackedId) return;
    const newSnap: PriceSnapshot = {
      id: `snap_${Date.now()}`,
      price,
      timestamp: Date.now(),
      label,
    };
    setTrackedCurrencies((prev) => {
      const next = prev.map((tc) => {
        if (tc.id === activeTrackedId) {
          return {
            ...tc,
            snapshots: [newSnap, ...(tc.snapshots || [])],
          };
        }
        return tc;
      });
      persistTrackedCurrencies(next);
      return next;
    });
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
    if (!activeTrackedId) return;
    setTrackedCurrencies((prev) => {
      const next = prev.map((tc) => {
        if (tc.id === activeTrackedId) {
          return {
            ...tc,
            snapshots: (tc.snapshots || []).filter((s) => s.id !== snapshotId),
          };
        }
        return tc;
      });
      persistTrackedCurrencies(next);
      return next;
    });
  };

  // Direct Integration: Send price from Tracker to Calculator as Entry Price
  const handleSendToCalculatorAsEntry = (currencyName: string, price: string, coinQuantity?: string) => {
    const upper = currencyName.trim().toUpperCase();
    let target = currencies.find((c) => c.name === upper);
    const pNum = parseFloat(price);
    const qNum = coinQuantity ? parseFloat(coinQuantity) : NaN;
    const calcTradeAmt = !isNaN(pNum) && pNum > 0 && !isNaN(qNum) && qNum > 0
      ? trimTrailingZeros((pNum * qNum).toFixed(6))
      : '100';

    if (!target) {
      target = {
        id: `curr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: upper,
        createdAt: Date.now(),
        entryPrice: price,
        tradeAmount: calcTradeAmt,
        coinQuantity: coinQuantity || '',
        entryFeePercent: defaultFees.entryFeePercent || '',
        exitFeePercent: defaultFees.exitFeePercent || '',
        entryFeeFixed: defaultFees.entryFeeFixed || '',
        exitFeeFixed: defaultFees.exitFeeFixed || '',
        feeMethod: defaultFees.feeMethod || 'cumulative',
        testPrices: [''],
      };
      const next = [target, ...currencies];
      setCurrencies(next);
      persistCurrencies(next);
    } else {
      const next = currencies.map((c) => {
        if (c.id === target!.id) {
          const qty = coinQuantity || c.coinQuantity;
          const q = qty ? parseFloat(qty) : NaN;
          const amt = !isNaN(pNum) && pNum > 0 && !isNaN(q) && q > 0
            ? trimTrailingZeros((pNum * q).toFixed(6))
            : c.tradeAmount || '100';
          return { ...c, entryPrice: price, coinQuantity: qty, tradeAmount: amt };
        }
        return c;
      });
      setCurrencies(next);
      persistCurrencies(next);
    }
    setActiveCurrencyId(target.id);
    setActiveMainTab('calculator');
  };

  // Direct Integration: Send price from Tracker to Calculator as Test Target
  const handleSendToCalculatorAsTest = (currencyName: string, price: string, coinQuantity?: string) => {
    const upper = currencyName.trim().toUpperCase();
    let target = currencies.find((c) => c.name === upper);
    if (!target) {
      target = {
        id: `curr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: upper,
        createdAt: Date.now(),
        entryPrice: '',
        tradeAmount: '100',
        coinQuantity: coinQuantity || '',
        entryFeePercent: defaultFees.entryFeePercent || '',
        exitFeePercent: defaultFees.exitFeePercent || '',
        entryFeeFixed: defaultFees.entryFeeFixed || '',
        exitFeeFixed: defaultFees.exitFeeFixed || '',
        feeMethod: defaultFees.feeMethod || 'cumulative',
        testPrices: [price],
      };
      const next = [target, ...currencies];
      setCurrencies(next);
      persistCurrencies(next);
    } else {
      const existing = target.testPrices.filter((p) => p.trim() !== '');
      const newTests = existing.includes(price) ? existing : [...existing, price].slice(0, MAX_TEST_PRICES);
      const next = currencies.map((c) => (c.id === target!.id ? { 
        ...c, 
        testPrices: newTests,
        coinQuantity: coinQuantity || c.coinQuantity 
      } : c));
      setCurrencies(next);
      persistCurrencies(next);
    }
    setActiveCurrencyId(target.id);
    setActiveMainTab('calculator');
  };

  const handleOpenCalculatorForCurrency = (currencyName: string, coinQuantity?: string) => {
    const upper = currencyName.trim().toUpperCase();
    let target = currencies.find((c) => c.name === upper);
    if (!target) {
      target = {
        id: `curr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: upper,
        createdAt: Date.now(),
        entryPrice: '',
        tradeAmount: '100',
        coinQuantity: coinQuantity || '',
        entryFeePercent: defaultFees.entryFeePercent || '',
        exitFeePercent: defaultFees.exitFeePercent || '',
        entryFeeFixed: defaultFees.entryFeeFixed || '',
        exitFeeFixed: defaultFees.exitFeeFixed || '',
        feeMethod: defaultFees.feeMethod || 'cumulative',
        testPrices: [''],
      };
      const next = [target, ...currencies];
      setCurrencies(next);
      persistCurrencies(next);
    } else if (coinQuantity && !target.coinQuantity) {
      const next = currencies.map((c) => (c.id === target!.id ? { ...c, coinQuantity } : c));
      setCurrencies(next);
      persistCurrencies(next);
    }
    setActiveCurrencyId(target.id);
    setActiveMainTab('calculator');
  };

  // Matched tracked points for the active calculator currency
  const activeCurrencyTrackedPoints = useMemo(() => {
    if (!activeCurrency) return undefined;
    const match = trackedCurrencies.find((tc) => tc.name === activeCurrency.name);
    if (!match) return undefined;
    return {
      baselinePrice: match.baselinePrice,
      peakPrice: match.peakPrice,
      troughPrice: match.troughPrice,
      livePrice: trackerLivePrices[match.binanceSymbol] || undefined,
    };
  }, [activeCurrency, trackedCurrencies, trackerLivePrices]);

  const persistTrackedCurrenciesRef = useRef(persistTrackedCurrencies);
  useEffect(() => {
    persistTrackedCurrenciesRef.current = persistTrackedCurrencies;
  }, [persistTrackedCurrencies]);

  const persistScalpTradesRef = useRef(persistScalpTrades);
  useEffect(() => {
    persistScalpTradesRef.current = persistScalpTrades;
  }, [persistScalpTrades]);

  const persistScalperSessionRef = useRef(persistScalperSession);
  useEffect(() => {
    persistScalperSessionRef.current = persistScalperSession;
  }, [persistScalperSession]);

  const persistWatchlistItemsRef = useRef(persistWatchlistItems);
  useEffect(() => {
    persistWatchlistItemsRef.current = persistWatchlistItems;
  }, [persistWatchlistItems]);

  // Combined symbols key for WebSocket (Tracker + Scalper + Watchlist + Range Master)
  const trackedSymbolsKey = useMemo(() => {
    if (!isTrackerStreamActive) return '';
    const tr = trackedCurrencies.map((tc) => tc.binanceSymbol.toLowerCase());
    const sc = scalpTrades.map((st) => st.binanceSymbol.toLowerCase());
    const wl = watchlistItems.map((wi) => wi.symbol.toLowerCase());
    const rg = rangeStreamSymbols.map((s) => s.toLowerCase());
    const combined = Array.from(new Set([...tr, ...sc, ...wl, ...rg]));
    if (combined.length === 0) return '';
    return combined.sort().join('/');
  }, [isTrackerStreamActive, trackedCurrencies, scalpTrades, watchlistItems, rangeStreamSymbols]);

  // Real-time WebSocket connection to Binance for both Tracker and Scalper
  useEffect(() => {
    if (!isTrackerStreamActive || !trackedSymbolsKey) {
      if (trackerWsRef.current) {
        trackerWsRef.current.close();
        trackerWsRef.current = null;
      }
      return;
    }

    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${trackedSymbolsKey
      .split('/')
      .map((s) => `${s}@ticker`)
      .join('/')}`;

    try {
      const ws = new WebSocket(wsUrl);
      trackerWsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const ticker = payload.data || payload;
          const symbol = (ticker.s || '').toUpperCase();
          const price = ticker.c;

          if (symbol && price) {
            setTrackerLivePrices((prev) => ({ ...prev, [symbol]: price }));

            const priceNum = parseFloat(price);
            if (!isNaN(priceNum) && priceNum > 0) {
              // 1. Update Tracker Currencies Peak & Trough
              setTrackedCurrencies((prev) => {
                let hasChanges = false;
                const next = prev.map((tc) => {
                  if (tc.binanceSymbol === symbol) {
                    const currentPeak = tc.peakPrice ? parseFloat(tc.peakPrice) : parseFloat(tc.baselinePrice);
                    const currentTrough = tc.troughPrice ? parseFloat(tc.troughPrice) : parseFloat(tc.baselinePrice);
                    let newPeak = tc.peakPrice;
                    let newPeakTs = tc.peakTimestamp;
                    let newTrough = tc.troughPrice;
                    let newTroughTs = tc.troughTimestamp;

                    if (priceNum > currentPeak) {
                      newPeak = price;
                      newPeakTs = Date.now();
                      hasChanges = true;
                    }
                    if (priceNum < currentTrough) {
                      newTrough = price;
                      newTroughTs = Date.now();
                      hasChanges = true;
                    }

                    if (hasChanges) {
                      return {
                        ...tc,
                        peakPrice: newPeak,
                        peakTimestamp: newPeakTs,
                        troughPrice: newTrough,
                        troughTimestamp: newTroughTs,
                      };
                    }
                  }
                  return tc;
                });

                if (hasChanges) {
                  persistTrackedCurrenciesRef.current(next);
                  return next;
                }
                return prev;
              });

              // 2. Update Scalper Trades: Dip Tracking for Watching, Peak Tracking for In-Trade, and real-time Price History
              setScalpTrades((prev) => {
                let hasChanges = false;
                const next = prev.map((st) => {
                  if (st.binanceSymbol === symbol) {
                    const prevHistory = st.priceHistory || [];
                    const lastRecorded = prevHistory.length > 0 ? prevHistory[prevHistory.length - 1] : null;
                    let newHistory = prevHistory;
                    if (lastRecorded !== priceNum) {
                      newHistory = [...prevHistory, priceNum].slice(-25);
                      hasChanges = true;
                    }

                    if (st.status === 'watching') {
                      const currentDip = st.dipPrice ? parseFloat(st.dipPrice) : priceNum;
                      if (!st.dipPrice || priceNum < currentDip) {
                        hasChanges = true;
                        return {
                          ...st,
                          priceHistory: newHistory,
                          dipPrice: price,
                          dipTimestamp: Date.now(),
                        };
                      }

                      // Check for confirmed bounce above dip (فقط إذا كانت الصفقة مفعّلة والتنبيهات مشغلة لها)
                      if (currentDip > 0 && st.isActive !== false && st.alertsEnabled === true) {
                        const bouncePercent = ((priceNum - currentDip) / currentDip) * 100;
                        if (bouncePercent >= (st.bounceTriggerPercent || 0.4)) {
                          if (canTriggerAlert('reboundBounce', st.id)) {
                            recordAlertTriggered('reboundBounce', st.id);
                            systemNotification.sendNotification({
                              title: `⚡ ارتداد جاهز للشراء (${st.name})!`,
                              body: `ارتد سعر ${st.name} بنسبة +${bouncePercent.toFixed(2)}% فوق القاع (${currentDip} USDT). جاهز لسكالبينج سريع!`,
                              tag: `bounce-${st.id}`,
                              icon: '/pwa-192x192.png',
                              badge: '/icon.svg',
                              renotify: true,
                            });
                          }
                        }
                      }

                      if (hasChanges) {
                        return { ...st, priceHistory: newHistory };
                      }
                    } else if (st.status === 'in_trade') {
                      const entryNum = st.entryPrice ? parseFloat(st.entryPrice) : priceNum;
                      const currentPeak = st.peakSinceEntry ? parseFloat(st.peakSinceEntry) : entryNum;
                      if (priceNum > currentPeak) {
                        hasChanges = true;
                        return {
                          ...st,
                          priceHistory: newHistory,
                          peakSinceEntry: price,
                          peakTimestamp: Date.now(),
                        };
                      }

                      // Trailing drop warning check (فقط إذا كانت الصفقة مفعّلة والتنبيهات مشغلة لها)
                      if (entryNum > 0 && currentPeak > entryNum && st.isActive !== false && st.alertsEnabled === true) {
                        const peakPnl = ((currentPeak - entryNum) / entryNum) * 100;
                        const dropFromPeak = ((currentPeak - priceNum) / currentPeak) * 100;
                        if (peakPnl >= 0.5 && dropFromPeak >= (st.trailingDropAlertPercent || 0.35)) {
                          if (canTriggerAlert('targetExit', st.id)) {
                            recordAlertTriggered('targetExit', st.id);
                            systemNotification.sendNotification({
                              title: `⚠️ تحذير هبوط من القمة (${st.name})!`,
                              body: `هبط سعر ${st.name} بنسبة -${dropFromPeak.toFixed(2)}% عن أعلى قمة (${currentPeak} USDT). يُنصح بالخروج السريع لـ USDT!`,
                              tag: `trailing-${st.id}`,
                              icon: '/pwa-192x192.png',
                              badge: '/icon.svg',
                              renotify: true,
                              requireInteraction: true,
                            });
                          }
                        }
                      }

                      if (hasChanges) {
                        return { ...st, priceHistory: newHistory };
                      }
                    } else if (hasChanges) {
                      return { ...st, priceHistory: newHistory };
                    }
                  }
                  return st;
                });

                if (hasChanges) {
                  persistScalpTradesRef.current(next);
                  return next;
                }
                return prev;
              });

              // 3. Update Watchlist and Trigger Instant Price Alerts (إشعار Push ونغمة صوتية)
              setWatchlistItems((prev) => {
                let hasAlertFired = false;
                const next = prev.map((item) => {
                  if (item.symbol === symbol && item.hasAlert && item.alertPrice) {
                    const targetNum = parseFloat(item.alertPrice);
                    if (!isNaN(targetNum) && targetNum > 0) {
                      const isTriggered = 
                        (item.alertDirection === 'above' && priceNum >= targetNum) ||
                        (item.alertDirection === 'below' && priceNum <= targetNum) ||
                        (!item.alertDirection && Math.abs(priceNum - targetNum) / targetNum < 0.002);

                      if (isTriggered) {
                        hasAlertFired = true;
                        systemNotification.sendNotification({
                          title: `🎯 تنبيه سعري فوري (${item.name})!`,
                          body: `وصل سعر ${item.name} إلى ${priceNum} USDT (المستهدف: ${targetNum} USDT).`,
                          tag: `wl-alert-${item.id}`,
                          icon: '/pwa-192x192.png',
                          badge: '/icon.svg',
                          renotify: true,
                          requireInteraction: true,
                        });

                        return {
                          ...item,
                          hasAlert: false, // Deactivate once fired
                        };
                      }
                    }
                  }
                  return item;
                });

                if (hasAlertFired) {
                  persistWatchlistItemsRef.current(next);
                  return next;
                }
                return prev;
              });
            }
          }
        } catch {
          // Ignore
        }
      };

      ws.onerror = () => {
        // Fallback polling will handle it if ws drops
      };
    } catch {
      // Ignore
    }

    return () => {
      if (trackerWsRef.current) {
        trackerWsRef.current.close();
        trackerWsRef.current = null;
      }
    };
  }, [isTrackerStreamActive, trackedSymbolsKey]);

  // ----------------------------------------------------
  // SCALPER ACTIONS & HANDLERS
  // ----------------------------------------------------

  const handleAddScalpTrade = (name: string) => {
    const clean = name.trim().toUpperCase();
    const pair = clean.endsWith('USDT') ? clean : `${clean}USDT`;
    const liveP = trackerLivePrices[pair] || '';
    const newTrade: ScalpTrade = {
      id: `scalp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: clean,
      binanceSymbol: pair,
      status: 'watching',
      isActive: true,
      alertsEnabled: false, // مضبوط افتراضياً على وضع "مغلق" كما طلب المستخدم
      dipPrice: liveP || undefined,
      dipTimestamp: liveP ? Date.now() : undefined,
      bounceTriggerPercent: 0.4,
      trailingDropAlertPercent: 0.35,
      target1Percent: 0.6,
      target2Percent: 1.2,
      target3Percent: 2.0,
      createdAt: Date.now(),
      notes: '',
    };
    const next = [newTrade, ...scalpTrades];
    setScalpTrades(next);
    persistScalpTrades(next);
  };

  const handleUpdateScalpTrade = (updated: ScalpTrade) => {
    const next = scalpTrades.map((t) => (t.id === updated.id ? updated : t));
    setScalpTrades(next);
    persistScalpTrades(next);
  };

  const handleDeleteScalpTrade = (tradeId: string) => {
    const next = scalpTrades.filter((t) => t.id !== tradeId);
    setScalpTrades(next);
    persistScalpTrades(next);
  };

  const handleToggleScalpTradeActive = (tradeId: string) => {
    const next = scalpTrades.map((t) => {
      if (t.id === tradeId) {
        return { ...t, isActive: t.isActive === false ? true : false };
      }
      return t;
    });
    setScalpTrades(next);
    persistScalpTrades(next);
  };

  const handleToggleScalpTradeAlerts = (tradeId: string) => {
    const next = scalpTrades.map((t) => {
      if (t.id === tradeId) {
        return { ...t, alertsEnabled: !t.alertsEnabled };
      }
      return t;
    });
    setScalpTrades(next);
    persistScalpTrades(next);
  };

  const handleClearAllScalpTrades = () => {
    setScalpTrades([]);
    persistScalpTrades([]);
  };

  const handleOpenScalpTrade = (tradeId: string, entryPrice: string, amountUsdt: string, coinQuantity?: string) => {
    const entryNum = parseFloat(entryPrice);
    const buyFee = parseFloat(defaultFees.entryFeePercent || '0.1') || 0.1;
    const sellFee = parseFloat(defaultFees.exitFeePercent || '0.1') || 0.1;
    const bePrice = entryNum > 0 ? (entryNum * (1 + buyFee / 100)) / (1 - sellFee / 100) : 0;

    const next = scalpTrades.map((t) => {
      if (t.id === tradeId) {
        return {
          ...t,
          status: 'in_trade' as const,
          entryPrice,
          allocatedUsdt: amountUsdt,
          coinQuantity: coinQuantity || undefined,
          entryTimestamp: Date.now(),
          breakEvenPrice: bePrice > 0 ? bePrice.toString() : undefined,
          peakSinceEntry: entryPrice,
          peakTimestamp: Date.now(),
        };
      }
      return t;
    });
    setScalpTrades(next);
    persistScalpTrades(next);
  };

  const handleCloseScalpTradeToUsdt = (tradeId: string, exitPrice: string, reason: ScalpTrade['exitReason']) => {
    const trade = scalpTrades.find((t) => t.id === tradeId);
    if (!trade || !trade.entryPrice) return;

    const entryNum = parseFloat(trade.entryPrice);
    const exitNum = parseFloat(exitPrice);
    const amount = trade.allocatedUsdt ? parseFloat(trade.allocatedUsdt) : 100;
    const qty = trade.coinQuantity ? parseFloat(trade.coinQuantity) : (entryNum > 0 ? amount / entryNum : 0);

    const diff = exitNum - entryNum;
    const pnlPercent = entryNum > 0 ? (diff / entryNum) * 100 : 0;
    const pnlUsdt = diff * qty;

    const durationMinutes = trade.entryTimestamp 
      ? Math.max(1, Math.round((Date.now() - trade.entryTimestamp) / 60000)) 
      : 1;

    // Update Session Stats
    const newCompleted = scalperSession.completedScalps + 1;
    const newWinning = scalperSession.winningScalps + (pnlUsdt > 0 ? 1 : 0);
    const newTotalPnl = scalperSession.totalRealizedPnlUsdt + pnlUsdt;
    const newAvgDuration = Math.round(
      (scalperSession.avgDurationMinutes * scalperSession.completedScalps + durationMinutes) / newCompleted
    );

    const updatedSession: ScalperSessionStats = {
      ...scalperSession,
      completedScalps: newCompleted,
      winningScalps: newWinning,
      totalRealizedPnlUsdt: newTotalPnl,
      avgDurationMinutes: newAvgDuration,
    };
    setScalperSession(updatedSession);
    persistScalperSession(updatedSession);

    // Update Trade Record
    const next = scalpTrades.map((t) => {
      if (t.id === tradeId) {
        return {
          ...t,
          status: 'closed' as const,
          exitPrice,
          exitTimestamp: Date.now(),
          realizedPnlUsdt: pnlUsdt,
          realizedPnlPercent: pnlPercent,
          exitReason: reason,
          holdingDurationMinutes: durationMinutes,
        };
      }
      return t;
    });
    setScalpTrades(next);
    persistScalpTrades(next);
  };

  const handleUpdateScalperSession = (stats: ScalperSessionStats) => {
    setScalperSession(stats);
    persistScalperSession(stats);
  };

  const handleNavigateToCalculatorFromScalp = (trade?: ScalpTrade) => {
    if (trade && trade.name) {
      handleOpenCalculatorForCurrency(trade.name, trade.coinQuantity);
      if (trade.entryPrice) {
        setCurrencies((prev) => {
          const next = prev.map((c) => {
            if (c.name === trade.name.trim().toUpperCase()) {
              return { 
                ...c, 
                entryPrice: trade.entryPrice!,
                tradeAmount: trade.allocatedUsdt || c.tradeAmount,
                coinQuantity: trade.coinQuantity || c.coinQuantity
              };
            }
            return c;
          });
          persistCurrencies(next);
          return next;
        });
      }
    }
    setActiveMainTab('calculator');
  };

  const handleNavigateToTrackerFromScalp = (symbol?: string) => {
    if (symbol) {
      const clean = symbol.trim().toUpperCase();
      const match = trackedCurrencies.find((tc) => tc.name === clean);
      if (match) {
        setActiveTrackedId(match.id);
      } else {
        const pair = clean.endsWith('USDT') ? clean : `${clean}USDT`;
        const liveP = trackerLivePrices[pair] || '0';
        handleAddTrackedCurrency(clean, liveP);
      }
    }
    setActiveMainTab('tracker');
  };

  // ----------------------------------------------------
  // WATCHLIST ACTIONS & HANDLERS (Screen #4 TradingView)
  // ----------------------------------------------------

  const handleAddWatchlistItem = (symbol: string, category: WatchlistCategory, flagColor: WatchlistFlagColor) => {
    const clean = symbol.trim().toUpperCase();
    const pair = clean.endsWith('USDT') ? clean : `${clean}USDT`;
    const baseName = pair.replace('USDT', '');
    const existing = watchlistItems.find((i) => i.symbol === pair);
    if (existing) return;

    const newItem: WatchlistItem = {
      id: `wl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      symbol: pair,
      name: baseName,
      category,
      flagColor,
      description: `${baseName} / Tether US`,
    };

    const next = [newItem, ...watchlistItems];
    setWatchlistItems(next);
    persistWatchlistItems(next);
  };

  const handleUpdateWatchlistItem = (item: WatchlistItem) => {
    const next = watchlistItems.map((i) => (i.id === item.id ? item : i));
    setWatchlistItems(next);
    persistWatchlistItems(next);
  };

  const handleDeleteWatchlistItem = (itemId: string) => {
    const next = watchlistItems.filter((i) => i.id !== itemId);
    setWatchlistItems(next);
    persistWatchlistItems(next);
  };

  const handleSetWatchlistAlert = (symbol: string, targetPrice: string, direction: 'above' | 'below') => {
    const next = watchlistItems.map((item) => {
      if (item.symbol === symbol) {
        return {
          ...item,
          hasAlert: true,
          alertPrice: targetPrice,
          alertDirection: direction,
        };
      }
      return item;
    });
    setWatchlistItems(next);
    persistWatchlistItems(next);

    // Request system push notification permission
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      systemNotification.requestPermission();
    }
  };

  const handleNavigateToScalperFromWatchlist = (symbolName: string) => {
    const clean = symbolName.trim().toUpperCase();
    const pair = clean.endsWith('USDT') ? clean : `${clean}USDT`;
    const baseName = pair.replace('USDT', '');
    const exists = scalpTrades.find((t) => t.binanceSymbol === pair);
    if (!exists) {
      handleAddScalpTrade(baseName);
    }
    setActiveMainTab('scalper');
  };

  const handleReorderWatchlistItems = useCallback((newItems: WatchlistItem[]) => {
    setWatchlistItems(newItems);
    persistWatchlistItems(newItems);
  }, [persistWatchlistItems]);

  const handleOpenChartForCurrency = useCallback((item: {
    symbol: string;
    name?: string;
    description?: string;
    entryPrice?: string;
    breakEvenPrice?: string;
    coinQuantity?: string;
    tradeAmount?: string;
  }) => {
    const upper = (item.name || item.symbol.replace('USDT', '')).trim().toUpperCase();
    const matchedCalc = currencies.find((c) => c.name === upper);
    const matchedScalp = scalpTrades.find((s) => s.name === upper);

    const entry = item.entryPrice || matchedCalc?.entryPrice || matchedScalp?.entryPrice || '';
    let be = item.breakEvenPrice || '';
    const qty = item.coinQuantity || matchedCalc?.coinQuantity || matchedScalp?.coinQuantity || '';
    const amt = item.tradeAmount || matchedCalc?.tradeAmount || matchedScalp?.allocatedUsdt || '';

    if (!be && entry) {
      const pNum = parseFloat(entry);
      if (!isNaN(pNum) && pNum > 0) {
        const buyFee = parseFloat(matchedCalc?.entryFeePercent || defaultFees.entryFeePercent || '0.1') || 0.1;
        const sellFee = parseFloat(matchedCalc?.exitFeePercent || defaultFees.exitFeePercent || '0.1') || 0.1;
        be = ((pNum * (1 + buyFee / 100)) / (1 - sellFee / 100)).toFixed(6);
      }
    }

    const tPrices = matchedCalc?.testPrices || [];
    const tTimestamps = matchedCalc?.testPriceTimestamps || [];

    setActiveChartItem({
      symbol: item.symbol,
      currencyName: upper,
      description: item.description,
      entryPrice: entry,
      breakEvenPrice: be,
      coinQuantity: qty,
      tradeAmount: amt,
      testPrices: tPrices,
      testPriceTimestamps: tTimestamps,
    });
  }, [currencies, scalpTrades, defaultFees]);

  return (
    <main className="relative min-h-screen w-full flex flex-col justify-start items-center p-3 sm:p-6 pb-28 sm:pb-32 overflow-x-hidden transition-colors">
      {/* Background Ambience and Guide */}
      <WorkspaceBackground 
        mode={activeCurrencyId && activeMainTab === 'calculator' ? windowMode : 'normal'}
        onSetMode={setWindowMode}
      />

      {/* Offline Status Toast */}
      <OfflineIndicator />

      {/* FIXED GLOBAL MARKET SESSIONS & LIQUIDITY TIMELINE BAR (شريط مواعيد البورصات والسيولة بتوقيت مكة) */}
      <MarketSessionsTopBar
        activeScreen={activeMainTab}
        onNavigateToScreen={(screen) => setActiveMainTab(screen)}
      />

      {/* Top Dedicated Control Bar */}
      <header className="relative z-20 w-full max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white/75 dark:bg-slate-900/75 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs mb-3">
        {/* App Title & Identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 font-black">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100">
                بوت مراقبة صعود العملات
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                v2.0 سكالبينج
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              رصد القيعان السريعة • حساب أسعار التعادل • تنبيهات فورية
            </p>
          </div>
        </div>

        {/* Top Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Side-by-Side Break-Even Comparison Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsComparisonOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition cursor-pointer"
            title="مقارنة أسعار التعادل بين العملات جنباً إلى جنب"
          >
            <Columns3 className="w-4 h-4" />
            <span>مقارنة التعادل</span>
            {currencies.length > 1 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold">
                {currencies.length}
              </span>
            )}
          </button>

          {/* Theme Customizer */}
          <button
            type="button"
            onClick={() => setIsThemeCustomizerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="ألوان وتخصيص المظهر"
          >
            <Palette className="w-4 h-4 text-amber-500" />
            <span className="hidden md:inline">ألوان الثيم</span>
          </button>

          {/* Global Fee Settings */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="إعدادات الرسوم الافتراضية"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            <span className="hidden md:inline">الإعدادات</span>
          </button>

          {/* Binance Stream Status */}
          <button
            type="button"
            onClick={() => handleToggleTrackerStream(!isTrackerStreamActive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
              isTrackerStreamActive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
            }`}
            title={isTrackerStreamActive ? 'بث بينانس اللحظي نشط — انقر للإيقاف' : 'بث بينانس متوقف — انقر للتشغيل'}
          >
            <Radio className={`w-3.5 h-3.5 ${isTrackerStreamActive ? 'animate-pulse text-emerald-500' : ''}`} />
            <span className="hidden sm:inline">{isTrackerStreamActive ? 'بينانس متصل' : 'البث متوقف'}</span>
          </button>
        </div>
      </header>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <div className="relative z-10 w-full flex justify-center py-2">
        {/* ========================================================= */}
        {/* TAB 1: CALCULATOR TAB                                     */}
        {/* ========================================================= */}
        {activeMainTab === 'calculator' && (
          !activeCurrencyId || !activeCurrency ? (
            /* Level 1: Currency Dashboard (لوحة العملات) */
            <CurrencyDashboard
              currencies={currencies}
              onSelectCurrency={(id) => setActiveCurrencyId(id)}
              onAddCurrency={handleAddCurrency}
              onDeleteCurrency={handleDeleteCurrency}
              onReorderCurrencies={handleReorderCurrencies}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenThemeCustomizer={() => setIsThemeCustomizerOpen(true)}
              hasDefaultsSaved={hasDefaultsSaved}
              defaultFeeMethod={defaultFees.feeMethod || 'cumulative'}
            />
          ) : (
            /* Level 2: Full Calculator for the Active Currency (حاسبة العملة المحددة) */
            <FloatingContainer
              mode={windowMode}
              onSetMode={setWindowMode}
              onReset={handleResetActiveCurrency}
              onToggleSettings={() => setIsSettingsOpen(true)}
              hasDefaultsSaved={hasDefaultsSaved}
              currencyName={activeCurrency.name}
              onBackToDashboard={() => setActiveCurrencyId(null)}
              percentTrack={calculationResult.percentTrack}
              fixedTrack={calculationResult.fixedTrack}
              isReadOnly={isCalculatorReadOnly}
              onToggleReadOnly={() => setIsCalculatorReadOnly((prev) => !prev)}
            >
              {/* Section 0: Live Monitoring & Alerts from Binance (وضع المراقبة اللحظية والتنبيهات) */}
              <LiveMonitoringSection
                currencyName={activeCurrency.name}
                binanceSymbol={activeCurrency.binanceSymbol}
                onChangeBinanceSymbol={(sym) => updateActiveCurrency({ binanceSymbol: sym })}
                isActive={Boolean(activeCurrency.isMonitoringActive)}
                onToggleActive={(active) => updateActiveCurrency({ isMonitoringActive: active })}
                targetPrice={activeCurrency.targetPrice || ''}
                onChangeTargetPrice={(price) => updateActiveCurrency({ targetPrice: price })}
                targetDirection={activeCurrency.targetDirection || 'above'}
                onChangeTargetDirection={(dir) => updateActiveCurrency({ targetDirection: dir })}
                onApplyPriceAsEntry={handleApplyLivePriceAsEntry}
                onAddPriceAsTest={handleAddLivePriceAsTest}
                breakEvenPrice={
                  calculationResult.percentTrack.hasTrack && calculationResult.percentTrack.isValid
                    ? calculationResult.percentTrack.breakEvenPrice
                    : calculationResult.fixedTrack.hasTrack && calculationResult.fixedTrack.isValid
                    ? calculationResult.fixedTrack.breakEvenPrice
                    : undefined
                }
              />

              {/* Section 1: Trade Data (بيانات الصفقة مع شريط نقاط سجل الرصد) */}
              <TradeDataSection
                entryPrice={activeCurrency.entryPrice}
                onChangeEntryPrice={(val) => {
                  if (activeCurrency.coinQuantity && (!activeCurrency.tradeAmount || activeCurrency.tradeAmount.trim() === '')) {
                    const q = parseFloat(activeCurrency.coinQuantity);
                    const p = parseFloat(val);
                    if (!isNaN(q) && q > 0 && !isNaN(p) && p > 0) {
                      updateActiveCurrency({ entryPrice: val, tradeAmount: trimTrailingZeros((q * p).toFixed(6)) });
                      return;
                    }
                  }
                  updateActiveCurrency({ entryPrice: val });
                }}
                tradeAmount={activeCurrency.tradeAmount}
                onChangeTradeAmount={(val) => updateActiveCurrency({ tradeAmount: val })}
                coinQuantity={activeCurrency.coinQuantity || ''}
                onChangeCoinQuantity={(val) => {
                  const updates: Partial<CurrencyItem> = { coinQuantity: val };
                  const q = parseFloat(val);
                  const p = parseFloat(activeCurrency.entryPrice);
                  const a = parseFloat(activeCurrency.tradeAmount);
                  if (!isNaN(q) && q > 0 && !isNaN(p) && p > 0) {
                    updates.tradeAmount = trimTrailingZeros((q * p).toFixed(6));
                  } else if (!isNaN(q) && q > 0 && !isNaN(a) && a > 0 && (!activeCurrency.entryPrice || activeCurrency.entryPrice.trim() === '')) {
                    updates.entryPrice = trimTrailingZeros((a / q).toFixed(8));
                  }
                  updateActiveCurrency(updates);
                }}
                currencyName={activeCurrency.name}
                entryFeePercent={activeCurrency.entryFeePercent}
                onChangeEntryFeePercent={(val) => updateActiveCurrency({ entryFeePercent: val })}
                exitFeePercent={activeCurrency.exitFeePercent}
                onChangeExitFeePercent={(val) => updateActiveCurrency({ exitFeePercent: val })}
                entryFeeFixed={activeCurrency.entryFeeFixed}
                onChangeEntryFeeFixed={(val) => updateActiveCurrency({ entryFeeFixed: val })}
                exitFeeFixed={activeCurrency.exitFeeFixed}
                onChangeExitFeeFixed={(val) => updateActiveCurrency({ exitFeeFixed: val })}
                errorMessage={
                  !calculationResult.hasValidBaseInputs && (activeCurrency.entryPrice || activeCurrency.tradeAmount || activeCurrency.coinQuantity)
                    ? calculationResult.baseErrorMessage
                    : undefined
                }
                trackedPoints={activeCurrencyTrackedPoints}
                onAddTestPriceWithVal={handleAddTestPriceWithVal}
                isReadOnly={isCalculatorReadOnly}
              />

              {/* Section 2: Break-Even Price (سعر التعادل) */}
              <BreakEvenSection
                hasValidBase={calculationResult.hasValidBaseInputs}
                percentTrack={calculationResult.percentTrack}
                fixedTrack={calculationResult.fixedTrack}
                feeMethod={activeCurrency.feeMethod || defaultFees.feeMethod || 'cumulative'}
              />

              {/* Section 3: Test Prices & Linked Results (أسعار الاختبار ونتائجها) */}
              <TestPricesSection
                testPrices={activeCurrency.testPrices}
                onChangeTestPrice={handleChangeTestPrice}
                onAddTestPrice={handleAddTestPrice}
                onRemoveTestPrice={handleRemoveTestPrice}
                percentTrack={calculationResult.percentTrack}
                fixedTrack={calculationResult.fixedTrack}
                isReadOnly={isCalculatorReadOnly}
              />

              {/* Section 4: Interactive Profit/Loss Chart (الرسم البياني التفاعلي للأرباح والخسائر) */}
              <ProfitLossChart
                entryPrice={activeCurrency.entryPrice}
                hasValidBase={calculationResult.hasValidBaseInputs}
                percentTrack={calculationResult.percentTrack}
                fixedTrack={calculationResult.fixedTrack}
                currencyName={activeCurrency.name}
              />
            </FloatingContainer>
          )
        )}

        {/* ========================================================= */}
        {/* TAB 2: TRACKER TAB (رصد صعود وهبوط العملات)               */}
        {/* ========================================================= */}
        {activeMainTab === 'tracker' && (
          !activeTrackedId || !activeTrackedCurrency ? (
            /* Level 1: Tracker Dashboard (لوحة رصد العملات) */
            <TrackerDashboard
              trackedCurrencies={trackedCurrencies}
              livePrices={trackerLivePrices}
              isLiveStreamActive={isTrackerStreamActive}
              onToggleLiveStream={handleToggleTrackerStream}
              onSelectCurrency={(id) => setActiveTrackedId(id)}
              onAddCurrency={handleAddTrackedCurrency}
              onDeleteCurrency={handleDeleteTrackedCurrency}
              onReorderCurrencies={handleReorderTrackedCurrencies}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenThemeCustomizer={() => setIsThemeCustomizerOpen(true)}
              onNavigateToCalculator={() => setActiveMainTab('calculator')}
            />
          ) : (
            /* Level 2: Tracker Detail View (تفاصيل رصد العملة) */
            <TrackerDetailView
              currency={activeTrackedCurrency}
              currentLivePrice={trackerLivePrices[activeTrackedCurrency.binanceSymbol] || activeTrackedCurrency.baselinePrice}
              isLiveStreamActive={isTrackerStreamActive}
              onToggleLiveStream={handleToggleTrackerStream}
              onBack={() => setActiveTrackedId(null)}
              onUpdateBaseline={handleUpdateBaseline}
              onUpdateQuantity={handleUpdateTrackedQuantity}
              onAddSnapshot={handleAddSnapshot}
              onDeleteSnapshot={handleDeleteSnapshot}
              onSendToCalculatorAsEntry={handleSendToCalculatorAsEntry}
              onSendToCalculatorAsTest={handleSendToCalculatorAsTest}
              onOpenCalculatorForCurrency={handleOpenCalculatorForCurrency}
            />
          )
        )}

        {/* ========================================================= */}
        {/* TAB 3: SCALPER TAB (لوحة السكالبينج ورصد القيعان)          */}
        {/* ========================================================= */}
        {activeMainTab === 'scalper' && (
          <ScalperDashboard
            trades={scalpTrades}
            livePrices={trackerLivePrices}
            isLiveStreamActive={isTrackerStreamActive}
            sessionStats={scalperSession}
            defaultEntryFeePercent={defaultFees.entryFeePercent || '0.1'}
            defaultExitFeePercent={defaultFees.exitFeePercent || '0.1'}
            onToggleLiveStream={handleToggleTrackerStream}
            onUpdateSessionStats={handleUpdateScalperSession}
            onAddTrade={handleAddScalpTrade}
            onUpdateTrade={handleUpdateScalpTrade}
            onDeleteTrade={handleDeleteScalpTrade}
            onToggleActive={handleToggleScalpTradeActive}
            onToggleAlerts={handleToggleScalpTradeAlerts}
            onClearAllTrades={handleClearAllScalpTrades}
            onOpenTrade={handleOpenScalpTrade}
            onCloseTradeToUsdt={handleCloseScalpTradeToUsdt}
            onNavigateToCalculator={handleNavigateToCalculatorFromScalp}
            onNavigateToTracker={handleNavigateToTrackerFromScalp}
            onOpenThemeCustomizer={() => setIsThemeCustomizerOpen(true)}
          />
        )}

        {/* ========================================================= */}
        {/* TAB 4: WATCHLIST TAB (شاشة مراقبة العملات TradingView)     */}
        {/* ========================================================= */}
        {activeMainTab === 'watchlist' && (
          <WatchlistDashboard
            watchlistItems={watchlistItems}
            livePrices={trackerLivePrices}
            isLiveStreamActive={isTrackerStreamActive}
            currencies={currencies}
            scalpTrades={scalpTrades}
            onToggleLiveStream={handleToggleTrackerStream}
            onUpdateWatchlistItem={handleUpdateWatchlistItem}
            onAddWatchlistItem={handleAddWatchlistItem}
            onDeleteWatchlistItem={handleDeleteWatchlistItem}
            onReorderWatchlistItems={handleReorderWatchlistItems}
            onOpenChart={(item) => handleOpenChartForCurrency(item)}
            onNavigateToCalculator={(coinName) => handleOpenCalculatorForCurrency(coinName)}
            onNavigateToScalper={handleNavigateToScalperFromWatchlist}
            onSetPriceAlert={handleSetWatchlistAlert}
          />
        )}
        {/* ========================================================= */}
        {/* TAB 5: RANGE MASTER SCALPER (صائد القيعان والمسار العرضي) */}
        {/* ========================================================= */}
        {activeMainTab === 'range_master' && (
          <RangeScalperDashboard
            livePrices={trackerLivePrices}
            isLiveStreamActive={isTrackerStreamActive}
            watchlistSymbols={watchlistItems.map((w) => w.symbol)}
            trackerSymbols={trackedCurrencies.map((t) => t.binanceSymbol)}
            defaultEntryFeePercent={defaultFees.entryFeePercent || '0.1'}
            defaultExitFeePercent={defaultFees.exitFeePercent || '0.1'}
            onToggleLiveStream={handleToggleTrackerStream}
            onOpenChart={(symbol) => handleOpenChartForCurrency({ symbol, name: symbol.replace('USDT', '') })}
            onNavigateToCalculator={(name, price) => handleSendToCalculatorAsEntry(name, price)}
            onNavigateToTracker={(symbol) => {
              if (symbol) {
                const clean = symbol.replace('USDT', '').trim().toUpperCase();
                const match = trackedCurrencies.find((t) => t.name === clean);
                if (match) setActiveTrackedId(match.id);
              }
              setActiveMainTab('tracker');
            }}
            onNavigateToScalper={(symbol) => {
              if (symbol) {
                const clean = symbol.replace('USDT', '').trim().toUpperCase();
                const exists = scalpTrades.some((s) => s.name === clean);
                if (!exists) {
                  handleAddScalpTrade(clean);
                }
              }
              setActiveMainTab('scalper');
            }}
            onNavigateToWatchlist={() => setActiveMainTab('watchlist')}
            onOpenThemeCustomizer={() => setIsThemeCustomizerOpen(true)}
            onRegisterSymbolsForStream={handleRegisterRangeSymbols}
          />
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSettings={defaultFees}
        onSaveDefaults={handleSaveDefaults}
        onClearDefaults={handleClearDefaults}
      />

      {/* Dedicated Theme & Colors Customizer Modal */}
      <ThemeCustomizerModal
        isOpen={isThemeCustomizerOpen}
        onClose={() => setIsThemeCustomizerOpen(false)}
      />

      {/* Side-by-Side Break-Even Comparison Drawer */}
      <BreakEvenComparisonDrawer
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        currencies={currencies}
        livePrices={trackerLivePrices}
        onSelectCurrencyForCalculator={(id) => {
          setActiveCurrencyId(id);
          setActiveMainTab('calculator');
          setIsComparisonOpen(false);
        }}
      />

      {/* Full-Screen TradingView Advanced Real-Time Chart Modal */}
      {activeChartItem && (
        <TradingViewChartModal
          isOpen={Boolean(activeChartItem)}
          symbol={activeChartItem.symbol}
          currencyName={activeChartItem.currencyName}
          description={activeChartItem.description}
          entryPrice={activeChartItem.entryPrice}
          breakEvenPrice={activeChartItem.breakEvenPrice}
          coinQuantity={activeChartItem.coinQuantity}
          tradeAmount={activeChartItem.tradeAmount}
          livePrice={trackerLivePrices[activeChartItem.symbol] || undefined}
          testPrices={activeChartItem.testPrices}
          testPriceTimestamps={activeChartItem.testPriceTimestamps}
          onClose={() => setActiveChartItem(null)}
          onNavigateToCalculator={(name) => handleOpenCalculatorForCurrency(name)}
          onNavigateToScalper={(name) => handleNavigateToScalperFromWatchlist(name)}
        />
      )}

      {/* FIXED BOTTOM NAVIGATION MENU (القائمة السفلية الثابتة للعناصر الخمسة بتباين فائق) */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-300 dark:border-slate-800 py-2 px-2 sm:px-4 shadow-[0_-4px_25px_rgba(0,0,0,0.12)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.6)]"
        dir="rtl"
        aria-label="القائمة الرئيسية الثابتة"
      >
        <div className="max-w-4xl mx-auto grid grid-cols-5 gap-1 sm:gap-2">
          {/* Item 1: حاسبة التجارة والتعادل */}
          <button
            type="button"
            onClick={() => setActiveMainTab('calculator')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 sm:px-2 rounded-2xl transition-all cursor-pointer ${
              activeMainTab === 'calculator'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black ring-2 ring-amber-500/40'
                : 'text-slate-900 dark:text-slate-100 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-bold'
            }`}
          >
            <Calculator className={`w-4 h-4 sm:w-5 sm:h-5 ${activeMainTab === 'calculator' ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
            <span className="text-[10px] sm:text-xs tracking-tight">حاسبة التعادل</span>
            <span className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 rounded-full font-mono font-black ${
              activeMainTab === 'calculator' ? 'bg-slate-950 text-amber-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
            }`}>
              {currencies.length}
            </span>
          </button>

          {/* Item 2: صائد القيعان والمسار العرضي (الجديد) */}
          <button
            type="button"
            onClick={() => setActiveMainTab('range_master')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 sm:px-2 rounded-2xl transition-all cursor-pointer ${
              activeMainTab === 'range_master'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black ring-2 ring-amber-500/40'
                : 'text-slate-900 dark:text-slate-100 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-bold'
            }`}
          >
            <Layers className={`w-4 h-4 sm:w-5 sm:h-5 ${activeMainTab === 'range_master' ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
            <span className="text-[10px] sm:text-xs tracking-tight">صائد القيعان</span>
            {rangeStreamSymbols.length > 0 && (
              <span className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 rounded-full font-mono font-black ${
                activeMainTab === 'range_master' ? 'bg-slate-950 text-amber-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              }`}>
                {rangeStreamSymbols.length}
              </span>
            )}
          </button>

          {/* Item 3: لوحة السكالبينج السريعة */}
          <button
            type="button"
            onClick={() => setActiveMainTab('scalper')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 sm:px-2 rounded-2xl transition-all cursor-pointer relative ${
              activeMainTab === 'scalper'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black ring-2 ring-amber-500/40'
                : 'text-slate-900 dark:text-slate-100 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-bold'
            }`}
          >
            <Zap className={`w-4 h-4 sm:w-5 sm:h-5 ${activeMainTab === 'scalper' ? 'fill-current' : 'stroke-[2]'}`} />
            <span className="text-[10px] sm:text-xs tracking-tight">السكالبينج</span>
            <span className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 rounded-full font-mono font-black ${
              activeMainTab === 'scalper' ? 'bg-slate-950 text-amber-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
            }`}>
              {scalpTrades.length}
            </span>
            {scalpTrades.some((t) => t.status === 'in_trade') && (
              <span className="absolute top-1.5 left-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </button>

          {/* Item 4: ترجمات عاجلة (رصد صعود العملات) */}
          <button
            type="button"
            onClick={() => setActiveMainTab('tracker')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 sm:px-2 rounded-2xl transition-all cursor-pointer ${
              activeMainTab === 'tracker'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black ring-2 ring-amber-500/40'
                : 'text-slate-900 dark:text-slate-100 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-bold'
            }`}
          >
            <TrendingUp className={`w-4 h-4 sm:w-5 sm:h-5 ${activeMainTab === 'tracker' ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
            <span className="text-[10px] sm:text-xs tracking-tight">رصد الصعود</span>
            <span className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 rounded-full font-mono font-black ${
              activeMainTab === 'tracker' ? 'bg-slate-950 text-amber-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
            }`}>
              {trackedCurrencies.length}
            </span>
          </button>

          {/* Item 5: قائمة المراقبة (TradingView Watchlist) */}
          <button
            type="button"
            onClick={() => setActiveMainTab('watchlist')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 sm:px-2 rounded-2xl transition-all cursor-pointer ${
              activeMainTab === 'watchlist'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black ring-2 ring-amber-500/40'
                : 'text-slate-900 dark:text-slate-100 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-bold'
            }`}
          >
            <LayoutList className={`w-4 h-4 sm:w-5 sm:h-5 ${activeMainTab === 'watchlist' ? 'stroke-[2.5]' : 'stroke-[2]'}`} />
            <span className="text-[10px] sm:text-xs tracking-tight">قائمة المراقبة</span>
            <span className={`text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.2 rounded-full font-mono font-black ${
              activeMainTab === 'watchlist' ? 'bg-slate-950 text-amber-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
            }`}>
              {watchlistItems.length}
            </span>
          </button>
        </div>
      </nav>
    </main>
  );
}
