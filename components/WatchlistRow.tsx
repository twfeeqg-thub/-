'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, GripVertical, MoreVertical } from 'lucide-react';
import { WatchlistItem, WatchlistTickerData } from '@/types/watchlist';
import { CoinAvatar } from './CoinAvatar';

interface WatchlistRowProps {
  item: WatchlistItem;
  ticker?: WatchlistTickerData;
  calculatedData?: {
    entryPrice?: string;
    breakEvenPrice?: string;
    netPnlUsdt?: number;
    netPnlPercent?: number;
  };
  isDragging?: boolean;
  onClick: (item: WatchlistItem) => void;
  onSwipeRight?: (item: WatchlistItem) => void;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>, item: WatchlistItem) => void;
  onTouchStart?: (e: React.TouchEvent<HTMLDivElement>, item: WatchlistItem) => void;
}

/**
 * Smart price formatter that keeps numbers large, bold, and readable without unnecessary clutter:
 */
function formatCompactPrice(priceStr?: string | number): string {
  if (!priceStr) return '—';
  const num = typeof priceStr === 'number' ? priceStr : parseFloat(priceStr);
  if (isNaN(num) || num <= 0) return '—';
  if (num >= 10000) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 1 });
  }
  if (num >= 100) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (num >= 1) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  }
  if (num >= 0.01) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

