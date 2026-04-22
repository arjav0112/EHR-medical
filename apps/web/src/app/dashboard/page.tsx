'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type SessionRecord, listSessionsForClinician } from '@/lib/firebase/sessions';
import { useAuth } from '@/contexts/AuthContext';
import SettingsModal from '@/components/SettingsModal';

// ─── Risk badge config ────────────────────────────────────────────────────────
const RISK_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  critical: { label: 'Critical', color: '#dc2626', bg: '#fef2f2', dot: 'bg-red-500 animate-pulse' },
  high:     { label: 'High',     color: '#ea580c', bg: '#fff7ed', dot: 'bg-orange-500' },
  moderate: { label: 'Moderate', color: '#d97706', bg: '#fffbeb', dot: 'bg-yellow-500' },
  low:      { label: 'Low',      color: '#16a34a', bg: '#f0fdf4', dot: 'bg-green-500' },
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  intake:    'Intake',
  follow_up: 'Follow-up',
  crisis:    'Crisis',
};

const MODALITY_ICONS: Record<string, string> = {
  in_person:  '🏥',
  telehealth: '💻',
};

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
    hour:  'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

function formatDateShort(date: Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  }).format(date);
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ sessionCount, userInitials, userPhoto, userName, userEmail }: {
  sessionCount: number;
  userInitials: string;
  userPhoto?: string | null;
  userName?: string | null;
  userEmail?: string | null;
}) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile'|'account'>('profile');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
    <header className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
      <div className="w-full max-w-[1100px] bg-white rounded-full shadow-[0_2px_20px_rgba(0,0,0,0.10)] border border-gray-100 px-5 h-[58px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </span>
          <span className="text-[16px] font-bold text-gray-900 tracking-tight">EHR Copilot</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-[12px] font-semibold text-gray-500">{sessionCount} sessions</span>
          <Link
            href="/session/new"
            className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-[12px] font-bold rounded-full hover:bg-green-700 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New Session
          </Link>

          {/* Avatar + dropdown */}
          <div className="relative pl-1 border-l border-gray-100" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-[12px] font-bold hover:ring-2 hover:ring-green-300 transition-all flex-shrink-0 focus:outline-none"
              aria-label="Account menu"
            >
              {userPhoto
                ? <img src={userPhoto} className="w-8 h-8 rounded-full object-cover" alt="" />
                : userInitials}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-11 w-60 bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.14)] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 z-50">
                {/* User info */}
                <div className="px-4 py-3.5 border-b border-gray-100">
                  <p className="text-[13px] font-bold text-gray-900 truncate">{userName || 'Clinician'}</p>
                  <p className="text-[11px] text-gray-400 truncate mt-0.5">{userEmail}</p>
                </div>

                <div className="py-1.5">
                  {/* Account */}
                  <button
                    onClick={() => { setMenuOpen(false); setSettingsTab('account'); setShowSettings(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  >
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Account
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => { setMenuOpen(false); setSettingsTab('profile'); setShowSettings(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  >
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </button>

                  <div className="h-px bg-gray-100 my-1" />

                  {/* Sign out */}
                  <button
                    onClick={async () => { setMenuOpen(false); await signOut(); router.push('/'); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50 transition-colors text-left"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>

    {/* Settings floating modal */}
    {showSettings && <SettingsModal onClose={() => setShowSettings(false)} initialTab={settingsTab} />}
  </>
  );
}


// ─── Risk badge ───────────────────────────────────────────────────────────────
function RiskBadge({ level }: { level: string }) {
  const cfg = RISK_CONFIG[level] ?? RISK_CONFIG.low;
  return (
    <span
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '15' }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-[13px] text-gray-500 font-medium">{label}</p>
        <p className="text-[24px] font-black text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Session row ──────────────────────────────────────────────────────────────
function SessionRow({ session, onClick }: { session: SessionRecord; onClick: () => void }) {
  const risk = RISK_CONFIG[session.overallRiskLevel] ?? RISK_CONFIG.low;
  const diagLabel = session.primaryDiagnosis?.label ?? '—';
  const diagCode  = session.primaryDiagnosis?.dsm5Code ?? '';
  const confidence = session.primaryDiagnosis?.confidence;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-100 rounded-2xl px-6 py-4 hover:border-green-200 hover:shadow-md transition-all duration-200 group"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: patient + session info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0 text-[13px] font-black text-gray-500">
            {session.patientId.slice(0, 2).toUpperCase()}
          </div>
          {/* Patient ID + session type */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[14px] font-bold text-gray-900 truncate">{session.patientId}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold flex-shrink-0">
                {MODALITY_ICONS[session.modality] ?? ''} {SESSION_TYPE_LABELS[session.sessionType] ?? session.sessionType}
              </span>
              <span className="text-[10px] text-gray-400 flex-shrink-0">#{session.sessionNumber}</span>
            </div>
            <p className="text-[12px] text-gray-400 truncate">
              {session.patientAge}y · {session.durationMinutes} min
              {session.knownDiagnoses.length > 0 && ` · ${session.knownDiagnoses.slice(0, 2).join(', ')}`}
            </p>
          </div>
        </div>

        {/* Center: primary diagnosis */}
        <div className="flex-1 min-w-0 hidden md:block">
          <p className="text-[13px] font-semibold text-gray-800 truncate">{diagLabel}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {diagCode && <span className="text-[11px] text-gray-400 font-mono">{diagCode}</span>}
            {confidence !== undefined && (
              <span className="text-[11px] text-green-600 font-semibold">{Math.round(confidence * 100)}%</span>
            )}
          </div>
        </div>

        {/* Right: risk + date + arrow */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <RiskBadge level={session.overallRiskLevel} />
          <div className="hidden sm:block text-right">
            <p className="text-[12px] font-semibold text-gray-600">{formatDateShort(session.completedAt)}</p>
            <p className="text-[10px] text-gray-400">{formatDate(session.completedAt).split(',').pop()?.trim()}</p>
          </div>
          <svg
            className="w-4 h-4 text-gray-300 group-hover:text-green-500 group-hover:translate-x-0.5 transition-all"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}

// ─── Session detail drawer ────────────────────────────────────────────────────
function SessionDrawer({ session, onClose }: { session: SessionRecord; onClose: () => void }) {
  const risk = RISK_CONFIG[session.overallRiskLevel] ?? RISK_CONFIG.low;
  const soap = session.reviewPackage?.soapNote;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
    >
      <div className="ml-auto w-full max-w-[600px] h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-[18px] font-bold text-gray-900">{session.patientId}</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">
              Session #{session.sessionNumber} · {SESSION_TYPE_LABELS[session.sessionType] ?? session.sessionType} · {formatDate(session.completedAt)}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Overview pills */}
          <div className="flex flex-wrap gap-2">
            <RiskBadge level={session.overallRiskLevel} />
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600">
              {session.patientAge}y · {session.patientGender}
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600">
              {session.durationMinutes} min
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600">
              {MODALITY_ICONS[session.modality]} {session.modality === 'in_person' ? 'In Person' : 'Telehealth'}
            </span>
          </div>

          {/* Primary diagnosis */}
          {session.primaryDiagnosis && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Primary Diagnosis</p>
              <p className="text-[14px] font-bold text-blue-900">{session.primaryDiagnosis.label}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] font-mono text-blue-500">{session.primaryDiagnosis.dsm5Code}</span>
                <span className="text-[11px] text-blue-600 font-semibold">{Math.round(session.primaryDiagnosis.confidence * 100)}% confidence</span>
              </div>
            </div>
          )}

          {/* SOAP sections */}
          {soap && (['subjective', 'objective', 'assessment', 'plan'] as const).map((key) => {
            const s = soap[key];
            if (!s?.content) return null;
            return (
              <div key={key} className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-[11px] font-bold text-gray-700 uppercase tracking-widest">{key}</span>
                  <div className="flex items-center gap-2">
                    {s.revisionRounds > 0 && (
                      <span className="text-[10px] text-purple-600 font-semibold">{s.revisionRounds} revision{s.revisionRounds > 1 ? 's' : ''}</span>
                    )}
                    <span className="text-[10px] text-green-600 font-semibold">{Math.round((s.confidence ?? 0) * 100)}%</span>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-4">{s.content}</p>
                </div>
              </div>
            );
          })}

          {/* Risk flags */}
          {session.reviewPackage?.riskFlags?.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Risk Flags</p>
              <div className="space-y-2">
                {session.reviewPackage.riskFlags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-3">
                    <div className="w-2 h-2 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-[12px] font-bold text-red-700 capitalize">{flag.type.replace(/_/g, ' ')}</p>
                      <p className="text-[11px] text-red-600/80 mt-0.5">{flag.evidence}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Medications & diagnoses */}
          {session.currentMedications.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Medications</p>
              <div className="flex flex-wrap gap-1.5">
                {session.currentMedications.map((m) => (
                  <span key={m} className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 text-[11px] font-medium border border-purple-100">{m}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
          <Link
            href={`/session/${session.sessionId}/review`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white text-[12px] font-bold rounded-xl hover:bg-green-700 transition-all"
          >
            Open Full Review
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href={`/session/${session.sessionId}/export`}
            className="px-4 py-2.5 border border-gray-200 text-gray-600 text-[12px] font-semibold rounded-xl hover:border-gray-300 transition-all"
          >
            Export PDF
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, loading: authLoading, photoURL: contextPhotoURL } = useAuth();

  const router = useRouter();

  const [sessions, setSessions]     = useState<SessionRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [selected, setSelected]     = useState<SessionRecord | null>(null);

  // Auth guard — redirect to /auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return; // wait for auth
    const clinicianId = user.uid;
    listSessionsForClinician(clinicianId, { pageSize: 100 })
      .then((data) => {
        setSessions(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  const total        = sessions.length;
  const critical     = sessions.filter((s) => s.overallRiskLevel === 'critical' || s.overallRiskLevel === 'high').length;
  const thisWeek     = sessions.filter((s) => {
    if (!s.completedAt) return false;
    const diff = Date.now() - s.completedAt.getTime();
    return diff < 7 * 24 * 60 * 60 * 1000;
  }).length;
  const uniquePatients = new Set(sessions.map((s) => s.patientId)).size;

  // Filters
  const filtered = sessions.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.patientId.toLowerCase().includes(q)
      || (s.primaryDiagnosis?.label ?? '').toLowerCase().includes(q)
      || (s.primaryDiagnosis?.dsm5Code ?? '').toLowerCase().includes(q);
    const matchRisk = filterRisk === 'all' || s.overallRiskLevel === filterRisk;
    const matchType = filterType === 'all' || s.sessionType === filterType;
    return matchSearch && matchRisk && matchType;
  });

  // Show spinner while auth resolves
  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-gray-300 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      </div>
    );
  }

  const userInitials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <main className="min-h-screen bg-gray-50/60">
      <Navbar
        sessionCount={total}
        userInitials={userInitials}
        userPhoto={contextPhotoURL ?? user?.photoURL}

        userName={user?.displayName}
        userEmail={user?.email}
      />

      <div className="pt-24 pb-16 px-6 max-w-[1100px] mx-auto">

        {/* ── Page header ── */}
        <div className="mb-8">
          <h1 className="text-[28px] font-black text-gray-900 tracking-tight">Clinical Dashboard</h1>
          <p className="text-[14px] text-gray-500 mt-1">Patient session history and clinical records</p>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Total Sessions"
            value={total}
            sub="All time"
            color="#16a34a"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          />
          <StatCard
            label="Unique Patients"
            value={uniquePatients}
            sub="Across all sessions"
            color="#2563eb"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
          <StatCard
            label="This Week"
            value={thisWeek}
            sub="Last 7 days"
            color="#7c3aed"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          />
          <StatCard
            label="High Risk"
            value={critical}
            sub="Require attention"
            color="#dc2626"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
          />
        </div>

        {/* ── Filter bar ── */}
        <div className="bg-white border border-gray-100 rounded-2xl px-5 py-3.5 mb-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-sm">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient ID or diagnosis…"
              className="w-full pl-9 pr-4 py-2 text-[13px] bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-500/10 transition-all"
            />
          </div>

          {/* Risk filter */}
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="px-3 py-2 text-[12px] font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-400 cursor-pointer"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="moderate">Moderate</option>
            <option value="high">High Risk</option>
            <option value="critical">Critical</option>
          </select>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-[12px] font-semibold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-green-400 cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="intake">Intake</option>
            <option value="follow_up">Follow-up</option>
            <option value="crisis">Crisis</option>
          </select>

          {/* Result count */}
          <span className="text-[12px] font-semibold text-gray-400 flex-shrink-0 self-center">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Session list ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <svg className="w-8 h-8 text-gray-300 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <p className="text-[13px] text-gray-400 font-medium">Loading sessions…</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
            <p className="text-[14px] font-bold text-red-700 mb-1">Failed to load sessions</p>
            <p className="text-[12px] text-red-500">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-[16px] font-bold text-gray-700 mb-1">
              {sessions.length === 0 ? 'No sessions yet' : 'No matches found'}
            </p>
            <p className="text-[13px] text-gray-400 mb-6">
              {sessions.length === 0
                ? 'Sessions will appear here after you process your first transcript.'
                : 'Try adjusting your search or filters.'}
            </p>
            {sessions.length === 0 && (
              <Link
                href="/session/new"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white text-[13px] font-bold rounded-xl hover:bg-green-700 transition-all"
              >
                Start First Session
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((session) => (
              <SessionRow
                key={session.sessionId}
                session={session}
                onClick={() => setSelected(session)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Detail drawer ── */}
      {selected && (
        <SessionDrawer session={selected} onClose={() => setSelected(null)} />
      )}
    </main>
  );
}
