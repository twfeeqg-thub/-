'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  KeyRound, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Cloud, 
  CloudUpload, 
  CloudDownload, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Trash2, 
  Sparkles, 
  Palette, 
  Quote, 
  Plus, 
  Edit3, 
  Clock, 
  Download, 
  FolderUp, 
  ShieldCheck, 
  Flame, 
  Check, 
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { 
  pushStateToCloud, 
  pullStateFromCloud, 
  exportLocalBackup, 
  importLocalBackup, 
  STORAGE_KEY_LAST_SYNC 
} from '@/lib/cloudSync';
import { 
  SplashQuote, 
  DEFAULT_SPLASH_QUOTES, 
  STORAGE_KEY_SPLASH_QUOTES, 
  STORAGE_KEY_SPLASH_SETTINGS, 
  SplashSettings 
} from '@/types/splash';

// Presets for trader avatars
const AVATAR_PRESETS = [
  { id: 'bull', name: 'الثور الذهبي', emoji: '🐂', color: 'from-amber-500 to-yellow-600' },
  { id: 'falcon', name: 'الصقر القناص', emoji: '🦅', color: 'from-blue-500 to-indigo-600' },
  { id: 'diamond', name: 'الأيدي الماسية', emoji: '💎', color: 'from-cyan-400 to-blue-600' },
  { id: 'lion', name: 'الأسد الملك', emoji: '🦁', color: 'from-orange-500 to-amber-700' },
  { id: 'rocket', name: 'الصاروخ الفضائي', emoji: '🚀', color: 'from-emerald-500 to-teal-700' },
  { id: 'matrix', name: 'المتداول الرقمي', emoji: '⚡', color: 'from-purple-500 to-pink-600' },
];

export const APP_ICON_THEMES = [
  { id: 'binance-gold', name: 'Binance Gold الفاخر', primary: '#f59e0b', ring: 'ring-amber-500', desc: 'شعار ذهبي وأسود عميق' },
  { id: 'emerald-bull', name: 'Emerald Bull الأخضر', primary: '#10b981', ring: 'ring-emerald-500', desc: 'أخضر سوق الصعود المستمر' },
  { id: 'cyber-cyan', name: 'Cyber Cyan المستقبلي', primary: '#06b6d4', ring: 'ring-cyan-500', desc: 'أزرق سايبر عالي التباين' },
  { id: 'dark-titanium', name: 'Dark Titanium الداكن', primary: '#64748b', ring: 'ring-slate-500', desc: 'رمادي تيتانيوم هادئ' },
];

export const STORAGE_KEY_APP_ICON_THEME = 'bot2_app_icon_theme';

