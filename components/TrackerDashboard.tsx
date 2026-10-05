'use client';

import React, { useState, useRef, useEffect } from 'react';
import { TrackedCurrency, MAX_TRACKED_CURRENCIES } from '@/types/tracker';
import { formatCompactPrice, formatPercent } from '@/lib/calculator';
import { 
  Plus, 
  Trash2, 
  ArrowLeft, 
  TrendingUp, 
  Radio, 
  Clock, 
  GripVertical, 
  AlertCircle,
  X,
  Target,
  Sparkles,
  Palette,
  SlidersHorizontal
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { ThemeToggle } from './ThemeToggle';
import { useCurrentTimestamp } from '@/lib/time';

interface TrackerDashboardProps {
  trackedCurrencies: TrackedCurrency[];
  livePrices: Record<string, string>; // symbol -> current live price
  isLiveStreamActive: boolean;
  onToggleLiveStream: (active: boolean) => void;
  onSelectCurrency: (id: string) => void;
  onAddCurrency: (name: string, baselinePrice: string) => void;
  onDeleteCurrency: (id: string) => void;
  onReorderCurrencies: (newCurrencies: TrackedCurrency[]) => void;
  onOpenSettings: () => void;
  onOpenThemeCustomizer: () => void;
  onNavigateToCalculator: () => void;
}

export const TrackerDashboard: React.FC<TrackerDashboardProps> = ({
  trackedCurrencies,
  livePrices,
  isLiveStreamActive,
  onToggleLiveStream,
  onSelectCurrency,
  onAddCurrency,
  onDeleteCurrency,
  onReorderCurrencies,
  onOpenSettings,
  onOpenThemeCustomizer,
  onNavigateToCalculator,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCurrencyName, setNewCurrencyName] = useState('');
  const [newBaselinePrice, setNewBaselinePrice] = useState('');
  const [currencyToDelete, setCurrencyToDelete] = useState<TrackedCurrency | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const currentTime = useCurrentTimestamp();

  // Drag and drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingActiveRef = useRef<boolean>(false);
  const justDraggedRef = useRef<boolean>(false);
  const currentCurrenciesRef = useRef<TrackedCurrency[]>(trackedCurrencies);
  const onReorderCurrenciesRef = useRef(onReorderCurrencies);

  useEffect(() => {
    currentCurrenciesRef.current = trackedCurrencies;
  }, [trackedCurrencies]);

  useEffect(() => {
    onReorderCurrenciesRef.current = onReorderCurrencies;
  }, [onReorderCurrencies]);

  const isMaxReached = trackedCurrencies.length >= MAX_TRACKED_CURRENCIES;

  const handleOpenAddModal = () => {
    if (isMaxReached) {
      setErrorMsg(`تم الوصول للحد الأقصى المسموح به (${MAX_TRACKED_CURRENCIES} عملات).`);
      return;
    }
    setErrorMsg('');
    setNewCurrencyName('');
    setNewBaselinePrice('');
    setIsAddModalOpen(true);
  };

  // Quick fetch live price when currency name changes in add modal
  const handleFetchCurrentPriceForModal = async (symbolName: string) => {
    const cleanSym = symbolName.trim().toUpperCase();
    if (!cleanSym) return;
    setIsFetchingPrice(true);
    setErrorMsg('');
    try {
      const pair = cleanSym.endsWith('USDT') ? cleanSym : `${cleanSym}USDT`;
      const res = await fetch(`/api/binance/price?symbol=${encodeURIComponent(pair)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.price) {
          setNewBaselinePrice(String(data.price));
          setErrorMsg('');
        } else {
          setErrorMsg('لم يتم العثور على سعر للعملة');
        }
      } else {
        const errData = await res.json().catch(() => null);
        setErrorMsg(errData?.error || 'رمز العملة غير متاح في بينانس');
      }
    } catch {
      setErrorMsg('تعذر الاتصال بخادم بينانس لجلب السعر');
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const handleSelectQuickCoin = (coin: string) => {
    setNewCurrencyName(coin);
    handleFetchCurrentPriceForModal(coin);
  };

  const handleConfirmAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCurrencyName.trim().toUpperCase();
    if (!trimmed) {
      setErrorMsg('يرجى إدخال اسم العملة');
      return;
    }
    const priceTrimmed = newBaselinePrice.trim();
    if (!priceTrimmed || isNaN(parseFloat(priceTrimmed)) || parseFloat(priceTrimmed) <= 0) {
      setErrorMsg('يرجى إدخال سعر رصد مرجعي صالح أكبر من صفر');
      return;
    }
    onAddCurrency(trimmed, priceTrimmed);
    setIsAddModalOpen(false);
    setNewCurrencyName('');
    setNewBaselinePrice('');
    setErrorMsg('');
  };

  const quickCoinSuggestions = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'AVAX', 'NEAR', 'SUI', 'TAO'];

  // Calculate elapsed time text
  const getElapsedString = (timestamp: number) => {
    if (!currentTime) return 'منذ لحظات';
    const diffSec = Math.max(0, Math.floor((currentTime - timestamp) / 1000));
    if (diffSec < 60) return `منذ ${diffSec} ثانية`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    const diffHours = Math.floor(diffMin / 60);
    const remainingMin = diffMin % 60;
    if (diffHours < 24) return `منذ ${diffHours} س و ${remainingMin} د`;
    const diffDays = Math.floor(diffHours / 24);
    return `منذ ${diffDays} يوم`;
  };

  // Pointer Down for Long-Press Drag
  const handlePointerDown = (e: React.PointerEvent, currency: TrackedCurrency) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }

    startCoordsRef.current = { x: e.clientX, y: e.clientY };
    isDraggingActiveRef.current = false;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      isDraggingActiveRef.current = true;
      setDraggedId(currency.id);
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(40);
        }
      } catch {
        // Ignore
      }
    }, 280);
  };

  // Window drag listeners
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
      const cardElem = elem.closest('[data-tracked-id]');
      if (cardElem) {
        const targetId = cardElem.getAttribute('data-tracked-id');
        const activeId = draggedId;
        if (targetId && activeId && targetId !== activeId) {
          const fromIdx = currentCurrenciesRef.current.findIndex((c) => c.id === activeId);
          const toIdx = currentCurrenciesRef.current.findIndex((c) => c.id === targetId);
          if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
            const next = [...currentCurrenciesRef.current];
            const [moved] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, moved);
            onReorderCurrenciesRef.current(next);
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

    const onWindowPointerUp = () => {
      handleEndInternal();
    };

    const onWindowTouchEnd = () => {
      handleEndInternal();
    };

    window.addEventListener('pointermove', onWindowPointerMove, { passive: false });
    window.addEventListener('touchmove', onWindowTouchMove, { passive: false });
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);
    window.addEventListener('touchend', onWindowTouchEnd);
    window.addEventListener('touchcancel', onWindowTouchEnd);

    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('touchmove', onWindowTouchMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);
      window.removeEventListener('touchend', onWindowTouchEnd);
      window.removeEventListener('touchcancel', onWindowTouchEnd);
    };
  }, [draggedId]);

  return (
    <div className="w-full max-w-4xl flex flex-col gap-4 animate-in fade-in duration-200">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              لوحة رصد صعود وهبوط العملات
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              احتساب نسبة وحجم الصعود اللحظي من نقطة الصفر المخصصة وسجل القمة والقاع
            </p>
          </div>
        </div>

        {/* Master Controls: Live Switch, ThemeToggle, Palette, Settings, Counter */}
        <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-center">
          <PWAInstallButton />
          
          <ThemeToggle />

          {/* Palette button for theme customization */}
          <button
            type="button"
            onClick={onOpenThemeCustomizer}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-amber-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer shadow-xs active:scale-95"
            title="🎨 تخصيص مظهر وألوان الثيم"
          >
            <Palette className="w-4 h-4" />
          </button>

          {/* Settings button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition cursor-pointer shadow-xs active:scale-95"
            title="الإعدادات العامة للتكاليف والحساب"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* Master Live Stream Toggle */}
          <button
            onClick={() => onToggleLiveStream(!isLiveStreamActive)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
              isLiveStreamActive
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
            }`}
            title={isLiveStreamActive ? 'إيقاف البث الحي لجميع العملات المرصودة' : 'تشغيل البث الحي لجميع العملات المرصودة'}
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveStreamActive ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
            <span>{isLiveStreamActive ? 'المراقبة نَشِطة' : 'المراقبة مُتوقفة'}</span>
          </button>

          <div className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            {trackedCurrencies.length} / {MAX_TRACKED_CURRENCIES}
          </div>
        </div>
      </header>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            العملات قيد الرصد المرجعي
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            (انقر على أي عملة لمشاهدة تفاصيلها وسجل القمة والقاع)
          </span>
        </div>

        <button
          onClick={handleOpenAddModal}
          disabled={isMaxReached}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
            isMaxReached
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700'
              : 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-amber-500/20 active:scale-95'
          }`}
          title={isMaxReached ? `تم الوصول للحد الأقصى (${MAX_TRACKED_CURRENCIES} عملة)` : 'إضافة عملة جديدة للرصد'}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>رصد عملة جديدة</span>
        </button>
      </div>

      {/* Empty State */}
      {trackedCurrencies.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl bg-white dark:bg-slate-900/60 border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
            <Clock className="w-7 h-7" />
          </div>
          <div className="max-w-sm mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              لا توجد عملات مرصودة حالياً
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              ابدأ برصد أول عملة بتثبيت سعرها اللحظي كنقطة بداية، ليقوم النظام باحتساب نسبة صعودها الحقيقية وأعلى قمة بلغتها منذ تلك اللحظة.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>تثبيت أول نقطة رصد الآن</span>
          </button>
        </div>
      ) : (
        /* Tracked Currencies Grid (Two-line Cards) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 select-none">
          {trackedCurrencies.map((tc) => {
            const isDraggingThis = draggedId === tc.id;
            const currentLivePrice = livePrices[tc.binanceSymbol] || tc.baselinePrice;
            const baseNum = parseFloat(tc.baselinePrice);
            const liveNum = parseFloat(currentLivePrice);

            // Calculations
            const netChange = liveNum - baseNum;
            const percentChange = baseNum > 0 ? (netChange / baseNum) * 100 : 0;
            const isGain = netChange >= 0;

            const peakNum = tc.peakPrice ? parseFloat(tc.peakPrice) : baseNum;
            const peakPercent = baseNum > 0 ? ((peakNum - baseNum) / baseNum) * 100 : 0;

            return (
              <div
                key={tc.id}
                data-tracked-id={tc.id}
                onPointerDown={(e) => handlePointerDown(e, tc)}
                onClick={() => {
                  if (justDraggedRef.current) return;
                  onSelectCurrency(tc.id);
                }}
                className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border shadow-xs transition-all duration-150 cursor-pointer text-right gap-2.5 touch-manipulation ${
                  isDraggingThis
                    ? 'ring-2 ring-amber-500 shadow-2xl scale-[1.03] z-30 opacity-95 bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 cursor-grabbing'
                    : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-amber-500/60 dark:hover:border-amber-500/60 hover:shadow-md'
                }`}
              >
                {/* السطر الأول: مقبض السحب، الرمز، المدة المنقضية، رابط الفتح، الحذف */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div 
                      className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors p-0.5"
                      title="اضغط مطولاً واسحب للتحريك صعوداً وهبوطاً"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    <span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-black text-[11px] flex items-center justify-center border border-amber-500/30 shrink-0">
                      {tc.name.slice(0, 3)}
                    </span>
                    <div className="flex items-baseline gap-2 truncate">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-500 transition-colors truncate">
                        {tc.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium shrink-0 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-amber-500/80" />
                        <span>{getElapsedString(tc.baselineTimestamp)}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Live Stream Indicator Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold border ${
                        isLiveStreamActive
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <Radio className={`w-2.5 h-2.5 ${isLiveStreamActive ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                      <span>{isLiveStreamActive ? 'مباشر' : 'توقف'}</span>
                    </span>

                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5 group-hover:translate-x-[-2px] transition-transform">
                      <span>تفاصيل</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrencyToDelete(tc);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title={`إلغاء رصد ${tc.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* السطر الثاني: سعر الرصد، السعر اللحظي وصافي النسبة، وأعلى قمة */}
                <div className="grid grid-cols-3 items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  {/* نقطة البداية (سعر الرصد المرجعي) */}
                  <div className="flex items-baseline gap-1 truncate text-slate-600 dark:text-slate-400">
                    <span className="text-[10px] text-slate-400 shrink-0">الرصد:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate" dir="ltr">
                      {formatCompactPrice(tc.baselinePrice)}
                    </span>
                  </div>

                  {/* السعر اللحظي مع نسبة الصعود/الهبوط */}
                  <div className="flex items-baseline gap-1 truncate justify-center">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 truncate text-[11px]" dir="ltr">
                      {formatCompactPrice(currentLivePrice)}
                    </span>
                    <span
                      className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] shrink-0 ${
                        isGain
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      }`}
                      dir="ltr"
                    >
                      {isGain ? '+' : ''}{formatPercent(percentChange)}
                    </span>
                  </div>

                  {/* أعلى قمة تم تسجيلها */}
                  <div className="flex items-baseline gap-1 truncate justify-end text-left" dir="ltr">
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 shrink-0 font-medium" dir="rtl">
                      القمة:
                    </span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 truncate text-[11px]" dir="ltr">
                      {formatCompactPrice(peakNum)}
                    </span>
                    <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400">
                      (+{formatPercent(peakPercent)})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reorder hint */}
      {trackedCurrencies.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-1 text-[11px] text-slate-400 dark:text-slate-500">
          <GripVertical className="w-3.5 h-3.5 opacity-60" />
          <span>يمكنك الضغط مطولاً على أي بطاقة واسحبها لإعادة ترتيب العملات صعوداً وهبوطاً</span>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {currencyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div 
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 text-right flex flex-col gap-4 animate-in zoom-in-95 duration-150"
            dir="rtl"
          >
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  إلغاء رصد عملة {currencyToDelete.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  سيتم حذف نقطة الرصد وسجل القمة والقاع لهذه العملة
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              هل أنت متأكد من رغبتك في حذف بطاقة رصد <strong className="font-mono text-slate-900 dark:text-slate-100 font-bold">{currencyToDelete.name}</strong>؟
            </p>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onDeleteCurrency(currencyToDelete.id);
                  setCurrencyToDelete(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 transition cursor-pointer active:scale-95"
              >
                تأكيد الإلغاء
              </button>
              <button
                type="button"
                onClick={() => setCurrencyToDelete(null)}
                className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                رجوع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Tracked Currency Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div 
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 text-right flex flex-col gap-4 animate-in zoom-in-95 duration-150"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold">
                  <Target className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  رصد صعود عملة جديدة
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdd} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  رمز العملة (Binance Symbol):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="مثال: SOL أو BTC أو NEAR"
                    value={newCurrencyName}
                    onChange={(e) => {
                      setNewCurrencyName(e.target.value);
                      handleFetchCurrentPriceForModal(e.target.value);
                    }}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500 font-mono text-left uppercase"
                    dir="ltr"
                    maxLength={12}
                  />
                  <button
                    type="button"
                    onClick={() => handleFetchCurrentPriceForModal(newCurrencyName)}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:border-amber-500 transition cursor-pointer"
                    title="جلب السعر الحالي من بينانس"
                  >
                    {isFetchingPrice ? '...' : 'جلب السعر'}
                  </button>
                </div>
              </div>

              {/* Quick suggestions */}
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1.5">
                  اختيار سريع:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickCoinSuggestions.map((coin) => (
                    <button
                      key={coin}
                      type="button"
                      onClick={() => handleSelectQuickCoin(coin)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/20 hover:text-amber-500 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-mono transition"
                    >
                      {coin}
                    </button>
                  ))}
                </div>
              </div>

              {/* Baseline Price */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    سعر الرصد المرجعي (نقطة الصفر USDT):
                  </label>
                  {isFetchingPrice && (
                    <span className="text-[10px] text-amber-500 animate-pulse">
                      جاري سحب السعر اللحظي...
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="مثال: 180.50"
                  value={newBaselinePrice}
                  onChange={(e) => setNewBaselinePrice(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500 font-mono text-left"
                  dir="ltr"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  هذا هو السعر الذي سيُحتسب الصعود أو الهبوط مقارنة به ابتداءً من هذه اللحظة.
                </span>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-1.5 p-2 rounded-lg bg-rose-500/10 text-rose-500 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>تثبيت وبدء الرصد</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
