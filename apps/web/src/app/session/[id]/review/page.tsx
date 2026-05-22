import SectionNav from '@/components/review/SectionNav';
import SectionContent from '@/components/review/SectionContent';

function TopBar({ sessionId }: { sessionId: string }) {
  return (
    <header className="fixed top-0 left-0 lg:left-[290px] right-0 z-50 h-[56px] bg-white/95 backdrop-blur-sm border-b border-gray-100 flex items-center px-6 gap-3">
      {/* SlothUI header buttons */}
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-2 bg-[#0f172a] text-white px-4 py-1.5 rounded-full text-[12.5px] font-medium shadow-sm cursor-pointer hover:bg-slate-800 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </button>
        <button className="flex items-center gap-1.5 border border-gray-200 bg-white hover:bg-gray-50 px-4 py-1.5 rounded-full text-[12.5px] font-medium text-gray-700 shadow-sm cursor-pointer transition-colors">
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New
        </button>
        <a
          href="/dashboard"
          className="flex items-center gap-1.5 border border-gray-200 bg-white hover:bg-gray-50 px-4 py-1.5 rounded-full text-[12.5px] font-medium text-gray-700 shadow-sm cursor-pointer transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Reports
        </a>
      </div>

      {/* Profile greeting far right */}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-[12.5px] font-medium text-gray-700 hidden sm:inline">Hello, Dr. Wu!</span>
        <div className="w-8 h-8 rounded-full bg-[#1a9e8f] text-white flex items-center justify-center font-black text-[13px] border border-white shadow-sm">
          W
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
    <div className="fixed inset-0 flex flex-col bg-[#f8fafc] overflow-hidden">
      <TopBar sessionId={sessionId} />

      {/* Two-panel layout — pushed down by topbar, offset by fixed sidebar on desktop */}
      <div className="relative z-10 flex flex-1 flex-col pt-[56px] lg:pl-[290px] overflow-hidden">
        <SectionNav sessionId={sessionId} />
        <SectionContent sessionId={sessionId} />
      </div>
    </div>
  );
}
