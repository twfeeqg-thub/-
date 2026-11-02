export interface AppIconPreset {
  id: string;
  name: string;
  subtitle: string;
  themeColor: string;
  badge: string;
  previewSvg: string; // inline SVG markup for crystal clear crisp preview
  primaryGradient: [string, string];
}

export interface ActiveAppIconConfig {
  type: 'preset' | 'custom';
  presetId?: string;
  customDataUrl?: string;
  updatedAt: number;
}

export const STORAGE_KEY_APP_ICON = 'pwa_active_app_icon_v2';

export const DEFAULT_APP_ICON_PRESETS: AppIconPreset[] = [
  {
    id: 'crypto_gold_bull',
    name: 'الثور الذهبي (Gold Surge)',
    subtitle: 'شعار ذهبي ملكي يرمز للانطلاق الصاعد والقمم السعرية',
    themeColor: '#f59e0b',
    badge: 'الافتراضي الموصى به',
    primaryGradient: ['#f59e0b', '#d97706'],
    previewSvg: `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg_gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#020617"/>
          </linearGradient>
          <linearGradient id="gold_grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fbbf24"/>
            <stop offset="50%" stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#d97706"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill="url(#bg_gold)"/>
        <rect x="3" y="3" width="94" height="94" rx="21" fill="none" stroke="url(#gold_grad)" stroke-width="2.5" stroke-opacity="0.5"/>
        <circle cx="50" cy="50" r="32" fill="#f59e0b" fill-opacity="0.1" stroke="url(#gold_grad)" stroke-width="1.5" stroke-dasharray="3 3"/>
        <path d="M28 65 L42 48 L54 56 L72 32" fill="none" stroke="url(#gold_grad)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M58 32 L72 32 L72 46" fill="none" stroke="url(#gold_grad)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="72" cy="32" r="4.5" fill="#fef08a"/>
        <circle cx="42" cy="48" r="3" fill="#fbbf24"/>
        <circle cx="54" cy="56" r="3" fill="#fbbf24"/>
      </svg>
    `,
  },
  {
    id: 'cyber_tron',
    name: 'السايبر بوت (Cyber Tron)',
    subtitle: 'أزرق نيون تكنولوجي يحاكي الرادارات الكمية ورصد السيولة',
    themeColor: '#06b6d4',
    badge: 'طابع تقني حديث',
    primaryGradient: ['#06b6d4', '#0284c7'],
    previewSvg: `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg_cyber" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#020617"/>
            <stop offset="100%" stop-color="#0369a1"/>
          </linearGradient>
          <linearGradient id="cyan_grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#67e8f9"/>
            <stop offset="100%" stop-color="#06b6d4"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill="url(#bg_cyber)"/>
        <rect x="3" y="3" width="94" height="94" rx="21" fill="none" stroke="url(#cyan_grad)" stroke-width="2.5" stroke-opacity="0.6"/>
        <polygon points="50,22 76,37 76,67 50,82 24,67 24,37" fill="#0891b2" fill-opacity="0.15" stroke="url(#cyan_grad)" stroke-width="3"/>
        <circle cx="50" cy="52" r="14" fill="#020617" stroke="url(#cyan_grad)" stroke-width="3"/>
        <path d="M50 42 L50 62 M40 52 L60 52" stroke="#67e8f9" stroke-width="3" stroke-linecap="round"/>
        <circle cx="50" cy="22" r="3" fill="#67e8f9"/>
        <circle cx="76" cy="37" r="3" fill="#67e8f9"/>
        <circle cx="76" cy="67" r="3" fill="#67e8f9"/>
      </svg>
    `,
  },
  {
    id: 'emerald_surge',
    name: 'الزمرد الأخضر (Emerald Breakout)',
    subtitle: 'أخضر زمردي مشرق يرمز للشموع الخضراء والانفجارات السعرية',
    themeColor: '#10b981',
    badge: 'طاقة الأرباح والشموع',
    primaryGradient: ['#10b981', '#059669'],
    previewSvg: `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg_emerald" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#064e3b"/>
            <stop offset="100%" stop-color="#022c22"/>
          </linearGradient>
          <linearGradient id="green_grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#6ee7b7"/>
            <stop offset="100%" stop-color="#10b981"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill="url(#bg_emerald)"/>
        <rect x="3" y="3" width="94" height="94" rx="21" fill="none" stroke="url(#green_grad)" stroke-width="2.5" stroke-opacity="0.7"/>
        {/* Candlestick bars */}
        <rect x="25" y="42" width="12" height="28" rx="2" fill="url(#green_grad)"/>
        <line x1="31" y1="34" x2="31" y2="76" stroke="#6ee7b7" stroke-width="3" stroke-linecap="round"/>
        <rect x="44" y="32" width="12" height="36" rx="2" fill="url(#green_grad)"/>
        <line x1="50" y1="22" x2="50" y2="74" stroke="#6ee7b7" stroke-width="3" stroke-linecap="round"/>
        <rect x="63" y="24" width="12" height="42" rx="2" fill="#a7f3d0"/>
        <line x1="69" y1="16" x2="69" y2="72" stroke="#a7f3d0" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `,
  },
  {
    id: 'purple_quant',
    name: 'الذكاء البنفسجي (Quant Intelligence)',
    subtitle: 'أرجواني وبنفسجي ملكي للمتداولين المحترفين وتحليل البيانات',
    themeColor: '#8b5cf6',
    badge: 'طابع النخبة الاحترافي',
    primaryGradient: ['#8b5cf6', '#6d28d9'],
    previewSvg: `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg_purple" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#2e1065"/>
            <stop offset="100%" stop-color="#0f0728"/>
          </linearGradient>
          <linearGradient id="purple_grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#c4b5fd"/>
            <stop offset="100%" stop-color="#8b5cf6"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill="url(#bg_purple)"/>
        <rect x="3" y="3" width="94" height="94" rx="21" fill="none" stroke="url(#purple_grad)" stroke-width="2.5" stroke-opacity="0.6"/>
        <path d="M50 22 L76 38 L68 74 L32 74 L24 38 Z" fill="#7c3aed" fill-opacity="0.2" stroke="url(#purple_grad)" stroke-width="3"/>
        <path d="M35 60 Q50 34 65 60" fill="none" stroke="#c4b5fd" stroke-width="4" stroke-linecap="round"/>
        <circle cx="50" cy="38" r="5" fill="#f5d0fe"/>
        <circle cx="35" cy="60" r="4" fill="#a78bfa"/>
        <circle cx="65" cy="60" r="4" fill="#a78bfa"/>
      </svg>
    `,
  },
  {
    id: 'crimson_hunter',
    name: 'صياد القيعان الناري (Crimson Hunter)',
    subtitle: 'أحمر قرمزي ناري لرصد مناطق الانعكاس والارتدادات الحادة',
    themeColor: '#ef4444',
    badge: 'قوة وسرعة التفاعل',
    primaryGradient: ['#ef4444', '#b91c1c'],
    previewSvg: `
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg_crimson" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#450a0a"/>
            <stop offset="100%" stop-color="#0f0202"/>
          </linearGradient>
          <linearGradient id="red_grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fca5a5"/>
            <stop offset="100%" stop-color="#ef4444"/>
          </linearGradient>
        </defs>
        <rect width="100" height="100" rx="24" fill="url(#bg_crimson)"/>
        <rect x="3" y="3" width="94" height="94" rx="21" fill="none" stroke="url(#red_grad)" stroke-width="2.5" stroke-opacity="0.6"/>
        <circle cx="50" cy="50" r="26" fill="none" stroke="url(#red_grad)" stroke-width="3"/>
        <circle cx="50" cy="50" r="14" fill="none" stroke="#fca5a5" stroke-width="2.5" stroke-dasharray="4 2"/>
        <circle cx="50" cy="50" r="4" fill="#fee2e2"/>
        <line x1="50" y1="18" x2="50" y2="28" stroke="url(#red_grad)" stroke-width="3" stroke-linecap="round"/>
        <line x1="50" y1="72" x2="50" y2="82" stroke="url(#red_grad)" stroke-width="3" stroke-linecap="round"/>
        <line x1="18" y1="50" x2="28" y2="50" stroke="url(#red_grad)" stroke-width="3" stroke-linecap="round"/>
        <line x1="72" y1="50" x2="82" y2="50" stroke="url(#red_grad)" stroke-width="3" stroke-linecap="round"/>
      </svg>
    `,
  },
];
