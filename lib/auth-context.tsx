'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from './supabase';
import type { Profile, UserSubject } from './supabase';
import { googleAuthErrorMessage, signOutUser } from './firebase';
import { PROFILE_STORAGE_KEY, buildUserSubjects, clearGuestData, guestStore } from './guest-db';

type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  profile: Profile | null;
  userSubjects: UserSubject[];
  loading: boolean;
  signingIn: boolean;
  signInWithGoogle: (options?: { selectAccount?: boolean }) => Promise<void>;
  signOut: () => Promise<void>;
  profileLoaded: boolean;
  refreshProfile: () => Promise<void>;
  saveProfile: (profile: Profile) => Promise<void>;
  saveSubjects: (names: string[], stage?: string | null, field?: string | null) => Promise<UserSubject[]>;
};

export { PROFILE_STORAGE_KEY, buildUserSubjects };

export function isReturningStudent(profile: Profile | null, subjects: UserSubject[] = []): boolean {
  if (profile?.onboarding_complete) return true;
  if (profile?.stage?.trim()) return true;
  return subjects.length > 0;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapAuthUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): AuthUser {
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? '',
    full_name: String(meta.full_name || meta.name || user.email?.split('@')[0] || 'طالب'),
    avatar_url: (meta.avatar_url as string | undefined) || (meta.picture as string | undefined) || null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userSubjects, setUserSubjects] = useState<UserSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const loadProfile = async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      const guest = guestStore.getProfile();
      let nextProfile = (data as Profile | null) ?? (guest?.id === userId ? guest : null);

      const { data: subjects } = await supabase
        .from('user_subjects')
        .select('*, subjects(*)')
        .eq('user_id', userId);
      const cloudSubjects = (subjects as UserSubject[] | null) ?? [];
      const guestSubjects = guestStore.getSubjects().filter((item) => item.user_id === userId);
      const nextSubjects = cloudSubjects.length ? cloudSubjects : guestSubjects;

      if (nextProfile && !nextProfile.onboarding_complete && isReturningStudent(nextProfile, nextSubjects)) {
        nextProfile = { ...nextProfile, onboarding_complete: true, updated_at: new Date().toISOString() };
        void supabase.from('profiles').update({
          onboarding_complete: true,
          updated_at: nextProfile.updated_at,
        }).eq('id', userId);
      }

      setProfile(nextProfile);
      if (nextProfile) guestStore.setProfile(nextProfile);
      setUserSubjects(nextSubjects);
      if (nextSubjects.length) guestStore.setSubjects(nextSubjects);
    } catch (err) {
      console.error(err);
      const guest = guestStore.getProfile();
      setProfile(guest?.id === userId ? guest : null);
      setUserSubjects(guestStore.getSubjects().filter((item) => item.user_id === userId));
    }
  };

  const signInWithGoogle = async (options?: { selectAccount?: boolean }) => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      const oauth = supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
          queryParams: options?.selectAccount ? { prompt: 'select_account' } : undefined,
        },
      });

      const timeout = new Promise<never>((_, reject) => {
        window.setTimeout(() => {
          reject(new Error('انتهت مهلة الاتصال بخدمة تسجيل الدخول. حاول مرة أخرى.'));
        }, 15000);
      });

      const { data, error } = await Promise.race([oauth, timeout]);

      if (data?.url) {
        window.location.assign(data.url);
        return;
      }

      if (error) {
        throw error;
      }

      throw new Error('لم يتم إنشاء رابط تسجيل الدخول بجوجل.');
    } catch (err) {
      setSigningIn(false);
      toast.error(googleAuthErrorMessage(err));
      throw err;
    }
  };

  const refreshProfile = async () => {
    if (!user) {
      setProfile(guestStore.getProfile());
      setUserSubjects(guestStore.getSubjects());
      return;
    }
    await loadProfile(user.id);
  };

  const saveProfile = async (nextProfile: Profile) => {
    guestStore.setProfile(nextProfile);
    setProfile(nextProfile);
    const { error } = await supabase.from('profiles').upsert(nextProfile);
    if (error) {
      console.error(error);
      toast.error('تعذر حفظ الملف على السحابة، تم الحفظ محلياً');
    }
  };

  const saveSubjects = async (names: string[], stage?: string | null, field?: string | null) => {
    if (!user) return [];

    const local = buildUserSubjects(names, user.id, stage ?? profile?.stage ?? null, field ?? profile?.study_field ?? null);
    guestStore.setSubjects(local);

    const { data: catalog } = await supabase.from('subjects').select('*');
    const matchedIds = (catalog ?? [])
      .filter((subject) => names.includes((subject as { name_ar: string }).name_ar))
      .map((subject) => (subject as { id: string }).id);

    if (matchedIds.length > 0) {
      await supabase.from('user_subjects').delete().eq('user_id', user.id);
      const { error } = await supabase.from('user_subjects').insert(
        matchedIds.map((subject_id) => ({ user_id: user.id, subject_id })),
      );
      if (error) {
        console.error(error);
        setUserSubjects(local);
        return local;
      }
      const { data } = await supabase.from('user_subjects').select('*, subjects(*)').eq('user_id', user.id);
      const next = (data as UserSubject[] | null) ?? local;
      guestStore.setSubjects(next);
      setUserSubjects(next);
      return next;
    }

    setUserSubjects(local);
    return local;
  };

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('labib-skip-auto-google', '1');
    }
    await signOutUser();
    clearGuestData();
    setUser(null);
    setProfile(null);
    setUserSubjects([]);
  };

  useEffect(() => {
    let cancelled = false;
    let generation = 0;

    const applySession = async (sessionUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null) => {
      const current = ++generation;
      if (!sessionUser) {
        setUser(null);
        setProfile(null);
        setUserSubjects([]);
        if (!cancelled && current === generation) {
          setProfileLoaded(true);
          setLoading(false);
        }
        return;
      }

      setUser(mapAuthUser(sessionUser));
      setLoading(true);
      setProfileLoaded(false);
      await loadProfile(sessionUser.id);
      if (cancelled || current !== generation) return;
      setProfileLoaded(true);
      setLoading(false);
    };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return;
      // Never await inside this callback — it can deadlock the auth client lock.
      window.setTimeout(() => {
        if (cancelled) return;
        void applySession(session?.user ?? null);
      }, 0);
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        userSubjects,
        loading,
        signingIn,
        profileLoaded,
        signInWithGoogle,
        signOut,
        refreshProfile,
        saveProfile,
        saveSubjects,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
