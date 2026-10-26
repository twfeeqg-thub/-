'use client';

import React, { useState } from 'react';

interface CoinAvatarProps {
  symbol: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

// In-memory cache for fast lookup and failure suppression
const failedImages = new Set<string>();

const COIN_COLOR_MAP: Record<string, { bg: string; text: string; iconSymbol?: string }> = {
  BTC: { bg: 'bg-[#F7931A]', text: 'text-white', iconSymbol: '₿' },
  ETH: { bg: 'bg-[#627EEA]', text: 'text-white', iconSymbol: 'Ξ' },
  BNB: { bg: 'bg-[#F3BA2F]', text: 'text-slate-950', iconSymbol: '◆' },
  SOL: { bg: 'bg-gradient-to-tr from-[#9945FF] to-[#14F195]', text: 'text-white', iconSymbol: 'S' },
  NEAR: { bg: 'bg-[#000000] dark:bg-[#111827] border border-emerald-400', text: 'text-emerald-400', iconSymbol: 'N' },
  RAY: { bg: 'bg-[#5054FF]', text: 'text-white', iconSymbol: 'R' },
  ZRO: { bg: 'bg-[#18181B] border border-slate-400', text: 'text-white', iconSymbol: 'Z' },
  INJ: { bg: 'bg-[#00D2FF]', text: 'text-slate-950', iconSymbol: '⚡' },
  BAT: { bg: 'bg-[#FF5000]', text: 'text-white', iconSymbol: '▲' },
  AR: { bg: 'bg-[#222326] border border-slate-500', text: 'text-white', iconSymbol: 'a' },
  ZEC: { bg: 'bg-[#F4B728]', text: 'text-slate-950', iconSymbol: 'Z' },
  LTC: { bg: 'bg-[#345D9D]', text: 'text-white', iconSymbol: 'Ł' },
  DASH: { bg: 'bg-[#008CE7]', text: 'text-white', iconSymbol: 'D' },
  AVAX: { bg: 'bg-[#E84142]', text: 'text-white', iconSymbol: '▲' },
  LINK: { bg: 'bg-[#375BD2]', text: 'text-white', iconSymbol: '⬡' },
  DOGE: { bg: 'bg-[#C2A633]', text: 'text-white', iconSymbol: 'Ð' },
  PEPE: { bg: 'bg-[#479B43]', text: 'text-white', iconSymbol: '🐸' },
  SUI: { bg: 'bg-[#2A82E4]', text: 'text-white', iconSymbol: 'S' },
  XRP: { bg: 'bg-[#23292F]', text: 'text-white', iconSymbol: '✕' },
  ADA: { bg: 'bg-[#0033AD]', text: 'text-white', iconSymbol: '₳' },
};

export const CoinAvatar: React.FC<CoinAvatarProps> = ({ symbol, size = 'sm', className = '' }) => {
  const cleanSymbol = symbol.toUpperCase().replace(/USDT$|BUSD$|USD$|BTC$/, '');
  const lowerSymbol = cleanSymbol.toLowerCase();

  // Official Binance asset CDN URL for cryptocurrencies
  const binanceIconUrl = `https://assets.binance.com/assets/market-cap/crypto/${lowerSymbol}.png`;
  const [imageError, setImageError] = useState(() => failedImages.has(lowerSymbol));

  const config = COIN_COLOR_MAP[cleanSymbol] || {
    bg: 'bg-slate-700 dark:bg-slate-800 border border-slate-600',
    text: 'text-slate-100',
    iconSymbol: cleanSymbol.slice(0, 3),
  };

  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-10 h-10 text-sm',
  }[size];

  const handleImageError = () => {
    failedImages.add(lowerSymbol);
    setImageError(true);
  };

  if (!imageError) {
    return (
      <div className={`relative ${sizeClasses} shrink-0 select-none ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={binanceIconUrl}
          alt={cleanSymbol}
          onError={handleImageError}
          loading="lazy"
          className="w-full h-full rounded-full object-cover shadow-2xs border border-slate-200/60 dark:border-slate-700/60 bg-white dark:bg-slate-800"
        />
      </div>
    );
  }

  // High-contrast clean fallback avatar
  return (
    <div
      className={`${sizeClasses} ${config.bg} ${config.text} rounded-full flex items-center justify-center font-black select-none shrink-0 shadow-2xs ${className}`}
    >
      <span>{config.iconSymbol || cleanSymbol.slice(0, 2)}</span>
    </div>
  );
};
