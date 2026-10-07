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
import { ThemeCustomizerModal } from '@/components/ThemeCustomizerModal';
import { Calculator, TrendingUp, Palette } from 'lucide-react';

export default function CalculatorPage() {
  // Navigation Tabs: 'calculator' | 'tracker'
  const [activeMainTab, setActiveMainTab] = useState<'calculator' | 'tracker'>('calculator');

  // Window State for Calculator
  const [windowMode, setWindowMode] = useState<WindowMode>('normal');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isThemeCustomizerOpen, setIsThemeCustomizerOpen] = useState(false);

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

  // Load saved default fees, currencies, and tracked currencies
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

  // Test prices handlers for active currency (max 10)
  const handleAddTestPrice = () => {
    if (!activeCurrency || activeCurrency.testPrices.length >= MAX_TEST_PRICES) return;
    updateActiveCurrency({
      testPrices: [...activeCurrency.testPrices, ''],
    });
  };

  const handleAddTestPriceWithVal = (val: string) => {
    if (!activeCurrency) return;
    const current = activeCurrency.testPrices.filter((p) => p.trim() !== '');
    if (current.includes(val) || current.length >= MAX_TEST_PRICES) return;
    updateActiveCurrency({
      testPrices: [...current, val],
    });
  };

  const handleRemoveTestPrice = (index: number) => {
    if (!activeCurrency || activeCurrency.testPrices.length <= 1) {
      updateActiveCurrency({ testPrices: [''] });
      return;
    }
    const updated = activeCurrency.testPrices.filter((_, i) => i !== index);
    updateActiveCurrency({ testPrices: updated });
  };

  const handleChangeTestPrice = (index: number, val: string) => {
    if (!activeCurrency) return;
    const updated = [...activeCurrency.testPrices];
    updated[index] = val;
    updateActiveCurrency({ testPrices: updated });
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
    updateActiveCurrency({ testPrices: [...current, price] });
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

  const trackedSymbolsKey = useMemo(() => {
    if (!isTrackerStreamActive || trackedCurrencies.length === 0) return '';
    return Array.from(new Set(trackedCurrencies.map((tc) => tc.binanceSymbol.toLowerCase())))
      .sort()
      .join('/');
  }, [isTrackerStreamActive, trackedCurrencies]);

  // Real-time WebSocket connection to Binance for all tracked currencies
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

            // Update Peak and Trough if necessary
            const priceNum = parseFloat(price);
            if (!isNaN(priceNum) && priceNum > 0) {
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

  return (
    <main className="relative min-h-screen w-full flex flex-col justify-start items-center p-3 sm:p-6 overflow-x-hidden transition-colors">
      {/* Background Ambience and Guide */}
      <WorkspaceBackground 
        mode={activeCurrencyId && activeMainTab === 'calculator' ? windowMode : 'normal'}
        onSetMode={setWindowMode}
      />

      {/* Offline Status Toast */}
      <OfflineIndicator />

      {/* Main Top Navigation Tabs (حاسبة الصفقات والتعادل | رصد صعود العملات) */}
      <div className="relative z-20 flex items-center p-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs mb-2">
        <button
          onClick={() => setActiveMainTab('calculator')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeMainTab === 'calculator'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>حاسبة الصفقات والتعادل</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/10 dark:bg-slate-950/20 font-mono font-bold">
            {currencies.length}
          </span>
        </button>

        <button
          onClick={() => setActiveMainTab('tracker')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeMainTab === 'tracker'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>رصد صعود العملات</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/10 dark:bg-slate-950/20 font-mono font-bold">
            {trackedCurrencies.length}
          </span>
        </button>

        {/* Quick Theme Customizer Button in Navigation Bar */}
        <button
          type="button"
          onClick={() => setIsThemeCustomizerOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          title="🎨 تخصيص مظهر وألوان الثيم"
        >
          <Palette className="w-4 h-4 text-amber-500" />
          <span className="hidden sm:inline">ألوان الثيم</span>
        </button>
      </div>

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
    </main>
  );
}
