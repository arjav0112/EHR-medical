import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple, transparent pricing for EHR Copilot. Start free with 5 sessions/month. Upgrade to Pro for unlimited sessions, custom templates, and priority support. HIPAA-compliant.',
  alternates: {
    canonical: 'https://ehr.life/pricing',
  },
  openGraph: {
    url: 'https://ehr.life/pricing',
    title: 'Pricing | EHR Copilot',
    description:
      'Start free with 5 AI SOAP note sessions/month. Upgrade to Pro or Team for unlimited clinical documentation. No hidden fees.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
