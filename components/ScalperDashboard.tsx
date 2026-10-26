'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  ScalpTrade, 
  ScalperSessionStats 
} from '@/types/scalper';
import { ScalperCard } from './ScalperCard';
import { ScalperDetailModal } from './ScalperDetailModal';
import { ScalperPerformanceReport } from './ScalperPerformanceReport';
import { 
  Zap, 
  Plus, 
  Radio, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  RotateCcw, 
  Calculator, 
  ExternalLink,
  Search,
  Filter,
  Sparkles,
  Volume2,
  VolumeX,
  Palette
} from 'lucide-react';
import { soundAlert } from '@/lib/soundAlert';

interface ScalperDashboardProps {
  trades: ScalpTrade[];
  livePrices: Record<string, string>;
  isLiveStreamActive: boolean;
  sessionStats: ScalperSessionStats;
  defaultEntryFeePercent?: string;
  defaultExitFeePercent?: string;
  onToggleLiveStream: (active: boolean) => void;
  onUpdateSessionStats: (stats: ScalperSessionStats) => void;
  onAddTrade: (name: string) => void;
  onUpdateTrade: (trade: ScalpTrade) => void;
  onDeleteTrade: (tradeId: string) => void;
  onOpenTrade: (tradeId: string, entryPrice: string, amountUsdt: string, coinQuantity?: string) => void;
  onCloseTradeToUsdt: (tradeId: string, exitPrice: string, reason: ScalpTrade['exitReason']) => void;
  onNavigateToCalculator: (trade?: ScalpTrade) => void;
  onNavigateToTracker: (symbol?: string) => void;
  onOpenThemeCustomizer: () => void;
}

const PRESET_SCALPING_SYMBOLS = ['SOL', 'DOGE', 'PEPE', 'SUI', 'NEAR', 'AVAX', 'XRP', 'BTC', 'ETH'];

