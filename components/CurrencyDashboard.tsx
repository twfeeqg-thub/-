'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CurrencyItem, MAX_CURRENCIES, FeeCalculationMethod } from '@/types/currency';
import { calculateAll, formatCompactPrice, formatPercent } from '@/lib/calculator';
import { 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Coins, 
  Target, 
  Bell, 
  AlertCircle,
  SlidersHorizontal,
  GripVertical,
  Palette,
  X
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { PWAInstallButton } from './PWAInstallButton';

interface CurrencyDashboardProps {
  currencies: CurrencyItem[];
  onSelectCurrency: (id: string) => void;
  onAddCurrency: (name: string, coinQuantity?: string) => void;
  onDeleteCurrency: (id: string) => void;
  onReorderCurrencies: (newCurrencies: CurrencyItem[]) => void;
  onOpenSettings: () => void;
  onOpenThemeCustomizer: () => void;
  hasDefaultsSaved: boolean;
  defaultFeeMethod?: FeeCalculationMethod;
}

export const CurrencyDashboard: React.FC<CurrencyDashboardProps> = ({
  currencies,
  onSelectCurrency,
  onAddCurrency,
  onDeleteCurrency,
  onReorderCurrencies,
  onOpenSettings,
  onOpenThemeCustomizer,
  hasDefaultsSaved,
  defaultFeeMethod = 'cumulative',
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCurrencyName, setNewCurrencyName] = useState('');
  const [newCoinQuantity, setNewCoinQuantity] = useState('');
  const [currencyToDelete, setCurrencyToDelete] = useState<CurrencyItem | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Long-press Drag and Drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingActiveRef = useRef<boolean>(false);
  const justDraggedRef = useRef<boolean>(false);
  const currentCurrenciesRef = useRef<CurrencyItem[]>(currencies);
  const onReorderCurrenciesRef = useRef(onReorderCurrencies);

  useEffect(() => {
    currentCurrenciesRef.current = currencies;
  }, [currencies]);

  useEffect(() => {
    onReorderCurrenciesRef.current = onReorderCurrencies;
  }, [onReorderCurrencies]);

  const isMaxReached = currencies.length >= MAX_CURRENCIES;

  const handleOpenAddModal = () => {
    if (isMaxReached) {
      setErrorMsg(`تم الوصول للحد الأقصى المسموح به (${MAX_CURRENCIES} عملات). يرجى حذف عملة لإضافة أخرى.`);
      return;
    }
    setErrorMsg('');
    setNewCurrencyName('');
    setNewCoinQuantity('');
    setIsAddModalOpen(true);
  };

  const handleConfirmAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCurrencyName.trim().toUpperCase();
    if (!trimmed) {
      setErrorMsg('يرجى إدخال اسم العملة');
      return;
    }
    onAddCurrency(trimmed, newCoinQuantity.trim() || undefined);
    setIsAddModalOpen(false);
    setNewCurrencyName('');
    setNewCoinQuantity('');
    setErrorMsg('');
  };

  const quickCoinSuggestions = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'AVAX', 'NEAR', 'SUI', 'TAO'];

  // Start pointer/touch down: initiate 280ms long-press detection
  const handlePointerDown = (e: React.PointerEvent, currency: CurrencyItem) => {
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

  // Window event listeners for seamless touch and mouse drag across the screen
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

      // Active drag: find element under point and swap if over a different currency card
      const elem = document.elementFromPoint(clientX, clientY);
      if (!elem) return;
      const cardElem = elem.closest('[data-currency-id]');
      if (cardElem) {
        const targetId = cardElem.getAttribute('data-currency-id');
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
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              لوحة متابعة وحساب العملات
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              إدارة صفقاتك، مراقبة سعر التعادل، وتعديل ترتيب العملات بالضغط المطول والسحب
            </p>
          </div>
        </div>

        {/* Header Tools: PWA, ThemeToggle, Palette, Fee Method, Settings, Counter */}
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

          {/* Fee calculation method indicator button */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] font-bold transition cursor-pointer bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400"
            title="طريقة حساب الرسوم الحالية (اضغط لتغييرها من الإعدادات)"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${defaultFeeMethod === 'separate' ? 'bg-sky-500' : 'bg-amber-500'}`}></span>
            <span>{defaultFeeMethod === 'separate' ? 'منفصل' : 'تراكمي'}</span>
          </button>

          <button
            onClick={onOpenSettings}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              hasDefaultsSaved
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="الإعدادات الافتراضية للتكاليف"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <div className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
            {currencies.length} / {MAX_CURRENCIES}
          </div>
        </div>
      </header>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            العملات المحفوظة
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            ({currencies.length} من أصل {MAX_CURRENCIES})
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
          title={isMaxReached ? `تم الوصول للحد الأقصى (${MAX_CURRENCIES} عملة)` : 'إضافة عملة جديدة'}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>إضافة عملة</span>
        </button>
      </div>

      {/* Max Reached Alert Banner */}
      {isMaxReached && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
          <span>
            لقد وصلت للحد الأقصى المسموح به وهو <strong>{MAX_CURRENCIES} عملة</strong>. لحساب عملة جديدة، يمكنك حذف إحدى العملات الحالية.
          </span>
        </div>
      )}

      {/* Empty State */}
      {currencies.length === 0 ? (
        <div className="p-8 sm:p-12 text-center rounded-2xl bg-white dark:bg-slate-900/60 border-2 border-dashed border-slate-200 dark:border-slate-800 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-inner">
            <Coins className="w-7 h-7" />
          </div>
          <div className="max-w-sm mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              لا توجد عملات مضافة بعد
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              ابدأ بإضافة أول عملة لمراقبة سعر دخولها وسعر تعادلها واختبار أهداف الربح والخسارة بشكل مستقل.
            </p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة أول عملة الآن</span>
          </button>
        </div>
      ) : (
        /* Currencies Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 select-none">
          {currencies.map((currency) => {
            const isDraggingThis = draggedId === currency.id;

            // Calculate summary for this currency card using chosen feeMethod
            const calc = calculateAll(
              {
                entryPrice: currency.entryPrice,
                tradeAmount: currency.tradeAmount,
                entryFeePercent: currency.entryFeePercent,
                exitFeePercent: currency.exitFeePercent,
                entryFeeFixed: currency.entryFeeFixed,
                exitFeeFixed: currency.exitFeeFixed,
                feeMethod: currency.feeMethod || defaultFeeMethod,
              },
              currency.testPrices
            );

            // Determine break-even display
            const hasBreakEven = calc.percentTrack.isValid || calc.fixedTrack.isValid;
            const breakEvenVal = calc.percentTrack.isValid
              ? calc.percentTrack.breakEvenPrice
              : calc.fixedTrack.breakEvenPrice;

            // Determine latest / primary test price result
            const testResults = calc.percentTrack.isValid
              ? calc.percentTrack.testResults
              : calc.fixedTrack.testResults;
            const primaryTest = testResults.length > 0 ? testResults[testResults.length - 1] : null;

            return (
              <div
                key={currency.id}
                data-currency-id={currency.id}
                onPointerDown={(e) => handlePointerDown(e, currency)}
                onClick={() => {
                  if (justDraggedRef.current) return;
                  onSelectCurrency(currency.id);
                }}
                className={`group relative flex flex-col justify-between p-3.5 rounded-2xl border shadow-xs transition-all duration-150 cursor-pointer text-right gap-2.5 touch-manipulation ${
                  isDraggingThis
                    ? 'ring-2 ring-amber-500 shadow-2xl scale-[1.03] z-30 opacity-95 bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 cursor-grabbing'
                    : 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-amber-500/60 dark:hover:border-amber-500/60 hover:shadow-md'
                }`}
              >
                {/* السطر الأول: رأس البطاقة (مقبض السحب، الاسم، المبلغ، قيمة التنبيه، رابط الفتح، زر الحذف) */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* مقبض سحب خفيف عند التحريك */}
                    <div 
                      className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors p-0.5"
                      title="اضغط مطولاً واسحب للتحريك صعوداً وهبوطاً"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>

                    <span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-black text-[11px] flex items-center justify-center border border-amber-500/30 shrink-0">
                      {currency.name.slice(0, 3)}
                    </span>
                    <div className="flex items-baseline gap-2 truncate">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-500 transition-colors truncate">
                        {currency.name}
                      </h3>
                      <span className="text-[11px] text-slate-400 font-mono shrink-0" dir="ltr">
                        {currency.tradeAmount ? `${currency.tradeAmount} USDT` : ''}
                        {currency.coinQuantity ? ` (${currency.coinQuantity} ${currency.name})` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* قيمة التنبيه (تظهر دائماً حتى لو كانت المراقبة في وضع الإغلاق) */}
                    {currency.targetPrice ? (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold border transition-colors ${
                          currency.isMonitoringActive
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                        }`}
                        title={`سعر التنبيه: ${currency.targetPrice} USDT (${currency.targetDirection === 'below' ? 'هبوط ≤' : 'صعود ≥'}) - المراقبة: ${currency.isMonitoringActive ? 'نَشِطة 🟢' : 'مُغلقة ⚪'}`}
                      >
                        <Bell className={`w-2.5 h-2.5 ${currency.isMonitoringActive ? 'text-emerald-500 animate-pulse' : 'text-amber-500'}`} />
                        <span>تنبيه: {formatCompactPrice(currency.targetPrice)}</span>
                        <span className="text-[9px] opacity-75">{currency.targetDirection === 'below' ? '≤' : '≥'}</span>
                      </span>
                    ) : null}

                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5 group-hover:translate-x-[-2px] transition-transform">
                      <span>فتح</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrencyToDelete(currency);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title={`حذف عملة ${currency.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* السطر الثاني: البيانات الثلاثة أفقياً وبمنازل عشرية مناسبة للعرض */}
                <div className="grid grid-cols-3 items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  {/* سعر الدخول */}
                  <div className="flex items-baseline gap-1 truncate text-slate-600 dark:text-slate-400">
                    <span className="text-[10px] text-slate-400 shrink-0">دخول:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate" dir="ltr">
                      {formatCompactPrice(currency.entryPrice)}
                    </span>
                  </div>

                  {/* سعر التعادل */}
                  <div className="flex items-baseline gap-1 truncate justify-center">
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 shrink-0 flex items-center gap-0.5 font-medium">
                      <Target className="w-3 h-3 text-amber-500" />
                      تعادل:
                    </span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 truncate" dir="ltr">
                      {hasBreakEven ? formatCompactPrice(breakEvenVal) : '—'}
                    </span>
                  </div>

                  {/* أحدث اختبار مع النسبة */}
                  <div className="flex items-baseline gap-1 truncate justify-end text-left" dir="ltr">
                    {primaryTest ? (
                      <div className="flex items-center gap-1 truncate">
                        <span className="font-mono text-slate-700 dark:text-slate-300 truncate text-[11px]">
                          {formatCompactPrice(primaryTest.price)}
                        </span>
                        <span
                          className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] shrink-0 ${
                            primaryTest.status === 'profit'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : primaryTest.status === 'loss'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {primaryTest.netPnL > 0 ? '+' : ''}{formatPercent(primaryTest.pnlPercent)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[10px]" dir="rtl">لا اختبار</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reorder hint */}
      {currencies.length > 1 && (
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
                  حذف عملة {currencyToDelete.name}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  هذا الإجراء سيحذف العملة وجميع بياناتها المسجلة
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              هل أنت متأكد من رغبتك في حذف عملة <strong className="font-mono text-slate-900 dark:text-slate-100 font-bold">{currencyToDelete.name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
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
                تأكيد الحذف
              </button>
              <button
                type="button"
                onClick={() => setCurrencyToDelete(null)}
                className="py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Currency Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div 
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5 text-right flex flex-col gap-4 animate-in zoom-in-95 duration-150"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold">
                  <Coins className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  إضافة عملة جديدة
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
                  رمز أو اسم العملة:
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="مثال: BTC أو ETH أو TAO"
                  value={newCurrencyName}
                  onChange={(e) => setNewCurrencyName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500 font-mono text-left"
                  dir="ltr"
                  maxLength={12}
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  يمكنك إدخال أي اسم عملة تريده (حتى {MAX_CURRENCIES} عملة كحد أقصى)
                </span>
              </div>

              {/* Quick suggestions */}
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1.5">
                  اقتراحات سريعة:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickCoinSuggestions.map((coin) => (
                    <button
                      key={coin}
                      type="button"
                      onClick={() => setNewCurrencyName(coin)}
                      className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/20 hover:text-amber-500 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-mono transition"
                    >
                      {coin}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Coin Quantity */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  كمية العملة <span className="text-amber-500 text-[10px] font-bold">(اختياري - للتحويل المباشر)</span>:
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="مثال: 50 أو 1.5"
                  value={newCoinQuantity}
                  onChange={(e) => setNewCoinQuantity(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500 font-mono text-left"
                  dir="ltr"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  إذا كنت تعرف كمية العملة فقط الناتجة عن التحويل، يمكنك إدخالها هنا.
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
                  <span>إضافة العملة</span>
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
