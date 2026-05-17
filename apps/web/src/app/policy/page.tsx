import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'EHR Copilot Cookie Policy — what cookies we use, why, and how to control them.',
  alternates: { canonical: 'https://ehr.life/policy' },
};

const LAST_UPDATED = 'May 17, 2026';

const cookies = [
  { name: '__session', type: 'Essential', duration: 'Session', purpose: 'Maintains your authenticated session.' },
  { name: 'sb-access-token', type: 'Essential', duration: '1 hour', purpose: 'Auth token for API requests.' },
  { name: '_vercel_analytics', type: 'Analytics', duration: '30 days', purpose: 'Anonymous page-view analytics. No personal data stored.' },
  { name: 'rzp_*', type: 'Payment', duration: 'Session', purpose: 'Razorpay checkout session cookie.' },
  { name: 'theme_pref', type: 'Preference', duration: '1 year', purpose: 'Stores your UI preferences.' },
];

export default function CookiePolicyPage() {
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
          <h1 className="text-[40px] font-bold tracking-tight text-gray-900 mb-3">Cookie Policy</h1>
          <p className="text-[14px] text-gray-400">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="space-y-10 text-[15px] leading-[1.8] text-gray-600">
          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">What Are Cookies?</h2>
            <p>Cookies are small text files placed on your device when you visit a website. They help us keep you logged in, remember your preferences, and understand how the platform is used.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-4">Cookies We Use</h2>
            <div className="overflow-hidden rounded-2xl border border-gray-100">
              <table className="w-full text-[13px]">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold text-gray-700">Cookie</th>
                    <th className="px-5 py-3.5 font-semibold text-gray-700">Type</th>
                    <th className="px-5 py-3.5 font-semibold text-gray-700">Duration</th>
                    <th className="px-5 py-3.5 font-semibold text-gray-700">Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cookies.map((c) => (
                    <tr key={c.name} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4 font-mono text-[12px] text-green-700">{c.name}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          c.type === 'Essential' ? 'bg-green-50 text-green-700' :
                          c.type === 'Analytics' ? 'bg-blue-50 text-blue-700' :
                          c.type === 'Payment' ? 'bg-orange-50 text-orange-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{c.type}</span>
                      </td>
                      <td className="px-5 py-4 text-gray-500">{c.duration}</td>
                      <td className="px-5 py-4 text-gray-500">{c.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">Managing Cookies</h2>
            <p>You can control cookies through your browser settings. Disabling essential cookies will prevent you from using the platform.</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li><strong>Chrome:</strong> Settings → Privacy &amp; Security → Cookies</li>
              <li><strong>Firefox:</strong> Settings → Privacy &amp; Security → Cookies and Site Data</li>
              <li><strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
              <li><strong>Edge:</strong> Settings → Cookies and Site Permissions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">No Tracking Cookies</h2>
            <p>We do not use third-party advertising or cross-site tracking cookies. We do not sell your data. Analytics are anonymous and aggregated via Vercel Analytics, compliant with GDPR.</p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-gray-900 mb-3">Contact</h2>
            <p>Questions? Email <a href="mailto:privacy@ehr.life" className="text-green-600 hover:underline">privacy@ehr.life</a>.</p>
          </section>
        </div>
      </main>

      <footer className="border-t border-gray-100 mt-16 py-8 text-center text-[12px] text-gray-400">
        <p>© 2026 EHR Copilot Inc. · <Link href="/terms" className="hover:text-gray-700">Terms</Link> · <Link href="/privacy" className="hover:text-gray-700">Privacy</Link> · <Link href="/security" className="hover:text-gray-700">Security</Link></p>
      </footer>
    </div>
  );
}
