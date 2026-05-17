import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Security',
  description: 'EHR Copilot Security — how we protect your clinical data with HIPAA-compliant encryption, access controls, and infrastructure security.',
  alternates: { canonical: 'https://ehr.life/security' },
};

const LAST_UPDATED = 'May 17, 2026';

const measures = [
  {
    icon: '🔐',
    title: 'Encryption at Rest',
    description: 'All data is encrypted using AES-256. Database backups are also encrypted before storage.',
  },
  {
    icon: '🔒',
    title: 'Encryption in Transit',
    description: 'All connections use TLS 1.3. We enforce HTTPS across all endpoints with HSTS headers.',
  },
  {
    icon: '🛡️',
    title: 'HIPAA Safeguards',
    description: 'Administrative, physical, and technical safeguards per HIPAA §164.312. BAAs available on request.',
  },
  {
    icon: '🔑',
    title: 'Access Controls',
    description: 'Role-based access control (RBAC). Clinicians can only access their own session data.',
  },
  {
    icon: '📋',
    title: 'Audit Logs',
    description: 'Comprehensive audit trails for all data access and modification events. Retained 90 days (Team plan).',
  },
  {
    icon: '🏗️',
    title: 'Infrastructure',
    description: 'Hosted on Vercel (SOC 2 Type II) and Google Cloud (ISO 27001, SOC 2). No single point of failure.',
  },
  {
    icon: '🤖',
    title: 'AI Data Isolation',
    description: 'Clinical content sent to AI APIs uses zero-data-retention endpoints. We never train on your data.',
  },
  {
    icon: '🚨',
    title: 'Incident Response',
    description: 'We maintain an incident response plan. Affected users are notified within 72 hours of a confirmed breach.',
  },
];

export default function SecurityPage() {
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
        <div className="mb-12 border-b border-gray-100 pb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-green-700 mb-4">Security</span>
          <h1 className="text-[40px] font-bold tracking-tight text-gray-900 mb-3">Security at EHR Copilot</h1>
          <p className="text-[16px] text-gray-500 max-w-[560px]">Protecting your clinical data is our highest priority. Here is how we keep your information safe at every layer.</p>
          <p className="text-[14px] text-gray-400 mt-4">Last updated: {LAST_UPDATED}</p>
        </div>

        {/* Security measures grid */}
        <div className="grid gap-4 sm:grid-cols-2 mb-14">
          {measures.map(({ icon, title, description }) => (
            <div key={title} className="rounded-2xl border border-gray-100 bg-gray-50/50 px-6 py-5 hover:border-gray-200 transition-colors">
              <div className="flex items-start gap-4">
                <span className="text-[28px] flex-shrink-0">{icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-[15px]">{title}</p>
                  <p className="mt-1 text-[13px] text-gray-500 leading-[1.65]">{description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-10 text-[15px] leading-[1.8] text-gray-600">

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">Vulnerability Disclosure</h2>
            <p>We take security reports seriously. If you discover a vulnerability, please disclose it responsibly by emailing <a href="mailto:security@ehr.life" className="text-green-600 hover:underline">security@ehr.life</a>. Do not publicly disclose the issue until we have had the opportunity to address it. We aim to acknowledge reports within 24 hours and resolve critical issues within 7 days.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">Payment Security</h2>
            <p>All payments are processed by <strong>Razorpay</strong> (PCI-DSS Level 1 compliant). We never store card numbers, CVVs, or UPI PINs. Payment data is tokenized and handled entirely by Razorpay&apos;s secure infrastructure.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">Penetration Testing</h2>
            <p>We conduct periodic security assessments and penetration tests. Results are reviewed by our engineering team and critical findings are remediated before each major release.</p>
          </section>

          <section className="rounded-2xl bg-green-50 border border-green-100 px-6 py-6">
            <h2 className="text-[18px] font-semibold text-green-900 mb-2">Report a Security Issue</h2>
            <p className="text-[14px] text-green-800">Email <a href="mailto:security@ehr.life" className="font-semibold underline">security@ehr.life</a> with details of the vulnerability. We will respond within 24 hours. Please include steps to reproduce, potential impact, and any supporting evidence.</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-100 mt-16 py-8 text-center text-[12px] text-gray-400">
        <p>© 2026 EHR Copilot Inc. · <Link href="/terms" className="hover:text-gray-700">Terms</Link> · <Link href="/privacy" className="hover:text-gray-700">Privacy</Link> · <Link href="/security" className="hover:text-gray-700">Security</Link></p>
      </footer>
    </div>
  );
}
