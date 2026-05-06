'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SOAPSection as SOAPSectionType } from '@/lib/types';
import { useSessionStore } from '@/lib/store/sessionStore';
import { ConfidenceBar } from '../ConfidenceBar';
import { ProvenanceTag } from '../ProvenanceTag';
import { FeedbackInput } from './FeedbackInput';
import { StreamingRevision } from './StreamingRevision';
import { DependencyWarning } from './DependencyWarning';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { ObjectiveBarometerPanel } from './ObjectiveBarometerPanel';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type SectionKey = 'subjective' | 'objective' | 'assessment' | 'plan';
type UIState = 'draft' | 'revising' | 'editing' | 'approved';

interface SOAPSectionProps {
  section: SectionKey;
  soapSection: SOAPSectionType;
  transcript: string;
  approvedSections: Record<string, unknown>;
  onApprove: () => void;
  onEdit: (content: string) => void;
  onRevisionComplete?: (result: { content: string; confidence: number; provenanceTag: string }) => void;
}

const SECTION_LABELS: Record<SectionKey, string> = {
  subjective: 'Subjective',
  objective: 'Objective',
  assessment: 'Assessment',
  plan: 'Plan',
};

const SECTION_DESCRIPTIONS: Record<SectionKey, string> = {
  subjective: "Patient's reported symptoms, history, and chief complaint",
  objective: 'Measurable clinical findings and observable data',
  assessment: 'Clinical interpretation and diagnostic impressions',
  plan: 'Treatment strategy and follow-up recommendations',
};

const UPSTREAM: Record<SectionKey, SectionKey[]> = {
  subjective: [],
  objective: [],
  assessment: ['subjective', 'objective'],
  plan: ['assessment'],
};

