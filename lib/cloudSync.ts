import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';

export const APP_STATE_SYNC_KEYS = [
  'bot2_calculator_currencies',
  'bot2_calculator_defaults',
  'bot2_tracker_currencies',
  'bot2_tracker_stream_active',
  'bot2_scalper_trades',
  'bot2_scalper_session',
  'bot2_watchlist_items',
  'bot2_range_scalper_trades',
  'bot2_binance_fab_hidden',
  'bot2_custom_chart_lines',
  'bot2_splash_quotes',
  'bot2_splash_settings',
  'bot2_app_icon_theme',
  'bot2_sound_tone_settings',
  'bot2_market_alert_settings',
  'bot2_range_alert_settings',
];

export const STORAGE_KEY_LAST_SYNC = 'bot2_last_cloud_sync';
export const EVENT_CLOUD_RESTORED = 'bot2_cloud_state_restored';

export interface CloudSyncSnapshot {
  version: string;
  timestamp: string;
  keysCount: number;
  data: Record<string, string | null>;
}

export function getLocalSnapshot(): CloudSyncSnapshot {
  const data: Record<string, string | null> = {};
  let count = 0;
  if (typeof window !== 'undefined') {
    APP_STATE_SYNC_KEYS.forEach((key) => {
      const val = localStorage.getItem(key);
      if (val !== null) {
        data[key] = val;
        count++;
      }
    });
  }
  return {
    version: 'v2',
    timestamp: new Date().toISOString(),
    keysCount: count,
    data,
  };
}

export async function pushStateToCloud(userId: string): Promise<{ success: boolean; timestamp: string }> {
  if (!userId) throw new Error('يجب تسجيل الدخول لمزامنة البيانات');
  const snapshot = getLocalSnapshot();
  const serialized = JSON.stringify(snapshot.data);
  const path = `users/${userId}/app_state/v2`;

  try {
    const docRef = doc(db, 'users', userId, 'app_state', 'v2');
    await setDoc(docRef, {
      uid: userId,
      version: 'v2',
      dataJson: serialized,
      updatedAt: snapshot.timestamp,
    });
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_LAST_SYNC, snapshot.timestamp);
    }
    return { success: true, timestamp: snapshot.timestamp };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function pullStateFromCloud(userId: string): Promise<{ success: boolean; timestamp: string; keysRestored: number }> {
  if (!userId) throw new Error('يجب تسجيل الدخول لاسترجاع البيانات السحابية');
  const path = `users/${userId}/app_state/v2`;

  try {
    const docRef = doc(db, 'users', userId, 'app_state', 'v2');
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('لا توجد نسخة سحابية محفوظة مسبقاً لهذا الحساب');
    }
    const data = snap.data();
    const dataJson = data?.dataJson;
    if (!dataJson) {
      throw new Error('النسخة السحابية فارغة');
    }

    const parsed = JSON.parse(dataJson) as Record<string, string>;
    let count = 0;
    if (typeof window !== 'undefined') {
      Object.entries(parsed).forEach(([key, val]) => {
        if (typeof val === 'string') {
          localStorage.setItem(key, val);
          count++;
        }
      });
      localStorage.setItem(STORAGE_KEY_LAST_SYNC, data.updatedAt || new Date().toISOString());
      window.dispatchEvent(new Event(EVENT_CLOUD_RESTORED));
    }
    return { success: true, timestamp: data.updatedAt, keysRestored: count };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function exportLocalBackup(): string {
  const snapshot = getLocalSnapshot();
  return JSON.stringify(snapshot, null, 2);
}

export function importLocalBackup(jsonStr: string): number {
  if (typeof window === 'undefined') return 0;
  const parsed = JSON.parse(jsonStr) as CloudSyncSnapshot;
  if (!parsed.data) throw new Error('ملف النسخة الاحتياطية غير صالح');
  let count = 0;
  Object.entries(parsed.data).forEach(([key, val]) => {
    if (typeof val === 'string') {
      localStorage.setItem(key, val);
      count++;
    }
  });
  window.dispatchEvent(new Event(EVENT_CLOUD_RESTORED));
  return count;
}
