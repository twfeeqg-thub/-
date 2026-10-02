'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WindowMode, WindowHeader } from './WindowHeader';
import { CalculationTrackResult, formatCurrencyPrice } from '@/lib/calculator';
import { Calculator, Maximize2, Move, GripHorizontal } from 'lucide-react';

interface FloatingContainerProps {
  children: React.ReactNode;
  mode: WindowMode;
  onSetMode: (mode: WindowMode) => void;
  onReset: () => void;
  onToggleSettings?: () => void;
  hasDefaultsSaved?: boolean;
  percentTrack: CalculationTrackResult;
  fixedTrack: CalculationTrackResult;
}

export const FloatingContainer: React.FC<FloatingContainerProps> = ({
  children,
  mode,
  onSetMode,
  onReset,
  onToggleSettings,
  hasDefaultsSaved,
  percentTrack,
  fixedTrack,
}) => {
  // Floating Window Coordinates & Dimensions (static initial values for SSR consistency)
  const [position, setPosition] = useState({ x: 20, y: 30 });
  const [size, setSize] = useState({ width: 380, height: 620 });


  // Refs for dragging and resizing
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  const isResizingRef = useRef(false);
  const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0, direction: '' });

  const handleModeChange = useCallback((newMode: WindowMode) => {
    if (newMode === 'floating' && typeof window !== 'undefined') {
      const defaultWidth = Math.min(420, window.innerWidth - 32);
      const defaultHeight = Math.min(650, window.innerHeight - 60);
      const defaultX = Math.max(16, (window.innerWidth - defaultWidth) / 2);
      const defaultY = Math.max(20, 40);
      setSize({ width: defaultWidth, height: defaultHeight });
      setPosition({ x: defaultX, y: defaultY });
    }
    onSetMode(newMode);
  }, [onSetMode]);


  // Dragging Handlers
  const handleDragStart = (clientX: number, clientY: number) => {
    if (mode !== 'floating') return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  // Resizing Handlers
  const handleResizeStart = (e: React.PointerEvent, direction: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (mode !== 'floating') return;
    isResizingRef.current = true;
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: size.width,
      height: size.height,
      direction,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  // Global Pointer / Mouse Move & Up Listeners
  useEffect(() => {
    if (mode !== 'floating') return;

    const handlePointerMove = (e: PointerEvent) => {
      // Handle Drag
      if (isDraggingRef.current) {
        const deltaX = e.clientX - dragStartRef.current.mouseX;
        const deltaY = e.clientY - dragStartRef.current.mouseY;
        const newX = Math.max(0, Math.min(window.innerWidth - size.width, dragStartRef.current.posX + deltaX));
        const newY = Math.max(0, Math.min(window.innerHeight - 60, dragStartRef.current.posY + deltaY));
        setPosition({ x: newX, y: newY });
      }

      // Handle Resize
      if (isResizingRef.current) {
        const deltaX = e.clientX - resizeStartRef.current.mouseX;
        const deltaY = e.clientY - resizeStartRef.current.mouseY;
        const dir = resizeStartRef.current.direction;

        let newWidth = resizeStartRef.current.width;
        let newHeight = resizeStartRef.current.height;

        if (dir.includes('e')) {
          newWidth = Math.max(300, Math.min(window.innerWidth - position.x - 10, resizeStartRef.current.width + deltaX));
        }
        if (dir.includes('w')) {
          const proposedWidth = Math.max(300, resizeStartRef.current.width - deltaX);
          if (proposedWidth !== size.width) {
            newWidth = proposedWidth;
          }
        }
        if (dir.includes('s')) {
          newHeight = Math.max(360, Math.min(window.innerHeight - position.y - 10, resizeStartRef.current.height + deltaY));
        }

        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      isResizingRef.current = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [mode, size.width, position.x, position.y]);

  // Touch Move / End for mobile browsers where pointer events might be captured
  const onHeaderTouchStart = (e: React.TouchEvent) => {
    if (mode !== 'floating' || e.touches.length !== 1) return;
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  };

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    // Only drag on left mouse button and not on interactive buttons
    if (mode !== 'floating' || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) return;
    handleDragStart(e.clientX, e.clientY);
  };

  // If CLOSED: render floating launcher
  if (mode === 'closed') {
    return (
      <div className="fixed bottom-6 left-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
        <button
          onClick={() => onSetMode('normal')}
          className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-amber-500 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 hover:bg-amber-400 transition cursor-pointer active:scale-95"
        >
          <Calculator className="w-5 h-5" />
          <span>فتح حاسبة الفروقات</span>
        </button>
      </div>
    );
  }

  // If MINIMIZED: render compact collapsed bar
  if (mode === 'minimized') {
    const hasBE = percentTrack.isValid || fixedTrack.isValid;
    const bePrice = percentTrack.isValid ? percentTrack.breakEvenPrice : fixedTrack.breakEvenPrice;

    return (
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-in fade-in slide-in-from-bottom-3">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-100 block">
                حاسبة الفروقات (مصغرة)
              </span>
              {hasBE && (
                <span className="text-[10px] text-amber-400 font-mono" dir="ltr">
                  التعادل: {formatCurrencyPrice(bePrice)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSetMode('normal')}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition cursor-pointer active:scale-95"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>استعادة</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If FLOATING: render draggable & resizable window
  if (mode === 'floating') {
    return (
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
          zIndex: 40,
        }}
        className="flex flex-col bg-slate-950/95 border-2 border-slate-700/90 rounded-2xl shadow-2xl shadow-black/80 backdrop-blur-lg overflow-hidden transition-shadow select-text"
      >
        {/* Floating Header with Drag Grip */}
        <div
          onMouseDown={onHeaderMouseDown}
          onTouchStart={onHeaderTouchStart}
          className="cursor-move select-none"
        >
          <div className="w-full flex justify-center py-1 bg-slate-900 border-b border-slate-800/60">
            <GripHorizontal className="w-8 h-3 text-slate-500 hover:text-slate-300" />
          </div>
          <WindowHeader
            mode={mode}
            onSetMode={handleModeChange}
            onReset={onReset}
            onToggleSettings={onToggleSettings}
            hasDefaultsSaved={hasDefaultsSaved}
          />
        </div>

        {/* Scrollable Content inside floating window */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-right">
          {children}
        </div>

        {/* Resize Handles */}
        {/* Bottom-Right Resize Handle */}
        <div
          onPointerDown={(e) => handleResizeStart(e, 'se')}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 text-slate-500 hover:text-amber-400 transition"
          title="سحب لتغيير الحجم"
        >
          <svg className="w-3 h-3" viewBox="0 0 6 6" fill="currentColor">
            <circle cx="5" cy="5" r="0.8" />
            <circle cx="3" cy="5" r="0.8" />
            <circle cx="5" cy="3" r="0.8" />
          </svg>
        </div>

        {/* Bottom-Left Resize Handle (for convenient RTL / left-side resizing) */}
        <div
          onPointerDown={(e) => handleResizeStart(e, 'sw')}
          className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize flex items-end justify-start p-0.5 text-slate-500 hover:text-amber-400 transition"
          title="سحب لتغيير الحجم"
        >
          <svg className="w-3 h-3" viewBox="0 0 6 6" fill="currentColor">
            <circle cx="1" cy="5" r="0.8" />
            <circle cx="3" cy="5" r="0.8" />
            <circle cx="1" cy="3" r="0.8" />
          </svg>
        </div>
      </div>
    );
  }

  // If MAXIMIZED: full screen container
  if (mode === 'maximized') {
    return (
      <div className="fixed inset-0 z-30 flex flex-col bg-slate-950 p-2 sm:p-4 overflow-hidden">
        <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          <WindowHeader
            mode={mode}
            onSetMode={handleModeChange}
            onReset={onReset}
            onToggleSettings={onToggleSettings}
            hasDefaultsSaved={hasDefaultsSaved}
          />
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-right">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Default NORMAL Mode: Mobile-first centered card
  return (
    <div className="w-full max-w-lg mx-auto bg-slate-950/90 border border-slate-800/90 rounded-2xl shadow-2xl overflow-hidden">
      <WindowHeader
        mode={mode}
        onSetMode={handleModeChange}
        onReset={onReset}
        onToggleSettings={onToggleSettings}
        hasDefaultsSaved={hasDefaultsSaved}
      />
      <div className="p-3.5 sm:p-5 space-y-4 text-right">
        {children}
      </div>
    </div>
  );
};