// â”€â”€â”€ Shared Section Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SectionHeader({
  section,
  currentSection,
  customStatus,
}: {
  section: SectionKey;
  currentSection: SOAPSectionType;
  customStatus?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[24px] font-bold tracking-tight leading-tight text-gray-900 sm:text-[28px]">
            {SECTION_LABELS[section]}
          </h2>
          <p className="text-[13px] text-gray-500 mt-1">{SECTION_DESCRIPTIONS[section]}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3 pt-1">
          {customStatus || <ProvenanceTag soapSection={currentSection} />}
        </div>
      </div>
      <div className="max-w-sm">
        <ConfidenceBar value={currentSection.confidence} />
      </div>
    </div>
  );
}

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function SOAPSection({
  section,
  soapSection,
  transcript,
  approvedSections,
  onApprove,
  onEdit,
  onRevisionComplete,
}: SOAPSectionProps) {
  const [uiState, setUiState] = useState<UIState>(
    soapSection.status === 'approved' ? 'approved' : 'draft'
  );
  const [currentContent, setCurrentContent] = useState(soapSection.content);
  const [currentSection, setCurrentSection] = useState<SOAPSectionType>(soapSection);
  const [editBuffer, setEditBuffer] = useState(soapSection.content);
  const [feedback, setFeedback] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [streamDone, setStreamDone] = useState(false);
  const [citationsOpen, setCitationsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [revisionRounds, setRevisionRounds] = useState(soapSection.revisionRounds);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const invalidatedSections = useSessionStore((s) => s.invalidatedSections);
  const clearInvalidated = useSessionStore((s) => s.clearInvalidated);
  const invalidateDownstream = useSessionStore((s) => s.invalidateDownstreamSections);
  const sessionInput = useSessionStore((s) => s.input);

  const isInvalidated = invalidatedSections.includes(section as any);
  const upstreamForWarning = UPSTREAM[section].find((u) => invalidatedSections.includes(u as any));

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [editBuffer, uiState]);

  const handleApprove = useCallback(() => {
    setUiState('approved');
    setCurrentSection((prev) => ({ ...prev, status: 'approved', provenanceTag: 'approved' }));
    onApprove();
  }, [onApprove]);

  const handleSaveEdit = useCallback(() => {
    const trimmed = editBuffer.trim();
    if (!trimmed) return;
    setCurrentContent(trimmed);
    setCurrentSection((prev) => ({ ...prev, content: trimmed, status: 'edited', provenanceTag: 'clinician_edited' }));
    onEdit(trimmed);
    invalidateDownstream(section as any);
    setUiState('draft');
  }, [editBuffer, onEdit, invalidateDownstream, section]);

  const handleStartRevision = useCallback(() => {
    setIsStreaming(true);
    setStreamDone(false);
    setStreamedContent('');
    setUiState('revising');
  }, []);

  // Used by DependencyWarning â€” auto-fills feedback for synchronization
  const handleSyncRevision = useCallback(() => {
    clearInvalidated(section as any);
    setFeedback(`Re-synchronize the ${SECTION_LABELS[section]} section with the latest approved upstream context.`);
    setIsStreaming(true);
    setStreamDone(false);
    setStreamedContent('');
    setUiState('revising');
  }, [section, clearInvalidated]);

  const handleStreamComplete = useCallback(
    (result: { content: string; confidence: number; provenanceTag: string }) => {
      setIsStreaming(false);
      setStreamDone(true);
      setStreamedContent(result.content);
      setRevisionRounds((r) => r + 1);
      setCurrentSection((prev) => ({
        ...prev,
        content: result.content,
        confidence: result.confidence,
        provenanceTag: 'ai_revised',
        revisionRounds: prev.revisionRounds + 1,
        status: 'revised',
      }));
    },
    []
  );

  const handleApproveStreamedVersion = useCallback(() => {
    const newContent = streamedContent || currentContent;
    setCurrentContent(newContent);
    setCurrentSection((prev) => ({ ...prev, content: newContent, status: 'revised', provenanceTag: 'ai_revised' }));
    onRevisionComplete?.({
      content: newContent,
      confidence: currentSection.confidence,
      provenanceTag: currentSection.provenanceTag,
    });
    setFeedback('');
    setStreamDone(false);
    setStreamedContent('');
    clearInvalidated(section as any);
    setUiState('draft');
  }, [streamedContent, currentContent, currentSection.confidence, currentSection.provenanceTag, onRevisionComplete, clearInvalidated, section]);

  const handleReviseAgain = useCallback(() => {
    setStreamDone(false);
    setIsStreaming(false);
    setFeedback('');
  }, []);

  const isLowConfidence = currentSection.confidence < 0.75;
  const canApproveDirectly = !isLowConfidence || revisionRounds > 0;

  // Fullscreen modal â€” classic popup with blurred backdrop
  const FullscreenModal = fullscreen ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200"
      style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.35)' }}
      onClick={(e) => { if (e.target === e.currentTarget) setFullscreen(false); }}
      onKeyDown={(e) => e.key === 'Escape' && setFullscreen(false)}
      tabIndex={-1}
    >
      {/* Floating panel */}
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Panel header */}
        <div className="flex-shrink-0 flex items-center justify-between px-8 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-[18px] font-bold text-gray-900">{SECTION_LABELS[section]}</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">{SECTION_DESCRIPTIONS[section]}</p>
          </div>
          <button
            onClick={() => setFullscreen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Scrollable text */}
        <div className="flex-1 overflow-y-auto px-8 py-7">
          <MarkdownContent content={currentContent} />
        </div>
      </div>
    </div>
  ) : null;

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // STATE A â€” Draft
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (uiState === 'draft') {
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-500">
        {/* Fullscreen modal â€” rendered at layout root so fixed positioning isn't clipped */}
        {FullscreenModal}

        {/* Header */}
        <SectionHeader section={section} currentSection={currentSection} />

        {isInvalidated && upstreamForWarning && (
        <DependencyWarning
            sectionName={section}
            upstreamSection={upstreamForWarning}
            onRegenerate={handleSyncRevision}
            onKeep={() => clearInvalidated(section as any)}
          />
        )}

        {/* Standard-width card with actions below */}
        <div className="flex flex-1 min-h-0 flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">

          {/* Content card (scrollable) */}
          <div className="group flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0 relative">
            {/* Fullscreen icon â€” appears on hover */}
            <button
              onClick={() => setFullscreen(true)}
              className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 shadow-sm"
              title="Fullscreen"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>

            {isLowConfidence && (
              <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 flex items-center gap-3 flex-shrink-0">
                <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-[12px] font-semibold text-amber-700">
                  Low confidence â€” review carefully or refine with AI before approving
                </span>
              </div>
            )}

            {/* Scrollable text */}
            <div className="flex-1 overflow-y-auto px-8 py-7 scrollbar-hide">
              <MarkdownContent content={currentContent} />
            </div>

            {/* Citations footer */}
            {currentSection.sourceCitations.length > 0 && (
              <div className="border-t border-gray-100 px-8 py-4 flex-shrink-0">
                <button
                  onClick={() => setCitationsOpen((p) => !p)}
                  className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 hover:text-gray-700 uppercase tracking-widest transition-colors"
                >
                  <svg className={`w-3.5 h-3.5 transition-transform ${citationsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {citationsOpen ? 'Hide Citations' : `Show Citations (${currentSection.sourceCitations.length})`}
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${citationsOpen ? 'max-h-60 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                  <ul className="space-y-2">
                    {currentSection.sourceCitations.map((c, i) => (
                      <li key={i} className="text-[12px] text-gray-500 bg-gray-50 border border-gray-100 p-3 rounded-xl flex gap-3">
                        <span className="text-gray-300 font-mono text-[10px] mt-0.5 flex-shrink-0">{i + 1}</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* â”€â”€ Stacked action buttons (right column) */}
          <div className="grid flex-shrink-0 grid-cols-1 gap-3 sm:grid-cols-3 lg:sticky lg:top-0 lg:grid-cols-1">
            <button
              onClick={() => { setEditBuffer(currentContent); setUiState('editing'); }}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white py-5 text-[13px] font-semibold text-gray-600 transition-all hover:border-gray-300 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Note
            </button>

            <button
              onClick={() => setUiState('revising')}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border border-purple-200 bg-purple-50 py-5 text-[13px] font-semibold text-purple-600 transition-all hover:bg-purple-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refine with AI
            </button>

            <button
              onClick={handleApprove}
              disabled={!canApproveDirectly}
              className={`flex w-full flex-col items-center gap-2 rounded-2xl py-5 text-[13px] font-bold transition-all duration-300 ${
                canApproveDirectly
                  ? 'bg-gray-900 text-white hover:bg-green-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Approve
            </button>
          </div>
        </div>

        {/* Barometer panel â€” Objective section only */}
        {section === 'objective' && soapSection.barometers && (
          <ObjectiveBarometerPanel barometers={soapSection.barometers} />
        )}
      </div>
    );
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // STATE B â€” Revision mode
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (uiState === 'revising') {
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-500">
        {/* Header */}
        <SectionHeader
          section={section}
          currentSection={currentSection}
          customStatus={
            <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-[11px] font-bold text-purple-700">AI Refinement</span>
            </div>
          }
        />

        {isInvalidated && upstreamForWarning && (
          <DependencyWarning sectionName={section} upstreamSection={upstreamForWarning} onRegenerate={() => {}} onKeep={() => clearInvalidated(section as any)} />
        )}

        {/* Two-column layout â€” same grid as draft/editing/approved */}
        <div className="flex flex-1 min-h-0 flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">

          {/* Left: original preview (dimmed) + feedback input stacked */}
          <div className="flex flex-col gap-4 min-h-0">

            {/* Dimmed original */}
            <div className="max-h-52 overflow-hidden opacity-55 pointer-events-none">
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                <div className="max-h-52 overflow-y-auto px-6 py-5 scrollbar-hide">
                  <MarkdownContent content={currentContent} className="opacity-60" />
                </div>
              </div>
            </div>

            {/* Feedback input â€” hidden while streaming or done */}
            {!isStreaming && !streamDone && (
              <div className="flex-shrink-0">
                <FeedbackInput value={feedback} onChange={setFeedback} onSubmit={handleStartRevision} isStreaming={isStreaming} />
                <div className="mt-3 flex justify-start">
                  <button
                    onClick={() => setUiState('draft')}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Cancel Refinement
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right col: streaming output */}
          <div className="flex flex-col gap-3 min-h-0 lg:sticky lg:top-0">
            {!isStreaming && !streamDone && (
              <div className="flex flex-col items-center justify-center h-48 rounded-2xl border border-dashed border-purple-200 bg-purple-50/40 text-purple-400 text-[12px] font-medium gap-2">
                <svg className="w-6 h-6 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                Refined version will appear here
              </div>
            )}
            {(isStreaming || streamDone) && (
              <>
                <div className="flex-1 min-h-0">
                  <StreamingRevision requestBody={{ section, currentDraft: currentContent, feedback, approvedSections, transcript, patientContext: { age: sessionInput?.patient.age ?? 0, gender: sessionInput?.patient.gender ?? '', knownDiagnoses: sessionInput?.patient.knownDiagnoses ?? [], sessionType: sessionInput?.session.sessionType ?? 'follow_up', currentMedications: sessionInput?.patient.currentMedications ?? [] }, currentRevisionRounds: revisionRounds }} onComplete={handleStreamComplete} onStop={() => setIsStreaming(false)} isActive={isStreaming} />
                </div>
                {streamDone && !isStreaming && (
                  <div className="flex flex-col gap-3 flex-shrink-0 pt-1 sm:flex-row sm:items-center sm:justify-end">
                    <button onClick={handleReviseAgain} className="text-[12px] font-semibold text-gray-500 border border-gray-200 bg-white px-5 py-2.5 rounded-xl hover:border-gray-300 hover:text-gray-700 transition-all">Discard &amp; Try Again</button>
                    <button onClick={handleApproveStreamedVersion} className="flex items-center justify-center gap-2 px-7 py-2.5 bg-gray-900 text-white rounded-xl text-[12px] font-bold hover:bg-green-700 transition-all duration-300"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>Accept Revision</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // STATE C â€” Direct edit
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (uiState === 'editing') {
    return (
      <div className="flex flex-col h-full animate-in fade-in duration-500">
        <SectionHeader
          section={section}
          currentSection={currentSection}
          customStatus={
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span className="text-[11px] font-bold text-blue-700">Editing</span>
            </div>
          }
        />

        {/* Fullscreen edit modal */}
        {fullscreen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200"
            style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.35)' }}
            onClick={(e) => { if (e.target === e.currentTarget) setFullscreen(false); }}
          >
            <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl h-[82vh] animate-in zoom-in-95 duration-200 overflow-hidden">
              {/* Modal header */}
              <div className="flex-shrink-0 flex items-center justify-between px-8 py-5 border-b border-gray-100">
                <div>
                  <h2 className="text-[18px] font-bold text-gray-900">{SECTION_LABELS[section]} â€” Editing</h2>
                  <p className="text-[11px] text-gray-400 mt-0.5">{SECTION_DESCRIPTIONS[section]}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setUiState('draft'); setFullscreen(false); }}
                    className="text-[12px] font-semibold text-gray-500 border border-gray-200 px-4 py-2 rounded-xl hover:border-gray-300 transition-all"
                  >Cancel</button>
                  <button
                    onClick={() => { handleSaveEdit(); setFullscreen(false); }}
                    disabled={!editBuffer.trim()}
                    className="text-[12px] font-bold bg-gray-900 text-white px-5 py-2 rounded-xl hover:bg-green-700 transition-all disabled:opacity-40"
                  >Save Changes</button>
                </div>
              </div>
              {/* Textarea */}
              <textarea
                value={editBuffer}
                onChange={(e) => setEditBuffer(e.target.value)}
                className="flex-1 w-full resize-none px-10 py-8 text-[15px] text-gray-800 leading-relaxed bg-transparent focus:outline-none overflow-y-auto"
                autoFocus
              />
              <div className="bg-gray-50 px-8 py-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                <span className="text-[11px] text-gray-400">Changes require your approval before saving</span>
                <span className="text-[11px] font-mono text-gray-500">{editBuffer.length} chars</span>
              </div>
            </div>
          </div>
        )}

        {/* Standard-width textarea with actions below */}
        <div className="flex flex-1 min-h-0 flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">

          {/* Textarea card */}
          <div className="group flex-1 min-h-0 bg-white border border-green-300 rounded-2xl shadow-sm overflow-hidden flex flex-col ring-1 ring-green-200 relative">
            {/* Fullscreen icon */}
            <button
              onClick={() => setFullscreen(true)}
              className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-7 h-7 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 shadow-sm"
              title="Expand editor"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            </button>
            <textarea
              ref={textareaRef}
              value={editBuffer}
              onChange={(e) => setEditBuffer(e.target.value)}
              className="flex-1 w-full resize-none px-8 py-8 text-[15px] text-gray-800 leading-relaxed bg-transparent focus:outline-none overflow-y-auto scrollbar-hide"
              autoFocus
            />
            <div className="bg-gray-50 px-8 py-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
              <span className="text-[11px] text-gray-400">Changes require your approval before saving</span>
              <span className="text-[11px] font-mono text-gray-500">{editBuffer.length} chars</span>
            </div>
          </div>

          {/* Right action column */}
          <div className="grid flex-shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:sticky lg:top-0 lg:grid-cols-1">
            <button
              onClick={() => setUiState('draft')}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white py-5 text-[13px] font-semibold text-gray-600 transition-all hover:border-gray-300 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </button>

            <button
              onClick={handleSaveEdit}
              disabled={!editBuffer.trim()}
              className="flex w-full flex-col items-center gap-2 rounded-2xl bg-gray-900 py-5 text-[13px] font-bold text-white transition-all duration-300 hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // STATE D â€” Approved
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* Header */}
      <SectionHeader
        section={section}
        currentSection={currentSection}
        customStatus={
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
            <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[11px] font-bold text-green-700">Approved</span>
          </div>
        }
      />

      {/* Standard-width content with actions below */}
      <div className="flex flex-1 min-h-0 flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">

        {/* â”€â”€ Content card */}
        <div className="flex-1 bg-white border-l-4 border-l-green-500 border border-green-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-8 py-7 scrollbar-hide">
            <MarkdownContent content={currentContent} />
          </div>

          {currentSection.sourceCitations.length > 0 && (
            <div className="border-t border-gray-100 px-8 py-4 flex-shrink-0">
              <button
                onClick={() => setCitationsOpen((p) => !p)}
                className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 hover:text-gray-700 uppercase tracking-widest transition-colors"
              >
                <svg className={`w-3.5 h-3.5 transition-transform ${citationsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                {citationsOpen ? 'Hide Citations' : `Show Citations (${currentSection.sourceCitations.length})`}
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${citationsOpen ? 'max-h-60 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                <ul className="space-y-2">
                  {currentSection.sourceCitations.map((c, i) => (
                    <li key={i} className="text-[12px] text-gray-500 bg-gray-50 border border-gray-100 p-3 rounded-xl flex gap-3">
                      <span className="text-gray-300 font-mono text-[10px] mt-0.5 flex-shrink-0">{i + 1}</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* â”€â”€ Stacked action buttons */}
        <div className="grid flex-shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:sticky lg:top-0 lg:grid-cols-1">
          <button
            onClick={() => { setEditBuffer(currentContent); setUiState('editing'); invalidateDownstream(section as any); }}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white py-5 text-[13px] font-semibold text-gray-600 transition-all hover:border-gray-300 hover:text-gray-900"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Note
          </button>

          <button
            onClick={() => { setFeedback(''); setStreamDone(false); setStreamedContent(''); setIsStreaming(false); setUiState('revising'); }}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border border-purple-200 bg-purple-50 py-5 text-[13px] font-semibold text-purple-600 transition-all hover:bg-purple-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refine with AI
          </button>
        </div>

        {/* Barometer panel â€” Objective section only */}
      </div>

      {section === 'objective' && currentSection.barometers && (
        <ObjectiveBarometerPanel barometers={currentSection.barometers} />
      )}
    </div>
  );
}
