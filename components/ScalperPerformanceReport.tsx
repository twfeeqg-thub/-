'use client';

import React, { useState, useMemo } from 'react';
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
  CartesianGrid 
} from 'recharts';
import { ScalpTrade, ScalperSessionStats } from '@/types/scalper';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Award, 
  DollarSign, 
  ChevronDown, 
  ChevronUp,
  Activity,
  Zap
} from 'lucide-react';
import { formatCompactPrice, formatPercent } from '@/lib/calculator';

interface ScalperPerformanceReportProps {
  trades: ScalpTrade[];
  sessionStats: ScalperSessionStats;
}

export const ScalperPerformanceReport: React.FC<ScalperPerformanceReportProps> = ({
  trades,
  sessionStats,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly'>('daily');

  // Closed trades
  const closedTrades = useMemo(() => {
    return trades
      .filter((t) => t.status === 'closed' && t.exitTimestamp)
      .sort((a, b) => (a.exitTimestamp || 0) - (b.exitTimestamp || 0));
  }, [trades]);

  // Daily Data Points (trade by trade today)
  const dailyData = useMemo(() => {
    let running = 0;
    const items = [];
    for (let idx = 0; idx < closedTrades.length; idx++) {
      const t = closedTrades[idx];
      const pnl = t.realizedPnlUsdt || 0;
      running += pnl;
      const dateObj = t.exitTimestamp ? new Date(t.exitTimestamp) : new Date();
      const timeStr = dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      items.push({
        tradeIndex: idx + 1,
        name: `${t.name} #${idx + 1}`,
        symbol: t.name,
        time: timeStr,
        pnl: parseFloat(pnl.toFixed(2)),
        cumulativePnl: parseFloat(running.toFixed(2)),
        duration: t.holdingDurationMinutes || 1,
        fill: pnl >= 0 ? '#10b981' : '#f43f5e',
      });
    }
    return items;
  }, [closedTrades]);

  // Weekly Data Points (last 7 days aggregate)
  const weeklyData = useMemo(() => {
    const daysMap: Record<string, { date: string; label: string; pnl: number; count: number; wins: number }> = {};
    const dayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    // Generate last 7 days slots
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const label = i === 0 ? 'اليوم' : dayNames[d.getDay()];
      daysMap[iso] = { date: iso, label, pnl: 0, count: 0, wins: 0 };
    }

    // Populate with actual closed trades
    closedTrades.forEach((t) => {
      if (t.exitTimestamp) {
        const iso = new Date(t.exitTimestamp).toISOString().split('T')[0];
        if (daysMap[iso]) {
          const pnl = t.realizedPnlUsdt || 0;
          daysMap[iso].pnl += pnl;
          daysMap[iso].count += 1;
          if (pnl > 0) daysMap[iso].wins += 1;
        }
      }
    });

    // If today has session stats without past timestamps, merge current session
    const todayIso = new Date().toISOString().split('T')[0];
    if (daysMap[todayIso] && daysMap[todayIso].count === 0 && sessionStats.completedScalps > 0) {
      daysMap[todayIso].pnl = sessionStats.totalRealizedPnlUsdt;
      daysMap[todayIso].count = sessionStats.completedScalps;
      daysMap[todayIso].wins = sessionStats.winningScalps;
    }

    return Object.values(daysMap).map((d) => ({
      ...d,
      pnl: parseFloat(d.pnl.toFixed(2)),
      fill: d.pnl >= 0 ? '#10b981' : '#f43f5e',
    }));
  }, [closedTrades, sessionStats]);

  // High-level aggregates
  const stats = useMemo(() => {
    const totalPnl = sessionStats.totalRealizedPnlUsdt;
    const completed = sessionStats.completedScalps;
    const wins = sessionStats.winningScalps;
    const winRate = completed > 0 ? Math.round((wins / completed) * 100) : 0;
    const losses = completed - wins;
    return { totalPnl, completed, wins, losses, winRate };
  }, [sessionStats]);

  return (
    <div className="mb-5 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all" dir="rtl">
      {/* Header bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                تقرير الأداء والتحليل البصري للسكالبينج
              </h2>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                stats.totalPnl >= 0 
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                  : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
              }`}>
                {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toFixed(2)} USDT
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              تحليل بياني تفاعلي لتطور الأرباح والخسائر ومعدل نجاح الصفقات
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Switcher inside header */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
          >
            <button
              type="button"
              onClick={() => setTimeframe('daily')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                timeframe === 'daily'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              اليومي
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('weekly')}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                timeframe === 'weekly'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              آخر 7 أيام
            </button>
          </div>

          <button 
            type="button"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
          >
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 space-y-4">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 block mb-0.5">صافي الأرباح</span>
              <div className={`font-mono font-bold text-base ${stats.totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} dir="ltr">
                {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toFixed(2)} $
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 block mb-0.5">نسبة نجاح الصفقات (Win Rate)</span>
              <div className="font-mono font-bold text-base text-amber-500 dark:text-amber-400">
                %{stats.winRate} <span className="text-xs text-slate-400">({stats.wins} رابحة)</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 block mb-0.5">عدد الصفقات المنفذة</span>
              <div className="font-mono font-bold text-base text-slate-800 dark:text-slate-200">
                {stats.completed} <span className="text-xs text-slate-400">صفقة</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 block mb-0.5">متوسط الاحتفاظ بالصفقة</span>
              <div className="font-mono font-bold text-base text-slate-800 dark:text-slate-200">
                {sessionStats.avgDurationMinutes || 1} <span className="text-xs text-slate-400">دقيقة</span>
              </div>
            </div>
          </div>

          {/* Recharts Chart Area */}
          <div className="h-56 sm:h-64 w-full pt-2">
            {timeframe === 'daily' ? (
              dailyData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-800">
                  <Activity className="w-8 h-8 text-amber-500/40 mb-2" />
                  <p className="text-xs text-slate-500">
                    لم يتم تسجيل صفقات مغلقة اليوم بعد. أغلق أول صفقة سكالبينج لمشاهدة الرسم البياني الحي للأرباح.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <ReferenceLine y={0} stroke="#64748b" strokeDasharray="2 2" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                      {dailyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="#64748b" strokeDasharray="2 2" />
                  <Tooltip content={<CustomWeeklyTooltip />} />
                  <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                    {weeklyData.map((entry, index) => (
                      <Cell key={`cell-wk-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Tooltip for Daily
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; pnl: number; time: string; duration: number } }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isWin = data.pnl >= 0;
    return (
      <div className="p-2.5 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-xl text-xs font-mono space-y-1 text-right" dir="rtl">
        <div className="font-bold text-slate-200">{data.name}</div>
        <div className="text-[11px] text-slate-400">الوقت: {data.time} (المدة: {data.duration} دقيقة)</div>
        <div className={`font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`} dir="ltr">
          {isWin ? '+' : ''}{data.pnl.toFixed(2)} USDT
        </div>
      </div>
    );
  }
  return null;
};

// Tooltip for Weekly
const CustomWeeklyTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { label: string; date: string; pnl: number; count: number; wins: number } }> }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isWin = data.pnl >= 0;
    return (
      <div className="p-2.5 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-xl text-xs font-mono space-y-1 text-right" dir="rtl">
        <div className="font-bold text-slate-200">{data.label} ({data.date})</div>
        <div className="text-[11px] text-slate-400">عدد الصفقات: {data.count} (رابحة: {data.wins})</div>
        <div className={`font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`} dir="ltr">
          صافي اليوم: {isWin ? '+' : ''}{data.pnl.toFixed(2)} USDT
        </div>
      </div>
    );
  }
  return null;
};
