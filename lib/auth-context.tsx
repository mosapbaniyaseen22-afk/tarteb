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
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  saveProfile: (profile: Profile) => Promise<void>;
  saveSubjects: (names: string[], stage?: string | null, field?: string | null) => Promise<UserSubject[]>;
};

export { PROFILE_STORAGE_KEY, buildUserSubjects };

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

  const loadProfile = async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      const nextProfile = (data as Profile | null) ?? guestStore.getProfile();
      setProfile(nextProfile);
      if (nextProfile) guestStore.setProfile(nextProfile);

      const { data: subjects } = await supabase
        .from('user_subjects')
        .select('*, subjects(*)')
        .eq('user_id', userId);
      const nextSubjects = (subjects as UserSubject[] | null)?.length
        ? (subjects as UserSubject[])
        : guestStore.getSubjects();
      setUserSubjects(nextSubjects);
      if (nextSubjects.length) guestStore.setSubjects(nextSubjects);
    } catch (err) {
      console.error(err);
      setProfile(guestStore.getProfile());
      setUserSubjects(guestStore.getSubjects());
    }
  };

  const signInWithGoogle = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      const oauth = supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: true,
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

    const applySession = async (sessionUser: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null) => {
      if (!sessionUser) {
        setUser(null);
        setProfile(null);
        setUserSubjects([]);
        setLoading(false);
        return;
      }

      setUser(mapAuthUser(sessionUser));
      setLoading(true);
      await Promise.race([
        loadProfile(sessionUser.id),
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, 4000);
        }),
      ]);
      if (!cancelled) setLoading(false);
    };

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      await applySession(data.session?.user ?? null);
    };

    void init();

    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;
      await applySession(session?.user ?? null);
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
