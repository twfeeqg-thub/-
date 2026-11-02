'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  UserProfile, 
  DEFAULT_AVATARS, 
  STORAGE_KEY_AUTH_USER 
} from '@/types/auth';
import { authService, EVENT_AUTH_STATE_CHANGED } from '@/lib/authService';
import { 
  AppIconPreset, 
  ActiveAppIconConfig, 
  DEFAULT_APP_ICON_PRESETS, 
  STORAGE_KEY_APP_ICON 
} from '@/types/appIcon';
import { 
  getActiveAppIcon, 
  setActiveAppIcon, 
  validateAndProcessCustomIcon 
} from '@/lib/appIconManager';
import { 
  SplashPhrase, 
  SplashSettings, 
  DEFAULT_SPLASH_SETTINGS, 
  STORAGE_KEY_SPLASH_SETTINGS 
} from '@/types/splash';
import { localBackupService, AppBackupData } from '@/lib/localBackup';
import { 
  User, 
  Lock, 
  Mail, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Camera, 
  Trash2, 
  Smartphone, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  Sparkles, 
  Plus, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Shield, 
  Layers, 
  Palette, 
  RefreshCw, 
  Clock, 
  FileJson,
  ExternalLink,
  SlidersHorizontal,
  Play
} from 'lucide-react';

