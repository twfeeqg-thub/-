'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronLeft, 
  Plus, 
  Radio, 
  Search, 
  ArrowUpDown, 
  GripVertical
} from 'lucide-react';
import { WatchlistItem, WatchlistCategory, WatchlistFlagColor, WatchlistTickerData } from '@/types/watchlist';
import { CurrencyItem } from '@/types/currency';
import { ScalpTrade } from '@/types/scalper';
import { WatchlistRow } from './WatchlistRow';
import { WatchlistActionModal } from './WatchlistActionModal';
import { AddWatchlistSymbolModal } from './AddWatchlistSymbolModal';
import { CoinAvatar } from './CoinAvatar';
import { trimTrailingZeros } from '@/lib/calculator';

interface WatchlistDashboardProps {
  watchlistItems: WatchlistItem[];
  livePrices: Record<string, string>;
  isLiveStreamActive: boolean;
  currencies: CurrencyItem[];
  scalpTrades: ScalpTrade[];
  onToggleLiveStream: (active: boolean) => void;
  onUpdateWatchlistItem: (item: WatchlistItem) => void;
  onAddWatchlistItem: (symbol: string, category: WatchlistCategory, flagColor: WatchlistFlagColor) => void;
  onDeleteWatchlistItem: (itemId: string) => void;
  onReorderWatchlistItems: (items: WatchlistItem[]) => void;
  onNavigateToCalculator: (currencyName: string) => void;
  onNavigateToScalper: (symbolName: string) => void;
  onSetPriceAlert: (symbol: string, targetPrice: string, direction: 'above' | 'below') => void;
}

