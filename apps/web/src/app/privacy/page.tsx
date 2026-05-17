import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'EHR Copilot Privacy Policy — how we collect, use, and protect your clinical data. HIPAA-compliant practices for mental health professionals.',
  alternates: { canonical: 'https://ehr.life/privacy' },
};

const LAST_UPDATED = 'May 17, 2026';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
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
        {/* Title */}
        <div className="mb-12 border-b border-gray-100 pb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-green-700 mb-4">Legal</span>
          <h1 className="text-[40px] font-bold tracking-tight text-gray-900 mb-3">Privacy Policy</h1>
          <p className="text-[14px] text-gray-400">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-10 text-[15px] leading-[1.8] text-gray-600">

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">1. Introduction</h2>
            <p>EHR Copilot Inc. ("we," "us," or "our") operates <strong>ehr.life</strong> — an AI-powered clinical documentation platform built for mental health professionals. We are committed to protecting the privacy and security of all information entrusted to us, including Protected Health Information (PHI) as defined under the Health Insurance Portability and Accountability Act (HIPAA).</p>
            <p>This Privacy Policy describes what data we collect, how we use it, and the rights you have over your information.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Account Data:</strong> Name, email address, professional credentials, and billing information when you register.</li>
              <li><strong>Clinical Content:</strong> Therapy session transcripts, SOAP notes, risk assessments, and treatment plans you submit for processing. This data may constitute PHI.</li>
              <li><strong>Usage Data:</strong> Log files, device type, browser, IP address, and session duration for platform improvement.</li>
              <li><strong>Payment Data:</strong> Processed through Razorpay. We never store full card numbers or UPI credentials.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To provide AI-generated SOAP notes, DSM-5 assessments, and clinical documentation.</li>
              <li>To send transactional emails (account confirmation, payment receipts).</li>
              <li>To detect security threats and prevent fraud.</li>
              <li>To comply with legal obligations, including HIPAA.</li>
            </ul>
            <p className="mt-4 rounded-xl bg-amber-50 border border-amber-100 px-5 py-4 text-[14px] text-amber-800"><strong>Important:</strong> We do <em>not</em> use your clinical content to train our AI models. Your patient data is never used for any purpose beyond delivering the service you requested.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">4. HIPAA Compliance</h2>
            <p>EHR Copilot operates as a Business Associate under HIPAA. We maintain appropriate administrative, physical, and technical safeguards for PHI, including:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>AES-256 encryption at rest for all stored data.</li>
              <li>TLS 1.3 encryption in transit.</li>
              <li>Role-based access controls and audit logs.</li>
              <li>Business Associate Agreements (BAAs) available to Pro and Team subscribers on request.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">5. Data Retention</h2>
            <p>Session data is retained for 90 days by default. You may request deletion at any time by emailing <a href="mailto:privacy@ehr.life" className="text-green-600 hover:underline">privacy@ehr.life</a>. Account data is purged within 30 days of account closure.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">6. Third-Party Services</h2>
            <p>We use the following sub-processors, each bound by a data processing agreement:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Google Cloud / Firebase</strong> — Authentication and database infrastructure.</li>
              <li><strong>Vercel</strong> — Hosting and edge network.</li>
              <li><strong>Razorpay</strong> — Payment processing (PCI-DSS Level 1 compliant).</li>
              <li><strong>OpenAI / Gemini</strong> — AI inference (zero data retention APIs).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">7. Your Rights</h2>
            <p>You have the right to access, correct, export, or delete your personal data. To exercise these rights, contact us at <a href="mailto:privacy@ehr.life" className="text-green-600 hover:underline">privacy@ehr.life</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">8. Contact</h2>
            <p>EHR Copilot Inc.<br />Email: <a href="mailto:privacy@ehr.life" className="text-green-600 hover:underline">privacy@ehr.life</a><br />Website: <a href="https://ehr.life" className="text-green-600 hover:underline">ehr.life</a></p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-100 mt-16 py-8 text-center text-[12px] text-gray-400">
        <p>© 2026 EHR Copilot Inc. · <Link href="/terms" className="hover:text-gray-700">Terms</Link> · <Link href="/privacy" className="hover:text-gray-700">Privacy</Link> · <Link href="/security" className="hover:text-gray-700">Security</Link></p>
      </footer>
    </div>
  );
}
