'use client';

import React, { useMemo, useId } from 'react';
import { trimTrailingZeros } from '@/lib/calculator';

interface ScalperSparklineProps {
  status: 'watching' | 'in_trade' | 'closed';
  currentPrice: number;
  entryPrice?: number;
  dipPrice?: number;
  peakPrice?: number;
  priceHistory?: number[];
  height?: number;
}

export const ScalperSparkline: React.FC<ScalperSparklineProps> = ({
  status,
  currentPrice,
  entryPrice,
  dipPrice,
  peakPrice,
  priceHistory = [],
  height = 36,
}) => {
  const uid = useId();
  const gradientId = `sparkline_grad_${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  // Construct a series of at least 8-12 points for visual smoothness
  const points = useMemo(() => {
    let raw = priceHistory && priceHistory.length >= 2 ? [...priceHistory] : [];

    if (raw.length === 0) {
      if (status === 'in_trade' && entryPrice && entryPrice > 0) {
        raw = [entryPrice, (entryPrice + currentPrice) / 2, currentPrice];
      } else if (status === 'watching' && dipPrice && dipPrice > 0) {
        raw = [dipPrice, (dipPrice + currentPrice) / 2, currentPrice];
      } else if (currentPrice > 0) {
        raw = [currentPrice * 0.998, currentPrice * 1.001, currentPrice];
      } else {
        return [];
      }
    }

    // Ensure the last point is strictly currentPrice if available
    if (currentPrice > 0) {
      if (raw[raw.length - 1] !== currentPrice) {
        raw.push(currentPrice);
      }
    }

    // Keep up to 25 points
    if (raw.length > 25) {
      raw = raw.slice(raw.length - 25);
    }

    return raw;
  }, [priceHistory, currentPrice, entryPrice, dipPrice, status]);

  if (points.length < 2) {
    return (
      <div 
        style={{ height }}
        className="w-full flex items-center justify-center text-[10px] text-slate-400 font-mono border-t border-dashed border-slate-200 dark:border-slate-800"
      >
        جاري رسم الحركة...
      </div>
    );
  }

  // Calculate scales
  const minVal = Math.min(...points, entryPrice || Infinity, dipPrice || Infinity) * 0.9995;
  const maxVal = Math.max(...points, entryPrice || -Infinity, peakPrice || -Infinity) * 1.0005;
  const range = maxVal - minVal || 1;

  const width = 240;
  const paddingY = 4;
  const usableHeight = height - paddingY * 2;

  // Transform to SVG coords
  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const y = height - paddingY - ((val - minVal) / range) * usableHeight;
    return { x, y, val };
  });

  const pathD = coords.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
  }, '');

  // Fill path
  const firstPt = coords[0];
  const lastPt = coords[coords.length - 1];
  const fillD = `${pathD} L ${lastPt.x.toFixed(1)} ${height} L ${firstPt.x.toFixed(1)} ${height} Z`;

  // Baseline Y (Entry price for in_trade, Dip for watching)
  let baselineY: number | null = null;
  let baselineLabel = '';
  if (status === 'in_trade' && entryPrice && entryPrice >= minVal && entryPrice <= maxVal) {
    baselineY = height - paddingY - ((entryPrice - minVal) / range) * usableHeight;
    baselineLabel = 'دخول';
  } else if (status === 'watching' && dipPrice && dipPrice >= minVal && dipPrice <= maxVal) {
    baselineY = height - paddingY - ((dipPrice - minVal) / range) * usableHeight;
    baselineLabel = 'قاع';
  }

  // Peak Y
  let peakY: number | null = null;
  if (status === 'in_trade' && peakPrice && peakPrice >= minVal && peakPrice <= maxVal) {
    peakY = height - paddingY - ((peakPrice - minVal) / range) * usableHeight;
  }

  const isProfitable = status === 'in_trade' && entryPrice ? currentPrice >= entryPrice : true;
  const strokeColor = status === 'in_trade'
    ? (isProfitable ? '#10b981' : '#f43f5e') // emerald or rose
    : '#f59e0b'; // amber for watching dip

  return (
    <div className="relative w-full overflow-hidden select-none" style={{ height }}>
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Shaded Area */}
        <path d={fillD} fill={`url(#${gradientId})`} />

        {/* Baseline (Entry or Dip) */}
        {baselineY !== null && (
          <line
            x1="0"
            y1={baselineY}
            x2={width}
            y2={baselineY}
            stroke={status === 'in_trade' ? '#d97706' : '#64748b'}
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.6"
          />
        )}

        {/* Main Price Trend Curve */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Peak Dot if available */}
        {peakY !== null && (() => {
          const match = coords.find((c) => c.val === peakPrice);
          const peakX = match ? match.x : width * 0.7;
          return (
            <circle
              cx={peakX}
              cy={peakY}
              r="2"
              fill="#10b981"
              className="animate-pulse"
            />
          );
        })()}

        {/* Current Live Price Tip Dot */}
        <circle
          cx={lastPt.x}
          cy={lastPt.y}
          r="3"
          fill={strokeColor}
          className="animate-ping opacity-75"
        />
        <circle
          cx={lastPt.x}
          cy={lastPt.y}
          r="2.5"
          fill={strokeColor}
        />
      </svg>

      {/* Mini Overlay Indicator */}
      <div className="absolute top-0.5 right-1 pointer-events-none flex items-center gap-1 text-[9px] font-mono text-slate-400">
        {baselineY !== null && (
          <span className="opacity-80">
            {baselineLabel}: {status === 'in_trade' && entryPrice ? trimTrailingZeros(entryPrice.toString()) : (dipPrice ? trimTrailingZeros(dipPrice.toString()) : '')}
          </span>
        )}
      </div>
    </div>
  );
};
