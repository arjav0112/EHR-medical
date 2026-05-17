import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'GDPR Compliance',
  description: 'EHR Copilot GDPR Compliance — your rights under the General Data Protection Regulation and how we uphold them.',
  alternates: { canonical: 'https://ehr.life/gdpr-compliance' },
};

const LAST_UPDATED = 'May 17, 2026';

const rights = [
  { right: 'Right of Access', description: 'Request a copy of all personal data we hold about you.' },
  { right: 'Right to Rectification', description: 'Correct inaccurate or incomplete personal data.' },
  { right: 'Right to Erasure', description: 'Request deletion of your personal data ("right to be forgotten").' },
  { right: 'Right to Restrict Processing', description: 'Ask us to limit how we use your data in certain circumstances.' },
  { right: 'Right to Data Portability', description: 'Receive your data in a machine-readable format.' },
  { right: 'Right to Object', description: 'Object to processing based on legitimate interests or for direct marketing.' },
  { right: 'Right to Withdraw Consent', description: 'Where processing is based on consent, withdraw it at any time.' },
];

export default function GDPRPage() {
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-green-700 mb-4">Legal</span>
          <h1 className="text-[40px] font-bold tracking-tight text-gray-900 mb-3">GDPR Compliance</h1>
          <p className="text-[14px] text-gray-400">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-10 text-[15px] leading-[1.8] text-gray-600">

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">Overview</h2>
            <p>EHR Copilot Inc. is committed to compliance with the General Data Protection Regulation (GDPR) (EU) 2016/679 for users located in the European Economic Area (EEA). This page describes our data practices and your rights under GDPR.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">Data Controller</h2>
            <p>For personal data processed in connection with your use of EHR Copilot, the data controller is:</p>
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-6 py-5 text-[14px]">
              <p className="font-semibold text-gray-900">EHR Copilot Inc.</p>
              <p className="mt-1 text-gray-500">Email: <a href="mailto:dpo@ehr.life" className="text-green-600 hover:underline">dpo@ehr.life</a></p>
              <p className="text-gray-500">Website: <a href="https://ehr.life" className="text-green-600 hover:underline">ehr.life</a></p>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">Legal Basis for Processing</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Contract performance</strong> — Processing necessary to provide the Service you signed up for.</li>
              <li><strong>Legitimate interests</strong> — Security monitoring, fraud prevention, and platform improvement.</li>
              <li><strong>Legal obligation</strong> — Where required by applicable law.</li>
              <li><strong>Consent</strong> — For optional analytics or marketing communications, which you can withdraw at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-4">Your Rights Under GDPR</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {rights.map(({ right, description }) => (
                <div key={right} className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4">
                  <p className="font-semibold text-gray-900 text-[14px]">{right}</p>
                  <p className="mt-1 text-[13px] text-gray-500">{description}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-[14px]">To exercise any of these rights, email <a href="mailto:dpo@ehr.life" className="text-green-600 hover:underline">dpo@ehr.life</a>. We will respond within 30 days. You also have the right to lodge a complaint with your local data protection authority.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">Data Transfers</h2>
            <p>If your data is transferred outside the EEA (e.g., to US-based cloud providers), we ensure appropriate safeguards are in place via Standard Contractual Clauses (SCCs) approved by the European Commission.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">Data Retention</h2>
            <p>Personal data is retained only as long as necessary for the purposes collected. Session and clinical content data is retained for 90 days; account data is deleted within 30 days of account closure.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">Contact the DPO</h2>
            <p>Our Data Protection Officer can be reached at <a href="mailto:dpo@ehr.life" className="text-green-600 hover:underline">dpo@ehr.life</a>.</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-100 mt-16 py-8 text-center text-[12px] text-gray-400">
        <p>© 2026 EHR Copilot Inc. · <Link href="/terms" className="hover:text-gray-700">Terms</Link> · <Link href="/privacy" className="hover:text-gray-700">Privacy</Link> · <Link href="/security" className="hover:text-gray-700">Security</Link></p>
      </footer>
    </div>
  );
}
