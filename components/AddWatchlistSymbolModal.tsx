'use client';

import React, { useState } from 'react';
import { X, Search, Plus, Sparkles, Check } from 'lucide-react';
import { WatchlistCategory, WatchlistFlagColor } from '@/types/watchlist';
import { CoinAvatar } from './CoinAvatar';

interface AddWatchlistSymbolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSymbol: (symbol: string, category: WatchlistCategory, flagColor: WatchlistFlagColor) => void;
  existingSymbols: string[];
}

const POPULAR_CRYPTO_SUGGESTIONS = [
  { symbol: 'BTCUSDT', name: 'BTC', desc: 'Bitcoin' },
  { symbol: 'ETHUSDT', name: 'ETH', desc: 'Ethereum' },
  { symbol: 'SOLUSDT', name: 'SOL', desc: 'Solana' },
  { symbol: 'BNBUSDT', name: 'BNB', desc: 'Binance Coin' },
  { symbol: 'DOGEUSDT', name: 'DOGE', desc: 'Dogecoin' },
  { symbol: 'PEPEUSDT', name: 'PEPE', desc: 'Pepe' },
  { symbol: 'SUIUSDT', name: 'SUI', desc: 'Sui Network' },
  { symbol: 'NEARUSDT', name: 'NEAR', desc: 'NEAR Protocol' },
  { symbol: 'AVAXUSDT', name: 'AVAX', desc: 'Avalanche' },
  { symbol: 'LINKUSDT', name: 'LINK', desc: 'ChainLink' },
  { symbol: 'XRPUSDT', name: 'XRP', desc: 'Ripple' },
  { symbol: 'ADAUSDT', name: 'ADA', desc: 'Cardano' },
  { symbol: 'LTCUSDT', name: 'LTC', desc: 'Litecoin' },
  { symbol: 'INJUSDT', name: 'INJ', desc: 'Injective' },
  { symbol: 'RAYUSDT', name: 'RAY', desc: 'Raydium' },
];

export const AddWatchlistSymbolModal: React.FC<AddWatchlistSymbolModalProps> = ({
  isOpen,
  onClose,
  onAddSymbol,
  existingSymbols,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WatchlistCategory>('crypto');
  const [selectedFlag, setSelectedFlag] = useState<WatchlistFlagColor>(null);

  if (!isOpen) return null;

  const cleanQuery = searchInput.trim().toUpperCase();

  const handleAdd = (sym: string) => {
    let clean = sym.trim().toUpperCase();
    if (!clean.endsWith('USDT') && !clean.endsWith('BUSD') && !clean.endsWith('USD')) {
      clean = `${clean}USDT`;
    }
    onAddSymbol(clean, selectedCategory, selectedFlag);
    onClose();
  };

  const filteredSuggestions = POPULAR_CRYPTO_SUGGESTIONS.filter(
    (s) =>
      s.symbol.includes(cleanQuery) ||
      s.name.includes(cleanQuery) ||
      s.desc.toUpperCase().includes(cleanQuery)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div 
        className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-3xl shadow-2xl p-5 sm:p-6 my-auto max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-slate-950 dark:text-slate-50">
                إضافة رمز جديد إلى قائمة المراقبة
              </h3>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                ابحث في جميع أزواج Binance المتاحة
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="my-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            dir="ltr"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="اكتب رمز العملة (مثال: SOL أو BTCUSDT)..."
            className="w-full pr-9 pl-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-mono font-bold text-sm text-slate-950 dark:text-slate-50 focus:outline-none focus:border-amber-500"
            autoFocus
          />
        </div>

        {/* Custom Symbol Submit */}
        {cleanQuery.length >= 2 && (
          <button
            type="button"
            onClick={() => handleAdd(cleanQuery)}
            className="w-full mb-3 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة الرمز المخصص: {cleanQuery.endsWith('USDT') ? cleanQuery : `${cleanQuery}USDT`}</span>
          </button>
        )}

        {/* Category selector */}
        <div className="space-y-1.5 mb-4">
          <label className="text-xs font-black text-slate-800 dark:text-slate-200 block">
            التصنيف في القائمة:
          </label>
          <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
            {[
              { id: 'crypto', label: 'العملات الرقمية' },
              { id: 'scalping', label: 'السكالبينج' },
              { id: 'favorites', label: 'المفضلة ⭐' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as WatchlistCategory)}
                className={`py-1.5 px-2 rounded-xl border text-center transition cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Popular Suggestions List */}
        <div className="space-y-1">
          <span className="text-xs font-black text-slate-800 dark:text-slate-200 block mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>العملات الأكثر شيوعاً:</span>
          </span>

          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {filteredSuggestions.map((coin) => {
              const isAdded = existingSymbols.includes(coin.symbol);
              return (
                <div
                  key={coin.symbol}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <CoinAvatar symbol={coin.name} size="sm" />
                    <div>
                      <span className="font-mono font-black text-xs text-slate-950 dark:text-slate-50 block">
                        {coin.symbol}
                      </span>
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        {coin.desc}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdd(coin.symbol)}
                    disabled={isAdded}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                      isAdded
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-xs'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>مضاف</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3" />
                        <span>إضافة</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
