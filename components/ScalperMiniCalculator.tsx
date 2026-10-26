'use client';

import React, { useState, useMemo } from 'react';
import { Calculator, Check, ArrowRight, Percent, DollarSign, Coins } from 'lucide-react';
import { trimTrailingZeros } from '@/lib/calculator';

interface ScalperMiniCalculatorProps {
  availableCapital?: string;
  defaultPrice?: string;
  defaultAmount?: string;
  onApply: (calculatedQuantity: string, tradeAmount: string, entryPrice: string) => void;
  onClose?: () => void;
}

export const ScalperMiniCalculator: React.FC<ScalperMiniCalculatorProps> = ({
  availableCapital = '1000',
  defaultPrice = '',
  defaultAmount = '100',
  onApply,
  onClose,
}) => {
  const [capitalUsdt, setCapitalUsdt] = useState<string>(defaultAmount || '100');
  const [priceInput, setPriceInput] = useState<string>(defaultPrice || '');
  const [feePercent, setFeePercent] = useState<string>('0.1');

  const totalAvailableNum = parseFloat(availableCapital) || 1000;
  const capitalNum = parseFloat(capitalUsdt) || 0;
  const priceNum = parseFloat(priceInput) || 0;
  const feeNum = parseFloat(feePercent) || 0.1;

  // Calculation
  const result = useMemo(() => {
    if (priceNum <= 0 || capitalNum <= 0) {
      return { grossQty: 0, netQty: 0, feeUsdt: 0 };
    }
    const grossQty = capitalNum / priceNum;
    const feeUsdt = capitalNum * (feeNum / 100);
    const netUsdt = capitalNum - feeUsdt;
    const netQty = netUsdt / priceNum;
    return { grossQty, netQty, feeUsdt };
  }, [capitalNum, priceNum, feeNum]);

  // Handle Quick Percent of Total Capital
  const handleQuickPercent = (pct: number) => {
    const val = (totalAvailableNum * pct) / 100;
    setCapitalUsdt(val.toFixed(2));
  };

  const handleApply = () => {
    if (result.grossQty <= 0) return;
    onApply(
      trimTrailingZeros(result.grossQty.toFixed(8)),
      capitalUsdt,
      priceInput
    );
    if (onClose) onClose();
  };

  return (
    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-right space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-xs text-amber-500 dark:text-amber-300">
          <Calculator className="w-4 h-4" />
          <span>حاسبة كمية العملة ورأس المال</span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          المتاح: ${totalAvailableNum.toFixed(0)} USDT
        </span>
      </div>

      {/* Percentage Shortcuts */}
      <div className="flex items-center gap-1.5 text-[11px]">
        <span className="text-slate-400 text-[10px]">نسبة رأس المال:</span>
        {[10, 25, 50, 100].map((pct) => (
          <button
            key={pct}
            type="button"
            onClick={() => handleQuickPercent(pct)}
            className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 hover:bg-amber-500/20 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono text-[10px] font-bold transition cursor-pointer"
          >
            %{pct}
          </button>
        ))}
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="text-[10px] text-slate-500 block mb-0.5">رأس مال الصفقة (USDT)</label>
          <input
            type="text"
            dir="ltr"
            value={capitalUsdt}
            onChange={(e) => setCapitalUsdt(e.target.value)}
            placeholder="100"
            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="text-[10px] text-slate-500 block mb-0.5">سعر الدخول (USDT)</label>
          <input
            type="text"
            dir="ltr"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="0.00"
            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Result Display Box */}
      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/90 border border-amber-500/20 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 block mb-0.5">الكمية الصافية المشتراة (Coin Qty)</span>
          <div className="font-mono font-bold text-sm text-emerald-500 dark:text-emerald-400" dir="ltr">
            {result.grossQty > 0 ? trimTrailingZeros(result.grossQty.toFixed(6)) : '0.00'}
          </div>
        </div>

        <div className="text-left font-mono text-[10px] text-slate-400" dir="ltr">
          <div>عمولة: {result.feeUsdt.toFixed(3)} $</div>
          <div className="text-[9px] text-slate-500">({feePercent}%)</div>
        </div>
      </div>

      {/* Action CTA */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleApply}
          disabled={result.grossQty <= 0}
          className="flex-1 py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-40 cursor-pointer"
        >
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>اعتماد الكمية في الصفقة</span>
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="py-1.5 px-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs hover:bg-slate-300 transition cursor-pointer"
          >
            إلغاء
          </button>
        )}
      </div>
    </div>
  );
};
