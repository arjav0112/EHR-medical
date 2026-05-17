import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'EHR Copilot Terms of Service — understand your rights and obligations when using our AI clinical documentation platform.',
  alternates: { canonical: 'https://ehr.life/terms' },
};

const LAST_UPDATED = 'May 17, 2026';

export default function TermsPage() {
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
          <h1 className="text-[40px] font-bold tracking-tight text-gray-900 mb-3">Terms of Service</h1>
          <p className="text-[14px] text-gray-400">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-10 text-[15px] leading-[1.8] text-gray-600">

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using EHR Copilot ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the Service. These Terms apply to all users including clinicians, administrators, and organization accounts.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>EHR Copilot provides AI-assisted clinical documentation tools including but not limited to: SOAP note generation, DSM-5 and ICD-10 assessment suggestions, risk stratification, and treatment plan drafting. The Service is intended solely as a documentation aid and does not constitute medical advice.</p>
            <p className="mt-3 rounded-xl bg-blue-50 border border-blue-100 px-5 py-4 text-[14px] text-blue-800"><strong>Notice:</strong> AI-generated content must be reviewed and approved by a licensed clinician before use in any patient record. EHR Copilot is a tool, not a replacement for clinical judgment.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">3. Eligibility</h2>
            <p>You must be at least 18 years old and a licensed or supervised healthcare professional (or acting on behalf of one) to use the Service for clinical purposes. Use by unauthorized individuals is strictly prohibited.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">4. User Accounts</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must notify us immediately of any unauthorized access at <a href="mailto:security@ehr.life" className="text-green-600 hover:underline">security@ehr.life</a>.</li>
              <li>One person may not maintain more than one free account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">5. Subscription & Billing</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Paid plans are billed monthly or annually as selected at checkout.</li>
              <li>You may cancel at any time. Cancellation takes effect at the end of the current billing period.</li>
              <li>All payments are processed by Razorpay. We do not store payment credentials.</li>
              <li>Refunds are at our discretion. Contact <a href="mailto:billing@ehr.life" className="text-green-600 hover:underline">billing@ehr.life</a> within 7 days of a charge for refund requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">6. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>Use the Service to process data of real patients without appropriate authorization.</li>
              <li>Attempt to reverse-engineer, scrape, or extract our AI models.</li>
              <li>Share login credentials or API keys with unauthorized parties.</li>
              <li>Use the Service for any unlawful purpose or in violation of HIPAA.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">7. Intellectual Property</h2>
            <p>All content, features, and functionality of the Service — including the AI models, interface, and documentation — are owned by EHR Copilot Inc. Your clinical content remains your property. By submitting content for processing, you grant us a limited, non-exclusive license to process it solely to deliver the Service.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, EHR Copilot Inc. shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">9. Termination</h2>
            <p>We reserve the right to suspend or terminate your access for violation of these Terms, non-payment, or for any reason with 30 days&apos; notice. Upon termination, your data will be retained for 30 days then deleted.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">10. Governing Law</h2>
            <p>These Terms are governed by the laws of India. Disputes shall be subject to the exclusive jurisdiction of courts in Bengaluru, Karnataka.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">11. Contact</h2>
            <p>Questions about these Terms? Email <a href="mailto:legal@ehr.life" className="text-green-600 hover:underline">legal@ehr.life</a>.</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-100 mt-16 py-8 text-center text-[12px] text-gray-400">
        <p>© 2026 EHR Copilot Inc. · <Link href="/terms" className="hover:text-gray-700">Terms</Link> · <Link href="/privacy" className="hover:text-gray-700">Privacy</Link> · <Link href="/security" className="hover:text-gray-700">Security</Link></p>
      </footer>
    </div>
  );
}
