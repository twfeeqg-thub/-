'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  ArrowRight, 
  Calculator, 
  Layers, 
  TrendingUp, 
  TrendingDown,
  LayoutList, 
  Search, 
  Plus, 
  Sliders, 
  Trash2, 
  Bell, 
  BellRing, 
  Camera, 
  Maximize2, 
  Minimize2, 
  Sun, 
  Moon, 
  Activity, 
  Check, 
  Copy, 
  Clock, 
  Target, 
  Globe, 
  Sparkles,
  ChevronDown,
  Eye,
  EyeOff,
  Settings2,
  RefreshCw
} from 'lucide-react';
import { 
  createChart, 
  CandlestickSeries, 
  HistogramSeries, 
  LineSeries, 
  ColorType, 
  LineStyle, 
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  UTCTimestamp
} from 'lightweight-charts';
import { CoinAvatar } from './CoinAvatar';
import { trimTrailingZeros } from '@/lib/calculator';
import { useTheme } from '@/context/ThemeContext';
import { systemNotification } from '@/lib/systemNotification';
import { soundAlert, AlertToneId } from '@/lib/soundAlert';
import { canTriggerAlert, recordAlertTriggered } from '@/lib/alertSettings';
import {
  dispatchUnifiedNotification,
  emitUnifiedAlertsChanged,
  openUnifiedAlertsCenter,
  EVENT_CHART_ALERTS_CHANGED,
} from '@/lib/unifiedAlerts';
import { 
  CandleData, 
  LinePoint,
  calculateSMA, 
  calculateEMA, 
  calculateBollingerBands, 
  calculateRSI, 
  calculateMACD, 
  formatVolumeData 
} from '@/lib/chartIndicators';

export interface ResolvedSymbolInfo {
  fullTradingViewSymbol: string;
  exchangeName: string;
  exchangeBadge: string;
  cleanPairName: string;
  baseToken: string;
  isDex: boolean;
  dexChain?: string;
}

export function parseSmartSymbol(rawInput: string, forcedExchange?: string): ResolvedSymbolInfo {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return {
      fullTradingViewSymbol: 'BINANCE:BTCUSDT',
      exchangeName: 'BINANCE',
      exchangeBadge: 'BINANCE',
      cleanPairName: 'BTCUSDT',
      baseToken: 'BTC',
      isDex: false,
    };
  }

  // 1. Explicit Exchange in Symbol (e.g. "STONFI2:ATFUSDT_EQAY5H", "BYBIT:BTCUSDT")
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const ex = parts[0].toUpperCase();
    const sym = parts[1];
    const isTon = ex.includes('STON') || ex.includes('DEDUST') || ex.includes('TON');
    const isDex = isTon || ex.includes('UNISWAP') || ex.includes('PANCAKE') || ex.includes('RAYDIUM') || ex.includes('DEX');
    const base = sym.split(/[_/]/)[0].replace(/USDT|USDC|USD/i, '') || sym;
    return {
      fullTradingViewSymbol: `${ex}:${sym}`,
      exchangeName: isTon ? 'STON.fi (TON)' : ex,
      exchangeBadge: isTon ? 'STON.fi' : ex,
      cleanPairName: sym,
      baseToken: base,
      isDex,
      dexChain: isTon ? 'TON' : isDex ? 'DEX' : undefined,
    };
  }

  // 2. User selected a specific exchange
  if (forcedExchange && forcedExchange !== 'AUTO') {
    const ex = forcedExchange.toUpperCase();
    let pair = trimmed.toUpperCase();
    if (!pair.includes('_') && !pair.endsWith('USDT') && !pair.endsWith('USD') && !pair.endsWith('USDC')) {
      pair = `${pair}USDT`;
    }
    const isTon = ex.includes('STON') || ex.includes('TON');
    const isDex = isTon || ex.includes('DEX');
    const base = pair.split(/[_/]/)[0].replace(/USDT|USDC|USD/i, '') || pair;
    return {
      fullTradingViewSymbol: `${ex}:${pair}`,
      exchangeName: isTon ? 'STON.fi (TON)' : ex,
      exchangeBadge: isTon ? 'STON.fi' : ex,
      cleanPairName: pair,
      baseToken: base,
      isDex,
      dexChain: isTon ? 'TON' : undefined,
    };
  }

  // 3. Known TON on-chain DEX pairs
  const upper = trimmed.toUpperCase();
  if (upper === 'ATF' || upper === 'ATFUSDT' || upper.startsWith('ATFUSDT_') || upper.includes('_EQ') || upper.startsWith('EQ')) {
    const pair = upper === 'ATF' || upper === 'ATFUSDT' ? 'ATFUSDT_EQAY5H' : upper;
    return {
      fullTradingViewSymbol: `STONFI2:${pair}`,
      exchangeName: 'STON.fi (TON DEX)',
      exchangeBadge: 'TON • STON.fi',
      cleanPairName: pair,
      baseToken: 'ATF',
      isDex: true,
      dexChain: 'TON',
    };
  }

  // 4. Underscore DEX pools
  if (upper.includes('_') && !upper.startsWith('BINANCE:')) {
    return {
      fullTradingViewSymbol: `STONFI2:${upper}`,
      exchangeName: 'STON.fi (TON DEX)',
      exchangeBadge: 'TON • STON.fi',
      cleanPairName: upper,
      baseToken: upper.split('_')[0].replace('USDT', ''),
      isDex: true,
      dexChain: 'TON',
    };
  }

  // 5. Default standard CEX crypto (Binance)
  let clean = upper;
  if (!clean.endsWith('USDT') && !clean.endsWith('BUSD') && !clean.endsWith('USD')) {
    clean = `${clean}USDT`;
  }
  const base = clean.replace(/USDT|BUSD|USD/, '');
  return {
    fullTradingViewSymbol: `BINANCE:${clean}`,
    exchangeName: 'BINANCE',
    exchangeBadge: 'BINANCE',
    cleanPairName: clean,
    baseToken: base,
    isDex: false,
  };
}

export interface CustomChartLine {
  id: string;
  price: number;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
  thickness: 1 | 2 | 3 | 4;
  label?: string;
  hasAlert?: boolean;
  alertDirection?: 'above' | 'below';
  alertFired?: boolean;
  alertRepeatMode?: 'once' | 'continuous';
  alertIntervalSeconds?: number;
  alertToneId?: AlertToneId;
}

export interface PersistentIndicatorConfig {
  volume: boolean;
  sma20: boolean;
  sma50: boolean;
  ema20: boolean;
  bollinger: boolean;
  rsi: boolean;
  macd: boolean;
}

const DEFAULT_INDICATORS: PersistentIndicatorConfig = {
  volume: true,
  sma20: true,
  sma50: false,
  ema20: true,
  bollinger: false,
  rsi: true,
  macd: false,
};

export const STORAGE_KEY_PERSISTENT_INDICATORS = 'tv_persistent_studies_config';
export const STORAGE_KEY_CHART_INTERVAL = 'tv_chart_interval';
export const STORAGE_KEY_CHART_MODE = 'tv_chart_render_mode'; // 'native' | 'widget'

const LINE_COLORS = [
  { label: 'سماوي', value: '#06b6d4' },
  { label: 'أخضر زمردي', value: '#10b981' },
  { label: 'ذهبي', value: '#f59e0b' },
  { label: 'أحمر وردي', value: '#ef4444' },
  { label: 'بنفسجي', value: '#8b5cf6' },
  { label: 'برتقالي', value: '#f97316' },
  { label: 'أبيض', value: '#ffffff' },
];

