/**
 * مولد ومشغل نغمات وتنبيهات صوتية
 * يدعم:
 * 1. نغمة الجهاز الافتراضية مع اهتزاز الهاتف (Device System Tone)
 * 2. النغمات المصممة محلياً عبر Web Audio API
 * 3. تحميل وتعيين نغمة مخصصة من ملفات الجهاز (Custom Audio File: MP3, WAV, M4A)
 */

export type AlertToneId = 'system' | 'celebration' | 'radar' | 'bell' | 'arcade' | 'chime' | 'custom';

export interface AlertToneOption {
  id: AlertToneId;
  name: string;
  description: string;
  icon?: string;
}

export const STORAGE_KEY_ALERT_TONE = 'price_calc_v0_alert_tone';
export const STORAGE_KEY_CUSTOM_TONE_DATA = 'price_calc_v0_custom_tone_data';
export const STORAGE_KEY_CUSTOM_TONE_NAME = 'price_calc_v0_custom_tone_name';

export const ALERT_TONE_OPTIONS: AlertToneOption[] = [
  { id: 'system', name: 'نغمة الجهاز الافتراضية 📱', description: 'نغمة النظام الكلاسيكية مع اهتزاز الجهاز' },
  { id: 'celebration', name: 'بهجة وصعود 🎯', description: 'سلسلة نغمات متصاعدة بهيجة واضحة' },
  { id: 'radar', name: 'رادار نبضي 📡', description: 'نبضتان متتاليتان بتردد نقي وقوي' },
  { id: 'bell', name: 'رنين جرس 🔔', description: 'نغمة جرس ناعمة ورنانة' },
  { id: 'arcade', name: 'إلكتروني سريع 🚀', description: 'نغمة حماسية سريعة كألعاب الفيديو' },
  { id: 'chime', name: 'تنبيه ناعم ✨', description: 'نغمة كلاسيكية مزدوجة هادئة' },
  { id: 'custom', name: 'نغمة مخصصة من جهازي 📁', description: 'تحميل أي ملف صوتي (MP3, WAV, M4A) من هاتفك أو حاسوبك' },
];

