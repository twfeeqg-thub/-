import { STORAGE_KEY_CURRENCIES, STORAGE_KEY_DEFAULTS } from '@/types/currency';
import { STORAGE_KEY_TRACKER, STORAGE_KEY_TRACKER_STREAM } from '@/types/tracker';
import { STORAGE_KEY_SCALPER_TRADES, STORAGE_KEY_SCALPER_SESSION } from '@/types/scalper';
import { STORAGE_KEY_WATCHLIST } from '@/types/watchlist';
import { STORAGE_KEY_MARKET_ALERT_CONFIG } from '@/types/marketSessions';
import { STORAGE_KEY_SPLASH_SETTINGS } from '@/types/splash';
import { STORAGE_KEY_APP_ICON } from '@/types/appIcon';
import { STORAGE_KEY_AUTH_USER } from '@/types/auth';

export const EVENT_DATA_RESTORED = 'crypto_app_data_restored_event';

export interface AppBackupData {
  app: string;
  version: string;
  exportedAt: string;
  timestamp: number;
  summary: {
    currenciesCount: number;
    trackedCount: number;
    scalpTradesCount: number;
    watchlistCount: number;
  };
  data: {
    currencies?: unknown;
    defaults?: unknown;
    tracker?: unknown;
    trackerStream?: unknown;
    scalperTrades?: unknown;
    scalperSession?: unknown;
    watchlist?: unknown;
    marketAlertConfig?: unknown;
    splashSettings?: unknown;
    appIcon?: unknown;
    authUser?: unknown;
  };
}

