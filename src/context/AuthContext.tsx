import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import type { UserProfile, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { dataService, isUsingDemoMode, setDemoModeOverride } from '../lib/dataService';
import { INITIAL_USERS } from '../lib/mockData';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isDemoMode: boolean;
  login: (email: string, password?: string) => Promise<void>;
  quickLoginAs: (targetRole: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  toggleDemoMode: (enabled: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_STORAGE_KEY = 'pemira_auth_current_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(isUsingDemoMode());
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user]);

  // Hanya ganti objek user bila isinya benar-benar berubah, supaya halaman
  // yang bergantung pada `user` tidak memuat ulang data/form setiap kali tab difokuskan.
  const applyProfile = (profile: UserProfile) =>
    setUser((prev) => (prev && JSON.stringify(prev) === JSON.stringify(profile) ? prev : profile));

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const demo = isUsingDemoMode();
        setIsDemoMode(demo);

        if (demo) {
          // Check local stored session
          const stored = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
          if (stored) {
            setUser(JSON.parse(stored));
          } else {
            // Default to Admin in demo mode for instant ease of testing
            setUser(INITIAL_USERS[0]);
            localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(INITIAL_USERS[0]));
          }
        } else {
          // Live Supabase Auth
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              setUser(profile as UserProfile);
            }
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen to Supabase auth changes if not in demo mode
    if (!isUsingDemoMode()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        // Sesi awal ditangani initAuth; refresh token tidak mengubah profil.
        if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
        // Supabase mengirim SIGNED_IN lagi setiap tab difokuskan: abaikan bila user sama.
        if (event === 'SIGNED_IN' && session?.user && session.user.id === userIdRef.current) return;

        // Jangan await panggilan Supabase langsung di dalam callback (bisa deadlock).
        setTimeout(async () => {
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            if (profile) applyProfile(profile as UserProfile);
          } else {
            setUser(null);
          }
        }, 0);
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    try {
      if (isDemoMode) {
        const users = await dataService.getUsers();
        const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (!found) {
          throw new Error('Pengguna dengan email ini tidak ditemukan pada data demo.');
        }
        if (!found.is_active) {
          throw new Error('Akun ini sedang dinonaktifkan oleh administrator.');
        }
        setUser(found);
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(found));
        await dataService.logActivity('LOGIN', 'user', found.id, { email: found.email }, found);
      } else {
        if (!password) throw new Error('Kata sandi wajib diisi.');
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw new Error(error.message);
        if (data.user) {
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();
          if (profileErr) throw new Error('Profil pengguna tidak ditemukan.');
          setUser(profile as UserProfile);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const quickLoginAs = async (targetRole: UserRole) => {
    // Akses cepat hanya tersedia saat Mode Demo aktif
    if (!isDemoMode) return;
    setIsLoading(true);
    try {
      const users = await dataService.getUsers();
      const targetUser = users.find((u) => u.role === targetRole && u.is_active) || users[0];
      setUser(targetUser);
      localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(targetUser));
      await dataService.logActivity('LOGIN_QUICK_SWITCH', 'user', targetUser.id, { role: targetRole }, targetUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (!isDemoMode) {
        await supabase.auth.signOut();
      }
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDemoMode = (enabled: boolean) => {
    setDemoModeOverride(enabled);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAuthenticated: Boolean(user),
        isLoading,
        isDemoMode,
        login,
        quickLoginAs,
        logout,
        toggleDemoMode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

