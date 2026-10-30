'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ExternalLink, 
  X, 
  ArrowLeftRight, 
  Wallet, 
  Clock, 
  FileText, 
  User, 
  RefreshCw, 
  Move, 
  EyeOff, 
  Check, 
  AlertCircle,
  HelpCircle,
  ChevronDown,
  Layers
} from 'lucide-react';

export const STORAGE_KEY_BINANCE_FAB_POS = 'price_calc_binance_fab_pos';
export const STORAGE_KEY_BINANCE_FAB_HIDDEN = 'price_calc_binance_fab_hidden';

interface BinanceQuickWidgetProps {
  activeSymbol?: string;
  onApplyBalanceToCapital?: (balance: number) => void;
  isOpenStateControlled?: boolean;
  onVisibilityChange?: (visible: boolean) => void;
}

export const BinanceQuickWidget: React.FC<BinanceQuickWidgetProps> = ({
  activeSymbol = 'BTC',
  onApplyBalanceToCapital,
  onVisibilityChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Dragging coordinates
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 20, y: 120 });
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const elementStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  // Live Wallet API state
  const [isFetchingWallet, setIsFetchingWallet] = useState(false);
  const [walletData, setWalletData] = useState<{
    configured: boolean;
    success?: boolean;
    usdtFree?: number;
    usdtLocked?: number;
    usdtTotal?: number;
    error?: string;
    message?: string;
  } | null>(null);
  const [showWalletDetails, setShowWalletDetails] = useState(false);

  // Load saved position and hidden state safely
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
      try {
        const savedHidden = localStorage.getItem(STORAGE_KEY_BINANCE_FAB_HIDDEN);
        if (savedHidden === 'true') {
          setIsHidden(true);
          onVisibilityChange?.(false);
        }

        const savedPos = localStorage.getItem(STORAGE_KEY_BINANCE_FAB_POS);
        if (savedPos) {
          const parsed = JSON.parse(savedPos);
          if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
            const maxX = Math.max(10, window.innerWidth - 70);
            const maxY = Math.max(10, window.innerHeight - 70);
            setPosition({
              x: Math.min(Math.max(10, parsed.x), maxX),
              y: Math.min(Math.max(10, parsed.y), maxY),
            });
          }
        } else {
          // Default: bottom-left corner
          setPosition({
            x: 20,
            y: Math.max(80, window.innerHeight - 150),
          });
        }
      } catch {
        // Ignore
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [onVisibilityChange]);

  // Clean symbol format (e.g. SOLUSDT -> SOL)
  const cleanBase = activeSymbol
    .trim()
    .toUpperCase()
    .replace(/(USDT|USDC|BUSD|FDUSD)$/, '') || 'BTC';

  // Toggle Visibility
  const handleToggleHide = () => {
    const next = !isHidden;
    setIsHidden(next);
    setIsOpen(false);
    onVisibilityChange?.(!next);
    try {
      localStorage.setItem(STORAGE_KEY_BINANCE_FAB_HIDDEN, String(next));
    } catch {}
  };

  // Fetch live wallet balance via server proxy route
  const handleFetchWalletBalance = async () => {
    setIsFetchingWallet(true);
    setWalletData(null);
    try {
      const res = await fetch('/api/binance/wallet');
      const data = await res.json();
      setWalletData(data);
      setShowWalletDetails(true);
    } catch {
      setWalletData({
        configured: false,
        success: false,
        error: 'تعذر الاتصال بخادم التطبيق الداخلي',
      });
      setShowWalletDetails(true);
    } finally {
      setIsFetchingWallet(false);
    }
  };

  // Dragging Handlers using Pointer Events (Mobile Touch + Desktop Mouse)
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    elementStartPosRef.current = { x: position.x, y: position.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartPosRef.current.x;
    const deltaY = e.clientY - dragStartPosRef.current.y;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      hasMovedRef.current = true;
    }

    const newX = elementStartPosRef.current.x + deltaX;
    const newY = elementStartPosRef.current.y + deltaY;

    // Constrain within viewport
    const maxX = Math.max(10, window.innerWidth - 65);
    const maxY = Math.max(10, window.innerHeight - 65);

    setPosition({
      x: Math.min(Math.max(10, newX), maxX),
      y: Math.min(Math.max(10, newY), maxY),
    });
  }, []);

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    // Save final position to localStorage
    try {
      localStorage.setItem(STORAGE_KEY_BINANCE_FAB_POS, JSON.stringify(position));
    } catch {}

    // If it was just a click (no drag movement), toggle the menu
    if (!hasMovedRef.current) {
      setIsOpen((prev) => !prev);
    }
  };

  if (!mounted || isHidden) return null;

  // Determine popover position relative to button so it doesn't overflow screen
  const isTopHalf = position.y < (typeof window !== 'undefined' ? window.innerHeight / 2 : 400);
  const isLeftHalf = position.x < (typeof window !== 'undefined' ? window.innerWidth / 2 : 300);

  return (
    <div
      className="fixed z-[9999] select-none"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      dir="rtl"
    >
      {/* 1. FLOATING ACTION BUTTON (أيقونة بينانس الذهبية الرسمية) */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`relative w-13 h-13 rounded-2xl flex items-center justify-center transition-all cursor-grab active:cursor-grabbing shadow-xl ring-2 ${
          isOpen
            ? 'bg-[#F3BA2F] ring-amber-400 scale-105 shadow-amber-500/40 text-slate-950'
            : 'bg-slate-900/95 hover:bg-slate-900 border border-[#F3BA2F]/40 ring-[#F3BA2F]/30 hover:scale-105 shadow-black/50 text-[#F3BA2F]'
        }`}
        title="بينانس الذكي: تداول مباشر، محفظة، وأوامر (اسحب لتحريك الزر لأي مكان)"
      >
        {/* Official Binance Diamond SVG Logo */}
        <svg
          viewBox="0 0 24 24"
          className="w-7 h-7 fill-current transition-transform duration-200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M16.72 13.63L12 18.35l-4.72-4.72 2.36-2.36L12 13.63l2.36-2.36 2.36 2.36zm4.72-4.72l-2.36 2.36-2.36-2.36 2.36-2.36 2.36 2.36zm-9.44-4.72L16.72 8.9l-2.36 2.36L12 8.9 9.64 11.26 7.28 8.9l4.72-4.71zm-4.72 4.72l2.36 2.36-2.36 2.36-2.36-2.36 2.36-2.36zM12 2l7.07 7.07-2.36 2.36L12 6.71 7.29 11.43 4.93 9.07 12 2zm0 20l-7.07-7.07 2.36-2.36L12 17.29l4.71-4.72 2.36 2.36L12 22z" />
        </svg>

        {/* Dynamic Coin Quick Badge */}
        <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.2 text-[9px] font-black font-mono rounded-full bg-[#F3BA2F] text-slate-950 border border-slate-900 shadow-xs">
          {cleanBase}
        </span>
      </div>

      {/* 2. FLOATING QUICK MENU POPOVER (القائمة المنبثقة المصغرة والأنيقة) */}
      {isOpen && (
        <div
          className={`absolute w-74 sm:w-80 rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-xl p-3 space-y-2 text-xs animate-in zoom-in-95 duration-150 z-50 ${
            isTopHalf ? 'top-15' : 'bottom-15'
          } ${isLeftHalf ? 'left-0' : 'right-0'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#F3BA2F] text-slate-950 flex items-center justify-center font-bold">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                  <path d="M16.72 13.63L12 18.35l-4.72-4.72 2.36-2.36L12 13.63l2.36-2.36 2.36 2.36zm4.72-4.72l-2.36 2.36-2.36-2.36 2.36-2.36 2.36 2.36zm-9.44-4.72L16.72 8.9l-2.36 2.36L12 8.9 9.64 11.26 7.28 8.9l4.72-4.71zm-4.72 4.72l2.36 2.36-2.36 2.36-2.36-2.36 2.36-2.36zM12 2l7.07 7.07-2.36 2.36L12 6.71 7.29 11.43 4.93 9.07 12 2zm0 20l-7.07-7.07 2.36-2.36L12 17.29l4.71-4.72 2.36 2.36L12 22z" />
                </svg>
              </div>
              <span className="font-extrabold text-slate-900 dark:text-slate-100">
                بينانس السريع • اختصارات فورية
              </span>
            </div>

            <div className="flex items-center gap-1">
              {/* Hide Button with Saved Preference */}
              <button
                type="button"
                onClick={handleToggleHide}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                title="إخفاء الأيقونة العائمة (يمكن إعادتها من أعلى الصفحة)"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Dragging hint */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <Move className="w-2.5 h-2.5" />
              <span>يمكنك سحب الأيقونة لأي زاوية تفضلها</span>
            </span>
          </div>

          {/* Action 1: ⚡ Spot Trading for current active coin */}
          <a
            href={`https://www.binance.com/ar/trade/${cleanBase}_USDT?type=spot`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-md shadow-amber-400/20 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <div>
                <span className="block text-xs font-black">
                  تداول {cleanBase}/USDT في بينانس
                </span>
                <span className="block text-[10px] opacity-80 font-normal">
                  فتح زوج العملة النشطة مباشرة للتنفيذ
                </span>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.5]" />
          </a>

          {/* Action 2: 💱 Binance Convert */}
          <a
            href="https://www.binance.com/ar/convert"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-emerald-500" />
              <div>
                <span className="block font-bold">التحويل السريع (Convert)</span>
                <span className="block text-[10px] text-slate-400">تحويل فوري بدون رسوم أو أوامر</span>
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>

          {/* Action 3: 💼 Spot Wallet & Overview */}
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5 text-amber-500" />
                <span>المحفظة والأرصدة (رصيد USDT)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <a
                href="https://www.binance.com/ar/my/wallet/account/main"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-amber-400 text-center font-bold text-[10.5px] transition cursor-pointer block truncate"
              >
                <span>المحفظة الفورية (Spot) ↗</span>
              </a>

              <a
                href="https://www.binance.com/ar/my/wallet/account/overview"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-amber-400 text-center font-bold text-[10.5px] transition cursor-pointer block truncate"
              >
                <span>نظرة عامة (Overview) ↗</span>
              </a>
            </div>
          </div>

          {/* Action 4 & 5: 📋 Open Orders & 📑 Trade History */}
          <div className="grid grid-cols-2 gap-1.5">
            <a
              href="https://www.binance.com/ar/my/orders/exchange/openorder"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5 font-bold mb-0.5">
                <Clock className="w-3.5 h-3.5 text-cyan-500" />
                <span>الأوامر المفتوحة</span>
              </div>
              <span className="text-[10px] text-slate-400 block">الصفقات المعلقة</span>
            </a>

            <a
              href="https://www.binance.com/ar/my/orders/exchange/tradeorder"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition cursor-pointer"
            >
              <div className="flex items-center gap-1.5 font-bold mb-0.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span>سجل الصفقات</span>
              </div>
              <span className="text-[10px] text-slate-400 block">المنفذة والرسوم</span>
            </a>
          </div>

          {/* Action 6: 👤 Main Account Dashboard */}
          <a
            href="https://www.binance.com/ar/my/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-bold">لوحة حسابي الرئيسية (Dashboard)</span>
            </div>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>

          {/* 3. OPTIONAL LIVE BALANCE QUERY (جلب رصيد المحفظة الآلي عبر الخادم) */}
          <div className="pt-1 border-t border-slate-200/80 dark:border-slate-800">
            <button
              type="button"
              onClick={handleFetchWalletBalance}
              disabled={isFetchingWallet}
              className="w-full py-2 px-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700 font-bold transition flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingWallet ? 'animate-spin text-amber-500' : 'text-slate-400'}`} />
                <span>جلب رصيد المحفظة إلى شاشة السكالبينج</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                {isFetchingWallet ? 'جارِ الجلب...' : 'فحص الرصيد'}
              </span>
            </button>

            {/* Wallet Query Response Details */}
            {showWalletDetails && walletData && (
              <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1.5 animate-in fade-in duration-150">
                {walletData.configured && walletData.success ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">رصيد USDT المتاح:</span>
                      <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                        ${walletData.usdtFree?.toFixed(2)} USDT
                      </span>
                    </div>

                    {onApplyBalanceToCapital && walletData.usdtFree !== undefined && (
                      <button
                        type="button"
                        onClick={() => {
                          onApplyBalanceToCapital(walletData.usdtFree!);
                          setIsOpen(false);
                        }}
                        className="w-full mt-2 py-1.5 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>تعيين كـ رأس مال مخصص للسكالبينج</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>ربط جلب الرصيد التلقائي (اختياري)</span>
                    </div>
                    <p className="leading-relaxed">
                      لجلب الرصيد تلقائياً بأمان خادم تام دون كتابة أي أسرار في المتصفح، يتم وضع مفاتيح بينانس في ملف متغيرات البيئة الخادم:
                    </p>
                    <code className="block p-1 rounded bg-slate-200 dark:bg-slate-900 font-mono text-[10px] text-slate-800 dark:text-slate-300" dir="ltr">
                      BINANCE_API_KEY=&quot;...&quot;<br />
                      BINANCE_API_SECRET=&quot;...&quot;
                    </code>
                    <p className="text-[10px] text-slate-400">
                      ويمكنك في أي وقت النقر على «المحفظة الفورية» أعلاه لفتح محفظتك مباشرة في تطبيق بينانس!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
