import { UserProfile, StoredUserAccount, STORAGE_KEY_AUTH_USER, STORAGE_KEY_AUTH_USERS_REGISTRY } from '@/types/auth';

export const EVENT_AUTH_STATE_CHANGED = 'crypto_auth_state_changed';

// Secure hashing using native Web Crypto API
async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(password + '::' + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function getUsersRegistry(): Record<string, StoredUserAccount> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AUTH_USERS_REGISTRY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveUsersRegistry(registry: Record<string, StoredUserAccount>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_AUTH_USERS_REGISTRY, JSON.stringify(registry));
  } catch (err) {
    console.error('Failed to save users registry', err);
  }
}

function notifyAuthStateChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT_AUTH_STATE_CHANGED));
  }
}

export const authService = {
  getCurrentUser(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AUTH_USER);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async register(email: string, password: string, displayName: string): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim();

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { success: false, error: 'الرجاء إدخال بريد إلكتروني صحيح وصالح.' };
    }

    if (!password || password.length < 6) {
      return { success: false, error: 'كلمة المرور يجب أن تتكون من 6 خانات على الأقل.' };
    }

    if (!cleanName) {
      return { success: false, error: 'الرجاء إدخال اسم المتداول أو اسم العرض.' };
    }

    const registry = getUsersRegistry();
    if (registry[cleanEmail]) {
      return { success: false, error: 'هذا البريد الإلكتروني مسجل مسبقاً! يمكنك تسجيل الدخول به.' };
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const newAccount: StoredUserAccount = {
      id: userId,
      email: cleanEmail,
      displayName: cleanName,
      passwordHash,
      passwordSalt: salt,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    registry[cleanEmail] = newAccount;
    saveUsersRegistry(registry);

    const userProfile: UserProfile = {
      id: newAccount.id,
      email: newAccount.email,
      displayName: newAccount.displayName,
      createdAt: newAccount.createdAt,
      lastLoginAt: newAccount.lastLoginAt,
      isGuest: false,
    };

    localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(userProfile));
    notifyAuthStateChanged();

    return { success: true, user: userProfile };
  },

  async login(email: string, password: string): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      return { success: false, error: 'يرجى إدخال البريد الإلكتروني وكلمة المرور معاً.' };
    }

    const registry = getUsersRegistry();
    const account = registry[cleanEmail];

    if (!account) {
      return { success: false, error: 'البريد الإلكتروني غير موجود، يرجى إنشاء حساب جديد أولاً.' };
    }

    const hash = await hashPassword(password, account.passwordSalt);
    if (hash !== account.passwordHash) {
      return { success: false, error: 'كلمة المرور غير صحيحة، يرجى التحقق وإعادة المحاولة.' };
    }

    account.lastLoginAt = Date.now();
    registry[cleanEmail] = account;
    saveUsersRegistry(registry);

    const userProfile: UserProfile = {
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      avatarUrl: account.avatarUrl,
      createdAt: account.createdAt,
      lastLoginAt: account.lastLoginAt,
      isGuest: false,
    };

    localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(userProfile));
    notifyAuthStateChanged();

    return { success: true, user: userProfile };
  },

  async updateProfile(updates: { displayName?: string; avatarUrl?: string | null }): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: 'يجب تسجيل الدخول لتحديث الملف الشخصي.' };
    }

    const registry = getUsersRegistry();
    const account = registry[currentUser.email];
    if (!account) {
      return { success: false, error: 'تعذر العثور على سجل الحساب.' };
    }

    if (updates.displayName !== undefined) {
      const cleanName = updates.displayName.trim();
      if (!cleanName) return { success: false, error: 'لا يمكن ترك الاسم فارغاً.' };
      account.displayName = cleanName;
      currentUser.displayName = cleanName;
    }

    if (updates.avatarUrl !== undefined) {
      account.avatarUrl = updates.avatarUrl || undefined;
      currentUser.avatarUrl = updates.avatarUrl || undefined;
    }

    registry[currentUser.email] = account;
    saveUsersRegistry(registry);
    localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(currentUser));
    notifyAuthStateChanged();

    return { success: true, user: currentUser };
  },

  async changeEmail(newEmail: string, currentPassword: string): Promise<{ success: boolean; error?: string; user?: UserProfile }> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return { success: false, error: 'يجب تسجيل الدخول لتغيير البريد.' };

    const cleanNewEmail = newEmail.trim().toLowerCase();
    if (!cleanNewEmail || !cleanNewEmail.includes('@') || !cleanNewEmail.includes('.')) {
      return { success: false, error: 'الرجاء إدخال بريد إلكتروني صالح.' };
    }

    if (cleanNewEmail === currentUser.email) {
      return { success: false, error: 'البريد الجديد مطابق للبريد الحالي.' };
    }

    const registry = getUsersRegistry();
    const account = registry[currentUser.email];
    if (!account) return { success: false, error: 'تعذر العثور على الحساب.' };

    const hash = await hashPassword(currentPassword, account.passwordSalt);
    if (hash !== account.passwordHash) {
      return { success: false, error: 'كلمة المرور الحالية غير صحيحة لتأكيد تغيير البريد.' };
    }

    if (registry[cleanNewEmail]) {
      return { success: false, error: 'البريد الجديد مستخدم بالفعل في حساب آخر.' };
    }

    delete registry[currentUser.email];
    account.email = cleanNewEmail;
    registry[cleanNewEmail] = account;
    saveUsersRegistry(registry);

    currentUser.email = cleanNewEmail;
    localStorage.setItem(STORAGE_KEY_AUTH_USER, JSON.stringify(currentUser));
    notifyAuthStateChanged();

    return { success: true, user: currentUser };
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return { success: false, error: 'يجب تسجيل الدخول لتغيير كلمة المرور.' };

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'كلمة المرور الجديدة يجب ألا تقل عن 6 خانات.' };
    }

    const registry = getUsersRegistry();
    const account = registry[currentUser.email];
    if (!account) return { success: false, error: 'تعذر العثور على الحساب.' };

    const oldHash = await hashPassword(oldPassword, account.passwordSalt);
    if (oldHash !== account.passwordHash) {
      return { success: false, error: 'كلمة المرور الحالية غير صحيحة.' };
    }

    const newSalt = generateSalt();
    account.passwordSalt = newSalt;
    account.passwordHash = await hashPassword(newPassword, newSalt);

    registry[currentUser.email] = account;
    saveUsersRegistry(registry);

    return { success: true };
  },

  logout(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY_AUTH_USER);
    notifyAuthStateChanged();
  },
};
