import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Demo',
  description:
    'Try EHR Copilot free — no signup required. Experience AI-generated SOAP notes, DSM-5 assessment, risk flags, and treatment plan drafting with a realistic synthetic therapy session.',
  alternates: {
    canonical: 'https://ehr.life/demo',
  },
  openGraph: {
    url: 'https://ehr.life/demo',
    title: 'Try EHR Copilot — Live Demo',
    description:
      'See full AI clinical documentation in action. Realistic therapy session, SOAP notes, risk scoring — no account needed.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
