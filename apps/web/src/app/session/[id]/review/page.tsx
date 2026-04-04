import Link from 'next/link';
import SectionNav from '@/components/review/SectionNav';
import SectionContent from '@/components/review/SectionContent';

function Navbar({ sessionId }: { sessionId: string }) {
  return (
    <header className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
      <div className="w-full max-w-[900px] bg-white rounded-full shadow-[0_2px_20px_rgba(0,0,0,0.10)] border border-gray-100 px-5 h-[58px] flex items-center justify-between">
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
        <div className="flex items-center gap-2 text-[12px]">
          <span className="text-gray-400 font-medium">New Session</span>
          <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold text-green-600">Clinical Review</span>
        </div>

        {/* Right — session ID */}
        <div className="flex items-center gap-2">
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
    <div className="flex flex-col h-screen">
      <Navbar sessionId={sessionId} />

      {/* Two-panel layout — pushed down by navbar */}
      <div className="flex flex-1 overflow-hidden pt-[78px] pr-4 pb-4">
        <SectionNav sessionId={sessionId} />
        <SectionContent sessionId={sessionId} />
      </div>
    </div>
  );
}
