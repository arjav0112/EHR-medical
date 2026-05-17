import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Roadmap',
  description: 'EHR Copilot Roadmap — see what we are building next for AI clinical documentation.',
  alternates: { canonical: 'https://ehr.life/roadmap' },
};

type Status = 'shipped' | 'in-progress' | 'planned' | 'exploring';

const statusConfig: Record<Status, { label: string; dot: string; badge: string }> = {
  shipped:     { label: 'Shipped',     dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700 border-green-100' },
  'in-progress': { label: 'In Progress', dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700 border-blue-100' },
  planned:     { label: 'Planned',     dot: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700 border-amber-100' },
  exploring:   { label: 'Exploring',   dot: 'bg-purple-400', badge: 'bg-purple-50 text-purple-700 border-purple-100' },
};

const quarters = [
  {
    period: 'Q1 2026 — Completed',
    items: [
      { title: 'AI SOAP Note Generation', desc: 'Full SOAP note from therapy transcripts via multi-agent pipeline.', status: 'shipped' as Status },
      { title: 'DSM-5 / ICD-10 Assessment', desc: 'Diagnostic suggestions with confidence scores and supporting criteria.', status: 'shipped' as Status },
      { title: 'Risk Flag Detection', desc: 'Suicidal ideation, medication non-compliance, and crisis signal identification.', status: 'shipped' as Status },
      { title: 'PDF Export', desc: 'Branded PDF with full SOAP note and risk summary.', status: 'shipped' as Status },
      { title: 'Demo Mode', desc: 'Synthetic session experience with no login required.', status: 'shipped' as Status },
    ],
  },
  {
    period: 'Q2 2026 — Now',
    items: [
      { title: 'Razorpay Payment Integration', desc: 'UPI QR + card checkout for Indian clinicians. Pro and Team plans.', status: 'shipped' as Status },
      { title: 'Legal & Compliance Pages', desc: 'Privacy, Terms, GDPR, Cookie Policy, and Security pages.', status: 'shipped' as Status },
      { title: 'SEO & Sitemap', desc: 'Sitemap.xml, robots.txt, structured data, and OG images.', status: 'shipped' as Status },
      { title: 'Treatment Plan Drafting', desc: 'AI-generated treatment goals, interventions, and follow-up actions.', status: 'in-progress' as Status },
      { title: 'Custom Note Templates', desc: 'Clinicians can define their own SOAP structure and preferred verbosity.', status: 'in-progress' as Status },
      { title: 'Audit Logs (Team Plan)', desc: '90-day audit trail for all data access and modification events.', status: 'planned' as Status },
    ],
  },
  {
    period: 'Q3 2026 — Coming Next',
    items: [
      { title: 'Voice-to-Transcript', desc: 'Real-time transcription from session audio using Whisper / Gemini Live.', status: 'planned' as Status },
      { title: 'EHR Integration (FHIR)', desc: 'Push completed SOAP notes directly into Epic, Athena, and SimplePractice via FHIR API.', status: 'planned' as Status },
      { title: 'Team Workspace', desc: 'Multi-clinician accounts with shared session review and supervisor approval.', status: 'planned' as Status },
      { title: 'Mobile App (iOS & Android)', desc: 'Native mobile experience for documentation on the go.', status: 'planned' as Status },
      { title: 'Community Forum', desc: 'Peer discussion, template sharing, and clinical documentation Q&A.', status: 'planned' as Status },
    ],
  },
  {
    period: 'Future — Exploring',
    items: [
      { title: 'Video Tutorials Library', desc: 'Step-by-step guides for onboarding, SOAP workflows, and integrations.', status: 'exploring' as Status },
      { title: 'AI Supervision Assistant', desc: 'Automated case conceptualisation support for clinical supervisors.', status: 'exploring' as Status },
      { title: 'Multi-language Support', desc: 'SOAP generation in Hindi, Spanish, French, and other languages.', status: 'exploring' as Status },
      { title: 'SSO / SAML (Enterprise)', desc: 'Single sign-on for health systems and large practice groups.', status: 'exploring' as Status },
      { title: 'Outcome Measurement Tools', desc: 'Integrated PHQ-9, GAD-7, and PCL-5 scoring linked to session notes.', status: 'exploring' as Status },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/ehr-icon.png" alt="EHR Copilot" className="h-8 w-8 rounded-lg" />
            <span className="text-[15px] font-bold text-gray-900">EHR Copilot</span>
          </Link>
          <Link href="/" className="text-[13px] text-gray-500 hover:text-gray-900 transition-colors">← Back to home</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        {/* Hero */}
        <div className="mb-14 border-b border-gray-100 pb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-green-700 mb-4">Product</span>
          <h1 className="text-[42px] font-bold tracking-tight text-gray-900 mb-3">Roadmap</h1>
          <p className="text-[16px] text-gray-500 max-w-[560px] mb-6">Here is what we are building — and what is coming next. We ship fast and listen to clinicians.</p>
          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {(Object.entries(statusConfig) as [Status, typeof statusConfig[Status]][]).map(([, cfg]) => (
              <div key={cfg.label} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
                <span className="text-[12px] text-gray-500">{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quarters */}
        <div className="space-y-14">
          {quarters.map((q) => (
            <section key={q.period}>
              <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-5">{q.period}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {q.items.map((item) => {
                  const cfg = statusConfig[item.status];
                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-gray-100 bg-gray-50/50 px-5 py-4 hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="font-semibold text-gray-900 text-[14px] leading-snug">{item.title}</p>
                        <span className={`flex-shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-500 leading-[1.6]">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Suggest */}
        <div className="mt-16 rounded-2xl border border-green-100 bg-green-50 px-8 py-8 text-center">
          <h3 className="text-[18px] font-semibold text-green-900 mb-2">Have a feature request?</h3>
          <p className="text-[14px] text-green-700 mb-5">We build based on clinician feedback. Tell us what would make EHR Copilot better for your practice.</p>
          <a
            href="mailto:feedback@ehr.life"
            className="inline-flex items-center gap-2 rounded-full bg-green-600 px-6 py-2.5 text-[14px] font-semibold text-white hover:bg-green-700 transition-colors"
          >
            Send feedback →
          </a>
        </div>
      </main>

      <footer className="border-t border-gray-100 mt-16 py-8 text-center text-[12px] text-gray-400">
        <p>© 2026 EHR Copilot Inc. · <Link href="/terms" className="hover:text-gray-700">Terms</Link> · <Link href="/privacy" className="hover:text-gray-700">Privacy</Link> · <Link href="/changelog" className="hover:text-gray-700">Changelog</Link></p>
      </footer>
    </div>
  );
}
