'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SOAPSection as SOAPSectionType } from '@/lib/types';
import { useSessionStore } from '@/lib/store/sessionStore';
import { ConfidenceBar } from '../ConfidenceBar';
import { ProvenanceTag } from '../ProvenanceTag';
import { FeedbackInput } from './FeedbackInput';
import { StreamingRevision } from './StreamingRevision';
import { DependencyWarning } from './DependencyWarning';

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionKey = 'subjective' | 'objective' | 'assessment' | 'plan';
type UIState = 'draft' | 'revising' | 'editing' | 'approved';

interface SOAPSectionProps {
  section: SectionKey;
  soapSection: SOAPSectionType;
  transcript: string;
  approvedSections: Record<string, unknown>;
  onApprove: () => void;
  onEdit: (content: string) => void;
  /** Called when a streaming revision is approved — passes back final content */
  onRevisionComplete?: (content: string) => void;
}

const SECTION_LABELS: Record<SectionKey, string> = {
  subjective: 'Subjective',
  objective: 'Objective',
  assessment: 'Assessment',
  plan: 'Plan',
};

const UPSTREAM: Record<SectionKey, SectionKey[]> = {
  subjective: [],
  objective: [],
  assessment: ['subjective', 'objective'],
  plan: ['assessment'],
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SOAPSection({
  section,
  soapSection,
  transcript,
  approvedSections,
  onApprove,
  onEdit,
  onRevisionComplete,
}: SOAPSectionProps) {
  // ── Local state ──
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
  const [revisionRounds, setRevisionRounds] = useState(soapSection.revisionRounds);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Zustand ──
  const invalidatedSections = useSessionStore((s) => s.invalidatedSections);
  const clearInvalidated = useSessionStore((s) => s.clearInvalidated);
  const invalidateDownstream = useSessionStore((s) => s.invalidateDownstreamSections);

  const isInvalidated = invalidatedSections.includes(section as Parameters<typeof clearInvalidated>[0]);

  // Upstream for dependency warning
  const upstreamForWarning = UPSTREAM[section].find(
    (u) => invalidatedSections.includes(u as Parameters<typeof clearInvalidated>[0])
  );

  // Autogrow textarea in edit mode
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [editBuffer]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleApprove = useCallback(() => {
    setUiState('approved');
    setCurrentSection((prev) => ({
      ...prev,
      status: 'approved',
      provenanceTag: 'approved',
    }));
    onApprove();
  }, [onApprove]);

  const handleSaveEdit = useCallback(() => {
    setCurrentContent(editBuffer);
    setCurrentSection((prev) => ({
      ...prev,
      content: editBuffer,
      status: 'edited',
      provenanceTag: 'clinician_edited',
    }));
    onEdit(editBuffer);
    invalidateDownstream(section as Parameters<typeof invalidateDownstream>[0]);
    setUiState('draft');
  }, [editBuffer, onEdit, invalidateDownstream, section]);

  const handleStartRevision = useCallback(() => {
    setIsStreaming(true);
    setStreamDone(false);
    setStreamedContent('');
    setUiState('revising');
  }, []);

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
    setCurrentSection((prev) => ({
      ...prev,
      content: newContent,
      status: 'approved',
      provenanceTag: 'approved',
    }));
    onRevisionComplete?.(newContent);
    onApprove();
    setUiState('approved');
    clearInvalidated(section as Parameters<typeof clearInvalidated>[0]);
  }, [streamedContent, currentContent, onApprove, onRevisionComplete, clearInvalidated, section]);

  const handleReviseAgain = useCallback(() => {
    setStreamDone(false);
    setIsStreaming(false);
    setFeedback('');
  }, []);

  const isLowConfidence = currentSection.confidence < 0.75;
  const canApproveDirectly = !isLowConfidence || revisionRounds > 0;

  // ─────────────────────────────────────────────────────────────────────────
  // STATE A — Draft
  // ─────────────────────────────────────────────────────────────────────────
  if (uiState === 'draft') {
    return (
      <div className="space-y-4">
        {/* Section header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[17px] font-bold text-[#1A1A1A]">
              {SECTION_LABELS[section]}
            </h2>
            <ProvenanceTag soapSection={currentSection} />
          </div>
          <ConfidenceBar value={currentSection.confidence} />
        </div>

        {/* Dependency warning */}
        {isInvalidated && upstreamForWarning && (
          <DependencyWarning
            sectionName={section}
            upstreamSection={upstreamForWarning}
            onRegenerate={handleStartRevision}
            onKeep={() => clearInvalidated(section as Parameters<typeof clearInvalidated>[0])}
          />
        )}

        {/* Content card */}
        <div className="bg-white border border-[#E0DDD6] rounded-xl overflow-hidden">
          {/* Low confidence banner */}
          {isLowConfidence && (
            <div className="bg-[#FFFBEB] border-b border-[#FDE68A] px-4 py-2.5 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#F59E0B] flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <span className="text-[12px] font-semibold text-[#92400E]">
                Low confidence — mandatory review before approval
              </span>
            </div>
          )}

          {/* Content */}
          <div className="px-5 py-4">
            <p className="text-[15px] text-[#1A1A1A] leading-[1.7] whitespace-pre-wrap">
              {currentContent}
            </p>
          </div>

          {/* Source citations (collapsible) */}
          {currentSection.sourceCitations.length > 0 && (
            <div className="border-t border-[#F0EDE8] px-5 py-2.5">
              <button
                onClick={() => setCitationsOpen((p) => !p)}
                className="text-[12px] text-[#6B7280] hover:text-[#4A4A4A] transition-colors"
              >
                {citationsOpen
                  ? '▲ Hide citations'
                  : `▼ Show citations (${currentSection.sourceCitations.length})`}
              </button>
              {citationsOpen && (
                <ul className="mt-2 space-y-1">
                  {currentSection.sourceCitations.map((c, i) => (
                    <li key={i} className="text-[12px] text-[#9CA3AF] font-mono">
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Action row */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => {
              setEditBuffer(currentContent);
              setUiState('editing');
            }}
            className="text-[13px] font-medium text-[#6B7280] border border-[#E0DDD6] px-4 py-2 rounded-full hover:bg-[#F5F5F5] transition-colors"
          >
            Edit directly
          </button>
          <button
            onClick={() => setUiState('revising')}
            className="text-[13px] font-semibold bg-[#6c63ff] text-white px-4 py-2 rounded-full hover:bg-[#5a52d5] transition-colors"
          >
            Revise with feedback
          </button>
          <button
            onClick={handleApprove}
            disabled={!canApproveDirectly}
            className="text-[13px] font-semibold px-4 py-2 rounded-full transition-colors
              disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF] disabled:cursor-not-allowed
              enabled:bg-[#10B981] enabled:text-white enabled:hover:bg-[#059669]"
            title={!canApproveDirectly ? 'Revise first — confidence is too low' : ''}
          >
            Approve
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE B — Revision mode
  // ─────────────────────────────────────────────────────────────────────────
  if (uiState === 'revising') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[17px] font-bold text-[#1A1A1A]">
              {SECTION_LABELS[section]}
            </h2>
            <ProvenanceTag soapSection={currentSection} />
          </div>
          <ConfidenceBar value={currentSection.confidence} />
        </div>

        {/* Original draft dimmed */}
        <div className="opacity-50 pointer-events-none">
          <div className="bg-white border border-[#E0DDD6] rounded-xl px-5 py-4">
            <p className="text-[13px] text-[#4A4A4A] leading-[1.7] whitespace-pre-wrap line-clamp-4">
              {currentContent}
            </p>
          </div>
        </div>

        {/* Dependency warning */}
        {isInvalidated && upstreamForWarning && (
          <DependencyWarning
            sectionName={section}
            upstreamSection={upstreamForWarning}
            onRegenerate={() => {}}
            onKeep={() => clearInvalidated(section as Parameters<typeof clearInvalidated>[0])}
          />
        )}

        {/* Feedback input — shown only when not streaming or when streaming is done */}
        {!isStreaming && (
          <FeedbackInput
            value={feedback}
            onChange={setFeedback}
            onSubmit={handleStartRevision}
            isStreaming={isStreaming}
          />
        )}

        {/* Streaming output */}
        {(isStreaming || streamDone) && (
          <StreamingRevision
            requestBody={{
              section,
              currentDraft: currentContent,
              feedback,
              approvedSections,
              transcript,
            }}
            onComplete={handleStreamComplete}
            onStop={() => setIsStreaming(false)}
            isActive={isStreaming}
          />
        )}

        {/* Post-stream actions */}
        {streamDone && !isStreaming && (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleReviseAgain}
              className="text-[13px] font-medium text-[#6B7280] border border-[#E0DDD6] px-4 py-2 rounded-full hover:bg-[#F5F5F5] transition-colors"
            >
              Revise again
            </button>
            <button
              onClick={handleApproveStreamedVersion}
              className="text-[13px] font-semibold bg-[#10B981] text-white px-4 py-2 rounded-full hover:bg-[#059669] transition-colors"
            >
              Approve this version
            </button>
          </div>
        )}

        {/* Cancel back to draft */}
        {!isStreaming && !streamDone && (
          <div>
            <button
              onClick={() => setUiState('draft')}
              className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
            >
              ← Cancel
            </button>
          </div>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE C — Direct edit
  // ─────────────────────────────────────────────────────────────────────────
  if (uiState === 'editing') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-[#1A1A1A]">{SECTION_LABELS[section]}</h2>
          <span className="text-[11px] font-medium text-[#3B82F6] bg-blue-50 px-2.5 py-0.5 rounded-full">
            Editing
          </span>
        </div>

        <div className="border border-[#6c63ff] rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-[#6c63ff]/20 transition-shadow">
          <textarea
            ref={textareaRef}
            value={editBuffer}
            onChange={(e) => setEditBuffer(e.target.value)}
            className="w-full resize-none px-5 py-4 text-[15px] text-[#1A1A1A] leading-[1.7] focus:outline-none bg-white min-h-[160px]"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setUiState('draft')}
            className="text-[13px] font-medium text-[#6B7280] border border-[#E0DDD6] px-4 py-2 rounded-full hover:bg-[#F5F5F5] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveEdit}
            disabled={!editBuffer.trim()}
            className="text-[13px] font-semibold bg-[#10B981] text-white px-4 py-2 rounded-full hover:bg-[#059669] transition-colors disabled:opacity-40"
          >
            Save edits
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE D — Approved
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-bold text-[#1A1A1A]">{SECTION_LABELS[section]}</h2>
        <div className="flex items-center gap-2">
          <ProvenanceTag soapSection={currentSection} />
          <span className="text-[11px] font-bold text-[#059669] bg-[#D1FAE5] px-2.5 py-0.5 rounded-full">
            ✓ Approved
          </span>
        </div>
      </div>

      {/* Green-bordered card */}
      <div className="bg-white border border-[#E0DDD6] border-l-4 border-l-[#10B981] rounded-r-xl overflow-hidden">
        <div className="px-5 py-4">
          <p className="text-[15px] text-[#1A1A1A] leading-[1.7] whitespace-pre-wrap">
            {currentContent}
          </p>
        </div>

        {/* Citations */}
        {currentSection.sourceCitations.length > 0 && (
          <div className="border-t border-[#F0EDE8] px-5 py-2">
            <button
              onClick={() => setCitationsOpen((p) => !p)}
              className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
            >
              {citationsOpen ? '▲ Hide' : `▼ Show citations (${currentSection.sourceCitations.length})`}
            </button>
            {citationsOpen && (
              <ul className="mt-1.5 space-y-1">
                {currentSection.sourceCitations.map((c, i) => (
                  <li key={i} className="text-[12px] text-[#9CA3AF] font-mono">{c}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Post-approval edit link */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditBuffer(currentContent);
            setUiState('editing');
            // Editing after approval should warn downstream
            invalidateDownstream(section as Parameters<typeof invalidateDownstream>[0]);
          }}
          className="text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
        >
          Edit ↗
        </button>
      </div>
    </div>
  );
}