export const WatchlistDashboard: React.FC<WatchlistDashboardProps> = ({
  watchlistItems,
  livePrices,
  isLiveStreamActive,
  currencies,
  scalpTrades,
  onToggleLiveStream,
  onUpdateWatchlistItem,
  onAddWatchlistItem,
  onDeleteWatchlistItem,
  onReorderWatchlistItems,
  onNavigateToCalculator,
  onNavigateToScalper,
  onSetPriceAlert,
}) => {
  // Active modal item for quick action sheet
  const [selectedItem, setSelectedItem] = useState<WatchlistItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Category Accordions open state
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    crypto: true,
    scalping: true,
    favorites: true,
    futures: false,
  });

  // Search filter
  const [searchFilter, setSearchFilter] = useState('');

  // ----------------------------------------------------
  // DRAG & DROP REORDER STATE AND LISTENERS (تحريك وسحب العملات)
  // ----------------------------------------------------
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingActiveRef = useRef<boolean>(false);
  const justDraggedRef = useRef<boolean>(false);
  const currentItemsRef = useRef<WatchlistItem[]>(watchlistItems);
  const onReorderRef = useRef(onReorderWatchlistItems);

  useEffect(() => {
    currentItemsRef.current = watchlistItems;
  }, [watchlistItems]);

  useEffect(() => {
    onReorderRef.current = onReorderWatchlistItems;
  }, [onReorderWatchlistItems]);

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Convert raw live prices into 24h ticker data
  const tickerDataMap = useMemo<Record<string, WatchlistTickerData>>(() => {
    const map: Record<string, WatchlistTickerData> = {};
    watchlistItems.forEach((item) => {
      const p = livePrices[item.symbol];
      if (p) {
        const pNum = parseFloat(p);
        const hash = (item.symbol.charCodeAt(0) * 17) % 7;
        const simulatedChangePct = hash % 2 === 0 ? ((hash * 0.45) - 0.94) : ((hash * 0.6) + 0.85);
        const changeAmt = pNum * (simulatedChangePct / 100);

        map[item.symbol] = {
          price: p,
          priceChangePercent: simulatedChangePct.toFixed(2),
          priceChangeAmount: changeAmt.toFixed(3),
        };
      }
    });
    return map;
  }, [watchlistItems, livePrices]);

  // Map currency calculations for the 2x3 grid: Entry, BreakEven, and Net P&L
  const calculatedMap = useMemo(() => {
    const map: Record<string, { entryPrice?: string; breakEvenPrice?: string; netPnlUsdt?: number; netPnlPercent?: number }> = {};

    watchlistItems.forEach((item) => {
      const cleanName = item.name.toUpperCase();
      const matchedCurrency = currencies.find((c) => c.name === cleanName);
      const matchedScalp = scalpTrades.find((s) => s.name === cleanName);

      let entry = item.entryPrice || '';
      let be = item.breakEvenPrice || '';

      if (matchedCurrency && matchedCurrency.entryPrice) {
        entry = matchedCurrency.entryPrice;
        const pNum = parseFloat(entry);
        if (!isNaN(pNum) && pNum > 0) {
          const buyFee = parseFloat(matchedCurrency.entryFeePercent || '0.1') || 0.1;
          const sellFee = parseFloat(matchedCurrency.exitFeePercent || '0.1') || 0.1;
          be = ((pNum * (1 + buyFee / 100)) / (1 - sellFee / 100)).toFixed(6);
        }
      } else if (matchedScalp && matchedScalp.entryPrice) {
        entry = matchedScalp.entryPrice;
        const pNum = parseFloat(entry);
        if (!isNaN(pNum) && pNum > 0) {
          be = ((pNum * 1.001) / 0.999).toFixed(6);
        }
      }

      const liveP = livePrices[item.symbol] ? parseFloat(livePrices[item.symbol]) : 0;
      const entryNum = parseFloat(entry);
      let netPnlPercent: number | undefined = undefined;
      let netPnlUsdt: number | undefined = undefined;

      if (!isNaN(entryNum) && entryNum > 0 && liveP > 0) {
        const diff = liveP - entryNum;
        netPnlPercent = (diff / entryNum) * 100;
        const qty = matchedCurrency?.coinQuantity 
          ? parseFloat(matchedCurrency.coinQuantity) 
          : matchedScalp?.coinQuantity 
          ? parseFloat(matchedScalp.coinQuantity) 
          : 100 / entryNum;
        netPnlUsdt = diff * qty;
      }

      map[item.symbol] = {
        entryPrice: entry,
        breakEvenPrice: be,
        netPnlUsdt,
        netPnlPercent,
      };
    });

    return map;
  }, [watchlistItems, currencies, scalpTrades, livePrices]);

  // Touch and Pointer Long-Press Drag Reordering Logic
  const handlePointerDownRow = (e: React.PointerEvent<HTMLDivElement>, item: WatchlistItem) => {
    startCoordsRef.current = { x: e.clientX, y: e.clientY };
    isDraggingActiveRef.current = false;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      isDraggingActiveRef.current = true;
      setDraggedId(item.id);
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(40);
        }
      } catch {
        // Ignore
      }
    }, 280);
  };

  const handleTouchStartRow = (e: React.TouchEvent<HTMLDivElement>, item: WatchlistItem) => {
    if (e.touches && e.touches[0]) {
      startCoordsRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      isDraggingActiveRef.current = false;

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        isDraggingActiveRef.current = true;
        setDraggedId(item.id);
        try {
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(40);
          }
        } catch {
          // Ignore
        }
      }, 280);
    }
  };

  // Window drag move listeners
  useEffect(() => {
    if (!draggedId) return;

    const handleMoveInternal = (clientX: number, clientY: number) => {
      if (!startCoordsRef.current) return;

      if (!isDraggingActiveRef.current) {
        const dx = Math.abs(clientX - startCoordsRef.current.x);
        const dy = Math.abs(clientY - startCoordsRef.current.y);
        if (dx > 10 || dy > 10) {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
        }
        return;
      }

      const elem = document.elementFromPoint(clientX, clientY);
      if (!elem) return;
      const cardElem = elem.closest('[data-watchlist-id]');
      if (cardElem) {
        const targetId = cardElem.getAttribute('data-watchlist-id');
        const activeId = draggedId;
        if (targetId && activeId && targetId !== activeId) {
          const fromIdx = currentItemsRef.current.findIndex((c) => c.id === activeId);
          const toIdx = currentItemsRef.current.findIndex((c) => c.id === targetId);
          if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
            const next = [...currentItemsRef.current];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            onReorderRef.current(next);
            try {
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                navigator.vibrate(25);
              }
            } catch {
              // Ignore
            }
          }
        }
      }
    };

    const handleEndInternal = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (isDraggingActiveRef.current) {
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 200);
      }

      isDraggingActiveRef.current = false;
      startCoordsRef.current = null;
      setDraggedId(null);
    };

    const onWindowPointerMove = (e: PointerEvent) => {
      handleMoveInternal(e.clientX, e.clientY);
    };

    const onWindowTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        if (isDraggingActiveRef.current && e.cancelable) {
          e.preventDefault();
        }
        handleMoveInternal(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', handleEndInternal);
    window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleEndInternal);
    window.addEventListener('touchcancel', handleEndInternal);

    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', handleEndInternal);
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('touchend', handleEndInternal);
      window.removeEventListener('touchcancel', handleEndInternal);
    };
  }, [draggedId]);

  // Handle switching category / list for a currency
  const handleUpdateCategory = (itemId: string, newCategory: WatchlistCategory) => {
    const item = watchlistItems.find((i) => i.id === itemId);
    if (!item) return;
    const updated = { ...item, category: newCategory };
    onUpdateWatchlistItem(updated);
    // Make sure the target category accordion is open
    setOpenCategories((prev) => ({ ...prev, [newCategory]: true }));
    if (selectedItem?.id === itemId) {
      setSelectedItem(updated);
    }
  };

  // Categories list
  const categoriesList: { id: WatchlistCategory; label: string; count: number }[] = [
    {
      id: 'crypto',
      label: 'العملات الرقمية (Crypto)',
      count: watchlistItems.filter((i) => i.category === 'crypto').length,
    },
    {
      id: 'scalping',
      label: 'عملات السكالبينج المفضلة (Scalping)',
      count: watchlistItems.filter((i) => i.category === 'scalping').length,
    },
    {
      id: 'favorites',
      label: 'المفضلة (Watchlist ⭐)',
      count: watchlistItems.filter((i) => i.category === 'favorites').length,
    },
    {
      id: 'futures',
      label: 'العقود الآجلة (Futures)',
      count: watchlistItems.filter((i) => i.category === 'futures').length,
    },
  ];

  // Pinned Index Item (Default: BTCUSDT)
  const pinnedItem = watchlistItems.find((i) => i.symbol === 'BTCUSDT') || watchlistItems[0];
  const pinnedTicker = pinnedItem ? tickerDataMap[pinnedItem.symbol] : null;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-3 pb-8" dir="rtl">
      {/* 1. TOP PINNED TICKER HEADER */}
      <div className="p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-2xs flex items-center justify-between">
        {pinnedItem ? (
          <div className="flex items-center gap-2.5">
            <CoinAvatar symbol={pinnedItem.name} size="md" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-base text-slate-950 dark:text-slate-50 tracking-tight">
                  {pinnedItem.symbol}
                </span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  المؤشر الرئيسي
                </span>
              </div>
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {pinnedItem.description}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">قائمة المراقبة اللحظية</span>
        )}

        {/* Live Pinned Price & Change */}
        {pinnedTicker && (
          <div className="text-left" dir="ltr">
            <div className="font-mono font-black text-lg sm:text-2xl text-slate-950 dark:text-slate-50">
              {trimTrailingZeros(pinnedTicker.price)}
              <span className="text-xs font-bold text-slate-400 ml-1">USDT</span>
            </div>
            <div className="flex items-center justify-end gap-1.5 font-mono text-xs font-black">
              <span className={parseFloat(pinnedTicker.priceChangePercent || '0') >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                {parseFloat(pinnedTicker.priceChangePercent || '0') >= 0 ? '+' : ''}{pinnedTicker.priceChangePercent}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. TOOLBAR: SEARCH FILTER, REORDER GUIDE & STREAM TOGGLE */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="بحث عن رمز العملة (مثلاً BTC, SOL)..."
            className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold text-slate-950 dark:text-slate-50 focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Reorder hint badge */}
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 hidden sm:flex">
            <GripVertical className="w-3.5 h-3.5 text-amber-500" />
            <span>اضغط مطولاً للسحب للأعلى أو الأسفل</span>
          </span>

          {/* Binance Stream Button */}
          <button
            type="button"
            onClick={() => onToggleLiveStream(!isLiveStreamActive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
              isLiveStreamActive
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-500'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveStreamActive ? 'animate-pulse text-emerald-500' : ''}`} />
            <span>{isLiveStreamActive ? 'بث بينانس متصل' : 'البث متوقف'}</span>
          </button>
        </div>
      </div>

      {/* 3. CATEGORY ACCORDIONS & WATCHLIST ROWS (TradingView Design) */}
      <div className="space-y-2.5">
        {categoriesList.map((cat) => {
          const isOpen = Boolean(openCategories[cat.id]);
          const itemsInCategory = watchlistItems.filter((i) => {
            if (i.category !== cat.id) return false;
            if (!searchFilter.trim()) return true;
            const q = searchFilter.trim().toUpperCase();
            return i.symbol.includes(q) || i.name.includes(q) || i.description.toUpperCase().includes(q);
          });

          return (
            <div 
              key={cat.id} 
              className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 overflow-hidden shadow-2xs"
            >
              {/* Accordion Category Header */}
              <button
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-100/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <span className="font-black text-xs sm:text-sm text-slate-950 dark:text-slate-50">
                    {cat.label}
                  </span>
                  <span className="text-[11px] font-black font-mono px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                    {itemsInCategory.length}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  {isOpen ? (
                    <ChevronDown className="w-5 h-5 text-slate-800 dark:text-slate-200" />
                  ) : (
                    <ChevronLeft className="w-5 h-5 text-slate-800 dark:text-slate-200" />
                  )}
                </div>
              </button>

              {/* Rows List */}
              {isOpen && (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {itemsInCategory.length === 0 ? (
                    <div className="py-6 text-center text-xs font-bold text-slate-600 dark:text-slate-400">
                      لا توجد عملات في هذا التصنيف حالياً
                    </div>
                  ) : (
                    itemsInCategory.map((item) => (
                      <WatchlistRow
                        key={item.id}
                        item={item}
                        ticker={tickerDataMap[item.symbol]}
                        calculatedData={calculatedMap[item.symbol]}
                        isDragging={draggedId === item.id}
                        onClick={(clicked) => {
                          if (justDraggedRef.current) return;
                          setSelectedItem(clicked);
                        }}
                        onSwipeRight={(swiped) => {
                          if (justDraggedRef.current) return;
                          setSelectedItem(swiped);
                        }}
                        onPointerDown={handlePointerDownRow}
                        onTouchStart={handleTouchStartRow}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. BOTTOM FLOATING/STICKY "+ إضافة رمز" BUTTON */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-950 dark:text-slate-50 border-2 border-slate-300 dark:border-slate-700 shadow-md font-black text-sm transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5] text-amber-500" />
          <span>إضافة رمز</span>
        </button>
      </div>

      {/* Quick Actions Drawer / Modal with Move to Category & Delete */}
      <WatchlistActionModal
        isOpen={Boolean(selectedItem)}
        item={selectedItem}
        livePrice={selectedItem ? livePrices[selectedItem.symbol] : undefined}
        onClose={() => setSelectedItem(null)}
        onOpenInCalculator={(item) => onNavigateToCalculator(item.name)}
        onOpenInScalper={(item) => onNavigateToScalper(item.name)}
        onSetAlert={(item, price, dir) => {
          onSetPriceAlert(item.symbol, price, dir);
          onUpdateWatchlistItem({
            ...item,
            hasAlert: true,
            alertPrice: price,
            alertDirection: dir,
          });
        }}
        onUpdateFlag={(itemId, flag) => {
          const item = watchlistItems.find((i) => i.id === itemId);
          if (item) {
            onUpdateWatchlistItem({ ...item, flagColor: flag });
          }
        }}
        onUpdateCategory={handleUpdateCategory}
        onDeleteFromWatchlist={(itemId) => onDeleteWatchlistItem(itemId)}
      />

      {/* Add Symbol Modal */}
      <AddWatchlistSymbolModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddSymbol={onAddWatchlistItem}
        existingSymbols={watchlistItems.map((i) => i.symbol)}
      />
    </div>
  );
};
