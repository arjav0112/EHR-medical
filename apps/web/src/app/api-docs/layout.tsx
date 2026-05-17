import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Documentation',
  description:
    'EHR Copilot REST API documentation. Integrate AI SOAP note generation, DSM-5 assessment, and risk scoring directly into your clinical workflow or EHR system.',
  alternates: {
    canonical: 'https://ehr.life/api-docs',
  },
  openGraph: {
    url: 'https://ehr.life/api-docs',
    title: 'API Docs | EHR Copilot',
    description:
      'Integrate AI clinical documentation into your EHR system. Full REST API reference for SOAP notes, DSM-5 assessment, and risk scoring.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};

export default function ApiDocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
