'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, TrendingUp, ShieldCheck, Zap, X } from 'lucide-react';
import { 
  SplashQuote, 
  DEFAULT_SPLASH_QUOTES, 
  STORAGE_KEY_SPLASH_QUOTES, 
  STORAGE_KEY_SPLASH_SETTINGS, 
  SplashSettings 
} from '@/types/splash';

interface SplashScreenProps {
  isReady?: boolean;
  onFinish: () => void;
}

export function SplashScreen({ isReady = false, onFinish }: SplashScreenProps) {
  // Lazy state initializers to prevent cascading renders
  const [quotes] = useState<SplashQuote[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_SPLASH_QUOTES);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return DEFAULT_SPLASH_QUOTES;
  });

  const [settings] = useState<SplashSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_SPLASH_SETTINGS);
        if (saved) {
          return { enabled: true, durationSeconds: 4, autoDismissOnReady: true, ...JSON.parse(saved) };
        }
      } catch {}
    }
    return { enabled: true, durationSeconds: 4, autoDismissOnReady: true };
  });

  const [quoteIndex, setQuoteIndex] = useState(() => {
    return Math.floor(Math.random() * (DEFAULT_SPLASH_QUOTES.length || 1));
  });

  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Handle dismiss declared first before any effects
  const handleDismiss = useCallback(() => {
    setIsExiting((prev) => {
      if (prev) return true;
      setTimeout(() => {
        onFinish();
      }, 400);
      return true;
    });
  }, [onFinish]);

  // Rotate quotes every 2.5 seconds if more than 1
  useEffect(() => {
    if (quotes.length <= 1) return;
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [quotes.length]);

  const durationMs = Math.max(1500, (settings.durationSeconds || 4) * 1000);

  // Progress ticker
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        handleDismiss();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [durationMs, handleDismiss]);

  // Fast-track exit when app is ready and progress is sufficiently primed
  useEffect(() => {
    if (isReady && settings.autoDismissOnReady) {
      const timeout = setTimeout(() => {
        handleDismiss();
      }, 800);
      return () => clearTimeout(timeout);
    }
  }, [isReady, settings.autoDismissOnReady, handleDismiss]);

  const currentQuote = quotes[quoteIndex] || DEFAULT_SPLASH_QUOTES[0];

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          key="splash-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: 'blur(8px)' }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-[#0a0c10] via-[#0d1117] to-[#08090d] text-slate-100 select-none overflow-hidden p-6"
          dir="rtl"
        >
          {/* Subtle Ambient Background Glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-10 right-1/4 w-[380px] h-[380px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

          {/* Top Bar with Skip Button */}
          <div className="w-full max-w-4xl flex items-center justify-between z-10 pt-2">
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full shadow-inner">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>إصدار احترافي V2.0</span>
            </div>

            <button
              onClick={handleDismiss}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white border border-slate-700/60 shadow-lg text-xs font-medium transition-all transform active:scale-95 cursor-pointer backdrop-blur-md"
              title="تخطي شاشة البداية"
            >
              <span>تخطي</span>
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Center Brand Emblem & Title */}
          <div className="flex flex-col items-center justify-center text-center my-auto z-10 px-4">
            {/* Animated Golden Pulse Ring Emblem */}
            <div className="relative mb-6">
              <motion.div
                animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-amber-600 via-yellow-500 to-amber-300 p-0.5 shadow-[0_0_40px_rgba(245,158,11,0.35)] flex items-center justify-center"
              >
                <div className="w-full h-full rounded-[14px] bg-[#0c1017] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-transparent" />
                  <TrendingUp className="w-12 h-12 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
                </div>
              </motion.div>
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-black border-2 border-[#0a0c10] shadow">
                2
              </span>
            </div>

            {/* App Title */}
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2 mb-1.5">
              <span>بوت مراقبة صعود العملات</span>
              <span className="text-amber-400 text-lg sm:text-xl font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                PRO
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 max-w-md font-normal leading-relaxed mb-6">
              نظام رصد القيعان، اقتناص الصعود اللحظي، وإدارة الصفقات مع المزامنة السحابية
            </p>

            {/* Dynamic Animated Quote Card */}
            <div className="w-full max-w-lg min-h-[88px] flex items-center justify-center bg-slate-900/60 border border-slate-800/80 rounded-2xl px-5 py-3.5 shadow-2xl backdrop-blur-md">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuote.id + currentQuote.text}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center text-center"
                >
                  <p className="text-xs sm:text-sm text-amber-100/90 font-medium leading-relaxed">
                    &ldquo;{currentQuote.text}&rdquo;
                  </p>
                  {currentQuote.author && (
                    <span className="text-[11px] text-amber-400/80 mt-1.5 font-mono">
                      — {currentQuote.author}
                    </span>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom Progress & Status Bar */}
          <div className="w-full max-w-md flex flex-col items-center gap-2.5 z-10 pb-4">
            <div className="w-full flex items-center justify-between text-[11px] text-slate-400 px-1 font-mono">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                {progress < 40 ? 'تهيئة بيئة التداول...' : progress < 80 ? 'توصيل البث الحي لـ Binance...' : 'جاهز للانطلاق!'}
              </span>
              <span className="text-amber-400 font-bold">{progress}%</span>
            </div>

            {/* Progress Bar Line */}
            <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden border border-slate-700/50 p-0.5 shadow-inner">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 rounded-full shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>

            <div className="flex items-center gap-4 text-[10px] text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> مشفر ومحلي أولاً
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> لا استهلاك للحصة المجانية
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
