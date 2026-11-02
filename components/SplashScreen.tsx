'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  SplashSettings, 
  DEFAULT_SPLASH_SETTINGS, 
  STORAGE_KEY_SPLASH_SETTINGS, 
  SESSION_KEY_SPLASH_SHOWN,
  SplashPhrase 
} from '@/types/splash';
import { Sparkles, ArrowRight, ShieldCheck, Zap, Activity } from 'lucide-react';

interface SplashScreenProps {
  forceShow?: boolean;
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  forceShow = false,
  onFinish,
}) => {
  const [isVisible, setIsVisible] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(0);
  const [selectedPhrase, setSelectedPhrase] = useState<SplashPhrase | null>(null);
  const [settings, setSettings] = useState<SplashSettings>(DEFAULT_SPLASH_SETTINGS);

  const handleComplete = useCallback(() => {
    setIsVisible(false);
    onFinish?.();
  }, [onFinish]);

  const handleSkip = useCallback(() => {
    setProgress(100);
    setIsVisible(false);
    onFinish?.();
  }, [onFinish]);

  // Initialize and select random motivational phrase
  useEffect(() => {
    const timer = setTimeout(() => {
      // 1. Check session flag if not forced
      if (!forceShow) {
        try {
          const rawSettings = localStorage.getItem(STORAGE_KEY_SPLASH_SETTINGS);
          const parsedSettings: SplashSettings = rawSettings ? JSON.parse(rawSettings) : DEFAULT_SPLASH_SETTINGS;
          setSettings(parsedSettings);

          if (!parsedSettings.enabled) {
            dismissPreloader();
            setIsVisible(false);
            onFinish?.();
            return;
          }

          if (parsedSettings.showOncePerSession) {
            const shown = sessionStorage.getItem(SESSION_KEY_SPLASH_SHOWN);
            if (shown === 'true') {
              dismissPreloader();
              setIsVisible(false);
              onFinish?.();
              return;
            }
          }
        } catch {
          // Fallback to default
        }
      }

      // 2. Select phrase
      try {
        const phrases = settings.phrases && settings.phrases.length > 0 ? settings.phrases : DEFAULT_SPLASH_SETTINGS.phrases;
        const randomIndex = Math.floor(Math.random() * phrases.length);
        setSelectedPhrase(phrases[randomIndex]);
      } catch {
        setSelectedPhrase(DEFAULT_SPLASH_SETTINGS.phrases[0]);
      }

      // 3. Mark session shown
      try {
        sessionStorage.setItem(SESSION_KEY_SPLASH_SHOWN, 'true');
      } catch {}

      // 4. Remove initial inline blocking HTML preloader if present, handing over seamlessly
      dismissPreloader();
    }, 0);

    return () => clearTimeout(timer);
  }, [forceShow, settings.phrases, onFinish]);

  // Handle smooth 4-second progress ticker
  useEffect(() => {
    if (!isVisible) return;

    const durationSec = settings.durationSeconds || 4;
    const intervalMs = 40; // 25 updates per second
    const totalSteps = (durationSec * 1000) / intervalMs;
    const increment = 100 / totalSteps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            handleComplete();
          }, 200);
          return 100;
        }
        return Math.min(100, prev + increment);
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isVisible, settings.durationSeconds, handleComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        className="fixed inset-0 z-[99999] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 flex flex-col justify-between items-center p-6 select-none overflow-hidden"
        dir="rtl"
      >
        {/* Background ambient glow effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-1/4 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-3xl" />
          {/* Subtle grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.03]" 
            style={{ 
              backgroundImage: 'radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)', 
              backgroundSize: '32px 32px' 
            }} 
          />
        </div>

        {/* Top Header with Skip Button */}
        <div className="w-full max-w-md flex items-center justify-between z-10 pt-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-mono font-medium text-slate-400">V2.0 LIVE</span>
          </div>

          {settings.allowSkip && (
            <button
              type="button"
              onClick={handleSkip}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 shadow-sm transition-all cursor-pointer group"
            >
              <span>تخطي</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}
        </div>

        {/* Center Section: App Brand & Surge Animation */}
        <div className="flex flex-col items-center justify-center text-center my-auto max-w-md z-10 px-4">
          {/* Glowing Animated Icon Container */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative mb-6"
          >
            {/* Outer rotating pulse rings */}
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-emerald-500/20 blur-xl animate-spin" style={{ animationDuration: '8s' }} />
            
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-1 border-2 border-amber-400/40 shadow-2xl flex items-center justify-center shadow-amber-500/10">
              <div className="w-full h-full rounded-[22px] bg-slate-950/90 flex flex-col items-center justify-center overflow-hidden relative">
                <Zap className="w-10 h-10 text-amber-400 fill-amber-400/20 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)] animate-bounce" />
                <div className="absolute bottom-1 text-[8px] font-black tracking-widest text-amber-300 font-mono">
                  BOT V2
                </div>
              </div>
            </div>
          </motion.div>

          {/* App Title */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center justify-center gap-2">
              <span>بوت(٢) مراقبة صعود العملات</span>
            </h1>
            <p className="text-xs sm:text-sm font-medium text-amber-400/90 mt-1 flex items-center justify-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>الرصد اللحظي • حاسبة التعادل • قناص السكالبينج</span>
            </p>
          </motion.div>

          {/* Dynamic Motivational Phrase Box */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mt-8 p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-md relative max-w-sm w-full"
          >
            <div className="absolute -top-3 right-4 bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 shadow-sm">
              <Sparkles className="w-3 h-3 fill-current" />
              <span>حكمة التداول</span>
            </div>
            
            <p className="text-sm font-semibold text-slate-200 leading-relaxed pt-1 min-h-[50px] flex items-center justify-center text-center">
              {selectedPhrase?.text || DEFAULT_SPLASH_SETTINGS.phrases[0].text}
            </p>

            {selectedPhrase?.author && (
              <p className="text-[11px] text-amber-400/80 font-medium text-left mt-2">
                — {selectedPhrase.author}
              </p>
            )}
          </motion.div>
        </div>

        {/* Bottom Section: Progress Bar & Status */}
        <div className="w-full max-w-md z-10 pb-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
            <span className="flex items-center gap-1 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>جاري تهيئة الرادار والمؤشرات...</span>
            </span>
            <span className="font-bold text-amber-400">{Math.round(progress)}%</span>
          </div>

          {/* Progress track */}
          <div className="w-full h-2 rounded-full bg-slate-800/80 p-0.5 overflow-hidden border border-slate-700/50">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-75 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-center text-[11px] text-slate-500 mt-3 font-medium">
            تطبيق بوتات مراقبة العملات وإجراء الصفقات • إصدار 2.0
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

function dismissPreloader(): void {
  if (typeof document === 'undefined') return;
  const preloader = document.getElementById('app-splash-preloader');
  if (preloader) {
    preloader.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
    preloader.style.opacity = '0';
    preloader.style.pointerEvents = 'none';
    setTimeout(() => {
      preloader.remove();
    }, 400);
  }
}
