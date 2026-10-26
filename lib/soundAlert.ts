/**
 * مولد نغمات وتنبيهات صوتية باستخدام Web Audio API
 * يعمل محلياً في المتصفح دون الحاجة لتحميل ملفات صوتية خارجية
 */

export type AlertToneId = 'celebration' | 'radar' | 'bell' | 'arcade' | 'chime';

export interface AlertToneOption {
  id: AlertToneId;
  name: string;
  description: string;
}

export const ALERT_TONE_OPTIONS: AlertToneOption[] = [
  { id: 'celebration', name: 'بهجة وصعود 🎯', description: 'سلسلة نغمات متصاعدة بهيجة واضحة' },
  { id: 'radar', name: 'رادار نبضي 📡', description: 'نبضتان متتاليتان بتردد نقي وقوي' },
  { id: 'bell', name: 'رنين جرس 🔔', description: 'نغمة جرس ناعمة ورنانة' },
  { id: 'arcade', name: 'إلكتروني سريع 🚀', description: 'نغمة حماسية سريعة كألعاب الفيديو' },
  { id: 'chime', name: 'تنبيه ناعم ✨', description: 'نغمة كلاسيكية مزدوجة هادئة' },
];

export const STORAGE_KEY_ALERT_TONE = 'price_calc_v0_alert_tone';

class SoundAlertPlayer {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private activeTone: AlertToneId = 'celebration';

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_ALERT_TONE) as AlertToneId;
        if (saved && ['celebration', 'radar', 'bell', 'arcade', 'chime'].includes(saved)) {
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
   * تشغيل نغمة الهدف وفق النغمة المختارة
   */
  public playTargetReachedAlert(overrideTone?: AlertToneId) {
    const toneToPlay = overrideTone || this.activeTone;
    this.playTone(toneToPlay);
  }

  /**
   * تشغيل نغمة مخصصة محددة (مع إمكانية التجربة والاستماع)
   */
  public playTone(tone: AlertToneId) {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      switch (tone) {
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