interface TradingViewChartModalProps {
  isOpen: boolean;
  symbol: string;
  currencyName: string;
  description?: string;
  entryPrice?: string;
  breakEvenPrice?: string;
  coinQuantity?: string;
  tradeAmount?: string;
  livePrice?: string;
  testPrices?: string[];
  testPriceTimestamps?: number[];
  onClose: () => void;
  onNavigateToCalculator?: (currencyName: string, entryPrice?: string) => void;
  onNavigateToScalper?: (symbolName: string) => void;
  onNavigateToRangeMaster?: (symbolName: string) => void;
  onNavigateToTracker?: (symbolName: string) => void;
  onNavigateToWatchlist?: () => void;
}

function formatTimestamp(ts?: number): string {
  if (!ts) return 'الآن';
  try {
    const d = new Date(ts);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds} ${day}/${month}`;
  } catch {
    return 'الآن';
  }
}

export const TradingViewChartModal: React.FC<TradingViewChartModalProps> = ({
  isOpen,
  symbol,
  currencyName,
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
  onNavigateToRangeMaster,
  onNavigateToTracker,
  onNavigateToWatchlist,
}) => {
  const { resolvedTheme } = useTheme();

  // Theme auto-inheritance + manual switch
  const [manualThemeOverride, setManualThemeOverride] = useState<'dark' | 'light' | null>(null);
  const chartTheme = manualThemeOverride ?? (resolvedTheme || 'dark');
  const isDark = chartTheme === 'dark';

  const toggleChartTheme = () => {
    setManualThemeOverride((prev) => {
      const current = prev ?? (resolvedTheme || 'dark');
      return current === 'dark' ? 'light' : 'dark';
    });
  };

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showIndicatorsModal, setShowIndicatorsModal] = useState(false);
  const [showTestPricesDrawer, setShowTestPricesDrawer] = useState(false);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);

  // Symbol resolution
  const [userSelectedSymbol, setUserSelectedSymbol] = useState<string | null>(null);
  const [currentExchange, setCurrentExchange] = useState<string>('AUTO');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchSymbolInput, setSearchSymbolInput] = useState('');

  // Reset custom selection when prop changes
  const [prevPropSymbol, setPrevPropSymbol] = useState(symbol);
  if (symbol !== prevPropSymbol) {
    setPrevPropSymbol(symbol);
    setUserSelectedSymbol(null);
    setCurrentExchange('AUTO');
  }

  const activeRawSymbol = userSelectedSymbol || symbol;
  const resolvedSymbolInfo = useMemo(() => {
    return parseSmartSymbol(activeRawSymbol, currentExchange);
  }, [activeRawSymbol, currentExchange]);

  const cleanSymbol = resolvedSymbolInfo.cleanPairName;
  const binanceSymbol = resolvedSymbolInfo.cleanPairName;
  const baseAsset = resolvedSymbolInfo.baseToken || currencyName.trim().toUpperCase() || 'CRYPTO';

  // Render Mode: 'native' (Lightweight Canvas) or 'widget' (TradingView iframe embed)
  const [chartRenderMode, setChartRenderMode] = useState<'native' | 'widget'>(() => {
    if (typeof window === 'undefined') return 'native';
    try {
      return (localStorage.getItem(STORAGE_KEY_CHART_MODE) as 'native' | 'widget') || 'native';
    } catch {
      return 'native';
    }
  });

  const handleToggleRenderMode = (mode: 'native' | 'widget') => {
    setChartRenderMode(mode);
    try {
      localStorage.setItem(STORAGE_KEY_CHART_MODE, mode);
    } catch {}
  };

  // Persistent Technical Indicators
  const [indicatorsConfig, setIndicatorsConfig] = useState<PersistentIndicatorConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_INDICATORS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PERSISTENT_INDICATORS);
      if (saved) {
        return { ...DEFAULT_INDICATORS, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_INDICATORS;
  });

  const toggleIndicator = (key: keyof PersistentIndicatorConfig) => {
    setIndicatorsConfig((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(STORAGE_KEY_PERSISTENT_INDICATORS, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Timeframe interval (1m, 5m, 15m, 1h, 4h, 1d)
  const [chartInterval, setChartInterval] = useState<string>(() => {
    if (typeof window === 'undefined') return '15m';
    try {
      return localStorage.getItem(STORAGE_KEY_CHART_INTERVAL) || '15m';
    } catch {
      return '15m';
    }
  });

  const handleSelectInterval = (val: string) => {
    setChartInterval(val);
    try {
      localStorage.setItem(STORAGE_KEY_CHART_INTERVAL, val);
    } catch {}
  };

  // Numeric Values
  const entryNum = entryPrice ? parseFloat(entryPrice) : NaN;
  const beNum = breakEvenPrice ? parseFloat(breakEvenPrice) : NaN;
  const currentPriceNum = livePrice ? parseFloat(livePrice) : NaN;

  // Custom User Lines (persisted per symbol)
  const storageKeyCustomLines = `tv_custom_lines_${binanceSymbol}`;
  const [customLines, setCustomLines] = useState<CustomChartLine[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(`tv_custom_lines_${binanceSymbol}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const persistCustomLines = useCallback((lines: CustomChartLine[]) => {
    try {
      localStorage.setItem(storageKeyCustomLines, JSON.stringify(lines));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(EVENT_CHART_ALERTS_CHANGED, {
            detail: { symbol: binanceSymbol, fromChartModal: true },
          })
        );
        emitUnifiedAlertsChanged('chart_lines');
      }
    } catch {}
  }, [storageKeyCustomLines, binanceSymbol]);

  // Target Exit Price Alert
  const storageKeyExitAlert = `tv_exit_alert_${binanceSymbol}`;
  const [exitAlertPrice, setExitAlertPrice] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const saved = localStorage.getItem(`tv_exit_alert_${binanceSymbol}`);
      if (saved) return JSON.parse(saved).price || '';
    } catch {}
    return '';
  });

  const [exitAlertActive, setExitAlertActive] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem(`tv_exit_alert_${binanceSymbol}`);
      if (saved) return Boolean(JSON.parse(saved).active);
    } catch {}
    return false;
  });

  const [showExitAlertModal, setShowExitAlertModal] = useState<boolean>(false);

  const persistExitAlert = useCallback((price: string, active: boolean, fired = false) => {
    try {
      const prevRaw = localStorage.getItem(storageKeyExitAlert);
      const prev = prevRaw ? JSON.parse(prevRaw) : {};
      localStorage.setItem(
        storageKeyExitAlert,
        JSON.stringify({ ...prev, price, active, fired })
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(EVENT_CHART_ALERTS_CHANGED, {
            detail: { symbol: binanceSymbol, fromChartModal: true },
          })
        );
        emitUnifiedAlertsChanged('chart_lines');
      }
    } catch {}
  }, [storageKeyExitAlert, binanceSymbol]);

  // Add/Edit Line Modal State
  const [isLineEditorOpen, setIsLineEditorOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [lineEditorPrice, setLineEditorPrice] = useState<string>('');
  const [lineEditorColor, setLineEditorColor] = useState<string>('#06b6d4');
  const [lineEditorStyle, setLineEditorStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [lineEditorThickness, setLineEditorThickness] = useState<1 | 2 | 3 | 4>(2);
  const [lineEditorLabel, setLineEditorLabel] = useState<string>('');
  const [lineEditorAlert, setLineEditorAlert] = useState<boolean>(false);

  // Break-Even Spread Percentage
  const breakEvenSpreadPercent = useMemo(() => {
    if (isNaN(entryNum) || entryNum <= 0 || isNaN(beNum) || beNum <= 0) return null;
    return ((beNum - entryNum) / entryNum) * 100;
  }, [entryNum, beNum]);

  // Live Net P&L
  const pnlData = useMemo(() => {
    if (isNaN(entryNum) || entryNum <= 0 || isNaN(currentPriceNum) || currentPriceNum <= 0) return null;
    const diff = currentPriceNum - entryNum;
    const percent = (diff / entryNum) * 100;
    const qty = coinQuantity ? parseFloat(coinQuantity) : (tradeAmount ? parseFloat(tradeAmount) / entryNum : 100 / entryNum);
    const usdt = diff * qty;
    return { percent, usdt, isProfit: diff >= 0 };
  }, [entryNum, currentPriceNum, coinQuantity, tradeAmount]);

  // Active Test Prices list
  const activeTestPrices = useMemo(() => {
    const list: Array<{ price: string; timestamp?: number; num: number }> = [];
    testPrices.forEach((tp, idx) => {
      const p = parseFloat(tp);
      if (!isNaN(p) && p > 0) {
        list.push({ price: tp, timestamp: testPriceTimestamps[idx], num: p });
      }
    });
    return list;
  }, [testPrices, testPriceTimestamps]);

  // Copy helper
  const handleCopyPrice = (val: string, fieldId: string) => {
    if (!val) return;
    try {
      navigator.clipboard.writeText(val);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {}
  };

  // Ref to keep latest customLines accessible without re-subscribing chart click
  const customLinesRef = useRef<CustomChartLine[]>(customLines);
  useEffect(() => {
    customLinesRef.current = customLines;
  }, [customLines]);
  const firedAlertsRef = useRef<Set<string>>(new Set());

  // Two-way sync when UnifiedAlertsModal edits or resets chart lines / exit alerts (or symbol changes)
  useEffect(() => {
    const loadStoredChartAlerts = () => {
      try {
        const rawLines = localStorage.getItem(storageKeyCustomLines);
        const parsedLines = rawLines ? JSON.parse(rawLines) : [];
        setCustomLines(Array.isArray(parsedLines) ? parsedLines : []);
      } catch {
        setCustomLines([]);
      }
      try {
        const rawExit = localStorage.getItem(storageKeyExitAlert);
        if (rawExit) {
          const parsedExit = JSON.parse(rawExit);
          setExitAlertPrice(parsedExit.price || '');
          setExitAlertActive(Boolean(parsedExit.active));
        } else {
          setExitAlertPrice('');
          setExitAlertActive(false);
        }
      } catch {
        // Ignore
      }
      firedAlertsRef.current.clear();
    };

    const timer = setTimeout(loadStoredChartAlerts, 0);

    const handleExternalChartChange = (e: Event) => {
      if (e instanceof CustomEvent && e.detail?.fromChartModal) return;
      if (e instanceof CustomEvent && e.detail?.symbol && e.detail.symbol !== binanceSymbol) return;
      loadStoredChartAlerts();
    };

    window.addEventListener(EVENT_CHART_ALERTS_CHANGED, handleExternalChartChange);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(EVENT_CHART_ALERTS_CHANGED, handleExternalChartChange);
    };
  }, [storageKeyCustomLines, storageKeyExitAlert, binanceSymbol]);

  const handleEditLine = useCallback((line: CustomChartLine) => {
    setEditingLineId(line.id);
    setLineEditorPrice(line.price.toString());
    setLineEditorColor(line.color);
    setLineEditorStyle(line.style);
    setLineEditorThickness(line.thickness);
    setLineEditorLabel(line.label || '');
    setLineEditorAlert(Boolean(line.hasAlert));
    setIsLineEditorOpen(true);
  }, []);

  const handleOpenAddLine = useCallback((suggestedPrice?: number) => {
    setEditingLineId(null);
    setLineEditorPrice(suggestedPrice ? suggestedPrice.toString() : livePrice || entryPrice || '');
    setLineEditorColor('#06b6d4');
    setLineEditorStyle('solid');
    setLineEditorThickness(2);
    setLineEditorLabel('');
    setLineEditorAlert(false);
    setIsLineEditorOpen(true);
  }, [livePrice, entryPrice]);

  // ---------------------------------------------------------------------------
  // NATIVE LIGHTWEIGHT CHARTS INTEGRATION
  // ---------------------------------------------------------------------------
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const indicatorSeriesRefs = useRef<Map<string, ISeriesApi<'Line' | 'Histogram'>>>(new Map());
  const priceLinesMapRef = useRef<Map<string, IPriceLine>>(new Map());

  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(true);
  const [candlesData, setCandlesData] = useState<CandleData[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch Klines from API asynchronously
  const fetchKlines = useCallback(async () => {
    setIsLoadingCandles(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/binance/klines?symbol=${cleanSymbol}&interval=${chartInterval}&limit=300`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.candles) && data.candles.length > 0) {
        const mapped: CandleData[] = data.candles.map((c: { time: number; open: number; high: number; low: number; close: number; volume: number }) => ({
          time: Number(c.time) as UTCTimestamp,
          open: Number(c.open),
          high: Number(c.high),
          low: Number(c.low),
          close: Number(c.close),
          volume: Number(c.volume),
        }));
        setCandlesData(mapped);
      } else {
        setFetchError(data.error || 'تعذر جلب بيانات الشارت');
      }
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'خطأ في الاتصال');
    } finally {
      setIsLoadingCandles(false);
    }
  }, [cleanSymbol, chartInterval]);

  useEffect(() => {
    if (chartRenderMode === 'native' && isOpen) {
      let active = true;
      (async () => {
        try {
          const res = await fetch(`/api/binance/klines?symbol=${cleanSymbol}&interval=${chartInterval}&limit=300`);
          const data = await res.json();
          if (!active) return;
          if (res.ok && Array.isArray(data.candles) && data.candles.length > 0) {
            const mapped: CandleData[] = data.candles.map((c: { time: number; open: number; high: number; low: number; close: number; volume: number }) => ({
              time: Number(c.time) as UTCTimestamp,
              open: Number(c.open),
              high: Number(c.high),
              low: Number(c.low),
              close: Number(c.close),
              volume: Number(c.volume),
            }));
            setCandlesData(mapped);
            setFetchError(null);
          } else {
            setFetchError(data.error || 'تعذر جلب بيانات الشارت');
          }
        } catch (err: unknown) {
          if (!active) return;
          setFetchError(err instanceof Error ? err.message : 'خطأ في الاتصال');
        } finally {
          if (active) {
            setIsLoadingCandles(false);
          }
        }
      })();
      return () => {
        active = false;
      };
    }
  }, [cleanSymbol, chartInterval, chartRenderMode, isOpen]);

  // Mount and manage Lightweight Chart
  useEffect(() => {
    if (chartRenderMode !== 'native' || !chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0b0f19' : '#ffffff' },
        textColor: isDark ? '#94a3b8' : '#334155',
      },
      grid: {
        vertLines: { color: isDark ? '#1e293b' : '#f1f5f9' },
        horzLines: { color: isDark ? '#1e293b' : '#f1f5f9' },
      },
      timeScale: {
        borderColor: isDark ? '#334155' : '#cbd5e1',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: isDark ? '#334155' : '#cbd5e1',
        autoScale: true,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    });

    chartInstanceRef.current = chart;

    // Candlestick Series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });
    candleSeriesRef.current = candleSeries;

    // Volume Series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '', // overlay
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0 && chartInstanceRef.current) {
        const { width: w, height: h } = entries[0].contentRect;
        chartInstanceRef.current.applyOptions({ width: w, height: h });
      }
    });
    resizeObserver.observe(container);

    // Chart click listener to pick price or edit line
    chart.subscribeClick((param) => {
      if (param.point && candleSeriesRef.current) {
        const p = candleSeriesRef.current.coordinateToPrice(param.point.y);
        if (p) {
          const matched = customLinesRef.current.find((l) => Math.abs((l.price - p) / p) < 0.003);
          if (matched) {
            handleEditLine(matched);
          }
        }
      }
    });

    const indicatorSeries = indicatorSeriesRefs.current;
    const priceLines = priceLinesMapRef.current;

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartInstanceRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      indicatorSeries.clear();
      priceLines.clear();
    };
  }, [chartRenderMode, isDark, handleEditLine]);

  // Update Candles and Volume data
  useEffect(() => {
    if (!candleSeriesRef.current || candlesData.length === 0) return;

    candleSeriesRef.current.setData(candlesData);

    if (volumeSeriesRef.current && indicatorsConfig.volume) {
      volumeSeriesRef.current.setData(formatVolumeData(candlesData));
    } else if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData([]);
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.timeScale().fitContent();
    }
  }, [candlesData, indicatorsConfig.volume]);

  // Live Price Tick into latest candle
  useEffect(() => {
    if (!candleSeriesRef.current || candlesData.length === 0 || !currentPriceNum || isNaN(currentPriceNum)) return;
    const last = candlesData[candlesData.length - 1];
    if (!last) return;

    const updatedLast: CandleData = {
      ...last,
      high: Math.max(last.high, currentPriceNum),
      low: Math.min(last.low, currentPriceNum),
      close: currentPriceNum,
    };

    try {
      candleSeriesRef.current.update(updatedLast);
    } catch {}
  }, [currentPriceNum, candlesData]);

  // Render and sync Technical Indicators (SMA, EMA, Bollinger, RSI, MACD)
  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart || candlesData.length === 0) return;

    const activeMap = indicatorSeriesRefs.current;

    // Helper: update or remove line series
    const syncLineSeries = (key: string, enabled: boolean, points: LinePoint[], color: string, width = 2) => {
      let series = activeMap.get(key) as ISeriesApi<'Line'> | undefined;
      if (enabled) {
        if (!series) {
          series = chart.addSeries(LineSeries, {
            color,
            lineWidth: width as 1 | 2 | 3 | 4,
            priceLineVisible: false,
            lastValueVisible: true,
          });
          activeMap.set(key, series);
        }
        series.setData(points);
      } else if (series) {
        chart.removeSeries(series);
        activeMap.delete(key);
      }
    };

    // 1. SMA 20
    syncLineSeries('sma20', indicatorsConfig.sma20, calculateSMA(candlesData, 20), '#3b82f6', 2);

    // 2. SMA 50
    syncLineSeries('sma50', indicatorsConfig.sma50, calculateSMA(candlesData, 50), '#f59e0b', 2);

    // 3. EMA 20
    syncLineSeries('ema20', indicatorsConfig.ema20, calculateEMA(candlesData, 20), '#a855f7', 2);

    // 4. Bollinger Bands (Upper & Lower)
    const bb = calculateBollingerBands(candlesData, 20, 2);
    syncLineSeries('bb_upper', indicatorsConfig.bollinger, bb.upper, '#06b6d4', 1);
    syncLineSeries('bb_lower', indicatorsConfig.bollinger, bb.lower, '#06b6d4', 1);

    // 5. RSI 14 (plotted on separate price scale)
    let rsiSeries = activeMap.get('rsi') as ISeriesApi<'Line'> | undefined;
    if (indicatorsConfig.rsi) {
      if (!rsiSeries) {
        rsiSeries = chart.addSeries(LineSeries, {
          color: '#ec4899',
          lineWidth: 2,
          priceScaleId: 'rsi_scale',
          priceLineVisible: false,
          lastValueVisible: true,
        });
        chart.priceScale('rsi_scale').applyOptions({
          scaleMargins: { top: 0.75, bottom: 0.05 },
        });
        activeMap.set('rsi', rsiSeries);
      }
      rsiSeries.setData(calculateRSI(candlesData, 14));
    } else if (rsiSeries) {
      chart.removeSeries(rsiSeries);
      activeMap.delete('rsi');
    }
  }, [candlesData, indicatorsConfig]);

  // Synchronize Physical Price Lines (Entry, Break-Even, Exit Alert, Custom Lines)
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;

    const currentMap = priceLinesMapRef.current;

    // Helper: upsert price line
    const upsertLine = (
      id: string,
      price: number,
      color: string,
      style: LineStyle,
      width: 1 | 2 | 3 | 4,
      title: string
    ) => {
      if (isNaN(price) || price <= 0) {
        const existing = currentMap.get(id);
        if (existing) {
          series.removePriceLine(existing);
          currentMap.delete(id);
        }
        return;
      }

      const existing = currentMap.get(id);
      if (existing) {
        existing.applyOptions({
          price,
          color,
          lineStyle: style,
          lineWidth: width,
          title,
          axisLabelVisible: true,
        });
      } else {
        const newLine = series.createPriceLine({
          price,
          color,
          lineStyle: style,
          lineWidth: width,
          title,
          axisLabelVisible: true,
        });
        currentMap.set(id, newLine);
      }
    };

    // 1. Entry Price Line
    if (entryNum && !isNaN(entryNum)) {
      upsertLine('sys_entry', entryNum, '#06b6d4', LineStyle.Solid, 2, `دخول $${trimTrailingZeros(entryNum.toString())}`);
    } else {
      upsertLine('sys_entry', NaN, '', LineStyle.Solid, 1, '');
    }

    // 2. Break-Even Price Line
    if (beNum && !isNaN(beNum)) {
      const spread = breakEvenSpreadPercent !== null ? ` (+${breakEvenSpreadPercent.toFixed(2)}%)` : '';
      upsertLine('sys_be', beNum, '#f59e0b', LineStyle.Dashed, 2, `تعادل $${trimTrailingZeros(beNum.toString())}${spread}`);
    } else {
      upsertLine('sys_be', NaN, '', LineStyle.Solid, 1, '');
    }

    // 3. Exit Alert Price Line
    const exitNum = parseFloat(exitAlertPrice);
    if (exitAlertActive && !isNaN(exitNum) && exitNum > 0) {
      upsertLine('sys_exit', exitNum, '#ec4899', LineStyle.Dotted, 2, `هدف خروج $${trimTrailingZeros(exitNum.toString())}`);
    } else {
      upsertLine('sys_exit', NaN, '', LineStyle.Solid, 1, '');
    }

    // 4. Custom User Lines
    const activeIds = new Set<string>(['sys_entry', 'sys_be', 'sys_exit']);
    customLines.forEach((cl) => {
      const lineStyle = cl.style === 'dashed' ? LineStyle.Dashed : cl.style === 'dotted' ? LineStyle.Dotted : LineStyle.Solid;
      const label = cl.label ? `${cl.label} $${trimTrailingZeros(cl.price.toString())}` : `$${trimTrailingZeros(cl.price.toString())}`;
      upsertLine(cl.id, cl.price, cl.color, lineStyle, cl.thickness, label);
      activeIds.add(cl.id);
    });

    // Remove deleted lines
    for (const [id, line] of Array.from(currentMap.entries())) {
      if (!activeIds.has(id)) {
        series.removePriceLine(line);
        currentMap.delete(id);
      }
    }
  }, [entryNum, beNum, breakEvenSpreadPercent, exitAlertActive, exitAlertPrice, customLines]);

  // ---------------------------------------------------------------------------
  // PRICE ALERTS MONITORING (Synced lock IDs with Unified Background Engine)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!currentPriceNum || isNaN(currentPriceNum) || currentPriceNum <= 0) return;

    // Check Exit Target Alert
    const exitNum = parseFloat(exitAlertPrice);
    if (exitAlertActive && !isNaN(exitNum) && exitNum > 0) {
      let exitRepeatMode: 'once' | 'continuous' = 'once';
      let exitIntervalSec = 60;
      let exitToneId: AlertToneId | undefined = undefined;
      let exitFiredFlag = false;
      try {
        const rawExit = localStorage.getItem(storageKeyExitAlert);
        if (rawExit) {
          const parsed = JSON.parse(rawExit);
          exitRepeatMode = parsed.repeatMode || 'once';
          exitIntervalSec = parsed.intervalSeconds || 60;
          exitToneId = parsed.toneId as AlertToneId | undefined;
          exitFiredFlag = Boolean(parsed.fired);
        }
      } catch {}

      if (!(exitRepeatMode === 'once' && exitFiredFlag)) {
        const shouldTrigger = entryNum && !isNaN(entryNum) && exitNum < entryNum
          ? currentPriceNum <= exitNum
          : currentPriceNum >= exitNum;

        const uniqueExitId = `chart_exit_${binanceSymbol}`;
        if (shouldTrigger && canTriggerAlert('targetExit', uniqueExitId, exitRepeatMode, exitIntervalSec)) {
          recordAlertTriggered('targetExit', uniqueExitId);
          dispatchUnifiedNotification({
            title: `🎯 وصول هدف خروج الشارت: ${binanceSymbol}`,
            body: `وصل السعر إلى $${currentPriceNum} (هدف الخروج: $${exitNum})`,
            tag: `exit_${binanceSymbol}`,
            toneId: exitToneId || soundAlert.getActiveTone(),
          });
          if (exitRepeatMode === 'once') {
            persistExitAlert(exitAlertPrice, exitAlertActive, true);
          }
        }
      }
    }

    // Check Custom Lines Alerts
    let anyLineUpdated = false;
    const nextLines = customLines.map((cl) => {
      if (!cl.hasAlert) return cl;
      const repeatMode = cl.alertRepeatMode || 'once';
      if (repeatMode === 'once' && (cl.alertFired || firedAlertsRef.current.has(cl.id))) {
        return cl;
      }
      const dir = cl.alertDirection || 'above';
      const triggered = dir === 'above' ? currentPriceNum >= cl.price : currentPriceNum <= cl.price;
      const uniqueLineId = `${binanceSymbol}_${cl.id}`;

      if (triggered && canTriggerAlert('chartLines', uniqueLineId, repeatMode, cl.alertIntervalSeconds || 60)) {
        firedAlertsRef.current.add(cl.id);
        recordAlertTriggered('chartLines', uniqueLineId);
        dispatchUnifiedNotification({
          title: `🔔 ملامسة خط الشارت: ${cl.label || binanceSymbol}`,
          body: `السعر الحالي $${currentPriceNum} تخطى الخط المحدد عند $${cl.price}`,
          tag: `line_${cl.id}`,
          toneId: cl.alertToneId || 'bell',
        });

        if (repeatMode === 'once') {
          anyLineUpdated = true;
          return { ...cl, alertFired: true };
        }
      }
      return cl;
    });

    if (anyLineUpdated) {
      setCustomLines(nextLines);
      persistCustomLines(nextLines);
    }
  }, [currentPriceNum, exitAlertActive, exitAlertPrice, entryNum, binanceSymbol, customLines, persistCustomLines, persistExitAlert, storageKeyExitAlert]);

  // ---------------------------------------------------------------------------
  // LINE MANAGEMENT HANDLERS
  // ---------------------------------------------------------------------------
  const handleSaveLine = () => {
    const pNum = parseFloat(lineEditorPrice);
    if (isNaN(pNum) || pNum <= 0) return;

    if (editingLineId) {
      const next = customLines.map((l) => (l.id === editingLineId ? {
        ...l,
        price: pNum,
        color: lineEditorColor,
        style: lineEditorStyle,
        thickness: lineEditorThickness,
        label: lineEditorLabel.trim() || undefined,
        hasAlert: lineEditorAlert,
        alertDirection: currentPriceNum > 0 ? (pNum >= currentPriceNum ? 'above' as const : 'below' as const) : undefined,
        alertFired: false,
      } : l));
      setCustomLines(next);
      persistCustomLines(next);
    } else {
      const newLine: CustomChartLine = {
        id: `line_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        price: pNum,
        color: lineEditorColor,
        style: lineEditorStyle,
        thickness: lineEditorThickness,
        label: lineEditorLabel.trim() || undefined,
        hasAlert: lineEditorAlert,
        alertDirection: currentPriceNum > 0 ? (pNum >= currentPriceNum ? 'above' as const : 'below' as const) : undefined,
        alertFired: false,
      };
      const next = [...customLines, newLine];
      setCustomLines(next);
      persistCustomLines(next);
    }

    if (lineEditorAlert) {
      systemNotification.requestPermission();
    }
    setIsLineEditorOpen(false);
  };

  const handleDeleteLine = (id: string) => {
    const next = customLines.filter((l) => l.id !== id);
    setCustomLines(next);
    persistCustomLines(next);
  };

  // Adjust price coordinate nudges
  const nudgeLinePrice = (deltaPercent: number) => {
    const current = parseFloat(lineEditorPrice);
    if (!isNaN(current) && current > 0) {
      const next = current * (1 + deltaPercent / 100);
      setLineEditorPrice(trimTrailingZeros(next.toString()));
    }
  };

  // ---------------------------------------------------------------------------
  // SAVE AS IMAGE
  // ---------------------------------------------------------------------------
  const handleSaveAsImage = async () => {
    setIsCapturingScreenshot(true);
    try {
      if (chartInstanceRef.current) {
        const canvas = chartInstanceRef.current.takeScreenshot();
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${binanceSymbol}_Chart_${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch {
      // Fallback
    } finally {
      setIsCapturingScreenshot(false);
      setShowToolsMenu(false);
    }
  };

  // TradingView Iframe Widget fallback URL
  const iframeSrc = useMemo(() => {
    const toolbarColor = isDark ? '0f172a' : 'ffffff';
    return `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_advanced_chart&symbol=${encodeURIComponent(
      resolvedSymbolInfo.fullTradingViewSymbol
    )}&interval=15&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=${toolbarColor}&theme=${chartTheme}&style=1&timezone=Etc%2FUTC&locale=ar_AE&allow_symbol_change=1&details=1&withdateranges=1`;
  }, [resolvedSymbolInfo.fullTradingViewSymbol, chartTheme, isDark]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-[70] flex flex-col transition-colors duration-200 ${
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
        {/* TOP HEADER HUD (STREAMLINED & MAXIMIZED FOR CHART VIEWPORT)              */}
        {/* ========================================================================= */}
        <header 
          className={`flex flex-col border-b shrink-0 transition-colors ${
            isDark ? 'bg-slate-900/95 border-slate-800 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
          }`}
        >
          {/* Row 1: Primary Controls, Price Stats & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            {/* Right: Close & Coin Identity & Search */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-md"
                title="إغلاق الشارت"
              >
                <X className="w-4 h-4 stroke-[3]" />
                <span>إغلاق</span>
              </button>

              <div className="flex items-center gap-1.5 mr-1">
                <CoinAvatar symbol={baseAsset} size="sm" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-sm tracking-tight">
                      {resolvedSymbolInfo.cleanPairName}
                    </span>
                    <span className={`text-[9px] font-black font-mono px-1.5 py-0.2 rounded-md border flex items-center gap-0.5 ${
                      resolvedSymbolInfo.isDex
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                        : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    }`}>
                      {resolvedSymbolInfo.isDex && <Globe className="w-2.5 h-2.5" />}
                      {resolvedSymbolInfo.exchangeBadge}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchSymbolInput(activeRawSymbol);
                        setIsSearchModalOpen(true);
                      }}
                      className="p-1 rounded-lg text-amber-500 hover:bg-amber-500/20 border border-amber-500/30 transition cursor-pointer"
                      title="بحث وتغيير الرمز / المنصة"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {livePrice && (
                    <div className="flex items-center gap-1 text-xs font-mono font-black text-emerald-500">
                      <span>${trimTrailingZeros(livePrice)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Middle: Entry, Break-Even & P&L Badges */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5">
              {/* Entry Price Badge */}
              <div 
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border ${
                  isDark ? 'bg-slate-800/90 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                <span className="font-bold text-[10px] text-slate-400">الدخول:</span>
                <span className="font-mono font-black text-[11px]" dir="ltr">
                  {entryPrice ? `$${trimTrailingZeros(entryPrice)}` : '—'}
                </span>
                {entryPrice && (
                  <button
                    type="button"
                    onClick={() => handleCopyPrice(entryPrice, 'entry')}
                    className="p-0.5 text-slate-400 hover:text-amber-500 transition cursor-pointer"
                    title="نسخ سعر الدخول"
                  >
                    {copiedField === 'entry' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>

              {/* Break-Even Price Badge */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="font-bold text-amber-500 text-[10px]">التعادل:</span>
                <span className="font-mono font-black text-amber-500 text-[11px]" dir="ltr">
                  {breakEvenPrice ? `$${trimTrailingZeros(breakEvenPrice)}` : '—'}
                </span>
                {breakEvenSpreadPercent !== null && (
                  <span className="font-mono font-black text-[10px] px-1 rounded bg-amber-500/20 text-amber-400">
                    +{breakEvenSpreadPercent.toFixed(1)}%
                  </span>
                )}
                {breakEvenPrice && (
                  <button
                    type="button"
                    onClick={() => handleCopyPrice(breakEvenPrice, 'be')}
                    className="p-0.5 text-amber-400 hover:text-amber-300 transition cursor-pointer"
                    title="نسخ سعر التعادل"
                  >
                    {copiedField === 'be' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
              </div>

              {/* Net P&L Badge */}
              {pnlData && (
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg font-mono text-xs font-black border ${
                  pnlData.isProfit 
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500' 
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-500'
                }`}>
                  {pnlData.isProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{pnlData.isProfit ? '+' : ''}{pnlData.percent.toFixed(2)}%</span>
                </div>
              )}
            </div>

            {/* Left: Quick Actions & Compact Navigation Icons */}
            <div className="flex items-center gap-1.5">
              {/* Compact Screen Integration Buttons matching Bottom Navigation */}
              <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/60">
                {onNavigateToCalculator && (
                  <button
                    type="button"
                    onClick={() => onNavigateToCalculator(baseAsset, entryPrice || livePrice)}
                    className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-500/20 transition cursor-pointer"
                    title="حاسبة التعادل"
                  >
                    <Calculator className="w-4 h-4" />
                  </button>
                )}

                {onNavigateToRangeMaster && (
                  <button
                    type="button"
                    onClick={() => onNavigateToRangeMaster(baseAsset)}
                    className="p-1.5 rounded-lg text-cyan-400 hover:bg-cyan-500/20 transition cursor-pointer"
                    title="صائد القيعان"
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                )}

                {onNavigateToTracker && (
                  <button
                    type="button"
                    onClick={() => onNavigateToTracker(baseAsset)}
                    className="p-1.5 rounded-lg text-purple-400 hover:bg-purple-500/20 transition cursor-pointer"
                    title="رصد الصعود"
                  >
                    <TrendingUp className="w-4 h-4" />
                  </button>
                )}

                {onNavigateToWatchlist && (
                  <button
                    type="button"
                    onClick={onNavigateToWatchlist}
                    className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/20 transition cursor-pointer"
                    title="قائمة المراقبة"
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Add Custom Price Line Button */}
              <button
                type="button"
                onClick={() => handleOpenAddLine()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                title="إضافة خط سعري جديد على الشارت"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span className="hidden sm:inline">خط</span>
              </button>

              {/* Unified Alerts Center Shortcut Button */}
              <button
                type="button"
                onClick={() => openUnifiedAlertsCenter('chart_lines')}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-bold text-xs transition cursor-pointer"
                title="إدارة تنبيهات خطوط الشارت وهدف الخروج من المركز الموحد"
              >
                <Bell className="w-3.5 h-3.5" />
                <span className="hidden md:inline">التنبيهات</span>
              </button>

              {/* Technical Indicators Config Button */}
              <button
                type="button"
                onClick={() => setShowIndicatorsModal(true)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/40 font-bold text-xs transition cursor-pointer"
                title="إعدادات وتخصيص المؤشرات الفنية المحفوظة"
              >
                <Activity className="w-3.5 h-3.5" />
                <span className="hidden md:inline">المؤشرات</span>
              </button>

              {/* Unified Tools Menu Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowToolsMenu((prev) => !prev)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition cursor-pointer"
                  title="أدوات وخيارات الشارت الثانوية"
                >
                  <Settings2 className="w-3.5 h-3.5 text-amber-400" />
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showToolsMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowToolsMenu(false)} 
                    />
                    <div className="absolute left-0 top-full mt-1.5 z-50 w-56 rounded-2xl bg-slate-900 border border-slate-700 p-2 shadow-2xl space-y-1 text-xs">
                      {/* Toggle Render Mode */}
                      <button
                        type="button"
                        onClick={() => {
                          handleToggleRenderMode(chartRenderMode === 'native' ? 'widget' : 'native');
                          setShowToolsMenu(false);
                        }}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-slate-800 text-right cursor-pointer"
                      >
                        <span className="text-slate-200 font-bold">نوع محرك الشارت:</span>
                        <span className="text-cyan-400 font-bold">
                          {chartRenderMode === 'native' ? 'خفيف أصلي ⚡' : 'TradingView كامل'}
                        </span>
                      </button>

                      {/* Exit Target Alert */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowExitAlertModal(true);
                          setShowToolsMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-800 text-right text-pink-400 cursor-pointer font-bold"
                      >
                        <Target className="w-4 h-4" />
                        <span>تحديد هدف خروج وتنبيه</span>
                      </button>

                      {/* Test Prices */}
                      {activeTestPrices.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowTestPricesDrawer((prev) => !prev);
                            setShowToolsMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-800 text-right text-amber-400 cursor-pointer font-bold"
                        >
                          <Clock className="w-4 h-4" />
                          <span>أسعار الاختبار ({activeTestPrices.length})</span>
                        </button>
                      )}

                      {/* Save Screenshot */}
                      <button
                        type="button"
                        onClick={handleSaveAsImage}
                        disabled={isCapturingScreenshot}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-800 text-right text-slate-200 cursor-pointer font-bold"
                      >
                        <Camera className="w-4 h-4 text-emerald-400" />
                        <span>حفظ لقطة شاشة كصورة</span>
                      </button>

                      {/* Theme Toggle */}
                      <button
                        type="button"
                        onClick={toggleChartTheme}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-slate-800 text-right cursor-pointer"
                      >
                        <span className="text-slate-300">مظهر الشارت:</span>
                        <span className="text-amber-400 font-bold">{isDark ? 'داكن 🌙' : 'فاتح ☀️'}</span>
                      </button>

                      {/* Fullscreen Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          setIsFullscreen((prev) => !prev);
                          setShowToolsMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-slate-800 text-right text-cyan-400 cursor-pointer font-bold"
                      >
                        <Maximize2 className="w-4 h-4" />
                        <span>{isFullscreen ? 'إنهاء ملء الشاشة' : 'ملء الشاشة'}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Timeframe Interval Selector Only */}
          <div className={`flex items-center justify-between px-3 py-1 border-t text-xs ${
            isDark ? 'bg-slate-950/70 border-slate-800/80' : 'bg-slate-100/80 border-slate-200'
          }`}>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-400">الفريم الزمني:</span>
              {[
                { id: '1m', label: '1د' },
                { id: '5m', label: '5د' },
                { id: '15m', label: '15د' },
                { id: '1h', label: '1س' },
                { id: '4h', label: '4س' },
                { id: '1d', label: 'يومي' },
              ].map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => handleSelectInterval(tf.id)}
                  className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold transition cursor-pointer ${
                    chartInterval === tf.id
                      ? 'bg-amber-400 text-slate-950 font-black shadow-xs'
                      : isDark ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-200 text-slate-700 hover:text-slate-950'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Custom Lines Quick Counter & Status */}
            <div className="flex items-center gap-2">
              {customLines.length > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-cyan-400 font-bold">
                  <span>خطوط مخصصة: {customLines.length}</span>
                </div>
              )}
              {chartRenderMode === 'native' && (
                <button
                  type="button"
                  onClick={fetchKlines}
                  className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                  title="تحديث بيانات الشارت"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCandles ? 'animate-spin text-amber-400' : ''}`} />
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* TEST PRICES DRAWER (COLLAPSED BY DEFAULT)                                  */}
        {/* ========================================================================= */}
        {showTestPricesDrawer && activeTestPrices.length > 0 && (
          <div className="border-b px-3 py-2 bg-slate-950 border-slate-800 shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-xs text-amber-400">أسعار الاختبار المسجلة ({activeTestPrices.length}):</span>
              <button
                type="button"
                onClick={() => setShowTestPricesDrawer(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {activeTestPrices.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs shrink-0">
                  <span className="font-mono font-bold text-white">${trimTrailingZeros(item.price)}</span>
                  <span className="text-[10px] text-slate-400">({formatTimestamp(item.timestamp)})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MAIN CHART VIEWPORT (MAXIMIZED CANVAS)                                    */}
        {/* ========================================================================= */}
        <main className="relative flex-1 w-full h-full min-h-[450px] overflow-hidden bg-slate-950">
          {chartRenderMode === 'native' ? (
            <>
              {/* Native Lightweight Chart Canvas Container */}
              <div 
                ref={chartContainerRef} 
                className="w-full h-full cursor-crosshair"
              />

              {/* Loading State Overlay */}
              {isLoadingCandles && candlesData.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-xs z-20">
                  <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mb-2" />
                  <span className="text-xs font-bold text-slate-300">جاري تحميل بيانات الشارت والشموع...</span>
                </div>
              )}

              {/* Error State with fallback button */}
              {fetchError && candlesData.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-20 p-4 text-center">
                  <p className="text-sm font-bold text-rose-400 mb-2">{fetchError}</p>
                  <p className="text-xs text-slate-400 mb-4">قد تكون هذه العملة مدرجة على منصة لامركزية (DEX) أو تتبع شبكة أخرى</p>
                  <button
                    type="button"
                    onClick={() => handleToggleRenderMode('widget')}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
                  >
                    التحويل لشارت TradingView المباشر
                  </button>
                </div>
              )}
            </>
          ) : (
            /* TradingView Official Web Embed Iframe */
            <iframe
              key={`${resolvedSymbolInfo.fullTradingViewSymbol}-${chartTheme}-${chartInterval}`}
              src={iframeSrc}
              className="w-full h-full border-0 block"
              title={`TradingView Chart for ${resolvedSymbolInfo.fullTradingViewSymbol}`}
              allow="fullscreen; clipboard-write"
              loading="lazy"
            />
          )}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT PHYSICAL PRICE LINE                                     */}
      {/* ========================================================================= */}
      {isLineEditorOpen && (
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md cursor-pointer" 
          dir="rtl"
          onClick={() => setIsLineEditorOpen(false)}
        >
          <div 
            className="w-full max-w-md p-5 rounded-3xl bg-slate-900 border border-slate-700 text-white shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-black text-sm text-cyan-400 flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                <span>{editingLineId ? 'تعديل الخط السعري الأفقي' : 'رسم خط أفقي جديد على الشارت'}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsLineEditorOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Price Coordinate with Nudge Buttons */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">سعر المستوى (USDT):</label>
                {livePrice && (
                  <button
                    type="button"
                    onClick={() => setLineEditorPrice(trimTrailingZeros(livePrice))}
                    className="text-[11px] font-mono font-bold text-emerald-400 hover:underline cursor-pointer"
                  >
                    السوق: ${trimTrailingZeros(livePrice)}
                  </button>
                )}
              </div>
              <input
                type="text"
                dir="ltr"
                inputMode="decimal"
                value={lineEditorPrice}
                onChange={(e) => setLineEditorPrice(e.target.value)}
                placeholder={livePrice || '0.00'}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 font-mono font-bold text-sm text-white focus:outline-none focus:border-cyan-500"
              />

              {/* Live Price Nudge Controls */}
              <div className="flex items-center gap-1.5 mt-1.5">
                {[
                  { label: '-1%', delta: -1 },
                  { label: '-0.2%', delta: -0.2 },
                  { label: '+0.2%', delta: 0.2 },
                  { label: '+1%', delta: 1 },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => nudgeLinePrice(btn.delta)}
                    className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 font-mono text-[11px] font-bold text-slate-300 transition cursor-pointer"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Palette */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">لون الخط:</label>
              <div className="flex items-center gap-2 flex-wrap">
                {LINE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setLineEditorColor(c.value)}
                    className={`w-7 h-7 rounded-full border border-black/30 transition transform hover:scale-110 cursor-pointer flex items-center justify-center ${
                      lineEditorColor === c.value ? 'ring-2 ring-white scale-110' : 'opacity-80'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  >
                    {lineEditorColor === c.value && <Check className="w-3.5 h-3.5 text-black" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Style & Thickness */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">نمط الخط:</label>
                <select
                  value={lineEditorStyle}
                  onChange={(e) => setLineEditorStyle(e.target.value as 'solid' | 'dashed' | 'dotted')}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white focus:outline-none"
                >
                  <option value="solid">متصل (Solid)</option>
                  <option value="dashed">متقطع (Dashed)</option>
                  <option value="dotted">منقط (Dotted)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">سماكة الخط:</label>
                <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl">
                  {([1, 2, 3, 4] as const).map((th) => (
                    <button
                      key={th}
                      type="button"
                      onClick={() => setLineEditorThickness(th)}
                      className={`flex-1 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                        lineEditorThickness === th ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {th}px
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Label (displayed cleanly on the price axis without obscuring boxes) */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">اسم / تصنيف المستوى:</label>
              <input
                type="text"
                value={lineEditorLabel}
                onChange={(e) => setLineEditorLabel(e.target.value)}
                placeholder="مثال: قمة سابقة، دعم 15د، هدف بيع..."
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Alert Toggle */}
            <div className="space-y-2">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 cursor-pointer">
                <span className="flex items-center gap-2 text-xs font-bold">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <span>تفعيل تنبيه صوتي وإشعار عند وصول السعر لهذا الخط</span>
                </span>
                <input
                  type="checkbox"
                  checked={lineEditorAlert}
                  onChange={(e) => setLineEditorAlert(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </label>

              <button
                type="button"
                onClick={() => openUnifiedAlertsCenter('chart_lines')}
                className="w-full py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>تخصيص التكرار والنغمة والسحابة في مركز التنبيهات الموحد</span>
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              {editingLineId ? (
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteLine(editingLineId);
                    setIsLineEditorOpen(false);
                  }}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white text-xs font-bold transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف الخط</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLineEditorOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveLine}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs transition cursor-pointer shadow-md"
                >
                  حفظ المستوى
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TECHNICAL INDICATORS SETTINGS                                      */}
      {/* ========================================================================= */}
      {showIndicatorsModal && (
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md cursor-pointer" 
          dir="rtl"
          onClick={() => setShowIndicatorsModal(false)}
        >
          <div 
            className="w-full max-w-md p-5 rounded-3xl bg-slate-900 border border-slate-700 text-white shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-black text-sm text-purple-400 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>المؤشرات الفنية (محفوظة دائماً على كل الشارتات)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowIndicatorsModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              أي مؤشر تقوم بتفعيله هنا يظل نشطاً ومحفوظاً على شارت أي عملة تفتحها ولا يختفي عند الخروج:
            </p>

            <div className="space-y-2">
              {[
                { key: 'volume', name: 'حجم التداول (Volume)', desc: 'أعمدة سيولة التداول في أسفل الشارت' },
                { key: 'sma20', name: 'المتوسط المتحرك البسيط (SMA 20)', desc: 'خط الاتجاه الكلاسيكي 20 شمعة' },
                { key: 'sma50', name: 'المتوسط المتحرك البسيط (SMA 50)', desc: 'خط الاتجاه المتوسط 50 شمعة' },
                { key: 'ema20', name: 'المتوسط الأسي السريع (EMA 20)', desc: 'متوسط أسي متجاوب مع حركة السعر' },
                { key: 'bollinger', name: 'بولنجر باندز (Bollinger Bands)', desc: 'نطاقات الانحراف المعياري والتقلب' },
                { key: 'rsi', name: 'مؤشر القوة النسبية (RSI 14)', desc: 'مناطق ذروة الشراء والبيع والتشبع' },
              ].map((ind) => {
                const isChecked = indicatorsConfig[ind.key as keyof PersistentIndicatorConfig];
                return (
                  <label
                    key={ind.key}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                      isChecked
                        ? 'bg-purple-600/15 border-purple-500/50 text-white'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{ind.name}</div>
                      <div className="text-[11px] text-slate-400">{ind.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleIndicator(ind.key as keyof PersistentIndicatorConfig)}
                      className="w-4 h-4 accent-purple-500 cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowIndicatorsModal(false)}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer"
              >
                تم وحفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EXIT TARGET ALERT CONFIG                                          */}
      {/* ========================================================================= */}
      {showExitAlertModal && (
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md cursor-pointer" 
          dir="rtl"
          onClick={() => setShowExitAlertModal(false)}
        >
          <div 
            className="w-full max-w-md p-5 rounded-3xl bg-slate-900 border border-slate-700 text-white shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-black text-sm text-pink-400 flex items-center gap-2">
                <Target className="w-4 h-4" />
                <span>تحديد هدف الخروج وتنبيه الوصول</span>
              </span>
              <button
                type="button"
                onClick={() => setShowExitAlertModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">سعر الهدف (USDT):</label>
              <input
                type="text"
                dir="ltr"
                inputMode="decimal"
                value={exitAlertPrice}
                onChange={(e) => setExitAlertPrice(e.target.value)}
                placeholder={breakEvenPrice || livePrice || '0.00'}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 font-mono font-bold text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/80 border border-slate-700 cursor-pointer">
              <span className="flex items-center gap-2 text-xs font-bold">
                <BellRing className="w-4 h-4 text-pink-400" />
                <span>تفعيل التنبيه المباشر في الخلفية</span>
              </span>
              <input
                type="checkbox"
                checked={exitAlertActive}
                onChange={(e) => setExitAlertActive(e.target.checked)}
                className="w-4 h-4 accent-pink-500 cursor-pointer"
              />
            </label>

            <button
              type="button"
              onClick={() => openUnifiedAlertsCenter('chart_lines')}
              className="w-full py-1.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 text-[11px] font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>تخصيص التكرار والنغمة والسحابة في مركز التنبيهات الموحد</span>
            </button>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setExitAlertActive(false);
                  persistExitAlert('', false);
                  setShowExitAlertModal(false);
                }}
                className="text-rose-400 hover:underline text-xs font-bold cursor-pointer"
              >
                تعطيل الهدف
              </button>

              <button
                type="button"
                onClick={() => {
                  persistExitAlert(exitAlertPrice, exitAlertActive);
                  if (exitAlertActive) systemNotification.requestPermission();
                  setShowExitAlertModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-black text-xs transition cursor-pointer"
              >
                حفظ الهدف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SEARCH & SWITCH SYMBOL                                             */}
      {/* ========================================================================= */}
      {isSearchModalOpen && (
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md cursor-pointer" 
          dir="rtl"
          onClick={() => setIsSearchModalOpen(false)}
        >
          <div 
            className="w-full max-w-md p-5 rounded-3xl bg-slate-900 border border-slate-700 text-white shadow-2xl space-y-4 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-black text-sm text-amber-400 flex items-center gap-2">
                <Search className="w-4 h-4" />
                <span>البحث عن عملة أو زوج في المنصات والبلوكتشين</span>
              </span>
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              value={searchSymbolInput}
              onChange={(e) => setSearchSymbolInput(e.target.value)}
              placeholder="مثال: BTCUSDT أو ATF أو STONFI2:ATFUSDT_EQAY5H"
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 font-mono text-sm text-white focus:outline-none focus:border-amber-500"
            />

            <div className="flex items-center gap-2 pt-2 border-t border-slate-800 justify-end">
              <button
                type="button"
                onClick={() => setIsSearchModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (searchSymbolInput.trim()) {
                    setUserSelectedSymbol(searchSymbolInput.trim().toUpperCase());
                  }
                  setIsSearchModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition cursor-pointer"
              >
                عرض الشارت
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