export const localBackupService = {
  createBackupObject(): AppBackupData {
    if (typeof window === 'undefined') {
      throw new Error('Window is not defined');
    }

    const safeParse = (key: string) => {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch {
        return null;
      }
    };

    const currencies = safeParse(STORAGE_KEY_CURRENCIES) || [];
    const defaults = safeParse(STORAGE_KEY_DEFAULTS);
    const tracker = safeParse(STORAGE_KEY_TRACKER) || [];
    const trackerStream = safeParse(STORAGE_KEY_TRACKER_STREAM);
    const scalperTrades = safeParse(STORAGE_KEY_SCALPER_TRADES) || [];
    const scalperSession = safeParse(STORAGE_KEY_SCALPER_SESSION);
    const watchlist = safeParse(STORAGE_KEY_WATCHLIST) || [];
    const marketAlertConfig = safeParse(STORAGE_KEY_MARKET_ALERT_CONFIG);
    const splashSettings = safeParse(STORAGE_KEY_SPLASH_SETTINGS);
    const appIcon = safeParse(STORAGE_KEY_APP_ICON);
    const authUser = safeParse(STORAGE_KEY_AUTH_USER);

    return {
      app: 'بوت(٢) مراقبة صعود العملات',
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      timestamp: Date.now(),
      summary: {
        currenciesCount: Array.isArray(currencies) ? currencies.length : 0,
        trackedCount: Array.isArray(tracker) ? tracker.length : 0,
        scalpTradesCount: Array.isArray(scalperTrades) ? scalperTrades.length : 0,
        watchlistCount: Array.isArray(watchlist) ? watchlist.length : 0,
      },
      data: {
        currencies,
        defaults,
        tracker,
        trackerStream,
        scalperTrades,
        scalperSession,
        watchlist,
        marketAlertConfig,
        splashSettings,
        appIcon,
        authUser,
      },
    };
  },

  downloadBackup(): void {
    const backup = this.createBackupObject();
    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const dateStr = new Date().toISOString().split('T')[0];
    const a = document.createElement('a');
    a.href = url;
    a.download = `crypto_surge_bot_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  validateBackup(jsonString: string): { isValid: boolean; error?: string; backup?: AppBackupData } {
    try {
      const parsed = JSON.parse(jsonString) as AppBackupData;
      if (!parsed || typeof parsed !== 'object') {
        return { isValid: false, error: 'الملف ليس بتنسيق JSON صحيح.' };
      }

      if (!parsed.data || typeof parsed.data !== 'object') {
        return { isValid: false, error: 'الملف لا يحتوي على قسم البيانات (data) المطلوب.' };
      }

      return { isValid: true, backup: parsed };
    } catch {
      return { isValid: false, error: 'تعذر قراءة ملف JSON، يرجى التأكد من اختيار ملف صالح.' };
    }
  },

  restoreBackup(backup: AppBackupData, mode: 'merge' | 'replace' = 'replace'): { success: boolean; message: string } {
    if (typeof window === 'undefined') return { success: false, message: 'بيئة غير صالحة' };

    try {
      const { data } = backup;

      const safeWrite = (key: string, val: unknown) => {
        if (val !== undefined && val !== null) {
          localStorage.setItem(key, JSON.stringify(val));
        } else if (mode === 'replace') {
          // Keep key intact if not specified
        }
      };

      if (mode === 'replace') {
        safeWrite(STORAGE_KEY_CURRENCIES, data.currencies);
        safeWrite(STORAGE_KEY_DEFAULTS, data.defaults);
        safeWrite(STORAGE_KEY_TRACKER, data.tracker);
        safeWrite(STORAGE_KEY_TRACKER_STREAM, data.trackerStream);
        safeWrite(STORAGE_KEY_SCALPER_TRADES, data.scalperTrades);
        safeWrite(STORAGE_KEY_SCALPER_SESSION, data.scalperSession);
        safeWrite(STORAGE_KEY_WATCHLIST, data.watchlist);
        safeWrite(STORAGE_KEY_MARKET_ALERT_CONFIG, data.marketAlertConfig);
        safeWrite(STORAGE_KEY_SPLASH_SETTINGS, data.splashSettings);
        safeWrite(STORAGE_KEY_APP_ICON, data.appIcon);
        if (data.authUser) {
          safeWrite(STORAGE_KEY_AUTH_USER, data.authUser);
        }
      } else {
        // Merge mode for list items
        if (Array.isArray(data.currencies)) {
          const current = JSON.parse(localStorage.getItem(STORAGE_KEY_CURRENCIES) || '[]');
          const merged = [...current, ...data.currencies];
          localStorage.setItem(STORAGE_KEY_CURRENCIES, JSON.stringify(merged));
        }
        if (Array.isArray(data.watchlist)) {
          const current = JSON.parse(localStorage.getItem(STORAGE_KEY_WATCHLIST) || '[]');
          const existingIds = new Set(current.map((item: { id: string }) => item.id));
          const newItems = (data.watchlist as { id: string }[]).filter(i => !existingIds.has(i.id));
          localStorage.setItem(STORAGE_KEY_WATCHLIST, JSON.stringify([...current, ...newItems]));
        }
        if (Array.isArray(data.scalperTrades)) {
          const current = JSON.parse(localStorage.getItem(STORAGE_KEY_SCALPER_TRADES) || '[]');
          const existingIds = new Set(current.map((item: { id: string }) => item.id));
          const newTrades = (data.scalperTrades as { id: string }[]).filter(t => !existingIds.has(t.id));
          localStorage.setItem(STORAGE_KEY_SCALPER_TRADES, JSON.stringify([...current, ...newTrades]));
        }
      }

      // Notify entire app of restoration
      window.dispatchEvent(new CustomEvent(EVENT_DATA_RESTORED, { detail: { mode, timestamp: Date.now() } }));

      return {
        success: true,
        message: mode === 'replace' ? 'تمت استعادة كافة البيانات بالكامل بنجاح!' : 'تم دمج البيانات الجديدة مع البيانات الموجودة بنجاح!',
      };
    } catch (err) {
      console.error('Failed to restore backup', err);
      return { success: false, message: 'حدث خطأ أثناء كتابة البيانات إلى الذاكرة المحلية.' };
    }
  },
};