class SoundAlertPlayer {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private activeTone: AlertToneId = 'system';
  private customAudioCache: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_ALERT_TONE) as AlertToneId;
        if (saved && ['system', 'celebration', 'radar', 'bell', 'arcade', 'chime', 'custom'].includes(saved)) {
          this.activeTone = saved;
        }
      } catch {
        // Ignore
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getActiveTone(): AlertToneId {
    return this.activeTone;
  }

  public setActiveTone(tone: AlertToneId) {
    this.activeTone = tone;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_ALERT_TONE, tone);
      } catch {
        // Ignore
      }
    }
  }

  /**
   * جلب اسم النغمة المخصصة المحفوظة إن وجدت
   */
  public getCustomToneName(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(STORAGE_KEY_CUSTOM_TONE_NAME);
    } catch {
      return null;
    }
  }

  /**
   * هل قام المستخدم برفع ملف صوتي مخصص سابقاً؟
   */
  public hasCustomTone(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return !!localStorage.getItem(STORAGE_KEY_CUSTOM_TONE_DATA);
    } catch {
      return false;
    }
  }

  /**
   * حفظ نغمة مخصصة من ملف المستخدم
   */
  public async saveCustomTone(file: File): Promise<{ success: boolean; name: string; error?: string }> {
    if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|ogg|m4a|aac|flac)$/i)) {
      return { success: false, name: '', error: 'يرجى اختيار ملف صوتي صالح بصيغة (MP3, WAV, OGG, M4A)' };
    }
    // حد أقصى 3 ميجابايت لضمان عدم امتلاء ذاكرة المتصفح
    if (file.size > 3 * 1024 * 1024) {
      return { success: false, name: '', error: 'حجم الملف الصوتي كبير (الحد الأقصى المسموح 3 ميجابايت)' };
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const dataUrl = reader.result as string;
          localStorage.setItem(STORAGE_KEY_CUSTOM_TONE_DATA, dataUrl);
          localStorage.setItem(STORAGE_KEY_CUSTOM_TONE_NAME, file.name);
          this.customAudioCache = new Audio(dataUrl);
          this.setActiveTone('custom');
          resolve({ success: true, name: file.name });
        } catch {
          resolve({ success: false, name: '', error: 'تعذر حفظ الملف في ذاكرة المتصفح، جرب ملفاً أصغر' });
        }
      };
      reader.onerror = () => {
        resolve({ success: false, name: '', error: 'فشل قراءة الملف الصوتي' });
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * حذف النغمة المخصصة والعودة لنغمة الجهاز
   */
  public removeCustomTone() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_TONE_DATA);
      localStorage.removeItem(STORAGE_KEY_CUSTOM_TONE_NAME);
      this.customAudioCache = null;
      if (this.activeTone === 'custom') {
        this.setActiveTone('system');
      }
    } catch {
      // Ignore
    }
  }

  /**
   * تشغيل نغمة الهدف وفق النغمة المختارة
   */
  public playTargetReachedAlert(overrideTone?: AlertToneId) {
    const toneToPlay = overrideTone || this.activeTone;
    this.playTone(toneToPlay);
  }

  /**
   * تشغيل نغمة مخصصة محددة (مع إمكانية التجربة والاستماع الفوري)
   */
  public playTone(tone: AlertToneId) {
    if (this.isMuted) return;

    // 1. خيار النغمة المخصصة من ملف الجهاز
    if (tone === 'custom') {
      let played = false;
      if (typeof window !== 'undefined') {
        try {
          if (!this.customAudioCache) {
            const savedData = localStorage.getItem(STORAGE_KEY_CUSTOM_TONE_DATA);
            if (savedData) {
              this.customAudioCache = new Audio(savedData);
            }
          }
          if (this.customAudioCache) {
            this.customAudioCache.currentTime = 0;
            this.customAudioCache.volume = 0.95;
            this.customAudioCache.play().catch(() => {
              this.playTone('system');
            });
            played = true;
          }
        } catch {
          // Ignore
        }
      }
      if (played) return;
      // إذا لم يكن هناك ملف مخصص، يتم تشغيل نغمة الجهاز الافتراضية كبديل
      tone = 'system';
    }

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      switch (tone) {
        case 'system': {
          // نغمة رنين الجهاز الافتراضية (Dual Harmonic System Ping) مع اهتزاز الهاتف
          if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
            try {
              navigator.vibrate([200, 80, 200]);
            } catch {}
          }
          [
            { freq: 587.33, time: 0, dur: 0.12 }, // D5
            { freq: 880.00, time: 0.1, dur: 0.32 }, // A5
          ].forEach(({ freq, time, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + time);
            gain.gain.setValueAtTime(0, now + time);
            gain.gain.linearRampToValueAtTime(0.35, now + time + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + time);
            osc.stop(now + time + dur + 0.03);
          });
          break;
        }

        case 'celebration': {
          // نغمة مكونة من 4 نغمات متصاعدة بهيجة (E5 -> G#5 -> B5 -> E6)
          const notes = [
            { freq: 659.25, time: 0, duration: 0.12 },
            { freq: 830.61, time: 0.13, duration: 0.12 },
            { freq: 987.77, time: 0.26, duration: 0.15 },
            { freq: 1318.51, time: 0.42, duration: 0.35 },
          ];
          notes.forEach(({ freq, time, duration }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + time);
            gain.gain.setValueAtTime(0, now + time);
            gain.gain.linearRampToValueAtTime(0.3, now + time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + time + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + time);
            osc.stop(now + time + duration + 0.05);
          });
          break;
        }

        case 'radar': {
          // نبضات رادار ثنائية حادة
          [0, 0.18].forEach((time) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1046.5, now + time); // C6
            gain.gain.setValueAtTime(0, now + time);
            gain.gain.linearRampToValueAtTime(0.35, now + time + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.14);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + time);
            osc.stop(now + time + 0.15);
          });
          break;
        }

        case 'bell': {
          // رنين جرس كلاسيكي نقي بتردد أساسي وتوافقي
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain = ctx.createGain();
          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(880, now);
          osc2.frequency.setValueAtTime(1760, now);
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.3, now + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(ctx.destination);
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.65);
          osc2.stop(now + 0.65);
          break;
        }

        case 'arcade': {
          // تصاعد سريع أركيد
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(1760, now + 0.25);
          gain.gain.setValueAtTime(0, now);
          gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.32);
          break;
        }

        case 'chime': {
          // نغمة كلاسيكية مزدوجة G5 -> C6
          [
            { freq: 783.99, time: 0, dur: 0.15 },
            { freq: 1046.50, time: 0.16, dur: 0.3 }
          ].forEach(({ freq, time, dur }) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + time);
            gain.gain.setValueAtTime(0, now + time);
            gain.gain.linearRampToValueAtTime(0.25, now + time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + time);
            osc.stop(now + time + dur + 0.05);
          });
          break;
        }
      }
    } catch {
      // Ignore
    }
  }

  /**
   * تشغيل نقرة خفيفة عند تغير السعر
   */
  public playTick() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Ignore
    }
  }

  /**
   * تشغيل نغمة صاعدة عند تأكيد الارتداد عن القاع 🚀
   */
  public playBounceAlert() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(1040, now + 0.18);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Ignore
    }
  }

  /**
   * تشغيل نغمة تحذيرية مزدوجة عند التراجع عن أعلى قمة للارتداد ⚠️
   */
  public playTrailingDropAlert() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      [
        { freq: 880, time: 0, dur: 0.08 },
        { freq: 700, time: 0.1, dur: 0.12 }
      ].forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + time);
        gain.gain.setValueAtTime(0, now + time);
        gain.gain.linearRampToValueAtTime(0.15, now + time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + time);
        osc.stop(now + time + dur + 0.02);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * تشغيل نغمة نجاح الخروج بربح إلى USDT 💰
   */
  public playTradeSuccess() {
    this.playTargetReachedAlert();
  }
}

export const soundAlert = new SoundAlertPlayer();
