export interface SplashPhrase {
  id: string;
  text: string;
  category?: 'discipline' | 'analysis' | 'risk' | 'mindset';
  author?: string;
  isCustom?: boolean;
}

export interface SplashSettings {
  enabled: boolean;
  durationSeconds: number; // default 4 seconds
  allowSkip: boolean;
  showOncePerSession: boolean;
  phrases: SplashPhrase[];
}

export const STORAGE_KEY_SPLASH_SETTINGS = 'crypto_splash_settings_v2';
export const SESSION_KEY_SPLASH_SHOWN = 'crypto_splash_shown_in_session_v2';

export const DEFAULT_SPLASH_PHRASES: SplashPhrase[] = [
  {
    id: 'phrase_1',
    text: '«الصبر والانضباط هما وقود الأرباح المستدامة في أسواق المال»',
    category: 'discipline',
    author: 'قواعد التداول الذكي',
  },
  {
    id: 'phrase_2',
    text: '«لا تطارد الشموع الخضراء، بل انتظر تأكيد المسار ونقاط الدخول الذهبية»',
    category: 'analysis',
    author: 'بوت مراقبة الصعود',
  },
  {
    id: 'phrase_3',
    text: '«إدارة المخاطر الصارمة وحساب سعر التعادل هما حصنك المنيع لحماية رأس المال»',
    category: 'risk',
    author: 'حاسبة الفروقات السعرية',
  },
  {
    id: 'phrase_4',
    text: '«السوق يكافئ الملتزمين بخطتهم ويعاقب المترددين والمندفعين بالعواطف»',
    category: 'mindset',
    author: 'حكمة المتداول المحترف',
  },
  {
    id: 'phrase_5',
    text: '«الفرص تتجدد كل دقيقة، فلا تجعل تفويت فرصة يدفعك لصفقة غير مدروسة»',
    category: 'discipline',
    author: 'استراتيجيات السكالبينج',
  },
];

export const DEFAULT_SPLASH_SETTINGS: SplashSettings = {
  enabled: true,
  durationSeconds: 4,
  allowSkip: true,
  showOncePerSession: false,
  phrases: DEFAULT_SPLASH_PHRASES,
};
