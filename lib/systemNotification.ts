/**
 * نظام إشعارات سطح المكتب والهاتف (Desktop & Mobile Push / Notification API)
 * يدعم العمل في الخلفية وعلامات التبويب غير النشطة عبر Service Worker والتكامل المباشر
 */

export type SystemNotificationPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export interface SendNotificationOptions {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  badge?: string;
  url?: string;
  renotify?: boolean;
  vibrate?: number[];
  requireInteraction?: boolean;
  playSound?: boolean;
}

export const STORAGE_KEY_NOTIFICATIONS_ENABLED = 'price_calc_v0_notifications_enabled';

class SystemNotificationManager {
  private lastAlertTimestamps: Map<string, number> = new Map();
  private listeners: Set<(status: SystemNotificationPermission) => void> = new Set();

  /**
   * هل المتصفح يدعم Notification API؟
   */
  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window;
  }

  /**
   * معرفة إذن الإشعارات الحالي
   */
  public getPermission(): SystemNotificationPermission {
    if (!this.isSupported()) return 'unsupported';
    return Notification.permission as SystemNotificationPermission;
  }

  /**
   * الاشتراك بتغييرات حالة الإذن
   */
  public subscribe(callback: (status: SystemNotificationPermission) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    const current = this.getPermission();
    this.listeners.forEach((cb) => {
      try {
        cb(current);
      } catch {
        // Ignore
      }
    });
  }

  /**
   * طلب إذن إرسال الإشعارات من المستخدم
   */
  public async requestPermission(): Promise<SystemNotificationPermission> {
    if (!this.isSupported()) return 'unsupported';

    try {
      const result = await Notification.requestPermission();
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY_NOTIFICATIONS_ENABLED, result === 'granted' ? 'true' : 'false');
        } catch {
          // Ignore
        }
      }
      this.notifyListeners();
      return result as SystemNotificationPermission;
    } catch (err) {
      console.warn('[Notification API] Permission request failed:', err);
      return this.getPermission();
    }
  }

  /**
   * إرسال إشعار نظام حقيقي يظهر على سطح المكتب أو شاشة الهاتف
   * حتى لو كان التطبيق يعمل في الخلفية أو الشاشة مطفأة
   */
  public async sendNotification(options: SendNotificationOptions): Promise<boolean> {
    if (!this.isSupported()) return false;
    if (Notification.permission !== 'granted') return false;

    // منع تكرار نفس الإشعار خلال مدة قصيرة (throttling) لتجنب الإزعاج
    const tagKey = options.tag || options.title;
    const now = Date.now();
    const lastTime = this.lastAlertTimestamps.get(tagKey) || 0;
    if (now - lastTime < 5000) {
      return false;
    }
    this.lastAlertTimestamps.set(tagKey, now);

    const defaultIcon = '/pwa-192x192.png';
    const defaultBadge = '/icon.svg';
    const vibrationPattern = options.vibrate || [250, 100, 250, 100, 400];

    // اهتزاز الهاتف إذا كان مدعوماً
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      try {
        navigator.vibrate(vibrationPattern);
      } catch {
        // Ignore
      }
    }

    const notificationPayload: NotificationOptions & {
      renotify?: boolean;
      vibrate?: number[];
    } = {
      body: options.body,
      icon: options.icon || defaultIcon,
      badge: options.badge || defaultBadge,
      tag: options.tag || `price-alert-${Date.now()}`,
      renotify: options.renotify !== false,
      vibrate: vibrationPattern,
      requireInteraction: options.requireInteraction ?? false,
      data: {
        url: options.url || '/',
        timestamp: now,
      },
    };

    // 1. الأسلوب الأساسي والمثالي في الخلفية والهواتف: عبر ServiceWorkerRegistration
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && 'showNotification' in registration) {
          await registration.showNotification(options.title, notificationPayload);
          return true;
        }
      } catch (swErr) {
        console.warn('[Notification API] ServiceWorker showNotification fallback:', swErr);
      }
    }

    // 2. البديل المباشر: عبر new Notification() في بيئات التطوير أو حال غياب Service Worker
    try {
      const n = new Notification(options.title, notificationPayload);
      n.onclick = () => {
        if (typeof window !== 'undefined') {
          window.focus();
        }
        n.close();
      };
      return true;
    } catch (err) {
      console.warn('[Notification API] Standard notification creation error:', err);
      return false;
    }
  }

  /**
   * إرسال إشعار تجريبي للمستخدم للتأكد من وصوله لسطح المكتب أو الهاتف
   */
  public async sendTestNotification(): Promise<boolean> {
    const perm = await (Notification.permission === 'granted' ? Promise.resolve('granted') : this.requestPermission());
    if (perm !== 'granted') return false;

    return this.sendNotification({
      title: '🎯 نجاح تفعيل إشعارات النظام!',
      body: 'ستصلك الآن تنبيهات وصول الأسعار والأهداف وارتداد القيعان حتى أثناء عمل التطبيق في الخلفية.',
      tag: 'test-system-notification',
      requireInteraction: false,
      vibrate: [200, 100, 200],
    });
  }
}

export const systemNotification = new SystemNotificationManager();
