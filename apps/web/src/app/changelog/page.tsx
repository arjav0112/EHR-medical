import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'EHR Copilot Changelog — every new feature, improvement, and fix across all releases.',
  alternates: { canonical: 'https://ehr.life/changelog' },
};

const releases = [
  {
    version: 'v1.4.0',
    date: 'May 17, 2026',
    tag: 'Latest',
    tagColor: 'bg-green-100 text-green-700',
    changes: [
      { type: 'new', text: 'Added /privacy, /terms, /policy, /gdpr-compliance, /security legal pages' },
      { type: 'new', text: 'Sitemap.xml and robots.txt auto-generated for SEO' },
      { type: 'new', text: 'OpenGraph image and JSON-LD SoftwareApplication schema' },
      { type: 'improved', text: 'Footer restructured — Company tab removed, Legal links wired up' },
      { type: 'improved', text: 'Brand logo (ehr-icon.png) added to footer and favicon' },
    ],
  },
  {
    version: 'v1.3.0',
    date: 'May 10, 2026',
    tag: null,
    tagColor: '',
    changes: [
      { type: 'new', text: 'Razorpay UPI QR modal for Indian payment flows' },
      { type: 'new', text: 'Team plan with up to 10 clinician seats' },
      { type: 'improved', text: 'SOAP section AI revision now persists on dashboard reload' },
      { type: 'fixed', text: 'Session state initialization bug when navigating back from dashboard' },
    ],
  },
  {
    version: 'v1.2.0',
    date: 'April 25, 2026',
    tag: null,
    tagColor: '',
    changes: [
      { type: 'new', text: 'DSM-5 / ICD-10 diagnostic suggestion with confidence scores' },
      { type: 'new', text: 'Risk flag panel: suicidal ideation, medication non-compliance detection' },
      { type: 'new', text: 'PDF export with EHR Copilot branding' },
      { type: 'improved', text: 'SOAP note generation latency reduced by 40%' },
      { type: 'fixed', text: 'ChromaDB replaced with Upstash Vector for Vercel compatibility' },
    ],
  },
  {
    version: 'v1.1.0',
    date: 'April 10, 2026',
    tag: null,
    tagColor: '',
    changes: [
      { type: 'new', text: 'Demo mode with synthetic therapy session (no signup required)' },
      { type: 'new', text: 'Section-level AI revision with approval workflow' },
      { type: 'improved', text: 'Homepage redesigned with mountain hero and glassmorphism elements' },
      { type: 'fixed', text: 'Auth redirect loop on session expiry' },
    ],
  },
  {
    version: 'v1.0.0',
    date: 'March 28, 2026',
    tag: 'Initial Release',
    tagColor: 'bg-blue-100 text-blue-700',
    changes: [
      { type: 'new', text: 'Initial public launch of EHR Copilot' },
      { type: 'new', text: 'AI SOAP note generation from therapy session transcripts' },
      { type: 'new', text: 'Firebase authentication with Google Sign-In' },
      { type: 'new', text: 'Starter free plan (5 sessions/month)' },
      { type: 'new', text: 'Session dashboard with review and approval flow' },
    ],
  },
];

const typeStyles: Record<string, { color: string; label: string }> = {
  new:      { color: 'bg-green-50 text-green-700 border-green-100',   label: 'New' },
  improved: { color: 'bg-blue-50 text-blue-700 border-blue-100',      label: 'Improved' },
  fixed:    { color: 'bg-orange-50 text-orange-700 border-orange-100', label: 'Fixed' },
};

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-4xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/ehr-icon.png" alt="EHR Copilot" className="h-8 w-8 rounded-lg" />
            <span className="text-[15px] font-bold text-gray-900">EHR Copilot</span>
          </Link>
          <Link href="/" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors">← Back to home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-14 border-b border-gray-100 pb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-green-700 mb-4">Product</span>
          <h1 className="text-[42px] font-bold tracking-tight text-gray-900 mb-3">Changelog</h1>
          <p className="text-[16px] text-gray-500 max-w-[480px]">Every new feature, improvement, and fix — documented for every release.</p>
        </div>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[7px] top-2 bottom-0 w-px bg-gray-100" aria-hidden="true" />

          <div className="space-y-14 pl-8">
            {releases.map((release) => (
              <div key={release.version} className="relative">
                {/* Dot */}
                <div className="absolute -left-8 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-gray-300 ring-2 ring-gray-100" />

                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <h2 className="text-[22px] font-bold text-gray-900">{release.version}</h2>
                  {release.tag && (
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${release.tagColor}`}>{release.tag}</span>
                  )}
                  <span className="text-[13px] text-gray-400">{release.date}</span>
                </div>

                <ul className="space-y-2.5">
                  {release.changes.map((change, i) => {
                    const style = typeStyles[change.type];
                    return (
                      <li key={i} className="flex items-start gap-3">
                        <span className={`mt-0.5 flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.color}`}>
                          {style.label}
                        </span>
                        <p className="text-[14px] text-gray-600 leading-relaxed">{change.text}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 mt-16 py-8 text-center text-[12px] text-gray-400">
        <p>© 2026 EHR Copilot Inc. · <Link href="/terms" className="hover:text-gray-700">Terms</Link> · <Link href="/privacy" className="hover:text-gray-700">Privacy</Link> · <Link href="/roadmap" className="hover:text-gray-700">Roadmap</Link></p>
      </footer>
    </div>
  );
}
