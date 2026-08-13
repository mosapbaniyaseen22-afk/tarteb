'use client';

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { supabase, isLocalSupabase } from './supabase';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
);

const app = firebaseEnabled
  ? getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0]
  : null;

export const auth = app ? getAuth(app) : null;

export type LabibUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
};

function toLabibUser(user: User): LabibUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

export function subscribeToFirebaseAuth(callback: (user: LabibUser | null) => void) {
  if (!auth) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(auth, (user) => {
    callback(user ? toLabibUser(user) : null);
  });
}

export const signInWithGoogle = async (): Promise<LabibUser> => {
  if (!auth || !firebaseEnabled) {
    throw new Error('Firebase is not configured');
  }

  const provider = new GoogleAuthProvider();

  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const googleIdToken = credential?.idToken;
  const googleAccessToken = credential?.accessToken;

  if (isLocalSupabase) {
    await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: googleIdToken || 'firebase-local',
      access_token: googleAccessToken,
      user: {
        id: user.uid,
        email: user.email,
        user_metadata: {
          full_name: user.displayName,
          avatar_url: user.photoURL,
        },
      },
    } as never);
  } else if (googleIdToken) {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: googleIdToken,
      access_token: googleAccessToken,
    });
    if (error) {
      console.warn('Supabase Google token exchange failed, using Firebase session', error.message);
    }
  }

  return toLabibUser(user);
};

export const signOutUser = async () => {
  if (auth) {
    await firebaseSignOut(auth);
  }
  await supabase.auth.signOut();
};

export function googleAuthErrorMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: string }).code)
      : '';

  const message =
    error instanceof Error && error.message
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: string }).message)
        : '';

  if (
    message.includes('Unsupported provider') ||
    message.includes('not enabled') ||
    (message.toLowerCase().includes('provider') && message.toLowerCase().includes('disabled'))
  ) {
    return 'جوجل غير مفعّل بعد في مشروع tarteb. افتح Authentication → Providers في Supabase وفعّل Google.';
  }

  if (message.includes('The requested action is invalid') || code === 'auth/invalid-credential') {
    return 'تسجيل جوجل غير مكتمل في Firebase. فعّل Google من Authentication ثم أعد المحاولة.';
  }

  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'تم إغلاق نافذة تسجيل الدخول قبل الإكمال.';
    case 'auth/popup-blocked':
      return 'المتصفح منع النافذة المنبثقة. اسمح بالنوافذ لهذا الموقع ثم حاول مرة أخرى.';
    case 'auth/unauthorized-domain':
      return 'هذا النطاق غير مصرّح له في Firebase. أضف localhost ونطاق Netlify من Authentication > Settings > Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'تسجيل الدخول بجوجل غير مفعّل في مشروع Firebase.';
    case 'auth/argument-error':
    case 'auth/invalid-api-key':
      return 'إعدادات Firebase غير صحيحة. تحقق من مفاتيح المشروع.';
    default: {
      if (code) {
        return `فشل تسجيل الدخول بجوجل (${code}).`;
      }
      if (message) {
        return message;
      }
      return 'فشل تسجيل الدخول بجوجل. حاول مرة أخرى.';
    }
  }
}
