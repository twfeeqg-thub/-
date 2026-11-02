export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string; // custom image Data URL or preset avatar ID
  createdAt: number;
  lastLoginAt: number;
  isGuest?: boolean;
}

export interface StoredUserAccount {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  passwordSalt: string;
  avatarUrl?: string;
  createdAt: number;
  lastLoginAt: number;
}

export const STORAGE_KEY_AUTH_USER = 'crypto_auth_user_v2';
export const STORAGE_KEY_AUTH_USERS_REGISTRY = 'crypto_auth_users_registry_v2';

export const DEFAULT_AVATARS = [
  { id: 'bull_avatar', name: 'المتداول الصاعد', icon: '🐂', color: 'from-amber-500 to-amber-700' },
  { id: 'quant_avatar', name: 'المحلل الرقمي', icon: '⚡', color: 'from-cyan-500 to-blue-700' },
  { id: 'sniper_avatar', name: 'قناص الصفقات', icon: '🎯', color: 'from-emerald-500 to-teal-700' },
  { id: 'whale_avatar', name: 'صائد السيولة', icon: '🐋', color: 'from-indigo-500 to-purple-700' },
  { id: 'falcon_avatar', name: 'الصقر الرابح', icon: '🦅', color: 'from-rose-500 to-red-700' },
  { id: 'crown_avatar', name: 'المتداول الذهبي', icon: '👑', color: 'from-yellow-400 to-amber-600' },
];
