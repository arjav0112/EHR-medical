import type { Metadata } from 'next';
import { Inter, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/contexts/AuthContext';
import OfflineBanner from '@/components/OfflineBanner';

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'EHR Copilot',
  url: 'https://ehr.life',
  logo: 'https://ehr.life/ehr-icon.png',
  description:
    'AI-powered clinical documentation assistant. Auto-generate SOAP notes, DSM-5 assessments, risk indicators, and treatment plans for mental health professionals.',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Web',
  offers: [
    {
      '@type': 'Offer',
      name: 'Starter',
      price: '0',
      priceCurrency: 'INR',
      description: '5 sessions/month — Free forever',
    },
    {
      '@type': 'Offer',
      name: 'Pro',
      price: '2999',
      priceCurrency: 'INR',
      description: 'Unlimited sessions, priority support, custom templates',
    },
    {
      '@type': 'Offer',
      name: 'Team',
      price: '7499',
      priceCurrency: 'INR',
      description: 'Up to 10 clinicians, API access, audit logs',
    },
  ],
  creator: {
    '@type': 'Organization',
    name: 'EHR Copilot',
    url: 'https://ehr.life',
  },
};


const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://ehr.life'),
  title: {
    default: 'EHR Copilot — AI Clinical Documentation Assistant',
    template: '%s | EHR Copilot',
  },
  description:
    'Premium AI-powered clinical documentation assistant. Auto-generate SOAP notes, flag risk indicators, and draft treatment plans with precision. Built for mental health professionals.',
  keywords: [
    'EHR',
    'electronic health records',
    'mental health',
    'SOAP notes',
    'clinical documentation',
    'AI medical assistant',
    'psychotherapy notes',
    'clinical AI',
    'therapy documentation',
    'AI copilot',
  ],
  authors: [{ name: 'EHR Copilot', url: 'https://ehr.life' }],
  creator: 'EHR Copilot',
  publisher: 'EHR Copilot',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://ehr.life',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://ehr.life',
    siteName: 'EHR Copilot',
    title: 'EHR Copilot — AI Clinical Documentation Assistant',
    description:
      'Auto-generate SOAP notes, flag risk indicators, and draft treatment plans with precision. The AI copilot built for mental health professionals.',
    images: [
      {
        url: '/og-image.png', // add a 1200x630 image in /public
        width: 1200,
        height: 630,
        alt: 'EHR Copilot — AI Clinical Documentation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EHR Copilot — AI Clinical Documentation Assistant',
    description:
      'Auto-generate SOAP notes, flag risk indicators, and draft treatment plans. Built for mental health professionals.',
    images: ['/og-image.png'],
    creator: '@ehrcopilot', // update with your real handle
  },
  // Add your Google Search Console verification token here once you get it:
  // verification: {
  //   google: 'your-google-verification-token',
  // },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${cormorant.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="icon" href="/ehr-icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/ehr-icon.png" />
      </head>
      <body suppressHydrationWarning className="font-sans antialiased bg-white text-gray-900">
        <OfflineBanner />
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

