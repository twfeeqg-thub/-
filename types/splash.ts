export interface SplashQuote {
  id: string;
  text: string;
  author?: string;
}

export interface SplashSettings {
  enabled: boolean;
  durationSeconds: number; // default 4
  autoDismissOnReady: boolean; // true
}

export const STORAGE_KEY_SPLASH_QUOTES = 'bot2_splash_quotes';
export const STORAGE_KEY_SPLASH_SETTINGS = 'bot2_splash_settings';

export const DEFAULT_SPLASH_QUOTES: SplashQuote[] = [
  {
    id: 'q1',
    text: 'الانضباط وإدارة رأس المال هما سر البقاء والاستمرار في أسواق المال.',
    author: 'قاعدة المتداول المحترف',
  },
  {
    id: 'q2',
    text: 'لا تطارد الشموع الخضراء.. انتظر حتى يأتي السعر إلى مناطق قناصتك المدروسة.',
    author: 'استراتيجية القناص',
  },
  {
    id: 'q3',
    text: 'الخسارة الصغيرة جزء من تكلفة العمل، وحماية رأس المال أولوية قصوى دائماً.',
    author: 'إدارة المخاطر',
  },
  {
    id: 'q4',
    text: 'الصبر هو الشجاعة الهادئة التي تجعل الأرباح تنمو والفرص تتضح.',
    author: 'سيكولوجية التداول',
  },
  {
    id: 'q5',
    text: 'تداول ما تراه على الشارت والبيانات، وليس ما تتمناه أو تخشاه بمشاعرك.',
    author: 'الانضباط الفني',
  },
  {
    id: 'q6',
    text: 'الناجح ليس من يربح كل صفقة، بل من يحسن إدارة نقاط الخروج والتعادل بذكاء.',
    author: 'عقلية النمو',
  },
];
