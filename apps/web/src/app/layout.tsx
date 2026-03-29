import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'EHR Copilot — AI Mental Health Records Assistant',
  description:
    'AI-powered clinical documentation assistant. Auto-generate SOAP notes, flag risk indicators, suggest DSM-5 diagnoses, and draft treatment plans from session transcripts.',
  keywords: ['EHR', 'mental health', 'SOAP notes', 'clinical documentation', 'AI'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body suppressHydrationWarning className="font-sans antialiased bg-white text-[#0f0f0f]">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

