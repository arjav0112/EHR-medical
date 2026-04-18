'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, addDoc, collection, serverTimestamp,
} from 'firebase/firestore';
import { app, db } from '@/lib/firebase/config';

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// ── Types ──────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Detect device info ─────────────────────────────────────────────────────────

function getDeviceInfo() {
  if (typeof window === 'undefined') return { browser: 'Unknown', os: 'Unknown' };
  const ua = navigator.userAgent;
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  if (ua.includes('Edg/'))        browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari'))  browser = 'Safari';

  if (ua.includes('Windows'))       os = 'Windows';
  else if (ua.includes('Mac'))      os = 'macOS';
  else if (ua.includes('iPhone'))   os = 'iPhone';
  else if (ua.includes('Android'))  os = 'Android';
  else if (ua.includes('Linux'))    os = 'Linux';

  return { browser, os };
}

// ── Firestore user record ──────────────────────────────────────────────────────

async function upsertUser(user: User) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid:         user.uid,
      email:       user.email,
      displayName: user.displayName ?? '',
      photoURL:    user.photoURL ?? '',
      createdAt:   serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });
  } else {
    await setDoc(ref, { lastLoginAt: serverTimestamp() }, { merge: true });
  }

  // Write a session record so Account tab can show real active devices
  const { browser, os } = getDeviceInfo();
  await addDoc(collection(db, 'users', user.uid, 'sessions'), {
    browser,
    os,
    sessionId: crypto.randomUUID(),
    createdAt: serverTimestamp(),
    lastSeen:  serverTimestamp(),
    active:    true,
  });
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signIn: AuthContextValue['signIn'] = async (email, password) => {
    const { user: u } = await signInWithEmailAndPassword(auth, email, password);
    await upsertUser(u);
  };

  const signUp: AuthContextValue['signUp'] = async (email, password, displayName) => {
    const { user: u } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(u, { displayName });
    await upsertUser(u);
  };

  const signInWithGoogle: AuthContextValue['signInWithGoogle'] = async () => {
    const { user: u } = await signInWithPopup(auth, googleProvider);
    await upsertUser(u);
  };

  const signOut: AuthContextValue['signOut'] = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
