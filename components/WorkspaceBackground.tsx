'use client';

import React from 'react';
import { Layers } from 'lucide-react';
import { WindowMode } from './WindowHeader';

interface WorkspaceBackgroundProps {
  mode: WindowMode;
  onSetMode: (mode: WindowMode) => void;
}

export const WorkspaceBackground: React.FC<WorkspaceBackgroundProps> = ({
  mode,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none flex flex-col justify-between p-6 opacity-40">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#64748b15_1px,transparent_1px),linear-gradient(to_bottom,#64748b15_1px,transparent_1px)] bg-[size:32px_32px]"
      />

      {/* Top subtle branding */}
      <div className="relative z-0 flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-mono tracking-widest uppercase">
            بوت(٢) مراقبة صعود العملات • V0
          </span>
        </div>
      </div>

      {/* Center workspace hint when floating */}
      {mode === 'floating' && (
        <div className="relative z-0 max-w-md mx-auto text-center space-y-2 pointer-events-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 shadow-sm">
            <Layers className="w-3.5 h-3.5 text-sky-500" />
            <span>الوضع العائم نشط — اسحب النافذة من الشريط العلوي أو غير حجمها من الزاوية</span>
          </div>
        </div>
      )}

      {/* Bottom subtle status */}
      <div className="relative z-0 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-600 font-mono">
        <span>PWA Offline-Ready</span>
        <span>دقة أرقام متناهية بدون تقريب جائر</span>
      </div>
    </div>
  );
};