export const ScalperDashboard: React.FC<ScalperDashboardProps> = ({
  trades,
  livePrices,
  isLiveStreamActive,
  sessionStats,
  defaultEntryFeePercent = '0.1',
  defaultExitFeePercent = '0.1',
  onToggleLiveStream,
  onUpdateSessionStats,
  onAddTrade,
  onUpdateTrade,
  onDeleteTrade,
  onOpenTrade,
  onCloseTradeToUsdt,
  onNavigateToCalculator,
  onNavigateToTracker,
  onOpenThemeCustomizer,
}) => {
  // Modal state
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  
  // Filter & Search states
  const [activeFilter, setActiveFilter] = useState<'all' | 'in_trade' | 'watching' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newSymbolInput, setNewSymbolInput] = useState('');

  // Audio mute state
  const [isMuted, setIsMuted] = useState(soundAlert.getMuted());

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundAlert.setMuted(next);
  };

  // The active trade being viewed in modal
  const activeModalTrade = useMemo(() => {
    if (!selectedTradeId) return null;
    return trades.find((t) => t.id === selectedTradeId) || null;
  }, [trades, selectedTradeId]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: trades.length,
      in_trade: trades.filter((t) => t.status === 'in_trade').length,
      watching: trades.filter((t) => t.status === 'watching').length,
      closed: trades.filter((t) => t.status === 'closed').length,
    };
  }, [trades]);

  // Filtered list
  const filteredTrades = useMemo(() => {
    return trades.filter((trade) => {
      if (activeFilter !== 'all' && trade.status !== activeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toUpperCase();
        return trade.name.includes(q) || trade.binanceSymbol.includes(q);
      }
      return true;
    });
  }, [trades, activeFilter, searchQuery]);

  // Add new symbol
  const handleAddNewSymbol = (sym: string) => {
    const clean = sym.trim().toUpperCase();
    if (!clean) return;
    onAddTrade(clean);
    setNewSymbolInput('');
  };

  // Quick buy action from card
  const handleQuickBuy = (trade: ScalpTrade, amountUsdt: number) => {
    const p = livePrices[trade.binanceSymbol] || trade.dipPrice || '0';
    onOpenTrade(trade.id, p, amountUsdt.toString());
    soundAlert.playBounceAlert();
  };

  // Quick exit action from card
  const handleQuickExit = (trade: ScalpTrade) => {
    const p = livePrices[trade.binanceSymbol] || trade.entryPrice || '0';
    onCloseTradeToUsdt(trade.id, p, 'manual_usdt');
    soundAlert.playTradeSuccess();
  };

  // Reset Session Stats
  const handleResetSession = () => {
    if (confirm('هل تريد تصفير إحصائيات الجلسة الحالية والبدء من جديد؟')) {
      onUpdateSessionStats({
        availableCapitalUsdt: sessionStats.availableCapitalUsdt || '1000',
        initialCapitalUsdt: sessionStats.availableCapitalUsdt || '1000',
        completedScalps: 0,
        winningScalps: 0,
        totalRealizedPnlUsdt: 0,
        totalRealizedVolumeUsdt: 0,
        avgDurationMinutes: 0,
      });
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3" dir="rtl">
      {/* 1. TOP HEADER & QUICK NAVIGATION BUTTONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                لوحة السكالبينج ورصد القيعان
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                5د - 60د
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              اقتناص أدنى قاع ممكن، والبيع عند أعلى ارتداد والخروج الفوري لـ USDT
            </p>
          </div>
        </div>

        {/* Quick Cross-Screen Navigation Links */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onNavigateToCalculator()}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/15 text-slate-700 dark:text-slate-300 hover:text-amber-500 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="الانتقال إلى حاسبة الصفقات وحساب التعادل"
          >
            <Calculator className="w-4 h-4 text-amber-500" />
            <span>حاسبة التعادل</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToTracker()}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/15 text-slate-700 dark:text-slate-300 hover:text-amber-500 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="الانتقال إلى شاشة رصد صعود العملات"
          >
            <TrendingUp className="w-4 h-4 text-amber-500" />
            <span>رصد الصعود</span>
          </button>

          {/* Audio toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isMuted
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-500'
            }`}
            title={isMuted ? 'تفعيل التنبيهات الصوتية' : 'كتم التنبيهات الصوتية'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Theme customizer */}
          <button
            type="button"
            onClick={onOpenThemeCustomizer}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            title="ألوان الثيم"
          >
            <Palette className="w-4 h-4 text-amber-500" />
          </button>

          {/* Live Binance Stream Toggle */}
          <button
            type="button"
            onClick={() => onToggleLiveStream(!isLiveStreamActive)}
            className={`flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
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

      {/* 2. UPPER SESSION SUMMARY RIBBON (شريط جلسة السكالبينج) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-4">
        {/* Metric 1: Realized P&L */}
        <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">صافي أرباح الجلسة</span>
          <div className="flex items-baseline gap-1" dir="ltr">
            <span className={`text-xl sm:text-2xl font-black font-mono ${
              sessionStats.totalRealizedPnlUsdt >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500'
            }`}>
              {sessionStats.totalRealizedPnlUsdt >= 0 ? '+' : ''}{sessionStats.totalRealizedPnlUsdt.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400 font-mono">USDT</span>
          </div>
        </div>

        {/* Metric 2: Completed Scalps & Win Rate */}
        <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">الصفقات المغلقة والنجاح</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
              {sessionStats.completedScalps}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-500 dark:text-emerald-400">
              {sessionStats.completedScalps > 0 
                ? `${Math.round((sessionStats.winningScalps / sessionStats.completedScalps) * 100)}% ربح` 
                : '0%'}
            </span>
          </div>
        </div>

        {/* Metric 3: Active In-Trade Positions */}
        <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">صفقات مفتوحة الآن</span>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-500 dark:text-emerald-400">
              {counts.in_trade}
            </span>
            {counts.in_trade > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            )}
          </div>
        </div>

        {/* Metric 4: Average Duration */}
        <div className="p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">متوسط مدة الصفقة</span>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xl sm:text-2xl font-black font-mono text-slate-900 dark:text-slate-100">
              {sessionStats.avgDurationMinutes > 0 ? `${sessionStats.avgDurationMinutes}` : '—'}
            </span>
            <span className="text-xs text-slate-400">دقيقة</span>
          </div>
        </div>

        {/* Metric 5: Capital & Reset Session */}
        <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-0.5">رأس المال المخصص</span>
            <div className="font-mono font-bold text-base text-slate-900 dark:text-slate-100" dir="ltr">
              ${sessionStats.availableCapitalUsdt || '1000'}
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetSession}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition cursor-pointer"
            title="تصفير إحصائيات الجلسة"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visual Daily & Weekly Performance Report (Recharts) */}
      <ScalperPerformanceReport 
        trades={trades}
        sessionStats={sessionStats}
      />

      {/* 3. ADD COIN & FILTER ACTION BAR */}
      <div className="space-y-3 mb-5 p-4 rounded-3xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {/* Quick Add presets & custom symbol input */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              عملات سكالبينج نشطة:
            </span>
            {PRESET_SCALPING_SYMBOLS.map((sym) => {
              const isAlreadyAdded = trades.some((t) => t.name === sym);
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() => handleAddNewSymbol(sym)}
                  disabled={isAlreadyAdded}
                  className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                    isAlreadyAdded
                      ? 'bg-slate-200/60 dark:bg-slate-800/40 text-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  }`}
                >
                  +{sym}
                </button>
              );
            })}
          </div>

          {/* Custom Input */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleAddNewSymbol(newSymbolInput);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={newSymbolInput}
              onChange={(e) => setNewSymbolInput(e.target.value.toUpperCase())}
              placeholder="رمز العملة (مثال: SUI, SOL)..."
              className="px-3 py-1.5 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs sm:text-sm font-mono focus:outline-none focus:border-amber-500 w-44"
            />
            <button
              type="submit"
              disabled={!newSymbolInput.trim()}
              className="px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-1 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة</span>
            </button>
          </form>
        </div>

        {/* Filter Tabs & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'الكل', count: counts.all },
              { id: 'in_trade', label: 'صفقات نشطة', count: counts.in_trade },
              { id: 'watching', label: 'رصد القيعان', count: counts.watching },
              { id: 'closed', label: 'المغلقة', count: counts.closed },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as typeof activeFilter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activeFilter === tab.id
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-900/10 dark:bg-slate-950/20 font-mono">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في العملات..."
              className="w-full sm:w-56 pr-9 pl-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* 4. SCALPER CARDS GRID */}
      {filteredTrades.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white/40 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
          <Zap className="w-12 h-12 mx-auto text-amber-500/40 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
            لا توجد عملات في هذه القائمة حالياً
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            أضف إحدى العملات السريعة المقترحة بالأعلى للبدء برصد أدنى قاع وتنفيذ صفقات السكالبينج السريعة.
          </p>
          <div className="flex items-center justify-center gap-2">
            {['SOL', 'DOGE', 'PEPE'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleAddNewSymbol(s)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition cursor-pointer"
              >
                + إضافة {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrades.map((trade) => (
            <ScalperCard
              key={trade.id}
              trade={trade}
              livePrice={livePrices[trade.binanceSymbol]}
              onOpenDetail={(t) => setSelectedTradeId(t.id)}
              onQuickBuy={handleQuickBuy}
              onQuickExit={handleQuickExit}
              onNavigateToCalculator={onNavigateToCalculator}
            />
          ))}
        </div>
      )}

      {/* 5. EXPANDED DETAIL MODAL */}
      <ScalperDetailModal
        isOpen={Boolean(activeModalTrade)}
        trade={activeModalTrade}
        livePrice={activeModalTrade ? livePrices[activeModalTrade.binanceSymbol] : undefined}
        defaultEntryFeePercent={defaultEntryFeePercent}
        defaultExitFeePercent={defaultExitFeePercent}
        onClose={() => setSelectedTradeId(null)}
        onUpdateTrade={onUpdateTrade}
        onOpenTrade={onOpenTrade}
        onCloseTradeToUsdt={onCloseTradeToUsdt}
        onDeleteTrade={onDeleteTrade}
        onNavigateToCalculator={onNavigateToCalculator}
        onNavigateToTracker={(sym) => onNavigateToTracker(sym)}
      />
    </div>
  );
};
