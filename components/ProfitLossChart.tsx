'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
  CartesianGrid,
} from 'recharts';
import { 
  CalculationTrackResult, 
  formatCurrencyPrice, 
  formatPercent, 
  formatUSDT 
} from '@/lib/calculator';
import { useTheme } from '@/context/ThemeContext';
import { 
  BarChart3, 
  LineChart as LineChartIcon, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  ChevronDown, 
  ChevronUp,
  Percent,
  DollarSign
} from 'lucide-react';

interface ProfitLossChartProps {
  entryPrice?: string;
  hasValidBase: boolean;
  percentTrack: CalculationTrackResult;
  fixedTrack: CalculationTrackResult;
  currencyName?: string;
}

interface ChartDataPoint {
  index: number;
  label: string;
  price: number;
  formattedPrice: string;
  netPnL: number;
  formattedPnL: string;
  pnlPercent: number;
  formattedPercent: string;
  status: 'profit' | 'loss' | 'breakeven';
  fill: string;
}

export const ProfitLossChart: React.FC<ProfitLossChartProps> = ({
  hasValidBase,
  percentTrack,
  fixedTrack,
  currencyName,
}) => {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');
  const [selectedTrack, setSelectedTrack] = useState<'percent' | 'fixed'>('percent');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const hasPercent = percentTrack.hasTrack && percentTrack.isValid;
  const hasFixed = fixedTrack.hasTrack && fixedTrack.isValid;

  // Derive active track without cascading setState in an effect
  const activeTrackType = useMemo(() => {
    if (selectedTrack === 'percent' && hasPercent) return 'percent';
    if (selectedTrack === 'fixed' && hasFixed) return 'fixed';
    if (hasPercent) return 'percent';
    if (hasFixed) return 'fixed';
    return 'percent';
  }, [selectedTrack, hasPercent, hasFixed]);

  const activeTrackResult = activeTrackType === 'percent' ? percentTrack : fixedTrack;

  // Prepare chart data sorted by price
  const chartData: ChartDataPoint[] = useMemo(() => {
    if (!hasValidBase || !activeTrackResult.isValid) return [];

    const results = activeTrackResult.testResults.filter((r) => !isNaN(r.netPnL));
    if (results.length === 0) return [];

    // Map to chart items
    const items: ChartDataPoint[] = results.map((item, idx) => {
      const numPrice = parseFloat(item.price);
      let fill = '#f59e0b'; // amber breakeven
      if (item.status === 'profit') fill = '#10b981'; // emerald profit
      if (item.status === 'loss') fill = '#f43f5e'; // rose loss

      return {
        index: idx + 1,
        label: formatCurrencyPrice(item.price),
        price: isNaN(numPrice) ? idx : numPrice,
        formattedPrice: formatCurrencyPrice(item.price),
        netPnL: item.netPnL,
        formattedPnL: (item.netPnL > 0 ? '+' : '') + formatUSDT(item.netPnL),
        pnlPercent: item.pnlPercent,
        formattedPercent: (item.pnlPercent > 0 ? '+' : '') + formatPercent(item.pnlPercent),
        status: item.status,
        fill,
      };
    });

    // Sort ascending by price for logical visualization
    return items.sort((a, b) => a.price - b.price);
  }, [hasValidBase, activeTrackResult]);

  // Statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const maxProfit = Math.max(...chartData.map((d) => d.netPnL));
    const maxLoss = Math.min(...chartData.map((d) => d.netPnL));
    return {
      maxProfit: maxProfit > 0 ? maxProfit : null,
      maxLoss: maxLoss < 0 ? maxLoss : null,
      totalCount: chartData.length,
    };
  }, [chartData]);

  if (!mounted) {
    return null;
  }

  // Theme-aware colors
  const isDark = theme === 'dark';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <section className="space-y-3 pt-2">
      {/* Header with Title and Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
            <BarChart3 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>تأثير أسعار الاختبار على الربح/الخسارة</span>
              {currencyName && (
                <span className="text-[10px] font-mono text-amber-500 font-bold">
                  ({currencyName})
                </span>
              )}
            </h2>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
              رسم بياني تفاعلي يوضح صافي العائد عند كل سعر
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Track switch if both tracks are active */}
          {hasPercent && hasFixed && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px]">
              <button
                type="button"
                onClick={() => setSelectedTrack('percent')}
                className={`px-1.5 py-0.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                  activeTrackType === 'percent'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="مسار النسبة"
              >
                <Percent className="w-2.5 h-2.5" />
                <span>%</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTrack('fixed')}
                className={`px-1.5 py-0.5 rounded-md font-medium transition cursor-pointer flex items-center gap-1 ${
                  activeTrackType === 'fixed'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="مسار المبلغ الثابت"
              >
                <DollarSign className="w-2.5 h-2.5" />
                <span>USDT</span>
              </button>
            </div>
          )}

          {/* Chart type toggle */}
          {chartData.length > 0 && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`p-1 rounded-md transition cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="مخطط أعمدة"
              >
                <BarChart3 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`p-1 rounded-md transition cursor-pointer ${
                  chartType === 'area'
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="منحنى مستمر"
              >
                <LineChartIcon className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Collapse/Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title={isCollapsed ? 'توسيع الرسم البياني' : 'طي الرسم البياني'}
          >
            {isCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-3 transition-all animate-in fade-in duration-200">
          {chartData.length === 0 ? (
            /* Empty State */
            <div className="py-6 text-center space-y-2">
              <div className="w-9 h-9 mx-auto rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
                أدخل سعر اختبار واحد على الأقل في خانات الاختبار أعلاه لإظهار الرسم البياني التفاعلي للأرباح والخسائر.
              </p>
            </div>
          ) : (
            /* Active Interactive Chart */
            <>
              {/* Summary Stats Badges */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {/* Max Profit */}
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                      <span>أعلى ربح:</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs" dir="ltr">
                      {stats.maxProfit !== null ? `+${formatUSDT(stats.maxProfit)}` : '—'}
                    </span>
                  </div>

                  {/* Max Loss */}
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-300">
                      <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                      <span>أقصى خسارة:</span>
                    </div>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs" dir="ltr">
                      {stats.maxLoss !== null ? `${formatUSDT(stats.maxLoss)}` : '—'}
                    </span>
                  </div>

                  {/* Break-Even Reference Point */}
                  <div className="col-span-2 sm:col-span-1 p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
                      <Target className="w-3.5 h-3.5 text-amber-500" />
                      <span>التعادل:</span>
                    </div>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs" dir="ltr">
                      {formatCurrencyPrice(activeTrackResult.breakEvenPrice)}
                    </span>
                  </div>
                </div>
              )}

              {/* Chart Visual Container */}
              <div className="w-full h-52 sm:h-60 pt-2" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart
                      data={chartData}
                      margin={{ top: 12, right: 12, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.6} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: textColor, fontSize: 10, fontFamily: 'monospace' }}
                        stroke={gridColor}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fill: textColor, fontSize: 10, fontFamily: 'monospace' }}
                        stroke={gridColor}
                        tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}`}
                        unit=" $"
                      />
                      {/* Break-Even Reference Line */}
                      <ReferenceLine
                        y={0}
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        label={{
                          value: 'التعادل (0 $)',
                          fill: '#f59e0b',
                          fontSize: 10,
                          position: 'insideBottomRight',
                          offset: 4,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="netPnL" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <AreaChart
                      data={chartData}
                      margin={{ top: 12, right: 12, left: -10, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.4} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.6} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: textColor, fontSize: 10, fontFamily: 'monospace' }}
                        stroke={gridColor}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fill: textColor, fontSize: 10, fontFamily: 'monospace' }}
                        stroke={gridColor}
                        tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}`}
                        unit=" $"
                      />
                      <ReferenceLine
                        y={0}
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        label={{
                          value: 'التعادل (0 $)',
                          fill: '#f59e0b',
                          fontSize: 10,
                          position: 'insideBottomRight',
                          offset: 4,
                        }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="netPnL"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorPnL)"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Chart Legend Footer */}
              <div className="flex items-center justify-center gap-4 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>ربح (أعلى من التعادل)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>خسارة (أدنى من التعادل)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>سعر التعادل (0 $)</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
};

