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
      <header className="bg-white border-b border-[#f0efe9] px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[13px] text-[#9ca3af] mb-0.5">
              Dashboard / Sessions / {sessionId}
            </p>
            <div className="flex items-center gap-3">
              <h1 className="text-[22px] font-semibold text-[#0f0f0f]">
                Session Review
              </h1>
              <span className="bg-[#f3f4f6] text-[#6b7280] text-[12px] px-2.5 py-0.5 rounded-full">
                {sessionId}
              </span>
            </div>
          </div>

          {/* Progress dots — rendered client-side in SectionNav header */}
          <div id="review-progress-slot" />

          {/* Export button — enabled when all approved */}
          <div id="review-export-slot" />
        </div>
      </header>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        <SectionNav sessionId={sessionId} />
        <SectionContent sessionId={sessionId} />
      </div>
    </>
  );
}
