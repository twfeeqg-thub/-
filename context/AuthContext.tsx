'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updatePassword as fbUpdatePassword, 
  updateEmail as fbUpdateEmail,
  updateProfile as fbUpdateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';

export interface UserProfileData {
  displayName: string;
  photoURL: string;
  email: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfileData | null;
  loading: boolean;
  isGuest: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (newPass: string) => Promise<void>;
  changeEmail: (newEmail: string) => Promise<void>;
  updateProfileDetails: (name: string, photo?: string) => Promise<void>;
  removeAvatar: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = async (currentUser: User) => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfileData;
        setProfile(data);
      } else {
        const defaultProfile: UserProfileData = {
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'متداول',
          photoURL: currentUser.photoURL || '',
          email: currentUser.email || '',
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userRef, defaultProfile);
        setProfile(defaultProfile);
      }
    } catch (err) {
      console.warn('Profile fetch warning (fallback to user object):', err);
      setProfile({
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'متداول',
        photoURL: currentUser.photoURL || '',
        email: currentUser.email || '',
        updatedAt: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    await fetchProfile(cred.user);
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    if (name) {
      await fbUpdateProfile(cred.user, { displayName: name.trim() });
    }
    const newProfile: UserProfileData = {
      displayName: name?.trim() || email.split('@')[0],
      photoURL: '',
      email: cred.user.email || email.trim(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'users', cred.user.uid), newProfile);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${cred.user.uid}`);
    }
    setProfile(newProfile);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    await fetchProfile(cred.user);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  const changePassword = async (newPass: string) => {
    if (!auth.currentUser) throw new Error('لا يوجد مستخدم مسجل حالياً');
    await fbUpdatePassword(auth.currentUser, newPass);
  };

  const changeEmail = async (newEmail: string) => {
    if (!auth.currentUser) throw new Error('لا يوجد مستخدم مسجل حالياً');
    await fbUpdateEmail(auth.currentUser, newEmail.trim());
    if (profile) {
      const updated: UserProfileData = {
        ...profile,
        email: newEmail.trim(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', auth.currentUser.uid), updated);
      setProfile(updated);
    }
  };

  const updateProfileDetails = async (name: string, photo?: string) => {
    if (!auth.currentUser) throw new Error('يجب تسجيل الدخول أولاً لتعديل الملف الشخصي');
    await fbUpdateProfile(auth.currentUser, {
      displayName: name,
      photoURL: photo !== undefined ? photo : auth.currentUser.photoURL,
    });
    const updated: UserProfileData = {
      displayName: name,
      photoURL: photo !== undefined ? photo : (profile?.photoURL || ''),
      email: auth.currentUser.email || profile?.email || '',
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), updated);
      setProfile(updated);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `users/${auth.currentUser.uid}`);
    }
  };

  const removeAvatar = async () => {
    await updateProfileDetails(profile?.displayName || auth.currentUser?.displayName || 'متداول', '');
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await fetchProfile(auth.currentUser);
    }
  };

  const isGuest = !user;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isGuest,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        logout,
        changePassword,
        changeEmail,
        updateProfileDetails,
        removeAvatar,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
