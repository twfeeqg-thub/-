import { 
  AppIconPreset, 
  ActiveAppIconConfig, 
  DEFAULT_APP_ICON_PRESETS, 
  STORAGE_KEY_APP_ICON 
} from '@/types/appIcon';

export const EVENT_APP_ICON_CHANGED = 'crypto_app_icon_changed_event';

export function getActiveAppIcon(): ActiveAppIconConfig {
  if (typeof window === 'undefined') {
    return { type: 'preset', presetId: 'crypto_gold_bull', updatedAt: Date.now() };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_APP_ICON);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.type === 'preset' || parsed.type === 'custom')) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }

  return { type: 'preset', presetId: 'crypto_gold_bull', updatedAt: Date.now() };
}

export function setActiveAppIcon(config: ActiveAppIconConfig): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY_APP_ICON, JSON.stringify(config));
    applyIconToDom(config);
    window.dispatchEvent(new CustomEvent(EVENT_APP_ICON_CHANGED, { detail: config }));
  } catch (err) {
    console.error('Failed to set active app icon', err);
  }
}

export function getIconDataUrl(config: ActiveAppIconConfig): string {
  if (config.type === 'custom' && config.customDataUrl) {
    return config.customDataUrl;
  }

  const preset = DEFAULT_APP_ICON_PRESETS.find(p => p.id === (config.presetId || 'crypto_gold_bull')) || DEFAULT_APP_ICON_PRESETS[0];
  const cleanedSvg = preset.previewSvg.replace(/\n\s+/g, ' ').trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(cleanedSvg)}`;
}

export function applyIconToDom(config: ActiveAppIconConfig): void {
  if (typeof document === 'undefined') return;

  try {
    const iconUrl = getIconDataUrl(config);

    // 1. Update or create standard favicon link
    let linkIcon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!linkIcon) {
      linkIcon = document.createElement('link');
      linkIcon.rel = 'icon';
      document.head.appendChild(linkIcon);
    }
    linkIcon.href = iconUrl;
    if (config.type === 'preset') {
      linkIcon.type = 'image/svg+xml';
    } else {
      linkIcon.removeAttribute('type');
    }

    // 2. Update apple touch icon
    let appleIcon = document.querySelector<HTMLLinkElement>("link[rel='apple-touch-icon']");
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = iconUrl;
  } catch (err) {
    console.error('Failed to apply icon to DOM', err);
  }
}

export interface ValidateIconResult {
  valid: boolean;
  error?: string;
  dataUrl?: string;
  width?: number;
  height?: number;
}

export async function validateAndProcessCustomIcon(file: File): Promise<ValidateIconResult> {
  const allowedTypes = ['image/png', 'image/webp', 'image/svg+xml', 'image/jpeg', 'image/jpg'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'نوع الملف غير مدعوم. الصيغ المدعومة هي: PNG (مفضل), WebP, SVG, JPG.',
    };
  }

  const maxBytes = 2 * 1024 * 1024; // 2MB
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: 'حجم الملف يتجاوز الحد الأقصى المسموح (2 ميغابايت). يرجى اختيار ملف أصغر حجماً.',
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        resolve({ valid: false, error: 'تعذر قراءة محتوى الصورة.' });
        return;
      }

      if (file.type === 'image/svg+xml') {
        resolve({ valid: true, dataUrl });
        return;
      }

      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        const ratio = width / height;

        // Check aspect ratio (allow slight 10% tolerance)
        if (ratio < 0.85 || ratio > 1.15) {
          resolve({
            valid: false,
            error: `أبعاد الصورة غير مربعة (${width}×${height}). يرجى استخدام صورة مربعة بنسبة 1:1 لضمان ظهور الشعار بشكل مثالي على الشاشة الرئيسية.`,
          });
          return;
        }

        if (width < 144 || height < 144) {
          resolve({
            valid: false,
            error: `دقة الصورة منخفضة جداً (${width}×${height}). الحد الأدنى المطلوب هو 192×192 بكسل (ويفضل 512×512 بكسل).`,
          });
          return;
        }

        resolve({ valid: true, dataUrl, width, height });
      };

      img.onerror = () => {
        resolve({ valid: false, error: 'الصورة تالفة أو غير صالحة للعرض.' });
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      resolve({ valid: false, error: 'حدث خطأ أثناء قراءة الملف.' });
    };

    reader.readAsDataURL(file);
  });
}