export function AccountDashboard() {
  const { 
    user, 
    profile, 
    loading: authLoading, 
    isGuest, 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithGoogle, 
    logout, 
    changePassword, 
    changeEmail, 
    updateProfileDetails, 
    removeAvatar 
  } = useAuth();

  // Tab: 'profile' | 'security' | 'sync' | 'appearance' | 'splash_quotes'
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'sync' | 'appearance' | 'splash_quotes'>('profile');

  // Notification banners
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Auth Forms State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Security Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Profile Form State
  const [displayNameInput, setDisplayNameInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cloud Sync State
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_LAST_SYNC);
    }
    return null;
  });

  // Splash Quotes State
  const [quotesList, setQuotesList] = useState<SplashQuote[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedQuotes = localStorage.getItem(STORAGE_KEY_SPLASH_QUOTES);
        if (savedQuotes) {
          const parsed = JSON.parse(savedQuotes);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return DEFAULT_SPLASH_QUOTES;
  });

  const [splashSettings, setSplashSettings] = useState<SplashSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedSplashSettings = localStorage.getItem(STORAGE_KEY_SPLASH_SETTINGS);
        if (savedSplashSettings) {
          return { enabled: true, durationSeconds: 4, autoDismissOnReady: true, ...JSON.parse(savedSplashSettings) };
        }
      } catch {}
    }
    return { enabled: true, durationSeconds: 4, autoDismissOnReady: true };
  });

  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [quoteTextInput, setQuoteTextInput] = useState('');
  const [quoteAuthorInput, setQuoteAuthorInput] = useState('');

  // Appearance Theme
  const [selectedTheme, setSelectedTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY_APP_ICON_THEME) || 'binance-gold';
    }
    return 'binance-gold';
  });

  // Sync display name input when user or profile is initially loaded
  const defaultInitialName = profile?.displayName || (user?.email ? user.email.split('@')[0] : '');
  const [hasUserEditedName, setHasUserEditedName] = useState(false);
  const effectiveDisplayName = hasUserEditedName ? displayNameInput : (displayNameInput || defaultInitialName);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  // Auth Handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPass) return triggerError('يرجى ملء جميع الحقول');
    setIsProcessing(true);
    try {
      await signInWithEmail(loginEmail, loginPass);
      triggerSuccess('تم تسجيل الدخول بنجاح! تم تفعيل المزامنة السحابية.');
      setLoginEmail('');
      setLoginPass('');
    } catch (err: any) {
      triggerError(err.message || 'فشل تسجيل الدخول، تحقق من البريد وكلمة المرور');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPass) return triggerError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
    if (regPass.length < 6) return triggerError('كلمة المرور يجب أن لا تقل عن 6 أحرف');
    setIsProcessing(true);
    try {
      await signUpWithEmail(regEmail, regPass, regName);
      triggerSuccess('تم إنشاء الحساب بنجاح! أهلاً بك.');
      setRegEmail('');
      setRegPass('');
      setRegName('');
    } catch (err: any) {
      triggerError(err.message || 'فشل إنشاء الحساب');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsProcessing(true);
    try {
      await signInWithGoogle();
      triggerSuccess('تم تسجيل الدخول بنجاح عبر Google.');
    } catch (err: any) {
      triggerError(err.message || 'تعذر تسجيل الدخول عبر Google');
    } finally {
      setIsProcessing(false);
    }
  };

  // Profile Handlers
  const handleSaveProfileName = async () => {
    const nameToSave = effectiveDisplayName.trim();
    if (!nameToSave) return triggerError('يرجى إدخال اسم مستعار صالح');
    setIsProcessing(true);
    try {
      await updateProfileDetails(nameToSave);
      triggerSuccess('تم تحديث الاسم المستعار بنجاح');
    } catch (err: any) {
      triggerError(err.message || 'تعذر تحديث الملف الشخصي');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectPresetAvatar = async (preset: typeof AVATAR_PRESETS[0]) => {
    setIsProcessing(true);
    try {
      const avatarVal = `preset:${preset.id}:${preset.emoji}`;
      await updateProfileDetails(displayNameInput || profile?.displayName || 'متداول', avatarVal);
      triggerSuccess(`تم اختيار صورة: ${preset.name}`);
    } catch (err: any) {
      triggerError(err.message || 'تعذر تحديث الصورة الرمزية');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      return triggerError('حجم الصورة يجب أن لا يتجاوز 2 ميجابايت');
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      if (base64) {
        setIsProcessing(true);
        try {
          await updateProfileDetails(displayNameInput || profile?.displayName || 'متداول', base64);
          triggerSuccess('تم رفع الصورة وتعيينها كأفاتار للملف الشخصي');
        } catch (err: any) {
          triggerError(err.message || 'فشل حفظ الصورة الشخصية');
        } finally {
          setIsProcessing(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    setIsProcessing(true);
    try {
      await removeAvatar();
      triggerSuccess('تم حذف الصورة الشخصية بنجاح والعودة للحالة الافتراضية');
    } catch (err: any) {
      triggerError(err.message || 'تعذر حذف الصورة الشخصية');
    } finally {
      setIsProcessing(false);
    }
  };

  // Security Handlers
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmNewPassword) {
      return triggerError('كلمات المرور الجديدة غير متطابقة أو فارغة');
    }
    if (newPassword.length < 6) {
      return triggerError('كلمة المرور يجب أن لا تقل عن 6 خانات');
    }
    setIsProcessing(true);
    try {
      await changePassword(newPassword);
      triggerSuccess('تم تغيير كلمة المرور بنجاح!');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      triggerError(err.message || 'تعذر تغيير كلمة المرور. قد تحتاج لتسجيل الدخول مجدداً أولاً لدواعي الأمان.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangeEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      return triggerError('يرجى إدخال بريد إلكتروني صالح');
    }
    setIsProcessing(true);
    try {
      await changeEmail(newEmail);
      triggerSuccess('تم تحديث البريد الإلكتروني بنجاح!');
      setNewEmail('');
    } catch (err: any) {
      triggerError(err.message || 'تعذر تحديث البريد الإلكتروني');
    } finally {
      setIsProcessing(false);
    }
  };

  // Sync Handlers
  const handlePushToCloud = async () => {
    if (!user) return triggerError('يجب تسجيل الدخول لمزامنة بياناتك مع السحابة');
    setIsProcessing(true);
    try {
      const res = await pushStateToCloud(user.uid);
      setLastSyncTime(res.timestamp);
      triggerSuccess('تمت المزامنة بنجاح! جميع خطوط الشارت والمذكرات والصفقات والإعدادات محفوظة في السحابة.');
    } catch (err: any) {
      triggerError(err.message || 'فشلت المزامنة إلى السحابة');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePullFromCloud = async () => {
    if (!user) return triggerError('يجب تسجيل الدخول لاسترجاع بياناتك من السحابة');
    if (!confirm('هل أنت متأكد من استرجاع البيانات من السحابة؟ سيتم استبدال البيانات المحلية بالنسخة السحابية المحفوظة.')) {
      return;
    }
    setIsProcessing(true);
    try {
      const res = await pullStateFromCloud(user.uid);
      setLastSyncTime(res.timestamp);
      triggerSuccess(`تم استرجاع البيانات السحابية بنجاح! (${res.keysRestored} مفتاح تمت استعادته).`);
    } catch (err: any) {
      triggerError(err.message || 'تعذر استرجاع البيانات من السحابة');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportBackup = () => {
    try {
      const jsonStr = exportLocalBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bot2_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      triggerSuccess('تم تحميل ملف النسخة الاحتياطية بنجاح على جهازك!');
    } catch (err: any) {
      triggerError('تعذر تصدير النسخة الاحتياطية');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const count = importLocalBackup(text);
        triggerSuccess(`تمت استعادة النسخة الاحتياطية بنجاح (${count} مفتاح بيانات).`);
      } catch (err: any) {
        triggerError('ملف النسخة الاحتياطية غير صالح أو تالف');
      }
    };
    reader.readAsText(file);
  };

  // Appearance / Theme Switcher
  const handleSelectTheme = (themeId: string) => {
    setSelectedTheme(themeId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_APP_ICON_THEME, themeId);
      // Dispatch custom event for app layout to catch theme change
      window.dispatchEvent(new CustomEvent('bot2_theme_changed', { detail: { themeId } }));
    }
    triggerSuccess(`تم تفعيل ثيم الأيقونة: ${APP_ICON_THEMES.find(t => t.id === themeId)?.name}`);
  };

  // Splash Quotes Handlers
  const handleSaveQuote = () => {
    if (!quoteTextInput.trim()) return triggerError('يرجى كتابة نص العبارة التحفيزية');
    let updated: SplashQuote[];
    if (editingQuoteId) {
      updated = quotesList.map((q) =>
        q.id === editingQuoteId
          ? { ...q, text: quoteTextInput.trim(), author: quoteAuthorInput.trim() || undefined }
          : q
      );
      setEditingQuoteId(null);
    } else {
      const newQuote: SplashQuote = {
        id: 'user_q_' + Date.now(),
        text: quoteTextInput.trim(),
        author: quoteAuthorInput.trim() || 'عبارة مخصصة',
      };
      updated = [newQuote, ...quotesList];
    }
    setQuotesList(updated);
    setQuoteTextInput('');
    setQuoteAuthorInput('');
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SPLASH_QUOTES, JSON.stringify(updated));
    }
    triggerSuccess('تم حفظ العبارة التحفيزية لشاشة الدخول');
  };

  const handleDeleteQuote = (id: string) => {
    const updated = quotesList.filter((q) => q.id !== id);
    setQuotesList(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SPLASH_QUOTES, JSON.stringify(updated));
    }
    triggerSuccess('تم حذف العبارة');
  };

  const handleResetQuotes = () => {
    setQuotesList(DEFAULT_SPLASH_QUOTES);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SPLASH_QUOTES, JSON.stringify(DEFAULT_SPLASH_QUOTES));
    }
    triggerSuccess('تمت استعادة العبارات التحفيزية الافتراضية');
  };

  const handleUpdateSplashSettings = (key: keyof SplashSettings, val: any) => {
    const updated = { ...splashSettings, [key]: val };
    setSplashSettings(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SPLASH_SETTINGS, JSON.stringify(updated));
    }
  };

  // Helper render for user avatar
  const renderCurrentAvatar = () => {
    const photo = profile?.photoURL || user?.photoURL;
    if (photo && photo.startsWith('preset:')) {
      const parts = photo.split(':');
      const emoji = parts[2] || '💎';
      return (
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center text-4xl shadow-xl border-2 border-amber-400/40">
          {emoji}
        </div>
      );
    } else if (photo) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt="Avatar"
          className="w-20 h-20 rounded-2xl object-cover shadow-xl border-2 border-amber-400/40"
        />
      );
    }
    return (
      <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-400 shadow-inner">
        <User className="w-8 h-8 text-slate-500 mb-1" />
        <span className="text-[10px]">بدون صورة</span>
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 text-slate-100" dir="rtl">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-600 p-0.5 shadow-lg flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white">إدارة الحساب والإعدادات الذكية</h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">
                PRO V2
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              الملف الشخصي، المصادقة السحابية، تخصيص شاشة السبلاش، وحفظ كامل بيئة التداول
            </p>
          </div>
        </div>

        {/* Cloud Connection Badge */}
        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-2xl shadow-inner">
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-xs font-semibold text-slate-200">
                {user ? (profile?.displayName || user.email) : 'وضع الضيف السريع (Guest)'}
              </span>
              <span className={`w-2 h-2 rounded-full ${user ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </div>
            <span className="text-[10px] text-slate-500 text-right">
              {user ? 'مزامنة سحابية فائقة الأمان نشطة' : 'البيانات تُحفظ محلياً على هذا الجهاز'}
            </span>
          </div>
          {user && (
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 transition cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs sm:text-sm flex items-center gap-2.5 shadow-lg animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 mb-6 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-inner">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <User className="w-4 h-4" />
          <span>الملف الشخصي والصورة</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === 'security'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>تسجيل الدخول والأمان</span>
        </button>

        <button
          onClick={() => setActiveTab('sync')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === 'sync'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span>المزامنة السحابية وقاعدة البيانات</span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === 'appearance'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>أيقونات ومظهر التطبيق</span>
        </button>

        <button
          onClick={() => setActiveTab('splash_quotes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === 'splash_quotes'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Quote className="w-4 h-4" />
          <span>عبارات شاشة الدخول (السبلاش)</span>
        </button>
      </div>

      {/* TAB 1: Profile & Avatar */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Avatar Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 flex flex-col items-center text-center shadow-xl">
            <div className="relative mb-4">
              {renderCurrentAvatar()}
              {user && (
                <button
                  onClick={handleRemoveAvatar}
                  disabled={isProcessing}
                  className="absolute -top-1 -right-1 p-1.5 rounded-full bg-red-600/90 hover:bg-red-500 text-white shadow-lg transition cursor-pointer"
                  title="حذف الصورة والعودة للافتراضي"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              {profile?.displayName || user?.displayName || 'متداول محترف'}
            </h3>
            <p className="text-xs text-slate-400 font-mono mb-4">
              {user?.email || 'وضع المتداول المستقل'}
            </p>

            <div className="w-full pt-4 border-t border-slate-800/80 flex flex-col gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => {
                  if (!user) return triggerError('يرجى تسجيل الدخول أولاً لتعديل وحفظ الصورة في ملفك');
                  fileInputRef.current?.click();
                }}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>رفع صورة من الجهاز / الهاتف</span>
              </button>

              <button
                onClick={handleRemoveAvatar}
                disabled={isProcessing || (!profile?.photoURL && !user?.photoURL)}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs font-semibold border border-red-500/20 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف الصورة الحالية</span>
              </button>
            </div>
          </div>

          {/* Edit Name & Pick Presets */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Display Name Edit Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-amber-400" />
                <span>تعديل الاسم المستعار</span>
              </h3>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <input
                  type="text"
                  value={effectiveDisplayName}
                  onChange={(e) => {
                    setDisplayNameInput(e.target.value);
                    setHasUserEditedName(true);
                  }}
                  placeholder="أدخل اسمك المستعار..."
                  className="w-full flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
                <button
                  onClick={handleSaveProfileName}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition cursor-pointer"
                >
                  حفظ الاسم
                </button>
              </div>
            </div>

            {/* Presets Library */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>مكتبة الصور الرمزية الجاهزة للمتداولين</span>
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                اختر شارة تعبر عن نمط تداولك بضغطة زر واحدة دون الحاجة لرفع صور
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AVATAR_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (!user) return triggerError('يرجى تسجيل الدخول أولاً لحفظ صورتك في السحابة');
                      handleSelectPresetAvatar(p);
                    }}
                    disabled={isProcessing}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/80 hover:border-amber-500/40 text-right transition group cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${p.color} flex items-center justify-center text-xl shadow-md group-hover:scale-105 transition`}>
                      {p.emoji}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-200 group-hover:text-amber-400 transition">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-slate-500">شارة مميزة</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Authentication & Security */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1: Auth Status / Sign In / Register */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            {user ? (
              <div>
                <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/20">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">أنت مسجل الدخول حالياً</h4>
                    <p className="text-xs text-emerald-400 font-mono mt-0.5">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-slate-300">
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">معرف المستخدم (UID):</span>
                    <span className="font-mono text-slate-300">{user.uid.slice(0, 16)}...</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-800">
                    <span className="text-slate-400">حالة التحقق من البريد:</span>
                    <span className={user.emailVerified ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                      {user.emailVerified ? 'موثق ✓' : 'غير موثق (يعمل بكفاءة)'}
                    </span>
                  </div>
                </div>

                <div className="mt-8">
                  <button
                    onClick={logout}
                    disabled={isProcessing}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-600/90 hover:bg-red-500 text-white font-bold text-xs sm:text-sm shadow-lg transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>تسجيل الخروج من الحساب</span>
                  </button>
                  <p className="text-[11px] text-slate-500 text-center mt-2">
                    البيانات المحفوظة في المتصفح ستبقى آمنة وتستطيع المتابعة كضيف
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAuthMode('login')}
                      className={`text-sm font-bold px-3 py-1.5 rounded-xl transition cursor-pointer ${
                        authMode === 'login' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'text-slate-400'
                      }`}
                    >
                      تسجيل الدخول
                    </button>
                    <button
                      onClick={() => setAuthMode('register')}
                      className={`text-sm font-bold px-3 py-1.5 rounded-xl transition cursor-pointer ${
                        authMode === 'register' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'text-slate-400'
                      }`}
                    >
                      إنشاء حساب جديد
                    </button>
                  </div>
                  <span className="text-xs text-slate-500">حساب سحابي مجاني</span>
                </div>

                {authMode === 'login' ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">البريد الإلكتروني</label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-3 w-4 h-4 text-slate-500" />
                        <input
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="trader@example.com"
                          className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">كلمة المرور</label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-3 w-4 h-4 text-slate-500" />
                        <input
                          type={showPass ? 'text' : 'password'}
                          required
                          value={loginPass}
                          onChange={(e) => setLoginPass(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pr-10 pl-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute left-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition cursor-pointer"
                    >
                      {isProcessing ? 'جاري الدخول...' : 'تسجيل الدخول'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegisterSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">الاسم المستعار</label>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="اسم المتداول"
                        className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">البريد الإلكتروني</label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="trader@example.com"
                        className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">كلمة المرور (6 خانات فأكثر)</label>
                      <input
                        type="password"
                        required
                        value={regPass}
                        onChange={(e) => setRegPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition cursor-pointer"
                    >
                      {isProcessing ? 'جاري إنشاء الحساب...' : 'إنشاء حساب جديد'}
                    </button>
                  </form>
                )}

                <div className="relative my-4 text-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-800" />
                  </div>
                  <span className="relative px-3 bg-slate-900 text-[10px] text-slate-500">أو عبر المنصات الموثوقة</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isProcessing}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>تسجيل الدخول بنقرة واحدة عبر Google</span>
                </button>
              </div>
            )}
          </div>

          {/* Card 2: Password and Email Update */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>تغيير كلمة المرور</span>
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                قم بتعيين كلمة مرور جديدة قوية لحماية حسابك
              </p>

              <form onSubmit={handleChangePasswordSubmit} className="space-y-3">
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة (6 أحرف فأكثر)"
                  className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="تأكيد كلمة المرور الجديدة"
                  className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !user}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer disabled:opacity-40"
                >
                  تحديث كلمة المرور
                </button>
              </form>
            </div>

            <div className="pt-4 border-t border-slate-800/80">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-400" />
                <span>تحديث البريد الإلكتروني</span>
              </h3>
              <form onSubmit={handleChangeEmailSubmit} className="space-y-3">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="البريد الإلكتروني الجديد..."
                  className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !user}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer disabled:opacity-40"
                >
                  تحديث البريد
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Cloud Sync & Architecture */}
      {activeTab === 'sync' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Sync Controls */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-amber-400" />
                  <span>المزامنة السحابية الفائقة</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  حفظ دائم واسترجاع فوري لجميع إعدادات التداول وخطوط الشارت والصفقات
                </p>
              </div>

              <div className="text-left font-mono text-[11px] bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block">آخر مزامنة:</span>
                <span className="text-amber-400 font-bold">
                  {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString('ar-SA') : 'لم تتم بعد'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handlePushToCloud}
                disabled={isProcessing || !user}
                className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-b from-amber-500/10 to-amber-600/5 hover:from-amber-500/20 hover:to-amber-600/10 border border-amber-500/30 text-center transition group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition shadow-md">
                  <CloudUpload className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-white mb-1">مزامنة الآن إلى السحابة ☁️</span>
                <span className="text-[11px] text-slate-400 leading-snug">
                  يرفع جميع خطوط الشارت والمذكرات والصفقات الحالية إلى قاعدة البيانات
                </span>
              </button>

              <button
                onClick={handlePullFromCloud}
                disabled={isProcessing || !user}
                className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-b from-blue-500/10 to-indigo-600/5 hover:from-blue-500/20 hover:to-indigo-600/10 border border-blue-500/30 text-center transition group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-110 transition shadow-md">
                  <CloudDownload className="w-6 h-6" />
                </div>
                <span className="text-sm font-bold text-white mb-1">استرجاع من السحابة 🔄</span>
                <span className="text-[11px] text-slate-400 leading-snug">
                  استعادة النسخة السحابية المحفوظة إلى هذا المتصفح فورياً
                </span>
              </button>
            </div>

            {/* Offline JSON Backup */}
            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-2">
                <FolderUp className="w-4 h-4 text-emerald-400" />
                <span>النسخ الاحتياطي المحلي اليدوي (ملف JSON)</span>
              </h4>
              <p className="text-[11px] text-slate-400 mb-4">
                تستطيع دائماً حفظ ملف نسخة احتياطية على جهازك دون اتصال، واستيراده في أي وقت:
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleExportBackup}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>تصدير نسخة احتياطية (JSON)</span>
                </button>

                <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer">
                  <FolderUp className="w-3.5 h-3.5 text-blue-400" />
                  <span>استيراد نسخة احتياطية</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Architecture Benefits Explanation Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white mb-2">معمارية التخزين الهجين (Local-First)</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                صممت هذه البنية خصيصاً لحماية حسابك من التوقف أو انتهاء الحصص المجانية:
              </p>

              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span><strong>سرعة استجابة 0ms</strong>: جميع الشاشات تقرأ وتكتب محلياً بلحظية تامة.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span><strong>أقل من 0.05% استهلاك</strong>: المزامنة السحابية تتم بشكل مجمّع عند الحاجة فقط، مما يمنع تجاوز الحد المجاني نهائياً.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  <span><strong>تشفير وخصوصية تامة</strong>: وثائقك السحابية مرتبطة برقم حسابك ولا يستطيع أحد الوصول إليها.</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 text-[10px] text-slate-500 text-center">
              قاعدة البيانات المهيأة: Google Cloud Firestore (Enterprise v2)
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Appearance & App Icons */}
      {activeTab === 'appearance' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-400" />
              <span>تخصيص أيقونات وثيم التطبيق</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              اختر الهوية البصرية المفضلة للأيقونات والشارات وشريط التداول
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {APP_ICON_THEMES.map((theme) => {
              const isSelected = selectedTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handleSelectTheme(theme.id)}
                  className={`flex flex-col p-5 rounded-2xl border text-right transition group cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-slate-800/90 border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 left-3 w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-bold shadow">
                      ✓
                    </div>
                  )}

                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg mb-4"
                    style={{ backgroundColor: `${theme.primary}20`, border: `1.5px solid ${theme.primary}50` }}
                  >
                    <Flame className="w-6 h-6" style={{ color: theme.primary }} />
                  </div>

                  <span className="text-sm font-bold text-white mb-1">{theme.name}</span>
                  <span className="text-xs text-slate-400 leading-snug">{theme.desc}</span>
                </button>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>تنبيه فني</strong>: في أنظمة الهواتف الحديثة (PWA)، يتم تطبيق الثيم على الشارات والأيقونات العائمة وشريط العنوان والـ Favicon فورياً.
            </span>
          </div>
        </div>
      )}

      {/* TAB 5: Splash Screen Quotes Manager */}
      {activeTab === 'splash_quotes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add / Edit Form */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Quote className="w-4 h-4 text-amber-400" />
              <span>{editingQuoteId ? 'تعديل عبارة تحفيزية' : 'إضافة عبارة تحفيزية جديدة'}</span>
            </h3>
            <p className="text-xs text-slate-400">
              تظهر هذه العبارات تلقائياً في شاشة الدخول (السبلاش) لتثبيت الانضباط النفسي
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">نص الحكمة أو العبارة</label>
              <textarea
                rows={3}
                value={quoteTextInput}
                onChange={(e) => setQuoteTextInput(e.target.value)}
                placeholder="اكتب العبارة هنا..."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">التصنيف أو الكاتب (اختياري)</label>
              <input
                type="text"
                value={quoteAuthorInput}
                onChange={(e) => setQuoteAuthorInput(e.target.value)}
                placeholder="مثال: حكمة سكالبينج، إدارة مخاطر..."
                className="w-full px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSaveQuote}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition cursor-pointer"
              >
                {editingQuoteId ? 'تحديث العبارة' : 'إضافة العبارة'}
              </button>
              {editingQuoteId && (
                <button
                  onClick={() => {
                    setEditingQuoteId(null);
                    setQuoteTextInput('');
                    setQuoteAuthorInput('');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                >
                  إلغاء
                </button>
              )}
            </div>

            {/* Splash Screen Duration & Behaviour Controls */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>إعدادات شاشة الدخول</span>
              </h4>

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>تفعيل شاشة السبلاش:</span>
                <input
                  type="checkbox"
                  checked={splashSettings.enabled}
                  onChange={(e) => handleUpdateSplashSettings('enabled', e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>المدة القصوى (ثواني):</span>
                <select
                  value={splashSettings.durationSeconds}
                  onChange={(e) => handleUpdateSplashSettings('durationSeconds', Number(e.target.value))}
                  className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-amber-400 font-bold"
                >
                  <option value={2}>2 ثواني</option>
                  <option value={3}>3 ثواني</option>
                  <option value={4}>4 ثواني (الموصى به)</option>
                  <option value={6}>6 ثواني</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>إخفاء فوري عند اكتمال التحميل:</span>
                <input
                  type="checkbox"
                  checked={splashSettings.autoDismissOnReady}
                  onChange={(e) => handleUpdateSplashSettings('autoDismissOnReady', e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Quotes List Table */}
          <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-white">العبارات المسجلة حالياً ({quotesList.length})</h4>
                  <p className="text-xs text-slate-400">تُعرض بشكل عشوائي ومتحرك عند فتح التطبيق</p>
                </div>
                <button
                  onClick={handleResetQuotes}
                  className="text-xs text-slate-400 hover:text-amber-400 underline transition cursor-pointer"
                >
                  استعادة الافتراضية
                </button>
              </div>

              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {quotesList.map((q) => (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-start justify-between gap-3 group hover:border-slate-700 transition"
                  >
                    <div className="flex items-start gap-2.5">
                      <Quote className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                          &ldquo;{q.text}&rdquo;
                        </p>
                        {q.author && (
                          <span className="text-[11px] text-amber-400/80 block mt-1 font-mono">
                            — {q.author}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => {
                          setEditingQuoteId(q.id);
                          setQuoteTextInput(q.text);
                          setQuoteAuthorInput(q.author || '');
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                        title="تعديل"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuote(q.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition cursor-pointer"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
              * العبارات محفوظة محلياً وتُرفع تلقائياً للسحابة مع النسخة الاحتياطية.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
