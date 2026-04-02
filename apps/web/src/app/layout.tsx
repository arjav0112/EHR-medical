import type { Metadata } from 'next';
import { Inter, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

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
  title: 'EHR Copilot — AI Clinical Documentation Assistant',
  description:
    'Premium AI-powered clinical documentation assistant. Auto-generate SOAP notes, flag risk indicators, and draft treatment plans with precision.',
  keywords: ['EHR', 'mental health', 'SOAP notes', 'clinical documentation', 'AI'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable} dark`}>
      <body suppressHydrationWarning className="font-sans antialiased bg-navy text-foreground">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

