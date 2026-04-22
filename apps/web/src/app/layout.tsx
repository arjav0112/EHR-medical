import type { Metadata } from 'next';
import { Inter, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/contexts/AuthContext';
import OfflineBanner from '@/components/OfflineBanner';


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
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${cormorant.variable}`}>

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

