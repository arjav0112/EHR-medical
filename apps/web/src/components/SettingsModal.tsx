'use client';

import { useEffect, useRef, useState } from 'react';
import {
  getAuth,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  updateProfile,
  deleteUser,
} from 'firebase/auth';
import {
  collection, query, orderBy, onSnapshot,
  doc, setDoc, updateDoc, getDoc, serverTimestamp,
} from 'firebase/firestore';
import { db, app } from '@/lib/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { syncMonthlySessionUsageForUser, type SubscriptionTier } from '@/lib/firebase/users';

const auth = getAuth(app);

type Tab = 'profile' | 'dashboard' | 'billing' | 'account' | 'integrations' | 'privacy';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'billing', label: 'Billing', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { id: 'account', label: 'Account', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { id: 'integrations', label: 'Integrations', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
  { id: 'privacy', label: 'Privacy', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 py-4 border-b border-gray-100 last:border-0">
      <div className="sm:w-44 flex-shrink-0">
        <p className="text-[13px] font-semibold text-gray-700">{label}</p>
        {hint && <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{hint}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder, disabled, type = 'text' }: {
  value?: string; onChange?: (v: string) => void; placeholder?: string; disabled?: boolean; type?: string;
}) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 transition-all disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
    />
  );
}

function Toggle({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-[13px] text-gray-700">{label}</span>
      <button onClick={() => setOn(!on)} style={{ height: '22px', width: '40px' }}
        className={`relative rounded-full transition-colors duration-200 focus:outline-none ${on ? 'bg-green-500' : 'bg-gray-200'}`}
        role="switch" aria-checked={on}>
        <span className={`absolute top-0.5 left-0.5 w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200 ${on ? 'translate-x-[18px]' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

// ── Profile tab ────────────────────────────────────────────────────────────────

function ProfileTab({ user }: { user: { displayName?: string | null; email?: string | null; photoURL?: string | null; uid?: string } }) {
  const { updatePhotoURL } = useAuth();
  const initials = user.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '?';

  const [displayName,   setDisplayName]   = useState(user.displayName ?? '');
  const [specialty,   setSpecialty]   = useState('');
  const [license,     setLicense]     = useState('');
  const [phone,       setPhone]       = useState('');
  const [status,      setStatus]      = useState<'idle'|'saving'|'ok'|'error'>('idle');
  const [loaded,      setLoaded]      = useState(false);

  // Photo state
  const [photoURL,    setPhotoURL]    = useState(user.photoURL ?? '');
  const [preview,     setPreview]     = useState<string | null>(null);
  const [photoStatus, setPhotoStatus] = useState<'idle'|'uploading'|'ok'|'error'>('idle');
  const [photoError,  setPhotoError]  = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing profile fields from Firestore
  useEffect(() => {
    if (!user.uid) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        setDisplayName(d.displayName ?? user.displayName ?? '');
        setSpecialty(d.specialty ?? '');
        setLicense(d.licenseNumber ?? '');
        setPhone(d.phone ?? '');
        if (d.photoURL) setPhotoURL(d.photoURL);
      }
      setLoaded(true);
    });
  }, [user.uid]);

  // Track blob URL in a ref so we can revoke on new pick or unmount
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  // Handle file picked
  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user.uid) return;

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image must be under 5 MB.');
      setPhotoStatus('error');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select an image file.');
      setPhotoStatus('error');
      return;
    }

    // Revoke previous blob if there is one
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    const objectUrl = URL.createObjectURL(file);
    blobUrlRef.current = objectUrl;
    setPreview(objectUrl);
    setPhotoStatus('uploading');
    setPhotoError('');

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('uid', user.uid);

      const res = await fetch('/api/upload/avatar', { method: 'POST', body: form });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? 'Upload failed');

      const url: string = json.url;

      // 1. Save new Cloudinary URL to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        photoURL: url,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // 2. Update Firebase Auth profile
      const fbUser = auth.currentUser;
      if (fbUser) await updateProfile(fbUser, { photoURL: url });

      // 3. Push into global context so navbar/dashboard update
      updatePhotoURL(url);

      // 4. Keep preview (blob URL) showing — avoids browser/CDN cache of old avatar.
      //    photoURL state stores the Cloudinary URL for next mount.
      setPhotoURL(url);
      // preview stays set — blobUrlRef holds it, cleaned up on next pick or unmount
      setPhotoStatus('ok');
      setTimeout(() => setPhotoStatus('idle'), 3000);
    } catch (err: unknown) {
      setPhotoError(err instanceof Error ? err.message : 'Upload failed');
      setPhotoStatus('error');
      // Clear preview on failure
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setPreview(null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  const handleSave = async () => {
    if (!user.uid) return;
    setStatus('saving');
    try {
      await setDoc(doc(db, 'users', user.uid), {
        displayName,
        specialty,
        licenseNumber: license,
        phone,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      const fbUser = auth.currentUser;
      if (fbUser && displayName !== fbUser.displayName) {
        await updateProfile(fbUser, { displayName });
      }

      setStatus('ok');
      setTimeout(() => setStatus('idle'), 2500);
    } catch {
      setStatus('error');
    }
  };

  if (!loaded) {
    return <div className="py-10 text-center text-[13px] text-gray-400">Loading profile…</div>;
  }

  const avatarSrc = preview ?? photoURL;

  return (
    <div>
      {/* Avatar row */}
      <div className="flex items-center gap-5 py-5 border-b border-gray-100">
        {/* Avatar circle */}
        <div className="relative group flex-shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-green-600 flex items-center justify-center text-white text-[20px] font-black overflow-hidden">
            {avatarSrc
              ? <img src={avatarSrc} className="w-16 h-16 object-cover" alt="Profile" />
              : initials
            }
          </div>
          {/* Hover overlay */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={photoStatus === 'uploading'}
            className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            title="Change photo"
          >
            {photoStatus === 'uploading' ? (
              <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFilePick}
          />
        </div>

        <div>
          <p className="text-[14px] font-bold text-gray-900">{displayName || 'Clinician'}</p>
          <p className="text-[12px] text-gray-400 mb-2">{user.email}</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={photoStatus === 'uploading'}
            className="text-[12px] font-semibold text-green-600 hover:text-green-700 border border-green-200 bg-green-50 px-3 py-1 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {photoStatus === 'uploading' ? 'Uploading…' :
             photoStatus === 'ok'        ? '✓ Photo updated' :
             'Change Photo'}
          </button>
          {photoStatus === 'error' && (
            <p className="text-[11px] text-red-500 mt-1">{photoError}</p>
          )}
        </div>
      </div>

      <FieldRow label="Full Name" hint="Your display name visible to patients">
        <TextInput value={displayName} onChange={setDisplayName} placeholder="Dr. Jane Smith" />
      </FieldRow>
      <FieldRow label="Email Address" hint="Used for login and notifications">
        <TextInput value={user.email ?? ''} disabled />
      </FieldRow>
      <FieldRow label="Specialty" hint="Your clinical specialty or role">
        <TextInput value={specialty} onChange={setSpecialty} placeholder="e.g. Psychiatry · CBT therapist" />
      </FieldRow>
      <FieldRow label="License Number" hint="Optional — shown on exported notes">
        <TextInput value={license} onChange={setLicense} placeholder="e.g. MFT-12345" />
      </FieldRow>
      <FieldRow label="Phone" hint="Optional contact number">
        <TextInput value={phone} onChange={setPhone} placeholder="+91 98765 43210" />
      </FieldRow>

      {status === 'error' && (
        <p className="text-[12px] text-red-500 mt-2">Failed to save. Please try again.</p>
      )}

      <div className="pt-4 flex justify-end">
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className={`px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
            status === 'ok'     ? 'bg-green-100 text-green-700 border border-green-200' :
            status === 'saving' ? 'bg-gray-200 text-gray-500 cursor-not-allowed' :
            'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          {status === 'saving' ? 'Saving…' : status === 'ok' ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}


// ── Dashboard tab ──────────────────────────────────────────────────────────────

function DashboardTab() {
  return (
    <div>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Display Preferences</p>
      <Toggle label="Show session count in navbar" defaultOn />
      <Toggle label="Enable compact session rows" />
      <Toggle label="Auto-open last viewed session" />
      <Toggle label="Show patient age in session list" defaultOn />
      <Toggle label="Show diagnosis confidence score" defaultOn />
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-6 mb-3">Notifications</p>
      <Toggle label="Email me when a session is ready for review" defaultOn />
      <Toggle label="Send weekly summary reports" defaultOn />
      <Toggle label="Alert on high-risk session flags" defaultOn />
      <Toggle label="Browser push notifications" />
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-6 mb-3">Default Filters</p>
      <FieldRow label="Default Risk Filter">
        <select className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] text-gray-800 focus:outline-none focus:border-green-400 bg-white">
          <option>All Risk Levels</option>
          <option>High + Critical only</option>
          <option>Low Risk</option>
        </select>
      </FieldRow>
      <FieldRow label="Sessions Per Page">
        <select className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-[13px] text-gray-800 focus:outline-none focus:border-green-400 bg-white">
          <option>20</option><option>50</option><option>100</option>
        </select>
      </FieldRow>
      <div className="pt-4 flex justify-end">
        <button className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-all">Save Changes</button>
      </div>
    </div>
  );
}

// ── Currency config ────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD – US Dollar', rate: 1 },
  { code: 'INR', symbol: '₹', label: 'INR – Indian Rupee', rate: 83.5 },
  { code: 'EUR', symbol: '€', label: 'EUR – Euro', rate: 0.92 },
  { code: 'GBP', symbol: '£', label: 'GBP – British Pound', rate: 0.79 },
  { code: 'JPY', symbol: '¥', label: 'JPY – Japanese Yen', rate: 153.2 },
  { code: 'AUD', symbol: 'A$', label: 'AUD – Australian Dollar', rate: 1.54 },
  { code: 'CAD', symbol: 'C$', label: 'CAD – Canadian Dollar', rate: 1.36 },
];

const PLAN_PRICES_USD: Record<string, number | null> = {
  free: 0,
  pro: 49,
  clinic: 149,
  enterprise: null, // custom
};

const PLAN_META: Record<string, { label: string; desc: string; sessionsLabel: string; limit: number | null }> = {
  free: { label: 'Starter', desc: '5 sessions/mo · free forever', sessionsLabel: '5', limit: 5 },
  pro: { label: 'Pro', desc: 'Unlimited sessions · billed monthly', sessionsLabel: 'Unlimited', limit: null },
  clinic: { label: 'Clinic', desc: 'Up to 10 seats · unlimited · billed monthly', sessionsLabel: 'Unlimited', limit: null },
  enterprise: { label: 'Enterprise', desc: 'Custom seats, SSO, on-prem', sessionsLabel: 'Unlimited', limit: null },
};

// ── Billing tab ────────────────────────────────────────────────────────────────

function BillingTab() {
  const { user } = useAuth();

  // Live data from Firestore
  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [sessionsUsed, setSessions] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Currency
  const [currency, setCurrency] = useState('INR');
  const cur = CURRENCIES.find(c => c.code === currency) ?? CURRENCIES[0];

  const fmt = (usd: number | null) => {
    if (usd === null) return 'Custom';
    const val = Math.round(usd * cur.rate);
    return `${cur.symbol}${val.toLocaleString()}`;
  };

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    syncMonthlySessionUsageForUser(user.uid)
      .then(({ tier: nextTier, used }) => {
        setTier(nextTier);
        setSessions(used);
      })
      .catch(() => {
        // Fallback to user tier if the usage scan is temporarily unavailable.
        getDoc(doc(db, 'users', user.uid)).then(snap => {
          if (snap.exists()) setTier((snap.data()?.tier as SubscriptionTier) ?? 'free');
        });
      })
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const meta = PLAN_META[tier] ?? PLAN_META.free;
  const priceUsd = PLAN_PRICES_USD[tier];
  const sessionLimit = meta.limit;

  const availablePlans = [
    { id: 'free', label: 'Starter', usd: 0, desc: '5 sessions/mo' },
    { id: 'pro', label: 'Pro', usd: 49, desc: 'Unlimited' },
    { id: 'clinic', label: 'Clinic', usd: 149, desc: '10 seats' },
  ];

  return (
    <div className="space-y-5">
      {/* Current plan banner */}
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold text-green-600 uppercase tracking-widest mb-1">Current Plan</p>
          <p className="text-[18px] font-black text-gray-900">{meta.label}</p>
          <p className="text-[12px] text-gray-500 mt-0.5">{meta.desc}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="bg-green-600 text-white text-[11px] font-bold px-3 py-1 rounded-full">Active</span>
          {/* Currency picker */}
          <select
            value={currency}
            onChange={e => setCurrency(e.target.value)}
            className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-600 focus:outline-none focus:border-green-400 cursor-pointer"
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code}>{c.code}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Usage this month */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Usage This Month</p>
        {loading ? (
          <p className="text-[13px] text-gray-400 py-3">Loading usage…</p>
        ) : (
          [
            {
              label: 'Sessions Processed',
              used: sessionsUsed,
              total: sessionLimit === null ? 'Unlimited' : sessionLimit,
            },
            { label: 'PDF Exports', used: '—', total: tier === 'free' ? 10 : 'Unlimited' },
            { label: 'AI Revisions', used: '—', total: tier === 'free' ? 0 : tier === 'pro' ? '3/session' : 'Unlimited' },
          ].map(({ label, used, total }) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
              <span className="text-[13px] text-gray-700">{label}</span>
              <span className="text-[13px] font-semibold text-gray-900">{used} / {total}</span>
            </div>
          ))
        )}
      </div>

      {/* Payment method (static — no payment processor yet) */}
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Payment Method</p>
        {tier === 'free' ? (
          <p className="text-[13px] text-gray-400 italic">No payment method — you are on the free plan.</p>
        ) : (
          <div className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-5 bg-blue-600 rounded text-white text-[9px] font-black flex items-center justify-center">VISA</div>
              <span className="text-[13px] text-gray-700">•••• •••• •••• 4242</span>
            </div>
            <button className="text-[12px] font-semibold text-green-600 hover:text-green-700 transition-colors">Update</button>
          </div>
        )}
      </div>

      {/* Available plans with converted prices */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Available Plans</p>
          <span className="text-[11px] text-gray-400">Prices in {cur.code}</span>
        </div>
        <div className="grid grid-cols-3 gap-3">

          {availablePlans.map(({ id, label, usd, desc }) => {
            const isCurrent = id === tier;
            return (
              <div
                key={id}
                className={`rounded-xl border p-4 text-center transition-all ${isCurrent
                    ? 'border-green-400 bg-green-50 ring-2 ring-green-200'
                    : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                  }`}
              >
                <p className="text-[12px] font-bold text-gray-700">{label}</p>
                <p className="text-[20px] font-black text-gray-900 mt-1">{fmt(usd)}</p>
                <p className="text-[11px] text-gray-400">{desc}</p>
                {isCurrent && (
                  <span className="inline-block mt-2 text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Current</span>
                )}
                {!isCurrent && (
                  <a href="/pricing" className="inline-block mt-2 text-[10px] font-bold text-gray-500 hover:text-green-600 transition-colors">
                    View plan
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button className="text-[13px] text-gray-400 hover:text-red-500 transition-colors">
          {tier !== 'free' ? 'Cancel Subscription' : ''}
        </button>
        <button className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-gray-900 text-white hover:bg-gray-800 transition-all">
          Download Invoice
        </button>
      </div>
    </div>
  );
}

// ── Account tab — FULLY INTEGRATED ────────────────────────────────────────────

interface SessionDoc {
  id: string;
  browser: string;
  os: string;
  createdAt: { toDate?: () => Date } | null;
  lastSeen: { toDate?: () => Date } | null;
  active: boolean;
}

function AccountTab() {
  const { user, signOut } = useAuth();

  // ── Password change ──────────────────────────────────────────────────────────
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdStatus, setPwdStatus] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [pwdError, setPwdError] = useState('');

  const handlePasswordChange = async () => {
    if (newPwd !== confirmPwd) { setPwdError("Passwords don't match."); setPwdStatus('error'); return; }
    if (newPwd.length < 8) { setPwdError('Password must be at least 8 characters.'); setPwdStatus('error'); return; }
    const fbUser = auth.currentUser;
    if (!fbUser || !fbUser.email) return;
    setPwdStatus('saving');
    try {
      const cred = EmailAuthProvider.credential(fbUser.email, currentPwd);
      await reauthenticateWithCredential(fbUser, cred);
      await updatePassword(fbUser, newPwd);
      setPwdStatus('ok');
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      setTimeout(() => setPwdStatus('idle'), 3000);
    } catch (e: any) {
      setPwdError(e?.message ?? 'Failed to update password.');
      setPwdStatus('error');
    }
  };

  // ── Account info from Firestore ──────────────────────────────────────────────
  const [userDoc, setUserDoc] = useState<{
    createdAt?: { toDate?: () => Date } | null;
    lastLoginAt?: { toDate?: () => Date } | null;
  } | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) setUserDoc(snap.data() as any);
    });
  }, [user?.uid]);

  // ── Live sessions from Firestore ─────────────────────────────────────────────
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [sessLoading, setSessLoading] = useState(true);
  const currentSessionId = useRef<string | null>(null);

  // Pull the current session ID that was written during this login
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'users', user.uid, 'sessions'),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as SessionDoc));
      setSessions(docs.filter(s => s.active !== false));
      // The newest session (first one) is the current one
      if (!currentSessionId.current && docs.length > 0) {
        currentSessionId.current = docs[0].id;
      }
      setSessLoading(false);
    });
    return unsub;
  }, [user?.uid]);

  const revokeSession = async (sessionDocId: string) => {
    if (!user?.uid) return;
    await updateDoc(doc(db, 'users', user.uid, 'sessions', sessionDocId), {
      active: false,
      revokedAt: serverTimestamp(),
    });
  };

  // ── Delete account ───────────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    const fbUser = auth.currentUser;
    if (!fbUser) return;
    setDeleting(true);
    try {
      await deleteUser(fbUser);
      await signOut();
    } catch {
      setDeleting(false);
    }
  };

  const fmt = (ts: { toDate?: () => Date } | null | undefined) => {
    if (!ts?.toDate) return '—';
    return ts.toDate().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <div>
      {/* ── Account info ── */}
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Account Info</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { label: 'Email', value: user?.email ?? '—' },
          { label: 'UID', value: user?.uid ? `${user.uid.slice(0, 12)}…` : '—' },
          { label: 'Created', value: fmt(userDoc?.createdAt) },
          { label: 'Last Login', value: fmt(userDoc?.lastLoginAt) },
        ].map(({ label, value }) => (
          <div key={label} className="border border-gray-100 rounded-xl px-4 py-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase">{label}</p>
            <p className="text-[13px] font-semibold text-gray-800 truncate mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Password ── */}
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Change Password</p>
      <FieldRow label="Current Password">
        <TextInput type="password" value={currentPwd} onChange={setCurrentPwd} placeholder="Enter current password" />
      </FieldRow>
      <FieldRow label="New Password">
        <TextInput type="password" value={newPwd} onChange={setNewPwd} placeholder="Min. 8 characters" />
      </FieldRow>
      <FieldRow label="Confirm Password">
        <TextInput type="password" value={confirmPwd} onChange={setConfirmPwd} placeholder="Re-enter new password" />
      </FieldRow>
      {pwdStatus === 'error' && (
        <p className="text-[12px] text-red-500 mt-1 mb-1">{pwdError}</p>
      )}
      <div className="pt-4 flex justify-end mb-6">
        <button
          onClick={handlePasswordChange}
          disabled={pwdStatus === 'saving'}
          className={`px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${pwdStatus === 'ok' ? 'bg-green-100 text-green-700 border border-green-200' :
              pwdStatus === 'saving' ? 'bg-gray-200 text-gray-500 cursor-not-allowed' :
                'bg-gray-900 text-white hover:bg-gray-800'
            }`}
        >
          {pwdStatus === 'saving' ? 'Saving…' : pwdStatus === 'ok' ? '✓ Updated' : 'Update Password'}
        </button>
      </div>

      {/* ── Sessions & Devices ── */}
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Sessions &amp; Devices</p>
      <div className="border border-gray-100 rounded-2xl overflow-hidden mb-6">
        {sessLoading ? (
          <div className="px-4 py-6 text-center text-[13px] text-gray-400">Loading sessions…</div>
        ) : sessions.length === 0 ? (
          <div className="px-4 py-6 text-center text-[13px] text-gray-400">No active sessions found.</div>
        ) : sessions.map((s, i) => {
          const isCurrent = s.id === currentSessionId.current || i === 0;
          return (
            <div key={s.id} className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isCurrent ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <svg className={`w-4 h-4 ${isCurrent ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d={s.os === 'iPhone' || s.os === 'Android'
                        ? 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z'
                        : 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'} />
                  </svg>
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">
                    {s.browser} · {s.os}
                    {isCurrent && <span className="ml-2 text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">This device</span>}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    First seen: {fmt(s.createdAt)} · Last active: {fmt(s.lastSeen)}
                  </p>
                </div>
              </div>
              {!isCurrent && (
                <button
                  onClick={() => revokeSession(s.id)}
                  className="text-[12px] font-semibold text-red-500 hover:text-red-600 border border-red-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all"
                >
                  Revoke
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Danger Zone ── */}
      <div className="p-5 border border-red-100 bg-red-50 rounded-2xl">
        <p className="text-[13px] font-bold text-red-700 mb-1">Danger Zone</p>
        <p className="text-[12px] text-red-500 mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
        <div className="flex items-center gap-3">
          <input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder='Type "DELETE" to confirm'
            className="flex-1 border border-red-200 rounded-xl px-3.5 py-2 text-[13px] text-gray-800 placeholder-red-300 focus:outline-none focus:border-red-400 bg-white"
          />
          <button
            onClick={handleDeleteAccount}
            disabled={deleteConfirm !== 'DELETE' || deleting}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {deleting ? 'Deleting…' : 'Delete Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Integrations tab ───────────────────────────────────────────────────────────

function IntegrationsTab() {
  const integrations = [
    { name: 'Epic Systems', desc: 'Sync notes directly to Epic EHR', logo: '🏥', connected: true },
    { name: 'Cerner', desc: 'Export FHIR bundles to Cerner', logo: '🩺', connected: false },
    { name: 'Athenahealth', desc: 'Auto-import patient context', logo: '📋', connected: false },
    { name: 'Google Calendar', desc: 'Sync session appointments', logo: '📅', connected: true },
    { name: 'Slack', desc: 'Receive high-risk session alerts', logo: '💬', connected: false },
    { name: 'Zoom', desc: 'Record and auto-transcribe sessions', logo: '🎥', connected: false },
  ];
  return (
    <div className="space-y-3">
      {integrations.map(({ name, desc, logo, connected }) => (
        <div key={name} className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3 hover:border-gray-200 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[20px] border border-gray-100">{logo}</div>
            <div>
              <p className="text-[13px] font-semibold text-gray-800">{name}</p>
              <p className="text-[11px] text-gray-400">{desc}</p>
            </div>
          </div>
          <button className={`text-[12px] font-semibold px-3.5 py-1.5 rounded-lg transition-all ${connected
              ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
              : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}>
            {connected ? 'Connected' : 'Connect'}
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Privacy tab ────────────────────────────────────────────────────────────────

function PrivacyTab() {
  return (
    <div>
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Data &amp; Privacy</p>
      <Toggle label="Allow anonymous usage analytics" defaultOn />
      <Toggle label="Include session metadata in AI training" />
      <Toggle label="Share crash reports with EHR Copilot" defaultOn />
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-6 mb-3">HIPAA Compliance</p>
      <div className="border border-green-100 bg-green-50 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-[13px] font-bold text-green-700">HIPAA BAA Active</p>
        </div>
        <p className="text-[12px] text-green-600 leading-snug">All session data is encrypted at rest and in transit.</p>
      </div>
      <Toggle label="Auto-purge session data after 7 years" defaultOn />
      <Toggle label="Enable audit log for all clinician actions" defaultOn />
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-6 mb-3">Data Exports</p>
      <div className="flex flex-col gap-2">
        {['Export all my sessions as CSV', 'Download FHIR R4 bundle', 'Request full data archive'].map(label => (
          <button key={label} className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 text-[13px] text-gray-700 hover:border-green-300 hover:bg-green-50 transition-all group">
            {label}
            <svg className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export default function SettingsModal({ onClose, initialTab = 'profile' }: { onClose: () => void; initialTab?: Tab }) {
  const { user, photoURL: contextPhotoURL } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const renderTab = () => {
    const u = {
      displayName: user?.displayName,
      email:       user?.email,
      photoURL:    contextPhotoURL ?? user?.photoURL,  // context wins — survives page reloads + profile updates
      uid:         user?.uid,
    };

    switch (activeTab) {
      case 'profile': return <ProfileTab user={u} />;
      case 'dashboard': return <DashboardTab />;
      case 'billing': return <BillingTab />;
      case 'account': return <AccountTab />;
      case 'integrations': return <IntegrationsTab />;
      case 'privacy': return <PrivacyTab />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center px-3 py-3"
      style={{ background: 'rgba(0,0,0,0.40)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-[95vw] h-[96vh] bg-white rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.22)] border border-gray-100 flex overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <aside className="w-60 flex-shrink-0 bg-gray-50 border-r border-gray-100 flex flex-col">
          <div className="px-5 pt-6 pb-4 border-b border-gray-100">
            <p className="text-[15px] font-black text-gray-900 tracking-tight">Settings</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Manage your workspace</p>
          </div>
          <nav className="flex-1 py-3 px-2 space-y-0.5">
            {TABS.map(({ id, label, icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 text-left ${activeTab === id ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-800 hover:bg-white/60'
                  }`}>
                <svg className={`w-4 h-4 flex-shrink-0 ${activeTab === id ? 'text-green-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={icon} />
                </svg>
                {label}
              </button>
            ))}
          </nav>
          <div className="px-5 py-4 border-t border-gray-100">
            <p className="text-[10px] text-gray-400">EHR Copilot v2.4.1</p>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-7 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
            <div>
              <h2 className="text-[17px] font-black text-gray-900">{TABS.find(t => t.id === activeTab)?.label}</h2>
              <p className="text-[12px] text-gray-400 mt-0.5">
                {activeTab === 'profile' && 'Update your personal and clinical information'}
                {activeTab === 'dashboard' && 'Customize your dashboard experience'}
                {activeTab === 'billing' && 'Manage subscription and payment methods'}
                {activeTab === 'account' && 'Security settings and active sessions'}
                {activeTab === 'integrations' && 'Connect with your EHR and productivity tools'}
                {activeTab === 'privacy' && 'Control data usage and compliance settings'}
              </p>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label="Close settings">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-7 py-5">{renderTab()}</div>
        </div>
      </div>
    </div>
  );
}
