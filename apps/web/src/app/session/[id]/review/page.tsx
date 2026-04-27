import Link from 'next/link';
import SectionNav from '@/components/review/SectionNav';
import SectionContent from '@/components/review/SectionContent';

function Navbar({ sessionId }: { sessionId: string }) {
  return (
    <header className="fixed top-3 left-0 right-0 z-50 flex justify-center px-4 sm:top-4">
      <div className="flex min-h-[58px] w-full max-w-[900px] items-center justify-between rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-[0_2px_20px_rgba(0,0,0,0.10)] sm:h-[58px] sm:rounded-full sm:px-5 sm:py-0">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </span>
          <span className="text-[16px] font-bold text-gray-900 tracking-tight">EHR Copilot</span>
        </Link>

        {/* Center — breadcrumb */}
        <div className="flex items-center gap-2 text-[11px] sm:text-[12px]">
          <span className="hidden text-gray-400 font-medium sm:inline">New Session</span>
          <svg className="hidden w-3.5 h-3.5 text-gray-300 sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold text-green-600">Clinical Review</span>
        </div>

        {/* Right — session ID */}
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Session</span>
          <span className="text-[11px] font-mono font-bold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full truncate max-w-[160px]">
            {sessionId}
          </span>
        </div>
      </div>
    </header>
  );
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = await params;

  return (
    <div className="relative flex min-h-screen flex-col lg:h-screen">
      <Navbar sessionId={sessionId} />

      {/* Two-panel layout — pushed down by navbar */}
      <div className="relative z-10 flex flex-1 flex-col overflow-visible pt-[74px] pb-4 lg:flex-row lg:overflow-hidden lg:pt-[78px] lg:pr-4">
        <SectionNav sessionId={sessionId} />
        <SectionContent sessionId={sessionId} />
      </div>

      {/* Mountain background — fixed to viewport bottom, covers white space */}
      <div className="fixed bottom-0 left-0 right-0 h-[320px] z-0 pointer-events-none">
        <div
          className="absolute inset-x-0 top-0 h-[120px] z-10"
          style={{ background: 'linear-gradient(to bottom, rgb(249 250 251), transparent)' }}
        />
        <img
          src="/mountain.png"
          alt=""
          className="w-full h-full object-cover object-bottom"
          style={{ opacity: 0.8 }}
        />
      </div>
    </div>
  );
}
