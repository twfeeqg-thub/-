'use client';

import React, { useState } from 'react';
import { 
  X, 
  BarChart2, 
  Calculator, 
  Zap, 
  Bell, 
  Check, 
  ArrowUpRight, 
  Info,
  FolderSync,
  Trash2
} from 'lucide-react';
import { WatchlistItem, WatchlistFlagColor, WatchlistCategory } from '@/types/watchlist';
import { CoinAvatar } from './CoinAvatar';
import { trimTrailingZeros } from '@/lib/calculator';

interface WatchlistActionModalProps {
  isOpen: boolean;
  item: WatchlistItem | null;
  livePrice?: string;
  onClose: () => void;
  onOpenChart?: (item: WatchlistItem) => void;
  onOpenInCalculator: (item: WatchlistItem) => void;
  onOpenInScalper: (item: WatchlistItem) => void;
  onSetAlert: (item: WatchlistItem, targetPrice: string, direction: 'above' | 'below') => void;
  onUpdateFlag: (itemId: string, flag: WatchlistFlagColor) => void;
  onUpdateCategory: (itemId: string, category: WatchlistCategory) => void;
  onDeleteFromWatchlist: (itemId: string) => void;
}

const FLAG_COLORS: { color: WatchlistFlagColor; label: string; bg: string }[] = [
  { color: 'red', label: 'أحمر', bg: 'bg-rose-500' },
  { color: 'orange', label: 'برتقالي', bg: 'bg-amber-500' },
  { color: 'green', label: 'أخضر', bg: 'bg-emerald-500' },
  { color: 'blue', label: 'أزرق', bg: 'bg-blue-500' },
  { color: null, label: 'بدون علم', bg: 'bg-slate-300 dark:bg-slate-700' },
];

const CATEGORIES: { id: WatchlistCategory; label: string }[] = [
  { id: 'crypto', label: 'العملات الرقمية' },
  { id: 'scalping', label: 'السكالبينج' },
  { id: 'favorites', label: 'المفضلة ⭐' },
  { id: 'futures', label: 'العقود الآجلة' },
];