export const WatchlistRow: React.FC<WatchlistRowProps> = ({
  item,
  ticker,
  calculatedData,
  isDragging = false,
  onClick,
  onSwipeRight,
  onPointerDown,
  onTouchStart,
}) => {
  // Flash animation on price tick update
  const [flashColor, setFlashColor] = useState<'green' | 'red' | null>(null);
  const prevPriceRef = useRef<number | null>(null);

  // Swipe detection touch state
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  const currentPriceNum = ticker?.price ? parseFloat(ticker.price) : 0;

  useEffect(() => {
    if (currentPriceNum > 0 && prevPriceRef.current !== null) {
      if (currentPriceNum > prevPriceRef.current) {
        setFlashColor('green');
        const timer = setTimeout(() => setFlashColor(null), 600);
        return () => clearTimeout(timer);
      } else if (currentPriceNum < prevPriceRef.current) {
        setFlashColor('red');
        const timer = setTimeout(() => setFlashColor(null), 600);
        return () => clearTimeout(timer);
      }
    }
    prevPriceRef.current = currentPriceNum;
  }, [currentPriceNum]);

  // Touch handlers for swipe right
  const handleInternalTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    if (onTouchStart) {
      onTouchStart(e, item);
    }
  };

  const handleInternalTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = Math.abs(e.changedTouches[0].clientY - touchStartYRef.current);
    if (deltaX > 45 && deltaY < 35) {
      if (onSwipeRight) {
        onSwipeRight(item);
      } else {
        onClick(item);
      }
    }
  };

  // Values for the 2x3 grid
  const effectiveEntry = calculatedData?.entryPrice || item.entryPrice || '';
  const effectiveBE = calculatedData?.breakEvenPrice || item.breakEvenPrice || '';

  // Calculate Net P&L if entry price exists
  const entryNum = parseFloat(effectiveEntry);
  const hasEntry = !isNaN(entryNum) && entryNum > 0 && currentPriceNum > 0;
  
  let netPnlPercent = calculatedData?.netPnlPercent;
  let netPnlUsdt = calculatedData?.netPnlUsdt;

  if (hasEntry && netPnlPercent === undefined) {
    const diff = currentPriceNum - entryNum;
    netPnlPercent = (diff / entryNum) * 100;
    const qty = item.coinQuantity ? parseFloat(item.coinQuantity) : (parseFloat(item.tradeAmount || '100') / entryNum);
    netPnlUsdt = diff * qty;
  }

  // 24h Change format
  const changePercentNum = ticker?.priceChangePercent ? parseFloat(ticker.priceChangePercent) : 0;
  const isPositive24h = changePercentNum >= 0;

  return (
    <div
      data-watchlist-id={item.id}
      onClick={() => onClick(item)}
      onPointerDown={(e) => onPointerDown && onPointerDown(e, item)}
      onTouchStart={handleInternalTouchStart}
      onTouchEnd={handleInternalTouchEnd}
      className={`group relative flex items-center justify-between gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 min-h-[52px] border-b border-slate-200 dark:border-slate-800 transition-all select-none cursor-grab active:cursor-grabbing ${
        isDragging
          ? 'bg-amber-100 dark:bg-amber-950/40 ring-2 ring-amber-500 shadow-lg scale-[1.01] z-30'
          : flashColor === 'green'
          ? 'bg-emerald-500/15 dark:bg-emerald-500/20'
          : flashColor === 'red'
          ? 'bg-rose-500/15 dark:bg-rose-500/20'
          : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850'
      }`}
      dir="rtl"
    >
      {/* Visual Color Flag Ribbon */}
      {item.flagColor && (
        <span
          className={`absolute right-0 top-1 bottom-1 w-1 rounded-l-xs ${
            item.flagColor === 'red'
              ? 'bg-rose-500'
              : item.flagColor === 'orange'
              ? 'bg-amber-500'
              : item.flagColor === 'green'
              ? 'bg-emerald-500'
              : 'bg-blue-500'
          }`}
        />
      )}

      {/* ========================================================================= */}
      {/* 1. RIGHT SIDE: DRAG HANDLE + LOGO + SYMBOL & PAIR (BOLD & TIGHT)           */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Drag handle icon */}
        <div 
          className="text-slate-400 dark:text-slate-500 hover:text-amber-500 cursor-grab active:cursor-grabbing p-0.5 shrink-0" 
          title="اضغط مطولاً للسحب وإعادة الترتيب"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Official Binance Coin Logo (Compact 24x24 px) */}
        <CoinAvatar symbol={item.name} size="sm" />

        <div className="overflow-hidden leading-tight text-right">
          {/* Line 1: Bold Large Symbol */}
          <div className="flex items-center gap-1">
            <span className="font-black text-sm sm:text-base text-slate-950 dark:text-slate-50 font-mono tracking-tight group-hover:text-amber-500 transition-colors">
              {item.name}
            </span>
            {item.hasAlert && (
              <span
                className="inline-flex items-center justify-center text-amber-500 shrink-0"
                title={`تنبيه نشط عند ${item.alertPrice || 'الهدف'}`}
              >
                <Bell className="w-2.5 h-2.5 stroke-[2.5]" />
              </span>
            )}
          </div>

          {/* Line 2: Pair Name */}
          <span className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 block truncate">
            {item.symbol.replace(item.name, '') || 'USDT'}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CENTER: 2-ROW x 3-COL TABLE (BOLD LARGE NUMBERS, NO DEAD SPACE)        */}
      {/* ========================================================================= */}
      <div className="flex-1 max-w-[230px] sm:max-w-md mx-1 sm:mx-2">
        <div className="grid grid-cols-3 gap-1 px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-2xs">
          {/* Row 1: Short Headers (دخول | تعادل | ربح/خسارة) in Bold Clear Text */}
          <div className="text-center">
            <span className="text-[10px] sm:text-xs font-black text-slate-800 dark:text-slate-200 block leading-tight">
              دخول
            </span>
          </div>
          <div className="text-center">
            <span className="text-[10px] sm:text-xs font-black text-slate-800 dark:text-slate-200 block leading-tight">
              تعادل
            </span>
          </div>
          <div className="text-center">
            <span className="text-[10px] sm:text-xs font-black text-slate-800 dark:text-slate-200 block leading-tight truncate">
              ربح/خسارة
            </span>
          </div>

          {/* Row 2: Values in Large Font & High Contrast */}
          {/* Col 1: دخول */}
          <div className="text-center" dir="ltr">
            <span className="font-mono font-black text-xs sm:text-sm text-slate-950 dark:text-slate-50 block leading-tight truncate">
              {hasEntry ? formatCompactPrice(effectiveEntry) : '—'}
            </span>
          </div>

          {/* Col 2: تعادل */}
          <div className="text-center" dir="ltr">
            <span className="font-mono font-black text-xs sm:text-sm text-amber-600 dark:text-amber-400 block leading-tight truncate">
              {effectiveBE ? formatCompactPrice(effectiveBE) : '—'}
            </span>
          </div>

          {/* Col 3: ربح/خسارة */}
          <div className="text-center" dir="ltr">
            {netPnlPercent !== undefined ? (
              <span
                className={`font-mono font-black text-xs sm:text-sm block leading-tight truncate ${
                  netPnlPercent >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
                title={netPnlUsdt !== undefined ? `${netPnlUsdt >= 0 ? '+' : ''}${netPnlUsdt.toFixed(2)}$` : undefined}
              >
                {netPnlPercent >= 0 ? '+' : ''}{netPnlPercent.toFixed(1)}%
              </span>
            ) : (
              <span className="text-xs sm:text-sm font-bold text-slate-400 block leading-tight">
                —
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. LEFT SIDE: BOLD PRICE (LINE 1) + 24H CHANGE (LINE 2) + QUICK ACTION     */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="text-left leading-tight" dir="ltr">
          {/* Line 1: Live Price in Bold Large Font */}
          <div className="font-mono font-black text-xs sm:text-base text-slate-950 dark:text-slate-50 tracking-tight truncate">
            {ticker?.price ? formatCompactPrice(ticker.price) : '...'}
          </div>

          {/* Line 2: 24h Change % */}
          <div className="flex items-center justify-start gap-1 font-mono text-[11px] sm:text-xs font-black">
            <span className={isPositive24h ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
              {isPositive24h ? '+' : ''}{changePercentNum.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* 3-dots Quick Action Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick(item);
          }}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          title="خيارات العملة (نقل، حذف، تنبيه)"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
