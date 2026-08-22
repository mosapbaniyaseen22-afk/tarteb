'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from './supabase';
import type { Profile, UserSubject } from './supabase';
import { googleAuthErrorMessage, signOutUser } from './firebase';
import { PROFILE_STORAGE_KEY, buildUserSubjects, clearGuestData, guestStore } from './guest-db';
import { markSubscriberLoggedOut, pingSubscriberPresence, resumeSubscriberPresence } from './subscriber-presence';
import { FIRST_YEAR_SUBJECTS, normalizeTawjihiStage, pickCatalogSubjectIds, type TawjihiStage } from './utils';

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
  allUserSubjects: UserSubject[];
  loading: boolean;
  signingIn: boolean;
  signInWithGoogle: (options?: { selectAccount?: boolean }) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  profileLoaded: boolean;
  refreshProfile: () => Promise<void>;
  saveProfile: (profile: Profile) => Promise<void>;
  saveSubjects: (names: string[], stage?: string | null, field?: string | null) => Promise<UserSubject[]>;
  enrolledStages: TawjihiStage[];
  switchStage: (stage: TawjihiStage) => Promise<void>;
};

export { PROFILE_STORAGE_KEY, buildUserSubjects };

export function isReturningStudent(profile: Profile | null, subjects: UserSubject[] = []): boolean {
  if (profile?.onboarding_complete) return true;
  if (profile?.stage?.trim()) return true;
  return subjects.length > 0;
}

function tagSubjects(rows: UserSubject[], fallback: TawjihiStage): UserSubject[] {
  return rows.map((row) => ({
    ...row,
    stage: normalizeTawjihiStage(row.stage, fallback),
  }));
}

function stagesOf(rows: UserSubject[]): TawjihiStage[] {
  const stages: TawjihiStage[] = [];
  for (const row of rows) {
    const stage = normalizeTawjihiStage(row.stage);
    if (!stages.includes(stage)) stages.push(stage);
  }
  return stages;
}

function subjectsForStage(rows: UserSubject[], stage: TawjihiStage): UserSubject[] {
  return rows.filter((row) => normalizeTawjihiStage(row.stage) === stage);
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function emailAuthErrorMessage(err: unknown) {
  const message = err && typeof err === 'object' && 'message' in err
    ? String((err as { message: string }).message)
    : '';
  const lower = message.toLowerCase();
  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'البريد أو كلمة السر غير صحيحة. إذا سجّلت عبر جوجل استخدم زر جوجل';
  }
  if (lower.includes('already registered') || lower.includes('already been registered')) {
    return 'هذا البريد مسجّل مسبقاً، سجّل الدخول';
  }
  if (lower.includes('password')) {
    return 'كلمة السر يجب أن تكون 6 أحرف على الأقل';
  }
  if (lower.includes('unable to validate email') || lower.includes('invalid email')) {
    return 'أدخل بريداً إلكترونياً صحيحاً';
  }
  return message || 'تعذر إكمال العملية، حاول مرة أخرى';
}

function mapAuthUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): AuthUser {
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: String(user.email || meta.email || ''),
    full_name: String(meta.full_name || meta.name || user.email?.split('@')[0] || 'طالب'),
    avatar_url: (meta.avatar_url as string | undefined) || (meta.picture as string | undefined) || null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userSubjects, setUserSubjects] = useState<UserSubject[]>([]);
  const [allUserSubjects, setAllUserSubjects] = useState<UserSubject[]>([]);
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

      const fallbackStage = normalizeTawjihiStage(nextProfile?.stage);
      const tagged = tagSubjects(nextSubjects, fallbackStage);
      setProfile(nextProfile);
      if (nextProfile) guestStore.setProfile(nextProfile);
      setAllUserSubjects(tagged);
      setUserSubjects(subjectsForStage(tagged, fallbackStage));
      if (tagged.length) guestStore.setSubjects(tagged);
    } catch (err) {
      console.error(err);
      const guest = guestStore.getProfile();
      setProfile(guest?.id === userId ? guest : null);
      const guestRows = tagSubjects(
        guestStore.getSubjects().filter((item) => item.user_id === userId),
        normalizeTawjihiStage(guest?.stage),
      );
      setAllUserSubjects(guestRows);
      setUserSubjects(subjectsForStage(guestRows, normalizeTawjihiStage(guest?.stage)));
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

  const signInWithEmail = async (email: string, password: string) => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
    } catch (err) {
      toast.error(emailAuthErrorMessage(err));
      throw err;
    } finally {
      setSigningIn(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() || 'طالب' },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
      if (!data.session) {
        toast.success('تم إنشاء الحساب. إذا طُلب تأكيد البريد، تحقق من صندوق الوارد ثم سجّل الدخول.');
      }
    } catch (err) {
      toast.error(emailAuthErrorMessage(err));
      throw err;
    } finally {
      setSigningIn(false);
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
    const targetStage = normalizeTawjihiStage(stage ?? profile?.stage);
    const local = buildUserSubjects(names, user.id, targetStage, field ?? profile?.study_field ?? null);
    const others = guestStore
      .getSubjects()
      .filter((item) => item.user_id === user.id && normalizeTawjihiStage(item.stage) !== targetStage);
    const mergedLocal = [...others, ...local];
    guestStore.setSubjects(mergedLocal);

    const { data: catalog } = await supabase.from('subjects').select('*');
    const matchedIds = pickCatalogSubjectIds(
      (catalog ?? []) as { id: string; name_ar: string; stage?: string | null; field?: string | null }[],
      names,
      targetStage,
      field ?? profile?.study_field ?? null,
    );

    if (matchedIds.length > 0) {
      await supabase.from('user_subjects').delete().eq('user_id', user.id).eq('stage', targetStage);
      const { error } = await supabase.from('user_subjects').insert(
        matchedIds.map((subject_id) => ({ user_id: user.id, subject_id, stage: targetStage })),
      );
      if (error) {
        console.error(error);
        setAllUserSubjects(mergedLocal);
        setUserSubjects(subjectsForStage(mergedLocal, normalizeTawjihiStage(profile?.stage, targetStage)));
        return subjectsForStage(mergedLocal, targetStage);
      }
      const { data } = await supabase.from('user_subjects').select('*, subjects(*)').eq('user_id', user.id);
      const next = tagSubjects((data as UserSubject[] | null) ?? mergedLocal, targetStage);
      guestStore.setSubjects(next);
      setAllUserSubjects(next);
      setUserSubjects(subjectsForStage(next, normalizeTawjihiStage(profile?.stage, targetStage)));
      return subjectsForStage(next, targetStage);
    }

    setAllUserSubjects(mergedLocal);
    setUserSubjects(subjectsForStage(mergedLocal, normalizeTawjihiStage(profile?.stage, targetStage)));
    return local;
  };

  const switchStage = async (stage: TawjihiStage) => {
    if (!user || !profile) return;
    if (!stagesOf(allUserSubjects).includes(stage) && stage === 'tawjihi_first') {
      await saveSubjects(FIRST_YEAR_SUBJECTS, 'tawjihi_first', profile.study_field);
    }
    const nextProfile = { ...profile, stage, updated_at: new Date().toISOString() };
    await saveProfile(nextProfile);
    const latest = tagSubjects(
      guestStore.getSubjects().filter((item) => item.user_id === user.id),
      stage,
    );
    setAllUserSubjects(latest);
    setUserSubjects(subjectsForStage(latest, stage));
  };

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('labib-skip-auto-google', '1');
    }
    await markSubscriberLoggedOut();
    await signOutUser();
    clearGuestData();
    setUser(null);
    setProfile(null);
    setUserSubjects([]);
    setAllUserSubjects([]);
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
        setAllUserSubjects([]);
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

  useEffect(() => {
    if (!user) return;
    resumeSubscriberPresence();
    void pingSubscriberPresence({
      name: profile?.full_name || user.full_name,
      email: user.email,
      avatarUrl: user.avatar_url,
      stage: profile?.stage ?? null,
    });
  }, [user, profile?.full_name, profile?.stage]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        userSubjects,
        allUserSubjects,
        loading,
        signingIn,
        profileLoaded,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        refreshProfile,
        saveProfile,
        saveSubjects,
        enrolledStages: stagesOf(allUserSubjects),
        switchStage,
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
