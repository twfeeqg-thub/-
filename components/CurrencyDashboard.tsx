'use client';

import React, { useState } from 'react';
import { CurrencyItem, MAX_CURRENCIES } from '@/types/currency';
import { calculateAll, formatCurrencyPrice, formatPercent, formatUSDT } from '@/lib/calculator';
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  ArrowLeft, 
  Coins, 
  Target, 
  AlertCircle,
  SlidersHorizontal,
  X,
  Check,
  Equal,
  Sparkles
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { PWAInstallButton } from './PWAInstallButton';

interface CurrencyDashboardProps {
  currencies: CurrencyItem[];
  onSelectCurrency: (id: string) => void;
  onAddCurrency: (name: string) => void;
  onDeleteCurrency: (id: string) => void;
  onOpenSettings: () => void;
  hasDefaultsSaved: boolean;
}

export const CurrencyDashboard: React.FC<CurrencyDashboardProps> = ({
  currencies,
  onSelectCurrency,
  onAddCurrency,
  onDeleteCurrency,
  onOpenSettings,
  hasDefaultsSaved,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCurrencyName, setNewCurrencyName] = useState('');
  const [currencyToDelete, setCurrencyToDelete] = useState<CurrencyItem | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const isMaxReached = currencies.length >= MAX_CURRENCIES;

  const handleOpenAddModal = () => {
    if (isMaxReached) {
      setErrorMsg(`تم الوصول للحد الأقصى المسموح به (${MAX_CURRENCIES} عملات). يرجى حذف عملة لإضافة أخرى.`);
      return;
    }
    setErrorMsg('');
    setNewCurrencyName('');
    setIsAddModalOpen(true);
  };

  const handleConfirmAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCurrencyName.trim().toUpperCase();
    if (!trimmed) {
      setErrorMsg('يرجى إدخال اسم العملة');
      return;
    }
    onAddCurrency(trimmed);
    setIsAddModalOpen(false);
    setNewCurrencyName('');
    setErrorMsg('');
  };

  const quickCoinSuggestions = ['BTC', 'ETH', 'SOL', 'XRP', 'TAO', 'WLD', 'SUI', 'BNB'];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-5 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 font-black text-sm shadow-xs">
            <Coins className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                حاسبة الفروقات السعرية
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                V0
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              لوحة العملات المراقبة • إدارة حتى 10 عملات
            </p>
          </div>
        </div>

        {/* Header Tools: PWA, ThemeToggle, Settings, Counter */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <PWAInstallButton />
          
          <ThemeToggle />

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
          title={isMaxReached ? 'تم الوصول للحد الأقصى (10 عملات)' : 'إضافة عملة جديدة'}
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
            لقد وصلت للحد الأقصى المسموح به وهو <strong>10 عملات</strong>. لحساب عملة جديدة، يمكنك حذف إحدى العملات الحالية.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {currencies.map((currency) => {
            // Calculate summary for this currency card
            const calc = calculateAll(
              {
                entryPrice: currency.entryPrice,
                tradeAmount: currency.tradeAmount,
                entryFeePercent: currency.entryFeePercent,
                exitFeePercent: currency.exitFeePercent,
                entryFeeFixed: currency.entryFeeFixed,
                exitFeeFixed: currency.exitFeeFixed,
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
                onClick={() => onSelectCurrency(currency.id)}
                className="group relative flex flex-col justify-between p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 hover:border-amber-500/60 dark:hover:border-amber-500/60 shadow-xs hover:shadow-lg transition-all cursor-pointer text-right"
              >
                {/* Card Top: Coin Name & Delete Action */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono font-black text-xs flex items-center justify-center border border-amber-500/30">
                      {currency.name.slice(0, 3)}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-500 transition-colors">
                        {currency.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {currency.tradeAmount ? `${currency.tradeAmount} USDT` : 'المبلغ غير محدد'}
                      </span>
                    </div>
                  </div>

                  {/* Delete button with confirmation trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrencyToDelete(currency);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    title={`حذف عملة ${currency.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Summary Metrics */}
                <div className="space-y-2 text-xs">
                  {/* Entry Price */}
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span className="text-[11px]">سعر الدخول:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200" dir="ltr">
                      {currency.entryPrice ? formatCurrencyPrice(currency.entryPrice) : '—'}
                    </span>
                  </div>

                  {/* Break-even Price */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      سعر التعادل:
                    </span>
                    <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400" dir="ltr">
                      {hasBreakEven ? formatCurrencyPrice(breakEvenVal) : 'بانتظار البيانات'}
                    </span>
                  </div>

                  {/* Key Test Result */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">أحدث اختبار:</span>
                      {primaryTest ? (
                        <div className="flex items-center gap-1.5" dir="ltr">
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {formatCurrencyPrice(primaryTest.price)}:
                          </span>
                          <span
                            className={`font-mono font-bold px-1.5 py-0.2 rounded text-[10px] ${
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
                        <span className="text-slate-400 text-[10px]">لا يوجد اختبار</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-amber-600 dark:text-amber-400 font-semibold group-hover:translate-x-[-2px] transition-transform">
                  <span>فتح الحاسبة الكاملة</span>
                  <ArrowLeft className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Currency Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div 
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4 text-right"
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
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
                  يمكنك إدخال أي اسم عملة تريده (حتى 10 عملات كحد أقصى)
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

      {/* Delete Confirmation Modal */}
      {currencyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div 
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4 text-right"
            dir="rtl"
          >
            <div className="flex items-center gap-2 text-rose-500 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                تأكيد حذف العملة
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف عملة <strong className="text-amber-500 font-mono">[{currencyToDelete.name}]</strong>؟
              <br />
              <span className="text-[11px] text-slate-400 mt-1 block">
                سيتم مسح بيانات هذه العملة فقط، ولن تتأثر العملات الأخرى.
              </span>
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
                className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