// Custom Tooltip component for Recharts
interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
    value: number;
  }>;
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    const isProfit = data.status === 'profit';
    const isLoss = data.status === 'loss';

    return (
      <div
        className="p-3 rounded-xl shadow-xl border text-right space-y-1.5 backdrop-blur-md min-w-[150px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
        dir="rtl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
          <span className="text-[10px] text-slate-400">سعر الاختبار:</span>
          <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-100" dir="ltr">
            {data.formattedPrice}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">صافي الربح/الخسارة:</span>
          <span
            className={`font-mono font-bold text-xs ${
              isProfit
                ? 'text-emerald-600 dark:text-emerald-400'
                : isLoss
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
            dir="ltr"
          >
            {data.formattedPnL} USDT
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-400">النسبة المئوية:</span>
          <span
            className={`font-mono font-bold text-xs ${
              isProfit
                ? 'text-emerald-600 dark:text-emerald-400'
                : isLoss
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
            dir="ltr"
          >
            {data.formattedPercent}
          </span>
        </div>

        <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-center">
          <span
            className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
              isProfit
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : isLoss
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
            }`}
          >
            {isProfit ? 'صفقة رابحة' : isLoss ? 'صفقة خاسرة' : 'نقطة التعادل'}
          </span>
        </div>
      </div>
    );
  }
  return null;
};