export const WatchlistActionModal: React.FC<WatchlistActionModalProps> = ({
  isOpen,
  item,
  livePrice,
  onClose,
  onOpenChart,
  onOpenInCalculator,
  onOpenInScalper,
  onSetAlert,
  onUpdateFlag,
  onUpdateCategory,
  onDeleteFromWatchlist,
}) => {
  const [showChartNotice, setShowChartNotice] = useState(false);
  const [isAlertMode, setIsAlertMode] = useState(false);
  const [targetPriceInput, setTargetPriceInput] = useState(() => item?.alertPrice || livePrice || '');
  const [alertDirection, setAlertDirection] = useState<'above' | 'below'>(() => item?.alertDirection || 'above');
  const [alertSaved, setAlertSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen || !item) return null;

  const handleSaveAlert = () => {
    if (!targetPriceInput.trim()) return;
    onSetAlert(item, targetPriceInput.trim(), alertDirection);
    setAlertSaved(true);
    setTimeout(() => {
      setAlertSaved(false);
      setIsAlertMode(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 pb-20 sm:pb-4 bg-slate-950/85 backdrop-blur-md">
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 pb-8 sm:pb-6 my-0 sm:my-auto max-h-[82vh] overflow-y-auto"
        dir="rtl"
      >
        {/* Top Handle / Close */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <CoinAvatar symbol={item.name} size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black font-mono text-slate-950 dark:text-slate-50 tracking-tight">
                  {item.symbol}
                </span>
                {item.flagColor && (
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    item.flagColor === 'red' ? 'bg-rose-500' :
                    item.flagColor === 'orange' ? 'bg-amber-500' :
                    item.flagColor === 'green' ? 'bg-emerald-500' : 'bg-blue-500'
                  }`} />
                )}
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {item.description}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Price Header */}
        <div className="my-3 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
              السعر المباشر من بينانس
            </span>
            <div className="text-2xl font-black font-mono text-slate-950 dark:text-slate-50" dir="ltr">
              {livePrice ? trimTrailingZeros(livePrice) : 'جاري الاتصال...'}
              <span className="text-xs font-bold text-slate-500 ml-1">USDT</span>
            </div>
          </div>

          {/* Quick Flag selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 ml-1">العلم:</span>
            {FLAG_COLORS.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => onUpdateFlag(item.id, f.color)}
                className={`w-6 h-6 rounded-full ${f.bg} border transition flex items-center justify-center cursor-pointer ${
                  item.flagColor === f.color 
                    ? 'ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-900 scale-110' 
                    : 'opacity-70 hover:opacity-100'
                }`}
                title={f.label}
              >
                {item.flagColor === f.color && <Check className="w-3 h-3 text-white" />}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* NEW: MOVE CURRENCY TO ANOTHER LIST / CATEGORY (نقل العملة بين القوائم)      */}
        {/* ========================================================================= */}
        <div className="mb-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <FolderSync className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-black text-slate-900 dark:text-slate-100">
              نقل العملة إلى قائمة:
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onUpdateCategory(item.id, cat.id)}
                className={`py-1.5 px-2 rounded-xl text-xs font-black transition cursor-pointer border ${
                  item.category === cat.id
                    ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-amber-400'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notice for Chart */}
        {showChartNotice && (
          <div className="mb-3.5 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-slate-900 dark:text-slate-100 text-xs flex items-start gap-2.5 animate-fadeIn">
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-300 mb-0.5">
                ميزة شارت العملة (TradingView Chart)
              </p>
              <p className="text-[11px] text-slate-700 dark:text-slate-300">
                زر الشارت مجهز بالكامل؛ وسنقوم ببرمجة شاشته المستقلة وتصميمه التفاعلي في المحادثة القادمة كما تم الاتفاق عليه!
              </p>
            </div>
          </div>
        )}

        {/* Action: Inline Alert Configuration Mode */}
        {isAlertMode && (
          <div className="mb-3.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-amber-500" />
                <span>تعيين تنبيه سعري فوري لـ {item.symbol}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAlertMode(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                إلغاء
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  dir="ltr"
                  inputMode="decimal"
                  value={targetPriceInput}
                  onChange={(e) => setTargetPriceInput(e.target.value)}
                  placeholder={livePrice || '0.00'}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-sm text-slate-950 dark:text-slate-50 focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2.5 text-xs font-mono font-bold text-slate-400">
                  USDT
                </span>
              </div>

              <div className="flex items-center bg-slate-200 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAlertDirection('above')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    alertDirection === 'above'
                      ? 'bg-emerald-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  صعود (≥)
                </button>
                <button
                  type="button"
                  onClick={() => setAlertDirection('below')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    alertDirection === 'below'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  هبوط (≤)
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {livePrice && (
                <button
                  type="button"
                  onClick={() => setTargetPriceInput(livePrice)}
                  className="text-xs text-amber-600 dark:text-amber-400 font-bold hover:underline"
                >
                  استخدام السعر الحالي
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveAlert}
                className="px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-black text-xs hover:bg-amber-400 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                {alertSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>تم حفظ التنبيه!</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5" />
                    <span>حفظ وتفعيل التنبيه</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 4 Primary Navigation / Quick Action Buttons */}
        <div className="space-y-2">
          {/* Action 1: فتح شارت العملة */}
          <button
            type="button"
            onClick={() => {
              if (onOpenChart) {
                onOpenChart(item);
                onClose();
              } else {
                setShowChartNotice((prev) => !prev);
              }
            }}
            className="w-full p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 flex items-center justify-between text-right transition cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
                <BarChart2 className="w-4 h-4 group-hover:scale-110 transition" />
              </div>
              <div>
                <span className="font-black text-sm text-slate-950 dark:text-slate-50 block leading-tight">
                  ١. فتح شارت العملة (TradingView Chart)
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  عرض الرسم البياني المتقدم والفريمات
                </span>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition" />
          </button>

          {/* Action 2: فتح في حاسبة التعادل */}
          <button
            type="button"
            onClick={() => {
              onOpenInCalculator(item);
              onClose();
            }}
            className="w-full p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 flex items-center justify-between text-right transition cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                <Calculator className="w-4 h-4 group-hover:scale-110 transition" />
              </div>
              <div>
                <span className="font-black text-sm text-slate-950 dark:text-slate-50 block leading-tight">
                  ٢. فتح في حاسبة التعادل
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  حساب سعر التعادل الصافي والأرباح مع الرسوم
                </span>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition" />
          </button>

          {/* Action 3: فتح في لوحة السكالبينج */}
          <button
            type="button"
            onClick={() => {
              onOpenInScalper(item);
              onClose();
            }}
            className="w-full p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 flex items-center justify-between text-right transition cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
                <Zap className="w-4 h-4 group-hover:scale-110 transition" />
              </div>
              <div>
                <span className="font-black text-sm text-slate-950 dark:text-slate-50 block leading-tight">
                  ٣. فتح في لوحة السكالبينج السريعة
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  رصد أدنى قاع وتأكيد الارتداد السريع
                </span>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition" />
          </button>

          {/* Action 4: ضبط تنبيه سعري فوري */}
          <button
            type="button"
            onClick={() => setIsAlertMode(true)}
            className="w-full p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 flex items-center justify-between text-right transition cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
                <Bell className="w-4 h-4 group-hover:scale-110 transition" />
              </div>
              <div>
                <span className="font-black text-sm text-slate-950 dark:text-slate-50 block leading-tight">
                  ٤. ضبط تنبيه سعري فوري
                </span>
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                  إشعار نظام Push ونغمة صوتية عند وصول السعر للهدف
                </span>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-500 transition" />
          </button>

          {/* Action 5: حذف العملة من قائمة المراقبة */}
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full p-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-between text-right transition cursor-pointer group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold">
                <Trash2 className="w-4 h-4 group-hover:scale-110 transition" />
              </div>
              <div>
                <span className="font-black text-sm text-rose-700 dark:text-rose-400 block leading-tight">
                  ٥. حذف العملة من قائمة المراقبة
                </span>
                <span className="text-[11px] font-semibold text-rose-600/80 dark:text-rose-400/80">
                  إزالة {item.symbol} نهائياً من قائمة مراقبة العملات
                </span>
              </div>
            </div>
            <Trash2 className="w-4 h-4 text-rose-400 group-hover:text-rose-600 transition" />
          </button>
        </div>

        {/* Delete option */}
        <div className="pt-3 mt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          {confirmDelete ? (
            <div className="w-full flex items-center justify-between bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-2xl border border-rose-300 dark:border-rose-800">
              <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                هل أنت متأكد من حذف {item.symbol} من المراقبة؟
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteFromWatchlist(item.id);
                    onClose();
                  }}
                  className="px-3 py-1 rounded-xl bg-rose-600 text-white font-black text-xs hover:bg-rose-700 transition cursor-pointer"
                >
                  نعم، احذف
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 flex items-center gap-1.5 cursor-pointer py-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>حذف العملة من قائمة المراقبة</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
