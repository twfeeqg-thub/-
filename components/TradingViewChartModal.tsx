'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  Eye,
  EyeOff,
  Sliders,
  Camera,
  Plus,
  Trash2,
  Bell,
  BellRing,
  Target,
  Edit2,
  X,
  GripVertical,
  RotateCcw
} from 'lucide-react';
import { CoinAvatar } from './CoinAvatar';
import { trimTrailingZeros } from '@/lib/calculator';
import { useTheme } from '@/context/ThemeContext';
import { systemNotification } from '@/lib/systemNotification';
import { soundAlert } from '@/lib/soundAlert';
import { canTriggerAlert, recordAlertTriggered } from '@/lib/alertSettings';

export interface CustomChartLine {
  id: string;
  price: number;
  color: string;
  style: 'solid' | 'dashed' | 'dotted';
  thickness: 1 | 2 | 3 | 4;
  label?: string;
  textColor?: string;
  textSize?: 'sm' | 'base' | 'lg';
  hasAlert?: boolean;
  alertDirection?: 'above' | 'below';
  alertFired?: boolean;
}

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
  onNavigateToCalculator?: (currencyName: string, entryPrice?: string) => void;
  onNavigateToScalper?: (symbolName: string) => void;
}

const LINE_COLORS = [
  { label: 'سماوي', value: '#06b6d4', ring: 'ring-cyan-500' },
  { label: 'أخضر زمردي', value: '#10b981', ring: 'ring-emerald-500' },
  { label: 'ذهبي', value: '#f59e0b', ring: 'ring-amber-500' },
  { label: 'أحمر وردي', value: '#ef4444', ring: 'ring-rose-500' },
  { label: 'بنفسجي', value: '#8b5cf6', ring: 'ring-purple-500' },
  { label: 'برتقالي', value: '#f97316', ring: 'ring-orange-500' },
  { label: 'أبيض', value: '#ffffff', ring: 'ring-slate-300' },
];

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
  const [isFloatingHudCollapsed, setIsFloatingHudCollapsed] = useState(false);
  const [showInChartLevels, setShowInChartLevels] = useState(true);
  const [showTestPricesDrawer, setShowTestPricesDrawer] = useState(false);
  const [showTvTip, setShowTvTip] = useState(false);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);

  // Clean symbol for Binance (e.g. BTCUSDT)
  const cleanSymbol = symbol.trim().toUpperCase();
  const binanceSymbol = cleanSymbol.endsWith('USDT') ? cleanSymbol : `${cleanSymbol}USDT`;
  const baseAsset = currencyName.trim().toUpperCase() || binanceSymbol.replace('USDT', '');

  // Numeric Values
  const entryNum = entryPrice ? parseFloat(entryPrice) : NaN;
  const beNum = breakEvenPrice ? parseFloat(breakEvenPrice) : NaN;
  const currentPriceNum = livePrice ? parseFloat(livePrice) : NaN;

  // Custom Drawn Lines State (Persisted in localStorage per symbol)
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
    } catch {
      // Ignore
    }
  }, [storageKeyCustomLines]);

  // Exit Price Alert Target State
  const storageKeyExitAlert = `tv_exit_alert_${binanceSymbol}`;
  const [exitAlertPrice, setExitAlertPrice] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const saved = localStorage.getItem(`tv_exit_alert_${binanceSymbol}`);
      if (saved) return JSON.parse(saved).price || '';
    } catch {
      // Ignore
    }
    return '';
  });

  const [exitAlertActive, setExitAlertActive] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem(`tv_exit_alert_${binanceSymbol}`);
      if (saved) return Boolean(JSON.parse(saved).active);
    } catch {
      // Ignore
    }
    return false;
  });

  const [exitAlertFired, setExitAlertFired] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem(`tv_exit_alert_${binanceSymbol}`);
      if (saved) return Boolean(JSON.parse(saved).fired);
    } catch {
      // Ignore
    }
    return false;
  });

  const [showExitAlertModal, setShowExitAlertModal] = useState<boolean>(false);

  const persistExitAlert = useCallback((price: string, active: boolean, fired: boolean) => {
    try {
      localStorage.setItem(storageKeyExitAlert, JSON.stringify({ price, active, fired }));
    } catch {
      // Ignore
    }
  }, [storageKeyExitAlert]);

  // Add/Edit Line Modal State
  const [isLineEditorOpen, setIsLineEditorOpen] = useState(false);
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [lineEditorPrice, setLineEditorPrice] = useState<string>('');
  const [lineEditorColor, setLineEditorColor] = useState<string>('#06b6d4');
  const [lineEditorStyle, setLineEditorStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [lineEditorThickness, setLineEditorThickness] = useState<1 | 2 | 3 | 4>(2);
  const [lineEditorLabel, setLineEditorLabel] = useState<string>('');
  const [lineEditorTextColor, setLineEditorTextColor] = useState<string>('#ffffff');
  const [lineEditorTextSize, setLineEditorTextSize] = useState<'sm' | 'base' | 'lg'>('sm');
  const [lineEditorAlert, setLineEditorAlert] = useState<boolean>(false);

  // Context Menu State for Right-Click on Chart
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    estimatedPrice?: number;
  }>({ visible: false, x: 0, y: 0 });

  const [showLinesManager, setShowLinesManager] = useState<boolean>(false);
  const [chartInteractionMode, setChartInteractionMode] = useState<'draw_gesture' | 'browse_chart'>('draw_gesture');
  const chartOverlayRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Floating Mode Switcher Draggable State (via Long-Press)
  // Default position: top-left (أعلى يسار الشاشة في الجهة المقابلة لاسم العملة)
  const [switcherPos, setSwitcherPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('tv_chart_mode_switcher_pos');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            return parsed;
          }
        }
      } catch {
        // Ignore
      }
    }
    // Default initial coordinates: top-left (x: 12, y: 12) opposite the coin name
    return { x: 12, y: 12 };
  });

  const [isDraggingSwitcher, setIsDraggingSwitcher] = useState(false);
  const switcherRef = useRef<HTMLDivElement | null>(null);
  const switcherDragTimerRef = useRef<NodeJS.Timeout | null>(null);
  const switcherStartPointerRef = useRef<{ clientX: number; clientY: number; initialX: number; initialY: number } | null>(null);
  const switcherJustDraggedRef = useRef<boolean>(false);

  // 1. DYNAMIC IN-CHART LEVEL LINES:
  // Instead of static positions, Entry & Break-Even lines position dynamically relative to Live Price!
  const levelLinePositions = useMemo(() => {
    if (!entryNum || isNaN(entryNum)) return null;

    // Center baseline for current live price
    const centerTop = 50;

    const fallbackCalcTop = (p: number) => {
      if (entryNum && p > entryNum) return 40;
      if (entryNum && p < entryNum) return 60;
      return 50;
    };

    // If current price is not available yet, place comfortably
    if (isNaN(currentPriceNum) || currentPriceNum <= 0) {
      const exitNum = parseFloat(exitAlertPrice);
      return { 
        entryTop: 62, 
        beTop: beNum && !isNaN(beNum) ? 42 : null, 
        liveTop: 50,
        exitTop: !isNaN(exitNum) && exitNum > 0 ? 30 : null,
        calcTop: fallbackCalcTop
      };
    }

    // Dynamic price scale: find maximum delta from live price
    const deltas: number[] = [
      Math.abs((entryNum - currentPriceNum) / currentPriceNum),
    ];
    if (beNum && !isNaN(beNum)) {
      deltas.push(Math.abs((beNum - currentPriceNum) / currentPriceNum));
    }
    const exitNum = parseFloat(exitAlertPrice);
    if (!isNaN(exitNum) && exitNum > 0) {
      deltas.push(Math.abs((exitNum - currentPriceNum) / currentPriceNum));
    }
    customLines.forEach((l) => {
      deltas.push(Math.abs((l.price - currentPriceNum) / currentPriceNum));
    });

    const maxSpread = Math.max(...deltas, 0.012); // At least 1.2% visible scale
    const scaleFactor = 38 / maxSpread; // Maps max spread to +/- 38% from center (12% to 88% bounds)

    // Higher price -> smaller top % (higher on chart)
    const calcTop = (p: number) => {
      const delta = (p - currentPriceNum) / currentPriceNum;
      const rawTop = centerTop - delta * scaleFactor;
      return Math.max(12, Math.min(88, rawTop));
    };

    return {
      liveTop: centerTop,
      entryTop: calcTop(entryNum),
      beTop: beNum && !isNaN(beNum) ? calcTop(beNum) : null,
      exitTop: !isNaN(exitNum) && exitNum > 0 ? calcTop(exitNum) : null,
      calcTop,
    };
  }, [entryNum, beNum, currentPriceNum, exitAlertPrice, customLines]);

  // Break-Even Spread Percentage from Entry Price
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

  const exitAlertFiredRef = useRef<boolean>(exitAlertFired);
  useEffect(() => {
    exitAlertFiredRef.current = exitAlertFired;
  }, [exitAlertFired]);

  const customFiredSetRef = useRef<Set<string>>(new Set());

  // -------------------------------------------------------------
  // REAL-TIME NOTIFICATION MONITOR FOR EXIT TARGET & CUSTOM LINES
  // -------------------------------------------------------------
  useEffect(() => {
    if (isNaN(currentPriceNum) || currentPriceNum <= 0) return;

    // Check Exit Target Alert
    if (exitAlertActive && !exitAlertFiredRef.current && exitAlertPrice) {
      const exitTarget = parseFloat(exitAlertPrice);
      if (!isNaN(exitTarget) && exitTarget > 0) {
        const isTriggered = 
          (exitTarget >= entryNum && currentPriceNum >= exitTarget) ||
          (exitTarget < entryNum && currentPriceNum <= exitTarget) ||
          Math.abs(currentPriceNum - exitTarget) / exitTarget < 0.001;

        if (isTriggered) {
          exitAlertFiredRef.current = true;
          // Verify with unified alert settings (defaults to OFF)
          if (canTriggerAlert('targetExit', binanceSymbol)) {
            recordAlertTriggered('targetExit', binanceSymbol);
            soundAlert.playTone('celebration');

            // Desktop / Mobile Push Notification API
            systemNotification.sendNotification({
              title: `🎯 هدف الخروج تحقق: ${binanceSymbol}!`,
              body: `وصل سعر ${baseAsset} إلى هدف الخروج $${currentPriceNum} (المستهدف: $${exitTarget}).`,
              tag: `exit-alert-${binanceSymbol}`,
              icon: '/pwa-192x192.png',
              badge: '/icon.svg',
              renotify: true,
              requireInteraction: true,
            });
          }

          setTimeout(() => {
            setExitAlertFired(true);
            persistExitAlert(exitAlertPrice, true, true);
          }, 0);
        }
      }
    }

    // Check Custom Lines Alerts
    const newlyTriggeredIds: string[] = [];
    customLines.forEach((line) => {
      if (line.hasAlert && !line.alertFired && !customFiredSetRef.current.has(line.id)) {
        const diffRatio = Math.abs(currentPriceNum - line.price) / line.price;
        const crossed = 
          (line.alertDirection === 'above' && currentPriceNum >= line.price) ||
          (line.alertDirection === 'below' && currentPriceNum <= line.price) ||
          diffRatio < 0.001;

        if (crossed) {
          customFiredSetRef.current.add(line.id);
          newlyTriggeredIds.push(line.id);
          // Verify with unified alert settings (defaults to OFF)
          if (canTriggerAlert('chartLines', line.id)) {
            recordAlertTriggered('chartLines', line.id);
            soundAlert.playTone('bell');
            systemNotification.sendNotification({
              title: `🔔 تنبيه خط الشارت: ${binanceSymbol}!`,
              body: `وصل السعر إلى خط المستوى ${line.label || ''} عند $${currentPriceNum}.`,
              tag: `custom-line-${line.id}`,
              icon: '/pwa-192x192.png',
              renotify: true,
            });
          }
        }
      }
    });

    if (newlyTriggeredIds.length > 0) {
      setTimeout(() => {
        setCustomLines((prev) => {
          const updated = prev.map((l) => newlyTriggeredIds.includes(l.id) ? { ...l, alertFired: true } : l);
          persistCustomLines(updated);
          return updated;
        });
      }, 0);
    }
  }, [currentPriceNum, exitAlertActive, exitAlertPrice, entryNum, binanceSymbol, baseAsset, customLines, persistCustomLines, persistExitAlert]);

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

  // -------------------------------------------------------------
  // CUSTOM DRAWING LINE ACTIONS
  // -------------------------------------------------------------
  const handleOpenAddLine = (suggestedPrice?: number) => {
    setEditingLineId(null);
    setLineEditorPrice(suggestedPrice ? suggestedPrice.toString() : livePrice || entryPrice || '');
    setLineEditorColor('#06b6d4');
    setLineEditorStyle('solid');
    setLineEditorThickness(2);
    setLineEditorLabel('');
    setLineEditorTextColor('#ffffff');
    setLineEditorTextSize('sm');
    setLineEditorAlert(false);
    setIsLineEditorOpen(true);
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  const handleEditLine = (line: CustomChartLine) => {
    setEditingLineId(line.id);
    setLineEditorPrice(line.price.toString());
    setLineEditorColor(line.color);
    setLineEditorStyle(line.style);
    setLineEditorThickness(line.thickness);
    setLineEditorLabel(line.label || '');
    setLineEditorTextColor(line.textColor || '#ffffff');
    setLineEditorTextSize(line.textSize || 'sm');
    setLineEditorAlert(Boolean(line.hasAlert));
    setIsLineEditorOpen(true);
  };

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
        textColor: lineEditorTextColor,
        textSize: lineEditorTextSize,
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
        textColor: lineEditorTextColor,
        textSize: lineEditorTextSize,
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

  const handleClearAllLines = () => {
    setCustomLines([]);
    persistCustomLines([]);
    setShowLinesManager(false);
  };

  // -------------------------------------------------------------
  // CONTEXT MENU & DELIBERATE LONG PRESS (ضغط مطول 750ms مع إلغاء عند الحركة)
  // -------------------------------------------------------------
  const openContextMenuAt = useCallback((clientX: number, clientY: number) => {
    if (!chartOverlayRef.current) return;
    const rect = chartOverlayRef.current.getBoundingClientRect();
    const relY = Math.max(0, Math.min(rect.height, clientY - rect.top));
    const percentFromTop = (relY / rect.height) * 100;

    // Estimate price based on relative vertical height
    let estPrice = currentPriceNum || entryNum || 100;
    if (levelLinePositions) {
      const deltaPercent = (50 - percentFromTop) / 38;
      estPrice = currentPriceNum ? currentPriceNum * (1 + deltaPercent * 0.02) : estPrice;
    }

    // Clamp positions inside viewport
    const menuWidth = 240;
    const menuHeight = 270;
    const clampedX = Math.max(16, Math.min(clientX - menuWidth / 2, window.innerWidth - menuWidth - 16));
    const clampedY = Math.max(50, Math.min(clientY - 30, window.innerHeight - menuHeight - 20));

    setContextMenu({
      visible: true,
      x: clampedX,
      y: clampedY,
      estimatedPrice: estPrice,
    });
  }, [currentPriceNum, entryNum, levelLinePositions]);

  // Context menu on right click (Desktop)
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    openContextMenuAt(e.clientX, e.clientY);
  };

  // Mobile Touch Long-Press Handlers (deliberate 750ms hold, cancels on movement > 10px)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      touchStartPosRef.current = null;
      return;
    }
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
          navigator.vibrate(40);
        }
      } catch {
        // Ignore
      }
      openContextMenuAt(touch.clientX, touch.clientY);
      longPressTimerRef.current = null;
    }, 750); // Deliberate long press
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dist = Math.hypot(touch.clientX - touchStartPosRef.current.x, touch.clientY - touchStartPosRef.current.y);
    if (dist > 10) {
      // Movement > 10px -> user is panning or scrolling, cancel long-press immediately
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  // Desktop Mouse Long-Press Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left click only
    touchStartPosRef.current = { x: e.clientX, y: e.clientY };

    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      openContextMenuAt(e.clientX, e.clientY);
      longPressTimerRef.current = null;
    }, 750);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!touchStartPosRef.current) return;
    const dist = Math.hypot(e.clientX - touchStartPosRef.current.x, e.clientY - touchStartPosRef.current.y);
    if (dist > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  // Close context menu on outside click or escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && contextMenu.visible) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contextMenu.visible]);

  // -------------------------------------------------------------
  // FLOATING MODE SWITCHER: LONG-PRESS DRAG LOGIC (تحريك بالضغط المطول)
  // -------------------------------------------------------------
  const cancelSwitcherLongPress = useCallback(() => {
    if (switcherDragTimerRef.current) {
      clearTimeout(switcherDragTimerRef.current);
      switcherDragTimerRef.current = null;
    }
  }, []);

  const handleSwitcherPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Left button or primary touch only

    cancelSwitcherLongPress();
    switcherJustDraggedRef.current = false;

    const overlay = chartOverlayRef.current;
    const switcher = switcherRef.current;
    if (!overlay || !switcher) return;

    switcherStartPointerRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialX: switcherPos.x,
      initialY: switcherPos.y,
    };

    const targetEl = e.currentTarget;

    // Trigger drag mode after 320ms deliberate hold
    switcherDragTimerRef.current = setTimeout(() => {
      setIsDraggingSwitcher(true);
      switcherJustDraggedRef.current = true;
      try {
        targetEl.setPointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
      if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
        try {
          navigator.vibrate(35);
        } catch {
          // Ignore
        }
      }
    }, 320);
  };

  const handleSwitcherPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!switcherStartPointerRef.current) return;

    if (!isDraggingSwitcher) {
      const dist = Math.hypot(
        e.clientX - switcherStartPointerRef.current.clientX,
        e.clientY - switcherStartPointerRef.current.clientY
      );
      if (dist > 8) {
        // Moving before timer fires: cancel long-press so user can scroll/tap normally
        cancelSwitcherLongPress();
      }
      return;
    }

    // Active drag in progress
    e.preventDefault();
    switcherJustDraggedRef.current = true;

    const overlay = chartOverlayRef.current;
    const switcher = switcherRef.current;
    if (!overlay || !switcher) return;

    const overlayRect = overlay.getBoundingClientRect();
    const switcherRect = switcher.getBoundingClientRect();

    const deltaX = e.clientX - switcherStartPointerRef.current.clientX;
    const deltaY = e.clientY - switcherStartPointerRef.current.clientY;

    const maxX = Math.max(8, overlayRect.width - switcherRect.width - 8);
    const maxY = Math.max(8, overlayRect.height - switcherRect.height - 8);

    const newX = Math.max(8, Math.min(maxX, switcherStartPointerRef.current.initialX + deltaX));
    const newY = Math.max(8, Math.min(maxY, switcherStartPointerRef.current.initialY + deltaY));

    setSwitcherPos({ x: Math.round(newX), y: Math.round(newY) });
  };

  const handleSwitcherPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    cancelSwitcherLongPress();

    if (isDraggingSwitcher) {
      setIsDraggingSwitcher(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }

      // Persist chosen custom position
      try {
        localStorage.setItem('tv_chart_mode_switcher_pos', JSON.stringify(switcherPos));
      } catch {
        // Ignore
      }

      setTimeout(() => {
        switcherJustDraggedRef.current = false;
      }, 120);
    } else {
      switcherJustDraggedRef.current = false;
    }

    switcherStartPointerRef.current = null;
  };

  const handleResetSwitcherPos = (e: React.MouseEvent) => {
    e.stopPropagation();
    const defaultPos = { x: 12, y: 12 };
    setSwitcherPos(defaultPos);
    try {
      localStorage.setItem('tv_chart_mode_switcher_pos', JSON.stringify(defaultPos));
    } catch {
      // Ignore
    }
  };

  // -------------------------------------------------------------
  // SAVE AS IMAGE (حفظ لقطة شاشة للشارت مع كافة الخطوط)
  // -------------------------------------------------------------
  const handleSaveAsImage = async () => {
    setIsCapturingScreenshot(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 1200;
      const height = 750;
      canvas.width = width;
      canvas.height = height;

      // Background
      ctx.fillStyle = isDark ? '#090d16' : '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      // Grid Lines
      ctx.strokeStyle = isDark ? '#1e293b' : '#e2e8f0';
      ctx.lineWidth = 1;
      for (let x = 80; x < width; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, 70);
        ctx.lineTo(x, height - 50);
        ctx.stroke();
      }
      for (let y = 100; y < height - 50; y += 60) {
        ctx.beginPath();
        ctx.moveTo(40, y);
        ctx.lineTo(width - 40, y);
        ctx.stroke();
      }

      // Header Banner
      ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
      ctx.fillRect(0, 0, width, 70);
      ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
      ctx.strokeRect(0, 0, width, 70);

      // Title & Symbol
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`${binanceSymbol}  (BINANCE)`, 50, 42);

      // Price & Net P&L in Header
      if (livePrice) {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 22px monospace';
        ctx.fillText(`$${trimTrailingZeros(livePrice)}`, 320, 42);
      }

      if (pnlData) {
        ctx.fillStyle = pnlData.isProfit ? '#10b981' : '#f43f5e';
        ctx.font = 'bold 18px monospace';
        ctx.fillText(`صافي الربح: ${pnlData.isProfit ? '+' : ''}${pnlData.percent.toFixed(2)}% (${pnlData.usdt.toFixed(2)}$)`, 520, 42);
      }

      // Watermark / Date
      ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.fillText(`«بوت مراقبة صعود العملات» • ${new Date().toLocaleString('ar-AE')}`, width - 380, 42);

      // Draw Lines Helper
      const drawHLine = (yPos: number, color: string, isDashed: boolean, lw: number, label: string, priceStr: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.setLineDash(isDashed ? [8, 6] : []);
        ctx.beginPath();
        ctx.moveTo(60, yPos);
        ctx.lineTo(width - 160, yPos);
        ctx.stroke();
        ctx.setLineDash([]);

        // Price Badge on Right
        ctx.fillStyle = color;
        ctx.fillRect(width - 150, yPos - 14, 130, 28);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`${label} $${trimTrailingZeros(priceStr)}`, width - 145, yPos + 5);
      };

      // 1. Draw Live Market Price
      if (currentPriceNum > 0) {
        drawHLine(360, '#10b981', true, 2, 'سعر السوق', livePrice || '');
      }

      // 2. Draw Entry Line
      if (entryPrice && levelLinePositions) {
        const y = 80 + (levelLinePositions.entryTop / 100) * (height - 160);
        drawHLine(y, '#06b6d4', false, 3, 'دخول', entryPrice);
      }

      // 3. Draw Break-Even Line
      if (breakEvenPrice && levelLinePositions && levelLinePositions.beTop != null) {
        const y = 80 + (levelLinePositions.beTop / 100) * (height - 160);
        drawHLine(y, '#f59e0b', true, 3, 'تعادل', breakEvenPrice);
      }

      // 4. Draw Exit Target Line
      if (exitAlertPrice && levelLinePositions && levelLinePositions.exitTop != null) {
        const y = 80 + (levelLinePositions.exitTop / 100) * (height - 160);
        drawHLine(y, '#ec4899', true, 3, 'هدف خروج', exitAlertPrice);
      }

      // 5. Draw Custom Lines
      if (levelLinePositions) {
        customLines.forEach((cl) => {
          const topPct = levelLinePositions.calcTop(cl.price);
          const y = 80 + (topPct / 100) * (height - 160);
          drawHLine(y, cl.color, cl.style !== 'solid', cl.thickness + 1, cl.label || 'مستوى', cl.price.toString());
        });
      }

      // Bottom Info Bar
      ctx.fillStyle = isDark ? '#0f172a' : '#f1f5f9';
      ctx.fillRect(0, height - 45, width, 45);
      ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
      ctx.font = '13px sans-serif';
      ctx.fillText(
        `الدخول: ${entryPrice ? '$' + trimTrailingZeros(entryPrice) : '—'}  |  التعادل: ${breakEvenPrice ? '$' + trimTrailingZeros(breakEvenPrice) : '—'}  |  فارق التعادل: ${breakEvenSpreadPercent ? '+' + breakEvenSpreadPercent.toFixed(2) + '%' : '—'}`,
        50,
        height - 18
      );

      // Download PNG image
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${binanceSymbol}_Chart_Analysis_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // Ignore
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  // Official isolated TradingView embed URL with Binance feed & dynamic theme
  const iframeSrc = useMemo(() => {
    const toolbarColor = isDark ? '0f172a' : 'ffffff';
    return `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_advanced_chart&symbol=BINANCE%3A${encodeURIComponent(
      binanceSymbol
    )}&interval=15&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=${toolbarColor}&studies=%5B%5D&theme=${chartTheme}&style=1&timezone=Etc%2FUTC&locale=ar_AE`;
  }, [binanceSymbol, chartTheme, isDark]);

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
        {/* 1. TOP HEADER HUD (NORMAL MODE)                                           */}
        {/* ========================================================================= */}
        {!isFullscreen && (
          <header 
            className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b shrink-0 transition-colors ${
              isDark ? 'bg-slate-900/95 border-slate-800 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
            }`}
          >
            {/* Right: Back Button + Coin Identity */}
            <div className="flex items-center gap-2">
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

            {/* Left: Toggles & Actions */}
            <div className="flex items-center gap-1.5">
              {/* Draw Custom Line Button */}
              <button
                type="button"
                onClick={() => handleOpenAddLine()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs transition cursor-pointer shadow-xs"
                title="رسم خط أفقي مخصص مع لون، نمط، نص وتنبيه"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="text-[11px]">رسم خط</span>
              </button>

              {/* Lines Manager & Delete Button (Visible if custom lines exist) */}
              {customLines.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowLinesManager(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-600 dark:text-rose-300 font-bold text-xs transition cursor-pointer"
                  title={`إدارة أو حذف خطوط الشارت (${customLines.length})`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-[11px]">الخطوط ({customLines.length})</span>
                </button>
              )}

              {/* Exit Alert Target Button */}
              <button
                type="button"
                onClick={() => setShowExitAlertModal(true)}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                  exitAlertActive 
                    ? 'bg-pink-600/20 border-pink-500/50 text-pink-600 dark:text-pink-300' 
                    : isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-800'
                }`}
                title="تحديد سعر تنبيه للخروج وتفعيله مع Push Notification"
              >
                <Target className="w-3.5 h-3.5 text-pink-500" />
                <span className="hidden md:inline text-[11px]">تنبيه الخروج</span>
              </button>

              {/* Save As Image Button */}
              <button
                type="button"
                onClick={handleSaveAsImage}
                disabled={isCapturingScreenshot}
                className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
                title="حفظ لقطة شاشة للشارت مع كافة الخطوط والأدوات المرسومة كصورة جهازك"
              >
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden lg:inline text-[11px]">حفظ كصورة</span>
              </button>

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
                  title={showInChartLevels ? 'إخفاء خطوط المستويات على الشارت' : 'إظهار خطوط المستويات على الشارت'}
                >
                  {showInChartLevels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              )}

              {/* Test Prices Drawer Toggle */}
              {activeTestPrices.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTestPricesDrawer((prev) => !prev)}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                    showTestPricesDrawer 
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-300'
                      : isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-800'
                  }`}
                  title="عرض قائمة أسعار الاختبار مع الطوابع الزمنية"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[11px]">({activeTestPrices.length})</span>
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
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition cursor-pointer shadow-sm"
                title="تفعيل وضع ملء الشاشة الكامل"
              >
                <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">ملء الشاشة</span>
              </button>
            </div>
          </header>
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
        {/* 2. MAIN TRADINGVIEW IFRAME + DYNAMIC LEVEL LINES + CUSTOM DRAWINGS        */}
        {/* ========================================================================= */}
        <div 
          ref={chartOverlayRef}
          onContextMenu={handleContextMenu}
          className={`relative flex-1 w-full h-full min-h-[350px] ${isDark ? 'bg-slate-950' : 'bg-white'}`}
        >
          {/* Top Left Floating Switch: Long-Press Draw Mode vs Native TradingView Candle Mode */}
          {/* Draggable via Long-Press (تحريك بالسحب عند الضغط المطول) - Default at top-left opposite coin name */}
          <div 
            ref={switcherRef}
            style={{
              position: 'absolute',
              top: `${switcherPos.y}px`,
              left: `${switcherPos.x}px`,
              touchAction: 'none',
            }}
            onPointerDown={handleSwitcherPointerDown}
            onPointerMove={handleSwitcherPointerMove}
            onPointerUp={handleSwitcherPointerUp}
            onPointerCancel={handleSwitcherPointerUp}
            className={`z-35 flex items-center gap-1.5 p-1 rounded-xl backdrop-blur-md border transition-shadow select-none ${
              isDraggingSwitcher 
                ? 'cursor-grabbing shadow-2xl ring-2 ring-cyan-400 bg-slate-900 border-cyan-400 scale-105 duration-75' 
                : 'cursor-grab shadow-lg bg-slate-900/90 border-slate-700/80 hover:border-slate-600 duration-200'
            } text-[11px] font-bold`}
            title="اضغط مطولاً لسحب الزر إلى أي مكان بالشاشة"
          >
            {/* Drag Handle / Grip Indicator */}
            <div 
              className="flex items-center justify-center pl-1 text-slate-400 hover:text-cyan-400 transition"
              title="مقبض التحريك: اضغط مطولاً للسحب إلى أي مكان"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>

            <button
              type="button"
              onClick={() => {
                if (switcherJustDraggedRef.current) return;
                setChartInteractionMode('draw_gesture');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition cursor-pointer ${
                chartInteractionMode === 'draw_gesture'
                  ? 'bg-cyan-500 text-slate-950 shadow-xs font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="تفعيل وضع الضغط المطول (Long Press) لرسم الخطوط وإدارتها باللمس"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>رسم بالضغط المطول ✍️</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (switcherJustDraggedRef.current) return;
                setChartInteractionMode('browse_chart');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition cursor-pointer ${
                chartInteractionMode === 'browse_chart'
                  ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="تصفح شموع ومؤشرات TradingView بحرية تامة دون اعتراض اللمس"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>تصفح الشموع 📊</span>
            </button>

            {/* Reset to Default Top-Left Position if moved */}
            {(switcherPos.x !== 12 || switcherPos.y !== 12) && !isDraggingSwitcher && (
              <button
                type="button"
                onClick={handleResetSwitcherPos}
                className="p-1 rounded-md text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition cursor-pointer"
                title="إعادة الزر لمكانه الافتراضي في أعلى اليسار (المقابل لاسم العملة)"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}

            {/* Active Dragging Hint */}
            {isDraggingSwitcher && (
              <span className="absolute -top-7 right-0 text-[10px] font-black text-cyan-300 bg-slate-950/90 border border-cyan-500/40 px-2 py-0.5 rounded-md shadow-md animate-pulse whitespace-nowrap">
                جارِ التحريك... أفلِت في أي مكان
              </span>
            )}
          </div>

          <iframe
            key={`${binanceSymbol}-${chartTheme}`}
            src={iframeSrc}
            className="w-full h-full border-0 block"
            title={`TradingView Chart for ${binanceSymbol}`}
            allow="fullscreen; clipboard-write"
            loading="lazy"
          />

          {/* DELIBERATE LONG-PRESS GESTURE LAYER (يعمل بالضغط المطول 750ms فقط ويُلغى فوراً عند التحريك) */}
          {chartInteractionMode === 'draw_gesture' && (
            <div 
              className="absolute inset-0 z-20 cursor-crosshair select-none touch-none"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          )}

          {/* ======================================================================= */}
          {/* DYNAMIC IN-CHART LEVEL LINES (تحرك مباشر وتلقائي مع السعر والبيانات)   */}
          {/* ======================================================================= */}
          {showInChartLevels && levelLinePositions && (
            <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden" dir="rtl">
              {/* 1. DYNAMIC ENTRY PRICE HORIZONTAL LINE */}
              {entryPrice && (
                <div 
                  className="absolute left-0 right-0 flex items-center transition-all duration-300 pointer-events-auto"
                  style={{ top: `${levelLinePositions.entryTop}%` }}
                >
                  <div className="flex-1 h-[2px] bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.9)] border-t border-cyan-300" />
                  <div 
                    className="flex items-center gap-1.5 px-2 py-0.5 ml-1 rounded-l-md font-mono font-black text-xs bg-cyan-600 text-white shadow-lg border border-cyan-400 select-none cursor-pointer hover:bg-cyan-500 transition"
                    onClick={() => handleCopyPrice(entryPrice, 'entry-line')}
                    title="سعر الدخول - انقر للنسخ"
                  >
                    <span className="font-sans text-[10px] font-bold">دخول</span>
                    <span dir="ltr">${trimTrailingZeros(entryPrice)}</span>
                    {copiedField === 'entry-line' && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              )}

              {/* 2. DYNAMIC BREAK-EVEN PRICE HORIZONTAL LINE */}
              {breakEvenPrice && levelLinePositions.beTop !== null && (
                <div 
                  className="absolute left-0 right-0 flex items-center transition-all duration-300 pointer-events-auto"
                  style={{ top: `${levelLinePositions.beTop}%` }}
                >
                  <div className="flex-1 h-0 border-t-2 border-dashed border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
                  <div 
                    className="flex items-center gap-1.5 px-2 py-0.5 ml-1 rounded-l-md font-mono font-black text-xs bg-amber-500 text-slate-950 shadow-lg border border-amber-300 select-none cursor-pointer hover:bg-amber-400 transition"
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

              {/* 3. DYNAMIC EXIT TARGET ALERT LINE */}
              {exitAlertPrice && levelLinePositions.exitTop !== null && (
                <div 
                  className="absolute left-0 right-0 flex items-center transition-all duration-300 pointer-events-auto"
                  style={{ top: `${levelLinePositions.exitTop}%` }}
                >
                  <div className="flex-1 h-[2px] bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.9)] border-t border-pink-400" />
                  <div 
                    className="flex items-center gap-1.5 px-2 py-0.5 ml-1 rounded-l-md font-mono font-black text-xs bg-pink-600 text-white shadow-lg border border-pink-300 select-none cursor-pointer"
                    onClick={() => setShowExitAlertModal(true)}
                    title="هدف الخروج - انقر للتعديل"
                  >
                    <Target className="w-3 h-3 text-white" />
                    <span className="font-sans text-[10px] font-bold">هدف الخروج</span>
                    <span dir="ltr">${trimTrailingZeros(exitAlertPrice)}</span>
                  </div>
                </div>
              )}

              {/* 4. CUSTOM DRAWN LINES (الضغط مرة واحدة يفتح نافذة التخصيص والإعدادات والحذف فوراً) */}
              {customLines.map((line) => {
                const topPct = levelLinePositions.calcTop(line.price);
                const isDashed = line.style === 'dashed';
                const isDotted = line.style === 'dotted';
                return (
                  <div 
                    key={line.id}
                    className="absolute left-0 right-0 flex items-center transition-all duration-300 pointer-events-auto group cursor-pointer py-3 -my-3"
                    style={{ top: `${topPct}%` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditLine(line);
                    }}
                    title="انقر مرة واحدة لتخصيص إعدادات هذا الخط ولونه وحجمه ونصه أو حذفه"
                  >
                    {/* Line Stroke with Custom Style & Thickness */}
                    <div 
                      className="flex-1 transition-all group-hover:brightness-125"
                      style={{
                        borderTopWidth: `${line.thickness}px`,
                        borderTopStyle: isDashed ? 'dashed' : isDotted ? 'dotted' : 'solid',
                        borderTopColor: line.color,
                        filter: `drop-shadow(0 0 6px ${line.color})`,
                      }}
                    />

                    {/* Annotation Label over the line (if present) */}
                    {line.label && (
                      <div 
                        className="absolute right-40 -top-5 px-2.5 py-0.5 rounded-md font-bold shadow-md select-none border border-black/20 group-hover:scale-105 transition"
                        style={{
                          backgroundColor: line.color,
                          color: line.textColor || '#ffffff',
                          fontSize: line.textSize === 'lg' ? '14px' : line.textSize === 'base' ? '12px' : '10px',
                        }}
                      >
                        {line.label}
                      </div>
                    )}

                    {/* Actions and Price Badge on the Right */}
                    <div className="flex items-center gap-1 ml-1 select-none pointer-events-auto">
                      {/* Always-visible Quick Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLine(line.id);
                        }}
                        className="p-1 px-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white shadow-md cursor-pointer transition flex items-center gap-0.5"
                        title="حذف هذا الخط من الشارت فوراً"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="text-[10px] font-bold">حذف</span>
                      </button>

                      {/* Quick Edit Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditLine(line);
                        }}
                        className="p-1 rounded-md bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600 cursor-pointer transition"
                        title="تعديل هذا الخط"
                      >
                        <Sliders className="w-3 h-3 text-cyan-400" />
                      </button>

                      {/* Right Price Badge */}
                      <div 
                        className="flex items-center gap-1 px-2 py-0.5 rounded-l-md font-mono font-black text-xs text-white shadow-lg border border-white/30 cursor-pointer hover:brightness-110 transition"
                        style={{ backgroundColor: line.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditLine(line);
                        }}
                        title="انقر لتعديل هذا الخط"
                      >
                        {line.hasAlert && <BellRing className="w-3 h-3 text-amber-300" />}
                        <span dir="ltr">${trimTrailingZeros(line.price.toString())}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ======================================================================= */}
          {/* CONTEXT MENU ON LONG-PRESS OR RIGHT-CLICK (مع زر X وإغلاق عند اللمس بالخارج) */}
          {/* ======================================================================= */}
          {contextMenu.visible && (
            <>
              {/* Invisible backdrop for instant dismissal by tapping anywhere outside */}
              <div 
                className="fixed inset-0 z-[85] bg-black/50 backdrop-blur-xs cursor-pointer animate-in fade-in duration-150"
                onClick={() => setContextMenu({ visible: false, x: 0, y: 0 })}
                onTouchStart={() => setContextMenu({ visible: false, x: 0, y: 0 })}
              />

              <div 
                className={`fixed z-[90] w-64 p-3 rounded-2xl border shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-150 ${
                  isDark ? 'bg-slate-900/95 border-slate-700 text-white shadow-black/80' : 'bg-white/95 border-slate-300 text-slate-950 shadow-slate-400/50'
                }`}
                style={{ left: contextMenu.x, top: contextMenu.y }}
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-black">خيارات الشارت السريعة</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {contextMenu.estimatedPrice && (
                      <span className="font-mono font-black text-xs text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md" dir="ltr">
                        ${contextMenu.estimatedPrice.toFixed(2)}
                      </span>
                    )}
                    {/* Clear 'X' Close Button */}
                    <button
                      type="button"
                      onClick={() => setContextMenu({ visible: false, x: 0, y: 0 })}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
                      title="إغلاق القائمة"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  {/* 1. رسم وتخصيص خط أفقي هنا */}
                  <button
                    type="button"
                    onClick={() => handleOpenAddLine(contextMenu.estimatedPrice)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl bg-cyan-600/15 hover:bg-cyan-600 text-cyan-500 hover:text-white text-right transition cursor-pointer font-bold border border-cyan-500/30"
                  >
                    <Plus className="w-4 h-4" />
                    <span>رسم وتخصيص خط أفقي هنا</span>
                  </button>

                  {/* 2. تعيين هدف خروج وتنبيه */}
                  <button
                    type="button"
                    onClick={() => {
                      if (contextMenu.estimatedPrice) {
                        setExitAlertPrice(contextMenu.estimatedPrice.toFixed(2));
                      }
                      setShowExitAlertModal(true);
                      setContextMenu({ visible: false, x: 0, y: 0 });
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl bg-pink-600/15 hover:bg-pink-600 text-pink-500 hover:text-white text-right transition cursor-pointer font-bold border border-pink-500/30"
                  >
                    <Target className="w-4 h-4" />
                    <span>تعيين هدف خروج وتنبيه</span>
                  </button>

                  {/* 3. إدارة الخطوط إذا كانت موجودة */}
                  {customLines.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowLinesManager(true);
                        setContextMenu({ visible: false, x: 0, y: 0 });
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-800 text-slate-300 text-right transition cursor-pointer font-bold"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>إدارة وحذف الخطوط ({customLines.length})</span>
                    </button>
                  )}

                  {/* 4. فتح في الحاسبة كسعر دخول */}
                  {onNavigateToCalculator && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateToCalculator(baseAsset, contextMenu.estimatedPrice?.toFixed(2));
                        onClose();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-amber-500/15 text-slate-300 hover:text-amber-400 text-right transition cursor-pointer font-bold"
                    >
                      <Calculator className="w-3.5 h-3.5 text-amber-500" />
                      <span>شراء / فتح بالحاسبة</span>
                    </button>
                  )}

                  {/* 5. فتح في لوحة السكالبينج */}
                  {onNavigateToScalper && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateToScalper(baseAsset);
                        onClose();
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-emerald-500/15 text-slate-300 hover:text-emerald-400 text-right transition cursor-pointer font-bold"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-500" />
                      <span>بيع / فتح بالسكالبينج</span>
                    </button>
                  )}

                  {/* 6. إلغاء وإغلاق */}
                  <button
                    type="button"
                    onClick={() => setContextMenu({ visible: false, x: 0, y: 0 })}
                    className="w-full flex items-center justify-center gap-1 py-1.5 mt-1 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer font-bold text-[11px]"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>إلغاء وإغلاق</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ======================================================================= */}
          {/* FLOATING HUD CARD IN CORNER (FULLSCREEN MODE)                           */}
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

                    {/* Controls: Add Line + Theme + Collapse + Exit Fullscreen */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenAddLine()}
                        className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition cursor-pointer"
                        title="رسم خط أفقي"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>

                      {customLines.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowLinesManager(true)}
                          className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg bg-rose-600/30 hover:bg-rose-600 border border-rose-500/50 text-rose-300 hover:text-white transition cursor-pointer"
                          title={`إدارة أو حذف خطوط الشارت (${customLines.length})`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="font-mono text-[10px] font-bold">{customLines.length}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleSaveAsImage}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition cursor-pointer"
                        title="حفظ كصورة"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={toggleChartTheme}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          isDark ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-800'
                        }`}
                        title={isDark ? 'خلفية بيضاء' : 'خلفية سوداء'}
                      >
                        {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsFloatingHudCollapsed(true)}
                        className="p-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                        title="تصغير"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>

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

                  {/* Body of Floating HUD */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className={`p-1.5 rounded-xl border ${isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-0.5">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                          <span>الدخول:</span>
                        </span>
                      </div>
                      <span className="font-mono font-black text-xs" dir="ltr">
                        {entryPrice ? `$${trimTrailingZeros(entryPrice)}` : '—'}
                      </span>
                    </div>

                    <div className="p-1.5 rounded-xl border bg-amber-500/10 border-amber-500/30">
                      <div className="flex items-center justify-between text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-0.5">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>التعادل:</span>
                        </span>
                      </div>
                      <span className="font-mono font-black text-xs text-amber-600 dark:text-amber-400" dir="ltr">
                        {breakEvenPrice ? `$${trimTrailingZeros(breakEvenPrice)}` : '—'}
                      </span>
                    </div>
                  </div>

                  {breakEvenSpreadPercent !== null && (
                    <div className="mt-2 py-1 px-2 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-[11px] font-bold text-amber-600 dark:text-amber-300">
                      <span>فارق التعادل عن الدخول:</span>
                      <span className="font-mono font-black" dir="ltr">
                        +{breakEvenSpreadPercent.toFixed(2)}%
                      </span>
                    </div>
                  )}

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
                </div>
              ) : (
                /* Collapsed Floating Mini Pill */
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
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL: ADD / EDIT CUSTOM HORIZONTAL LINE                               */}
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
                <span>{editingLineId ? 'تعديل الخط الأفقي' : 'رسم خط أفقي مخصص على الشارت'}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsLineEditorOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="إغلاق النافذة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Price Input */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                سعر المستوى (USDT):
              </label>
              <input
                type="text"
                dir="ltr"
                inputMode="decimal"
                value={lineEditorPrice}
                onChange={(e) => setLineEditorPrice(e.target.value)}
                placeholder={livePrice || '0.00'}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 font-mono font-bold text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Color Palette */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                لون الخط:
              </label>
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

            {/* Line Style & Thickness */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  نمط الخط:
                </label>
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
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  سماكة الخط:
                </label>
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

            {/* Annotation Label Text, Color & Size */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                نص توضيحي فوق الخط (اختياري):
              </label>
              <input
                type="text"
                value={lineEditorLabel}
                onChange={(e) => setLineEditorLabel(e.target.value)}
                placeholder="مثال: مقاومة يومية / منطقة تجميع / هدف أول"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
              />

              {/* Text Color Selection */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  لون النص:
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { label: 'أبيض', value: '#ffffff' },
                    { label: 'ذهبي', value: '#fbbf24' },
                    { label: 'سماوي', value: '#22d3ee' },
                    { label: 'أخضر', value: '#34d399' },
                    { label: 'وردي', value: '#f43f5e' },
                    { label: 'بنفسجي', value: '#a78bfa' },
                    { label: 'برتقالي', value: '#fb923c' },
                    { label: 'رمادي', value: '#94a3b8' },
                  ].map((tc) => (
                    <button
                      key={tc.value}
                      type="button"
                      onClick={() => setLineEditorTextColor(tc.value)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer flex items-center gap-1 ${
                        lineEditorTextColor === tc.value
                          ? 'border-white bg-slate-700 ring-1 ring-white/50 text-white shadow-xs'
                          : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tc.value }} />
                      <span>{tc.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Size Selection */}
              <div className="flex items-center justify-between gap-3 text-xs pt-1">
                <span className="text-slate-400 font-bold">حجم النص:</span>
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
                  {(['sm', 'base', 'lg'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setLineEditorTextSize(sz)}
                      className={`px-3 py-0.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        lineEditorTextSize === sz ? 'bg-cyan-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {sz === 'sm' ? 'صغير' : sz === 'base' ? 'متوسط' : 'كبير'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Alert Option */}
            <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold">تنبيه عند وصول السعر لهذا الخط</span>
              </div>
              <input
                type="checkbox"
                checked={lineEditorAlert}
                onChange={(e) => setLineEditorAlert(e.target.checked)}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              {editingLineId ? (
                <button
                  type="button"
                  onClick={() => {
                    handleDeleteLine(editingLineId);
                    setIsLineEditorOpen(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/40 text-xs font-bold transition cursor-pointer"
                  title="حذف هذا الخط من الشارت نهائياً"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف هذا الخط</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLineEditorOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleSaveLine}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition cursor-pointer shadow-md"
                >
                  {editingLineId ? 'حفظ التعديلات' : 'حفظ الخط على الشارت'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: SET EXIT TARGET PRICE ALERT                                     */}
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
                <span>تعيين سعر تنبيه للخروج مع إشعار فوري (Push Alert)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowExitAlertModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
                title="إغلاق النافذة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              يقوم النظام برسم خط أفقي مشع يمثل هدف الخروج على الشارت، وإرسال إشعار فوري (Desktop / Mobile Push Notification) حتى لو كان التطبيق بالخلفية عند وصول السعر للهدف.
            </p>

            {/* Price Input */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                سعر الخروج المستهدف (USDT):
              </label>
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

            {/* Quick Percentage Presets */}
            {entryNum > 0 && (
              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  أو اختر نسبة ربح مستهدفة سريعة فوق التعادل/الدخول:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[0.5, 1.0, 1.5, 2.0, 3.0, 5.0].map((pct) => {
                    const base = beNum && !isNaN(beNum) ? beNum : entryNum;
                    const calculated = (base * (1 + pct / 100)).toFixed(4);
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setExitAlertPrice(calculated)}
                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-pink-300 border border-slate-700 transition cursor-pointer"
                      >
                        +{pct}% (${trimTrailingZeros(calculated)})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              {exitAlertActive ? (
                <button
                  type="button"
                  onClick={() => {
                    setExitAlertActive(false);
                    persistExitAlert(exitAlertPrice, false, false);
                    setShowExitAlertModal(false);
                  }}
                  className="text-xs font-bold text-rose-400 hover:underline cursor-pointer"
                >
                  إلغاء التنبيه
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowExitAlertModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  إغلاق
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p = parseFloat(exitAlertPrice);
                    if (!isNaN(p) && p > 0) {
                      setExitAlertActive(true);
                      setExitAlertFired(false);
                      persistExitAlert(exitAlertPrice, true, false);
                      systemNotification.requestPermission();
                    }
                    setShowExitAlertModal(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-black text-xs transition cursor-pointer shadow-md"
                >
                  حفظ وتفعيل التنبيه
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: LINES MANAGER & BATCH CLEAR (إدارة وحذف جميع الخطوط)            */}
      {/* ========================================================================= */}
      {showLinesManager && (
        <div 
          className="fixed inset-0 z-[80] flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md cursor-pointer"
          dir="rtl"
          onClick={() => setShowLinesManager(false)}
        >
          <div 
            className="w-full max-w-md p-5 rounded-3xl bg-slate-900 border border-slate-700 text-white shadow-2xl space-y-4 cursor-default max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 shrink-0">
              <span className="font-black text-sm text-amber-400 flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                <span>إدارة خطوط الشارت المرسومة ({customLines.length})</span>
              </span>
              <button
                type="button"
                onClick={() => setShowLinesManager(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                title="إغلاق النافذة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {customLines.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                لا توجد خطوط مرسومة حالياً على هذا الشارت.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 py-1">
                {customLines.map((line, idx) => (
                  <div 
                    key={line.id}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-800/80 border border-slate-700/80"
                  >
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-3.5 h-3.5 rounded-full border border-black/30 shrink-0" 
                        style={{ backgroundColor: line.color }} 
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-white" dir="ltr">
                            ${trimTrailingZeros(line.price.toString())}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            #{idx + 1}
                          </span>
                        </div>
                        {line.label && (
                          <div className="text-[11px] text-slate-300 font-bold">
                            {line.label}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowLinesManager(false);
                          handleEditLine(line);
                        }}
                        className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs transition cursor-pointer"
                        title="تعديل هذا الخط"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLine(line.id)}
                        className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition cursor-pointer"
                        title="حذف هذا الخط فوراً"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 shrink-0 flex items-center justify-between gap-2">
              {customLines.length > 0 ? (
                <button
                  type="button"
                  onClick={handleClearAllLines}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/50 text-xs font-black transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف كافة الخطوط ({customLines.length})</span>
                </button>
              ) : <div />}

              <button
                type="button"
                onClick={() => setShowLinesManager(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
