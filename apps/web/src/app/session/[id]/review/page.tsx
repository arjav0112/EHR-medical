import SectionNav from '@/components/review/SectionNav';
import SectionContent from '@/components/review/SectionContent';

// Server component — gets sessionId from URL, passes to client children
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = await params;

  return (
    <>
      {/* Document header */}
      <header className="bg-navy-950/50 backdrop-blur-2xl border-b border-white/5 px-12 py-8 relative z-20">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-neon-500 uppercase tracking-widest mb-2">
              <span className="w-6 h-[1px] bg-neon-500/50" />
              Clinical Intelligence / Session Review
            </div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-serif font-medium text-white tracking-tight">
                Synthesized <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-400 to-cyan-400">Clinical Data</span>
              </h1>
              <span className="bg-white/5 border border-white/10 text-navy-300 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest backdrop-blur-sm">
                ID: {sessionId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Progress dots — rendered client-side in SectionNav header */}
            <div id="review-progress-slot" />

            {/* Export button — enabled when all approved */}
            <div id="review-export-slot" />
          </div>
        </div>
      </header>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        <SectionNav sessionId={sessionId} />
        <SectionContent sessionId={sessionId} />
      </div>
    </>
  );
}
