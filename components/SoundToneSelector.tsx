'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  soundAlert, 
  ALERT_TONE_OPTIONS, 
  AlertToneId 
} from '@/lib/soundAlert';
import { 
  Volume2, 
  Upload, 
  Music, 
  Trash2, 
  Check, 
  Smartphone,
  AlertCircle
} from 'lucide-react';

interface SoundToneSelectorProps {
  selectedTone: AlertToneId;
  onSelectTone: (tone: AlertToneId) => void;
  title?: string;
}

export const SoundToneSelector: React.FC<SoundToneSelectorProps> = ({
  selectedTone,
  onSelectTone,
  title = 'نغمة التنبيه الصوتي:',
}) => {
  const [customName, setCustomName] = useState<string | null>(null);
  const [hasCustom, setHasCustom] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync custom tone information from local storage safely
  useEffect(() => {
    const timer = setTimeout(() => {
      setCustomName(soundAlert.getCustomToneName());
      setHasCustom(soundAlert.hasCustomTone());
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedTone]);

  const handleTestTone = (tone: AlertToneId) => {
    soundAlert.playTone(tone);
  };

  const handleToneClick = (toneId: AlertToneId) => {
    onSelectTone(toneId);
    handleTestTone(toneId);

    // If user clicked custom tone but has not uploaded a file yet, trigger file picker directly
    if (toneId === 'custom' && !hasCustom && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const result = await soundAlert.saveCustomTone(file);

    if (result.success) {
      setCustomName(result.name);
      setHasCustom(true);
      onSelectTone('custom');
      soundAlert.playTone('custom');
    } else {
      setUploadError(result.error || 'فشل حفظ الملف الصوتي');
    }

    // Reset file input so the same file can be re-selected if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveCustom = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundAlert.removeCustomTone();
    setCustomName(null);
    setHasCustom(false);
    onSelectTone('system');
    soundAlert.playTone('system');
  };

  return (
    <div className="space-y-2.5">
      {/* Hidden File Input for Custom Tone Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
        className="hidden"
      />

      {/* Title */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
          {title}
        </span>
        {selectedTone === 'system' && (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <Smartphone className="w-3 h-3" />
            <span>نغمة النظام واهتزاز الجهاز</span>
          </span>
        )}
        {selectedTone === 'custom' && customName && (
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold truncate max-w-[150px]">
            {customName}
          </span>
        )}
      </div>

      {/* Tones Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
        {ALERT_TONE_OPTIONS.map((opt) => {
          const isSelected = selectedTone === opt.id;
          return (
            <div
              key={opt.id}
              className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                isSelected
                  ? 'bg-amber-400/15 border-amber-500 text-slate-950 dark:text-amber-300 font-bold ring-1 ring-amber-500/30 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-amber-400'
              }`}
              onClick={() => handleToneClick(opt.id)}
              title={opt.description}
            >
              <div className="flex items-center gap-1.5 min-w-0 pr-0.5">
                <span className="text-[11px] truncate">{opt.name}</span>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleTestTone(opt.id);
                }}
                className="p-1 rounded-lg hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 transition cursor-pointer flex-shrink-0"
                title="استماع وتجربة النغمة"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Expanded Custom Audio Upload Panel if 'custom' is active or selected */}
      {selectedTone === 'custom' && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
              <Music className="w-4 h-4 text-amber-500" />
              <span>ملف النغمة المخصصة من جهازك:</span>
            </span>

            {hasCustom && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3 h-3 stroke-[2.5]" />
                <span>تم التحميل</span>
              </span>
            )}
          </div>

          {hasCustom && customName ? (
            <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 truncate max-w-[220px]">
                <div className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-500 flex items-center justify-center flex-shrink-0">
                  <Volume2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                  {customName}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => soundAlert.playTone('custom')}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  title="تجربة تشغيل الملف"
                >
                  <Volume2 className="w-3 h-3" />
                  <span>تشغيل</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                  title="اختيار ملف آخر"
                >
                  <Upload className="w-3 h-3" />
                  <span>تغيير</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemoveCustom}
                  className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500 transition cursor-pointer"
                  title="حذف النغمة المخصصة"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-amber-400/60 hover:border-amber-500 bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 transition flex items-center justify-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-amber-500" />
              <span>انقر هنا لاختيار ملف نغمة من هاتفك أو جهازك (MP3, WAV, M4A)</span>
            </button>
          )}

          {uploadError && (
            <div className="flex items-center gap-1 text-[11px] text-rose-500 font-bold pt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <p className="text-[10px] text-slate-500 leading-tight">
            يتم حفظ الملف الصوتي محلياً على جهازك ويتم تشغيله تلقائياً مع جميع التنبيهات المحددة.
          </p>
        </div>
      )}
    </div>
  );
};