interface AccountSettingsDashboardProps {
  onPreviewSplash?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const AccountSettingsDashboard: React.FC<AccountSettingsDashboardProps> = ({
  onPreviewSplash,
  onNavigateTab,
}) => {
  // Navigation sub-tabs within this screen: 'profile' | 'app_icon' | 'backup' | 'splash_quotes'
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'app_icon' | 'backup' | 'splash_quotes'>('profile');

  // Auth & Profile State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authDisplayName, setAuthDisplayName] = useState('');
  const [authShowPassword, setAuthShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Profile Edit State
  const [editDisplayName, setEditDisplayName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [changeOldPassword, setChangeOldPassword] = useState('');
  const [changeNewPassword, setChangeNewPassword] = useState('');
  const [changeConfirmPassword, setChangeConfirmPassword] = useState('');
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Email Change State
  const [changeNewEmail, setChangeNewEmail] = useState('');
  const [changeEmailCurrentPassword, setChangeEmailCurrentPassword] = useState('');
  const [emailChangeStatus, setEmailChangeStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // App Icon State
  const [activeIconConfig, setActiveIconConfig] = useState<ActiveAppIconConfig>({ type: 'preset', presetId: 'crypto_gold_bull', updatedAt: 0 });
  const [customIconError, setCustomIconError] = useState<string | null>(null);
  const [showReinstallNoticeModal, setShowReinstallNoticeModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Splash Quotes State
  const [splashSettings, setSplashSettings] = useState<SplashSettings>(DEFAULT_SPLASH_SETTINGS);
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuoteAuthor, setNewQuoteAuthor] = useState('');
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [editingQuoteText, setEditingQuoteText] = useState('');
  const [quoteSuccessMsg, setQuoteSuccessMsg] = useState<string | null>(null);

  // Backup State
  const [backupSummary, setBackupSummary] = useState<AppBackupData['summary']>({
    currenciesCount: 0,
    trackedCount: 0,
    scalpTradesCount: 0,
    watchlistCount: 0,
  });
  const [backupStatus, setBackupStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [pendingRestoreBackup, setPendingRestoreBackup] = useState<AppBackupData | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [isCopiedToClipboard, setIsCopiedToClipboard] = useState(false);

  // Load initial data
  useEffect(() => {
    const timer = setTimeout(() => {
      // 1. Load Auth User
      const user = authService.getCurrentUser();
      setCurrentUser(user);
      if (user) {
        setEditDisplayName(user.displayName);
        setChangeNewEmail(user.email);
      }

      // 2. Load App Icon
      const icon = getActiveAppIcon();
      setActiveIconConfig(icon);

      // 3. Load Splash Settings
      try {
        const rawSplash = localStorage.getItem(STORAGE_KEY_SPLASH_SETTINGS);
        if (rawSplash) {
          setSplashSettings(JSON.parse(rawSplash));
        }
      } catch {}

      // 4. Load Backup Summary
      try {
        const bObj = localBackupService.createBackupObject();
        setBackupSummary(bObj.summary);
      } catch {}
    }, 0);

    // Listen to auth changes
    const handleAuthChange = () => {
      const u = authService.getCurrentUser();
      setCurrentUser(u);
      if (u) {
        setEditDisplayName(u.displayName);
        setChangeNewEmail(u.email);
      }
    };
    window.addEventListener(EVENT_AUTH_STATE_CHANGED, handleAuthChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener(EVENT_AUTH_STATE_CHANGED, handleAuthChange);
    };
  }, []);

  // Save splash settings helper
  const handleSaveSplashSettings = (updated: SplashSettings) => {
    setSplashSettings(updated);
    try {
      localStorage.setItem(STORAGE_KEY_SPLASH_SETTINGS, JSON.stringify(updated));
      setQuoteSuccessMsg('تم حفظ إعدادات شاشة السبلاش بنجاح');
      setTimeout(() => setQuoteSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- AUTH HANDLERS ----------------
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccess(null);
    setIsSubmittingAuth(true);

    try {
      if (authMode === 'register') {
        const res = await authService.register(authEmail, authPassword, authDisplayName);
        if (!res.success) {
          setAuthError(res.error || 'حدث خطأ أثناء إنشاء الحساب.');
        } else {
          setAuthSuccess('تم إنشاء الحساب وتسجيل الدخول بنجاح! أهلاً بك.');
          setAuthEmail('');
          setAuthPassword('');
          setAuthDisplayName('');
        }
      } else {
        const res = await authService.login(authEmail, authPassword);
        if (!res.success) {
          setAuthError(res.error || 'فشل تسجيل الدخول.');
        } else {
          setAuthSuccess('تم تسجيل الدخول بنجاح!');
          setAuthEmail('');
          setAuthPassword('');
        }
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleUpdateName = async () => {
    if (!editDisplayName.trim()) return;
    const res = await authService.updateProfile({ displayName: editDisplayName.trim() });
    if (res.success) {
      setIsEditingName(false);
      setAuthSuccess('تم تحديث الاسم بنجاح');
      setTimeout(() => setAuthSuccess(null), 3000);
    } else {
      setAuthError(res.error || 'فشل تحديث الاسم');
    }
  };

  const handlePickAvatarPreset = async (avatarId: string) => {
    const res = await authService.updateProfile({ avatarUrl: avatarId });
    if (res.success) {
      setAuthSuccess('تم تغيير الصورة الرمزية بنجاح');
      setTimeout(() => setAuthSuccess(null), 3000);
    }
  };

  const handleRemoveAvatar = async () => {
    const res = await authService.updateProfile({ avatarUrl: null });
    if (res.success) {
      setAuthSuccess('تمت إزالة الصورة الشخصية');
      setTimeout(() => setAuthSuccess(null), 3000);
    }
  };

  const handleCustomAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await validateAndProcessCustomIcon(file);
    if (!res.valid || !res.dataUrl) {
      setAuthError(res.error || 'تعذر معالجة الصورة المرفوعة.');
      return;
    }

    const updateRes = await authService.updateProfile({ avatarUrl: res.dataUrl });
    if (updateRes.success) {
      setAuthSuccess('تم تحديث صورتك الشخصية بنجاح!');
      setTimeout(() => setAuthSuccess(null), 3000);
    } else {
      setAuthError(updateRes.error || 'فشل حفظ الصورة الشخصية.');
    }
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeStatus(null);

    if (changeNewPassword !== changeConfirmPassword) {
      setPasswordChangeStatus({ type: 'error', msg: 'كلمة المرور الجديدة وتأكيدها غير متطابقين.' });
      return;
    }

    const res = await authService.changePassword(changeOldPassword, changeNewPassword);
    if (res.success) {
      setPasswordChangeStatus({ type: 'success', msg: 'تم تغيير كلمة المرور بنجاح!' });
      setChangeOldPassword('');
      setChangeNewPassword('');
      setChangeConfirmPassword('');
    } else {
      setPasswordChangeStatus({ type: 'error', msg: res.error || 'فشل تغيير كلمة المرور.' });
    }
  };

  const handleChangeEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailChangeStatus(null);

    const res = await authService.changeEmail(changeNewEmail, changeEmailCurrentPassword);
    if (res.success) {
      setEmailChangeStatus({ type: 'success', msg: 'تم تحديث البريد الإلكتروني بنجاح!' });
      setChangeEmailCurrentPassword('');
    } else {
      setEmailChangeStatus({ type: 'error', msg: res.error || 'فشل تغيير البريد.' });
    }
  };

  const handleLogout = () => {
    authService.logout();
    setAuthSuccess('تم تسجيل الخروج. يمكنك الاستمرار في العمل كضيف.');
    setTimeout(() => setAuthSuccess(null), 3000);
  };

  // ---------------- APP ICON HANDLERS ----------------
  const handleSelectPresetIcon = useCallback((presetId: string) => {
    const timestamp = Date.now();
    const config: ActiveAppIconConfig = {
      type: 'preset',
      presetId,
      updatedAt: timestamp,
    };
    setActiveIconConfig(config);
    setActiveAppIcon(config);
    setShowReinstallNoticeModal(true);
  }, []);

  const handleUploadCustomIcon = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomIconError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await validateAndProcessCustomIcon(file);
    if (!res.valid || !res.dataUrl) {
      setCustomIconError(res.error || 'فشل التحقق من الملف.');
      return;
    }

    const config: ActiveAppIconConfig = {
      type: 'custom',
      customDataUrl: res.dataUrl,
      updatedAt: Date.now(),
    };
    setActiveIconConfig(config);
    setActiveAppIcon(config);
    setShowReinstallNoticeModal(true);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---------------- SPLASH QUOTES HANDLERS ----------------
  const handleAddQuote = () => {
    if (!newQuoteText.trim()) return;
    const newPhrase: SplashPhrase = {
      id: 'custom_' + Date.now(),
      text: newQuoteText.trim(),
      author: newQuoteAuthor.trim() || 'عبارة مخصصة',
      isCustom: true,
    };
    const updated = {
      ...splashSettings,
      phrases: [newPhrase, ...splashSettings.phrases],
    };
    handleSaveSplashSettings(updated);
    setNewQuoteText('');
    setNewQuoteAuthor('');
  };

  const handleDeleteQuote = (id: string) => {
    const updated = {
      ...splashSettings,
      phrases: splashSettings.phrases.filter(p => p.id !== id),
    };
    handleSaveSplashSettings(updated);
  };

  const handleSaveEditQuote = (id: string) => {
    if (!editingQuoteText.trim()) return;
    const updated = {
      ...splashSettings,
      phrases: splashSettings.phrases.map(p => p.id === id ? { ...p, text: editingQuoteText.trim() } : p),
    };
    handleSaveSplashSettings(updated);
    setEditingQuoteId(null);
    setEditingQuoteText('');
  };

  const handleResetQuotesToDefault = () => {
    handleSaveSplashSettings({
      ...splashSettings,
      phrases: DEFAULT_SPLASH_SETTINGS.phrases,
    });
  };

  // ---------------- LOCAL BACKUP HANDLERS ----------------
  const handleDownloadBackup = () => {
    try {
      localBackupService.downloadBackup();
      setBackupStatus({ type: 'success', msg: 'تم تنزيل ملف النسخة الاحتياطية بنجاح على جهازك.' });
      setTimeout(() => setBackupStatus(null), 4000);
    } catch {
      setBackupStatus({ type: 'error', msg: 'فشل تصدير النسخة الاحتياطية.' });
    }
  };

  const handleCopyBackupToClipboard = async () => {
    try {
      const backup = localBackupService.createBackupObject();
      await navigator.clipboard.writeText(JSON.stringify(backup, null, 2));
      setIsCopiedToClipboard(true);
      setBackupStatus({ type: 'success', msg: 'تم نسخ محتوى النسخة الاحتياطية إلى الحافظة بنجاح!' });
      setTimeout(() => {
        setIsCopiedToClipboard(false);
        setBackupStatus(null);
      }, 3000);
    } catch {
      setBackupStatus({ type: 'error', msg: 'تعذر النسخ إلى الحافظة.' });
    }
  };

  const handleSelectBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBackupStatus(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = localBackupService.validateBackup(content);
      if (!res.isValid || !res.backup) {
        setBackupStatus({ type: 'error', msg: res.error || 'الملف المختار غير صالح كنسخة احتياطية.' });
      } else {
        setPendingRestoreBackup(res.backup);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!pendingRestoreBackup) return;
    const res = localBackupService.restoreBackup(pendingRestoreBackup, restoreMode);
    if (res.success) {
      setBackupStatus({ type: 'success', msg: res.message });
      setPendingRestoreBackup(null);
      // Reload stats
      const bObj = localBackupService.createBackupObject();
      setBackupSummary(bObj.summary);
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } else {
      setBackupStatus({ type: 'error', msg: res.message });
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-6 pb-28 text-slate-900 dark:text-slate-100 font-sans" dir="rtl">
      {/* Top Banner / Header */}
      <div className="mb-6 bg-gradient-to-l from-slate-900 via-slate-800 to-slate-950 p-5 sm:p-7 rounded-3xl border border-slate-700/60 shadow-xl relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-52 h-52 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border-2 border-amber-400/50 flex items-center justify-center p-2 shadow-inner">
              {currentUser?.avatarUrl ? (
                currentUser.avatarUrl.startsWith('data:') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <span className="text-2xl">
                    {DEFAULT_AVATARS.find(a => a.id === currentUser.avatarUrl)?.icon || '👤'}
                  </span>
                )
              ) : (
                <User className="w-7 h-7 text-amber-400 stroke-[2.5]" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                  {currentUser ? currentUser.displayName : 'حساب الضيف (مجهول)'}
                </h1>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  currentUser ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-700 text-slate-300'
                }`}>
                  {currentUser ? 'عضو مسجل' : 'تصفح محلي كضيف'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>{currentUser ? currentUser.email : 'بياناتك محفوظة بأمان على متصفحك الحالي • يمكنك إنشاء حساب للمزامنة'}</span>
              </p>
            </div>
          </div>

          {/* Quick Stats or Logout */}
          <div className="flex items-center gap-2">
            {currentUser && (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>تسجيل الخروج</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200 dark:bg-slate-900 rounded-2xl mb-6 border border-slate-300 dark:border-slate-800 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSubTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'profile'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <User className="w-4 h-4 stroke-[2.2]" />
          <span>الملف الشخصي والحساب</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('app_icon')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'app_icon'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Smartphone className="w-4 h-4 stroke-[2.2]" />
          <span>أيقونة التطبيق للشاشة الرئيسية</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('backup')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'backup'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileJson className="w-4 h-4 stroke-[2.2]" />
          <span>النسخ الاحتياطي اليدوي (JSON)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('splash_quotes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'splash_quotes'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 stroke-[2.2]" />
          <span>عبارات شاشة السبلاش</span>
        </button>
      </div>

      {/* Global Alerts / Toasts */}
      {authSuccess && (
        <div className="mb-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{authSuccess}</span>
        </div>
      )}
      {authError && (
        <div className="mb-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-bold flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{authError}</span>
        </div>
      )}

      {/* ================= TAB 1: PROFILE & AUTH ================= */}
      {activeSubTab === 'profile' && (
        <div className="space-y-6">
          {!currentUser ? (
            /* Guest / Login / Register Form */
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-md max-w-xl mx-auto">
              <div className="flex items-center justify-center gap-3 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => { setAuthMode('login'); setAuthError(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    authMode === 'login'
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode('register'); setAuthError(null); }}
                  className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    authMode === 'register'
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  إنشاء حساب جديد
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === 'register' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      اسم المتداول / اسم العرض
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                      <input
                        type="text"
                        value={authDisplayName}
                        onChange={(e) => setAuthDisplayName(e.target.value)}
                        placeholder="مثال: قناص الفرص"
                        className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    <input
                      type="email"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      required
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                    <input
                      type={authShowPassword ? 'text' : 'password'}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pr-10 pl-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                      required
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setAuthShowPassword(!authShowPassword)}
                      className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      {authShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">6 خانات على الأقل</p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  {isSubmittingAuth ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : authMode === 'register' ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>تأكيد إنشاء الحساب</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>تسجيل الدخول الآن</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : (
            /* Logged in User Profile Control */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Avatar & Display Name */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md">
                <h3 className="text-base font-black mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-amber-500" />
                  <span>الصورة الشخصية واسم العرض</span>
                </h3>

                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 mb-5">
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center p-1 overflow-hidden shadow-md">
                      {currentUser.avatarUrl ? (
                        currentUser.avatarUrl.startsWith('data:') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={currentUser.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          <span className="text-3xl">
                            {DEFAULT_AVATARS.find(a => a.id === currentUser.avatarUrl)?.icon || '👤'}
                          </span>
                        )
                      ) : (
                        <User className="w-10 h-10 text-amber-500" />
                      )}
                    </div>
                  </div>

                  <div className="flex-1 text-center sm:text-right">
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      {isEditingName ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            className="px-3 py-1 text-sm rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <button
                            type="button"
                            onClick={handleUpdateName}
                            className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h4 className="text-lg font-black">{currentUser.displayName}</h4>
                          <button
                            type="button"
                            onClick={() => setIsEditingName(true)}
                            className="text-xs text-amber-500 hover:underline cursor-pointer"
                          >
                            تعديل
                          </button>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{currentUser.email}</p>

                    <div className="flex items-center gap-2 mt-3 justify-center sm:justify-start">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleCustomAvatarUpload}
                      />
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-xs font-bold cursor-pointer transition-all"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>رفع صورة مخصصة</span>
                      </button>

                      {currentUser.avatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-200 text-xs font-bold cursor-pointer transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>إزالة الصورة</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preset Avatars Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">
                    أو اختر شخصية رمزية جاهزة:
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {DEFAULT_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        onClick={() => handlePickAvatarPreset(av.id)}
                        className={`p-2 rounded-2xl border transition-all flex flex-col items-center gap-1 cursor-pointer ${
                          currentUser.avatarUrl === av.id
                            ? 'border-amber-400 bg-amber-400/10 ring-2 ring-amber-400/30'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="text-2xl">{av.icon}</span>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 truncate w-full text-center">
                          {av.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2: Security & Password */}
              <div className="space-y-6">
                {/* Change Password */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md">
                  <h3 className="text-base font-black mb-3 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-amber-500" />
                    <span>تغيير كلمة المرور</span>
                  </h3>

                  {passwordChangeStatus && (
                    <div className={`mb-3 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      passwordChangeStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                    }`}>
                      {passwordChangeStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      <span>{passwordChangeStatus.msg}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
                    <div>
                      <input
                        type="password"
                        value={changeOldPassword}
                        onChange={(e) => setChangeOldPassword(e.target.value)}
                        placeholder="كلمة المرور الحالية"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                        required
                        dir="ltr"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="password"
                        value={changeNewPassword}
                        onChange={(e) => setChangeNewPassword(e.target.value)}
                        placeholder="الكلمة الجديدة (6+)"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                        required
                        dir="ltr"
                      />
                      <input
                        type="password"
                        value={changeConfirmPassword}
                        onChange={(e) => setChangeConfirmPassword(e.target.value)}
                        placeholder="تأكيد الكلمة الجديدة"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                        required
                        dir="ltr"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-amber-400 font-bold text-xs border border-amber-400/30 transition-all cursor-pointer"
                    >
                      تحديث كلمة المرور
                    </button>
                  </form>
                </div>

                {/* Change Email */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md">
                  <h3 className="text-base font-black mb-3 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-amber-500" />
                    <span>تغيير البريد الإلكتروني</span>
                  </h3>

                  {emailChangeStatus && (
                    <div className={`mb-3 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      emailChangeStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                    }`}>
                      {emailChangeStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      <span>{emailChangeStatus.msg}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangeEmailSubmit} className="space-y-3">
                    <input
                      type="email"
                      value={changeNewEmail}
                      onChange={(e) => setChangeNewEmail(e.target.value)}
                      placeholder="البريد الإلكتروني الجديد"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      required
                      dir="ltr"
                    />
                    <input
                      type="password"
                      value={changeEmailCurrentPassword}
                      onChange={(e) => setChangeEmailCurrentPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور الحالية لتأكيد التغيير"
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                      required
                      dir="ltr"
                    />
                    <button
                      type="submit"
                      className="w-full py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
                    >
                      تأكيد وحفظ البريد الجديد
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: APP ICON CUSTOMIZATION ================= */}
      {activeSubTab === 'app_icon' && (
        <div className="space-y-6">
          {/* Reinstallation Notice Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-l from-amber-500/15 via-yellow-500/10 to-amber-500/5 border-2 border-amber-500/40 shadow-lg text-slate-800 dark:text-slate-200">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black shadow-md shrink-0">
                <Smartphone className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-black text-amber-500 dark:text-amber-400 flex items-center gap-2">
                  <span>إشعار هام لتطبيق الأيقونة على هاتفك وسطح المكتب:</span>
                </h3>
                <p className="text-xs sm:text-sm font-semibold leading-relaxed">
                  أنظمة التشغيل (Android / iOS / Windows) تمنع أمنياً أي تطبيق ويب من تغيير الأيقونة المثبتة على الشاشة الرئيسية تلقائياً بعد تثبيتها. لتحديث الشعار على جهازك:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-amber-500/20">
                    <span className="font-bold text-amber-500 ml-1">١.</span>
                    <span>احذف أيقونة التطبيق الحالية من الشاشة الرئيسية.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-amber-500/20">
                    <span className="font-bold text-amber-500 ml-1">٢.</span>
                    <span>اختر الأيقونة التي تعجبك أدناه أو ارفع شعارك.</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-amber-500/20">
                    <span className="font-bold text-amber-500 ml-1">٣.</span>
                    <span>اضغط خيارات المتصفح واضف التطبيق للشاشة مجدداً!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Specs Info Card */}
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-500 shrink-0" />
              <span className="font-bold">المواصفات المطلوبة للأيقونة المخصصة:</span>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-400">
              <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 font-mono">نسبة 1:1 مربعة</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 font-mono">512×512 بكسل (حد أدنى 192×192)</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 font-mono">PNG (مفضل شفاف) / WebP / SVG</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 font-mono">الحد الأقصى: 2MB</span>
            </div>
          </div>

          {customIconError && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{customIconError}</span>
            </div>
          )}

          {/* Preset Icons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEFAULT_APP_ICON_PRESETS.map((preset) => {
              const isSelected = activeIconConfig.type === 'preset' && activeIconConfig.presetId === preset.id;
              return (
                <div
                  key={preset.id}
                  onClick={() => handleSelectPresetIcon(preset.id)}
                  className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/5 shadow-xl ring-4 ring-amber-400/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    {/* SVG Icon Render */}
                    <div 
                      className="w-16 h-16 rounded-2xl shadow-lg shrink-0 overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: preset.previewSvg }}
                    />

                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                        {preset.badge}
                      </span>
                      {isSelected && (
                        <span className="mt-2 flex items-center gap-1 text-[11px] font-black text-amber-500 bg-amber-400/10 px-2 py-0.5 rounded-full">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>الأيقونة النشطة</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">{preset.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {preset.subtitle}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                    <span style={{ color: preset.themeColor }}>معاينة حية</span>
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? 'تم التفعيل' : 'اختيار هذه الأيقونة'}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Custom Icon Card */}
            <div className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
              activeIconConfig.type === 'custom'
                ? 'border-amber-400 bg-amber-500/5 shadow-xl ring-4 ring-amber-400/20'
                : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'
            }`}>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-inner">
                  {activeIconConfig.type === 'custom' && activeIconConfig.customDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={activeIconConfig.customDataUrl} alt="Custom" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-7 h-7 text-slate-400" />
                  )}
                </div>

                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/30">
                  شعار مخصص
                </span>
              </div>

              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">رفع أيقونة خاصة بك</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  ارفع تصميمك أو شعارك المفضل ليتحول إلى أيقونة التطبيق على شاشتك.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/webp,image/svg+xml,image/jpeg"
                  className="hidden"
                  onChange={handleUploadCustomIcon}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-amber-400 font-bold text-xs border border-amber-400/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-4 h-4" />
                  <span>تحديد صورة من الجهاز</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: LOCAL JSON BACKUP & RESTORE ================= */}
      {activeSubTab === 'backup' && (
        <div className="space-y-6">
          {/* Summary of Stored App Data */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md">
            <h3 className="text-base font-black mb-2 flex items-center gap-2">
              <FileJson className="w-5 h-5 text-amber-500" />
              <span>النسخ الاحتياطي اليدوي الشامل (Local JSON Backup & Restore)</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
              خيار بديل عملي بنسبة 100% يمنحك السيطرة الكاملة على بياناتك. يمكنك تصدير كافة العملات، الصفقات، الخطوط، الإعدادات كملف JSON بنقرة واحدة، واستعادتها في أي وقت على أي جهاز دون الحاجة لخوادم وسيطة أو قيود ربط.
            </p>

            {/* Live Counts Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">قائمة المراقبة (Watchlist)</span>
                <span className="text-xl font-mono font-black text-amber-500">{backupSummary.watchlistCount}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">عملة وخطوط رسم</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">صفقات السكالبينج</span>
                <span className="text-xl font-mono font-black text-emerald-500">{backupSummary.scalpTradesCount}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">صفقة مسجلة</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">رصد الصعود (Tracker)</span>
                <span className="text-xl font-mono font-black text-cyan-500">{backupSummary.trackedCount}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">زوج مراقب</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
                <span className="text-[11px] text-slate-500 font-bold block mb-1">حاسبة الفروقات</span>
                <span className="text-xl font-mono font-black text-purple-500">{backupSummary.currenciesCount}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">عملة مخزنة</span>
              </div>
            </div>

            {backupStatus && (
              <div className={`mb-6 p-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 ${
                backupStatus.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
              }`}>
                {backupStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{backupStatus.msg}</span>
              </div>
            )}

            {/* Actions: Export & Import */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Export Box */}
              <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-black text-amber-500 flex items-center gap-2 mb-1">
                    <Download className="w-4 h-4" />
                    <span>تصدير نسخة احتياطية</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    حفظ كافة بيانات التطبيق في ملف `.json` على جهازك مع طابع زمني دقيق.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadBackup}
                    className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>تنزيل ملف النسخة الاحتياطية</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyBackupToClipboard}
                    className="p-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer transition-all"
                    title="نسخ السجل كـ JSON"
                  >
                    {isCopiedToClipboard ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Import Box */}
              <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-black text-emerald-500 flex items-center gap-2 mb-1">
                    <Upload className="w-4 h-4" />
                    <span>استيراد نسخة احتياطية</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                    استرجاع بياناتك من ملف JSON سابق، مع إمكانية الدمج أو الاستبدال الشامل.
                  </p>
                </div>

                <label className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center">
                  <Upload className="w-4 h-4" />
                  <span>اختيار ملف JSON للاستعادة</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    className="hidden"
                    onChange={handleSelectBackupFile}
                  />
                </label>
              </div>
            </div>

            {/* Pending Restore Confirmation Modal / Card */}
            {pendingRestoreBackup && (
              <div className="mt-6 p-5 rounded-3xl bg-slate-100 dark:bg-slate-800 border-2 border-amber-400 shadow-xl animate-fadeIn">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span>تأكيد استعادة النسخة الاحتياطية</span>
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black">
                    {pendingRestoreBackup.version || 'V2.0'}
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 mb-4 space-y-1">
                  <p>تاريخ التصدير: <strong className="font-mono">{new Date(pendingRestoreBackup.timestamp).toLocaleString('ar-SA')}</strong></p>
                  <p>محتويات الملف: {pendingRestoreBackup.summary.watchlistCount} في المراقبة • {pendingRestoreBackup.summary.scalpTradesCount} صفقات سكالبينج • {pendingRestoreBackup.summary.currenciesCount} عملات حاسبة.</p>
                </div>

                {/* Restore Mode Selector */}
                <div className="flex items-center gap-3 mb-4 text-xs font-bold">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="restore_mode"
                      value="replace"
                      checked={restoreMode === 'replace'}
                      onChange={() => setRestoreMode('replace')}
                      className="accent-amber-400"
                    />
                    <span>استبدال كامل (حذف الحالي واستعادة النسخة)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="restore_mode"
                      value="merge"
                      checked={restoreMode === 'merge'}
                      onChange={() => setRestoreMode('merge')}
                      className="accent-amber-400"
                    />
                    <span>دمج (إضافة البيانات غير الموجودة)</span>
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmRestore}
                    className="flex-1 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs cursor-pointer shadow"
                  >
                    تطبيق الاستعادة وتحديث التطبيق
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingRestoreBackup(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 4: SPLASH QUOTES MANAGEMENT ================= */}
      {activeSubTab === 'splash_quotes' && (
        <div className="space-y-6">
          {/* General Splash Settings Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <span>التحكم في شاشة السبلاش الترحيبية (Splash Screen)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  شاشة ترحيبية أنيقة تعرض اقتباسات تداول ملهمة مع شريط تحميل ذكي قبل الدخول للتطبيق.
                </p>
              </div>

              {/* Preview Button */}
              <button
                type="button"
                onClick={onPreviewSplash}
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs shadow-md hover:from-amber-400 hover:to-amber-300 cursor-pointer transition-all shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>معاينة شاشة السبلاش الآن</span>
              </button>
            </div>

            {quoteSuccessMsg && (
              <div className="mb-4 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{quoteSuccessMsg}</span>
              </div>
            )}

            {/* Config Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold block">تفعيل شاشة السبلاش</span>
                  <span className="text-[11px] text-slate-400">عرضها عند فتح التطبيق</span>
                </div>
                <input
                  type="checkbox"
                  checked={splashSettings.enabled}
                  onChange={(e) => handleSaveSplashSettings({ ...splashSettings, enabled: e.target.checked })}
                  className="w-4 h-4 accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold block">زر التخطي السريع</span>
                  <span className="text-[11px] text-slate-400">إمكانية التخطي الفوري</span>
                </div>
                <input
                  type="checkbox"
                  checked={splashSettings.allowSkip}
                  onChange={(e) => handleSaveSplashSettings({ ...splashSettings, allowSkip: e.target.checked })}
                  className="w-4 h-4 accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold block">مدة العرض الافتراضية</span>
                  <span className="text-[11px] text-slate-400">{splashSettings.durationSeconds} ثواني</span>
                </div>
                <div className="flex items-center gap-1">
                  {[2, 3, 4, 5].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => handleSaveSplashSettings({ ...splashSettings, durationSeconds: sec })}
                      className={`px-2 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                        splashSettings.durationSeconds === sec
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {sec}ث
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Add New Phrase Form */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 mb-6">
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-amber-500" />
                <span>إضافة عبارة تداول جديدة لشاشة السبلاش</span>
              </h4>
              <div className="space-y-2">
                <textarea
                  value={newQuoteText}
                  onChange={(e) => setNewQuoteText(e.target.value)}
                  placeholder="اكتب العبارة أو الحكمة هنا... مثال: «التداول خطة وانضباط وليس مقامرة»"
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none resize-none"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newQuoteAuthor}
                    onChange={(e) => setNewQuoteAuthor(e.target.value)}
                    placeholder="المصدر أو القائل (اختياري)"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddQuote}
                    disabled={!newQuoteText.trim()}
                    className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-black text-xs cursor-pointer shadow transition-all shrink-0"
                  >
                    إضافة العبارة
                  </button>
                </div>
              </div>
            </div>

            {/* Active Quotes List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">
                  العبارات النشطة ({splashSettings.phrases.length}):
                </span>
                <button
                  type="button"
                  onClick={handleResetQuotesToDefault}
                  className="text-xs text-amber-500 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>استعادة العبارات الافتراضية</span>
                </button>
              </div>

              {splashSettings.phrases.map((phrase) => (
                <div
                  key={phrase.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex-1">
                    {editingQuoteId === phrase.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingQuoteText}
                          onChange={(e) => setEditingQuoteText(e.target.value)}
                          className="flex-1 px-3 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-900 border border-amber-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveEditQuote(phrase.id)}
                          className="p-1.5 rounded-lg bg-emerald-500 text-white cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                          {phrase.text}
                        </p>
                        {phrase.author && (
                          <span className="text-[10px] text-amber-500 font-medium block mt-1">
                            — {phrase.author}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {phrase.isCustom && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/30">
                        مخصصة
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingQuoteId(phrase.id);
                        setEditingQuoteText(phrase.text);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                      title="تعديل"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuote(phrase.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Friendly Reinstall Notice Modal (when icon changed) */}
      {showReinstallNoticeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-md w-full border-2 border-amber-400 shadow-2xl animate-scaleUp text-slate-900 dark:text-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-amber-400/20 text-amber-500 flex items-center justify-center mx-auto mb-4 border border-amber-400/40">
              <Smartphone className="w-7 h-7 stroke-[2.2]" />
            </div>

            <h3 className="text-lg font-black text-center mb-2">
              تم تحديث الأيقونة في المتصفح بنجاح! 🎉
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed text-center mb-5">
              لتثبيت الأيقونة الجديدة على الشاشة الرئيسية لهاتفك أو سطح المكتب، تفرض أنظمة التشغيل (Android / iOS / Windows) أمنياً حذف الاختصار القديم وتثبيته مجدداً:
            </p>

            <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-5">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[10px] shrink-0">1</span>
                <span>احذف أيقونة التطبيق الحالية من شاشتك الرئيسية.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[10px] shrink-0">2</span>
                <span>اضغط على زر المشاركة أو القائمة (⋮ أو ⎋) في المتصفح.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-[10px] shrink-0">3</span>
                <span>اختر &quot;إضافة إلى الشاشة الرئيسية&quot; أو &quot;تثبيت التطبيق&quot;.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowReinstallNoticeModal(false)}
              className="w-full py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-md transition-all cursor-pointer"
            >
              فهمت ذلك، شكراً لك!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
