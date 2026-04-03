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
  const sessionInput = useSessionStore((s) => s.input);

  const isInvalidated = invalidatedSections.includes(section as any);

  // Upstream for dependency warning
  const upstreamForWarning = UPSTREAM[section].find(
    (u) => invalidatedSections.includes(u as any)
  );

  // Autogrow textarea in edit mode
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [editBuffer, uiState]);

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
    const trimmed = editBuffer.trim();
    if (!trimmed) return;
    
    setCurrentContent(trimmed);
    setCurrentSection((prev) => ({
      ...prev,
      content: trimmed,
      status: 'edited',
      provenanceTag: 'clinician_edited',
    }));
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
      status: 'revised',
      provenanceTag: 'ai_revised',
    }));
    onRevisionComplete?.(newContent);
    // Drop back to draft so the user can refine again — do NOT lock to 'approved'
    setFeedback('');
    setStreamDone(false);
    setStreamedContent('');
    clearInvalidated(section as any);
    setUiState('draft');
  }, [streamedContent, currentContent, onRevisionComplete, clearInvalidated, section]);

  const handleReviseAgain = useCallback(() => {
    setStreamDone(false);
    setIsStreaming(false);
    setFeedback('');
  }, []);

  const isLowConfidence = currentSection.confidence < 0.75;
  const canApproveDirectly = !isLowConfidence || revisionRounds > 0;

  // ─────────────────────────────────────────────────────────────────────────
  // SHARED HEADER
  // ─────────────────────────────────────────────────────────────────────────
  const SectionHeader = ({ customStatus }: { customStatus?: React.ReactNode }) => (
    <div className="flex items-end justify-between border-b border-white/5 pb-6 mb-8 mt-2">
      <div className="flex-1">
        <div className="flex items-center gap-4 mb-2">
           <h2 className="text-3xl font-serif font-medium text-white tracking-tight">
            {SECTION_LABELS[section]}
          </h2>
          <span className="w-1.5 h-1.5 rounded-full bg-navy-700 mx-1" />
          <div className="flex-shrink-0">
            {customStatus || <ProvenanceTag soapSection={currentSection} />}
          </div>
        </div>
        <div className="max-w-xs">
          <ConfidenceBar value={currentSection.confidence} />
        </div>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STATE A — Draft
  // ─────────────────────────────────────────────────────────────────────────
  if (uiState === 'draft') {
    return (
      <div className="space-y-8 animate-in fade-in duration-1000">
        <SectionHeader />

        {/* Dependency warning */}
        {isInvalidated && upstreamForWarning && (
          <DependencyWarning
            sectionName={section}
            upstreamSection={upstreamForWarning}
            onRegenerate={handleStartRevision}
            onKeep={() => clearInvalidated(section as any)}
          />
        )}

        {/* Content card */}
        <div className="glass-card bg-white/[0.02] border-white/10 overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          
          {/* Low confidence banner */}
          {isLowConfidence && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex items-center gap-3">
              <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span className="text-[11px] font-bold text-amber-500 uppercase tracking-widest">
                Verification Required: Confidence Index Below Threshold
              </span>
            </div>
          )}

          {/* Content */}
          <div className="p-8">
            <p className="text-[17px] text-navy-50 leading-relaxed font-serif whitespace-pre-wrap">
              {currentContent}
            </p>
          </div>

          {/* Source citations (collapsible) */}
          {currentSection.sourceCitations.length > 0 && (
            <div className="border-t border-white/5 px-8 py-5 group-hover:bg-white/[0.01] transition-colors">
              <button
                onClick={() => setCitationsOpen((p) => !p)}
                className="flex items-center gap-3 text-[10px] font-bold text-navy-500 hover:text-white uppercase tracking-widest transition-all"
              >
                <div className="w-4 h-[1px] bg-navy-700 transition-all group-hover:w-6" />
                {citationsOpen
                  ? 'Collapse Citations'
                  : `Reveal Citations (${currentSection.sourceCitations.length})`}
              </button>
              
              <div className={`overflow-hidden transition-all duration-500 ${citationsOpen ? 'max-h-96 opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
                <ul className="space-y-3">
                  {currentSection.sourceCitations.map((c, i) => (
                    <li key={i} className="text-[12px] text-cyan-500/60 font-mono bg-navy-950/40 p-3 rounded-lg border border-white/5 flex gap-3">
                       <span className="text-navy-700 text-[10px] mt-0.5">SOURCE_{i+1}</span>
                       {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Action row */}
        <div className="flex items-center justify-end gap-5 pt-4">
          <button
            onClick={() => {
              setEditBuffer(currentContent);
              setUiState('editing');
            }}
            className="text-[11px] font-bold text-navy-400 uppercase tracking-widest border border-white/10 px-8 py-3 rounded-xl hover:bg-white/5 hover:text-white transition-all"
          >
            Manual Override
          </button>
          
          <button
            onClick={() => setUiState('revising')}
            className="text-[11px] font-bold text-purple-400 uppercase tracking-widest border border-purple-500/30 px-8 py-3 rounded-xl hover:bg-purple-500/10 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] transition-all flex items-center gap-2"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Refine Block
          </button>
          
          <button
            onClick={handleApprove}
            disabled={!canApproveDirectly}
            className={`group relative px-10 py-3 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-500 overflow-hidden shadow-2xl ${
              canApproveDirectly
                ? 'bg-neon-500 text-navy-950 shadow-[0_0_30px_rgba(190,242,100,0.2)]'
                : 'bg-white/5 text-navy-600 border border-white/5 cursor-not-allowed'
            }`}
          >
            {canApproveDirectly && <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />}
            <span className="relative z-10 flex items-center gap-2">
              Commit Block
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
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
      <div className="space-y-8 animate-in fade-in duration-1000">
        <SectionHeader 
          customStatus={
            <div className="flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 px-3 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Revision Protocol</span>
            </div>
          }
        />

        {/* Original draft dimmed */}
        <div className="opacity-30 blur-[1px] pointer-events-none scale-[0.98] transition-all">
          <div className="glass-card bg-white/[0.02] border-white/10 p-8">
            <p className="text-[15px] text-white leading-relaxed font-serif whitespace-pre-wrap line-clamp-3">
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
            onKeep={() => clearInvalidated(section as any)}
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
              patientContext: {
                age: sessionInput?.patient.age ?? 0,
                gender: sessionInput?.patient.gender ?? '',
                knownDiagnoses: sessionInput?.patient.knownDiagnoses ?? [],
                sessionType: sessionInput?.session.sessionType ?? 'follow_up',
              },
              currentRevisionRounds: revisionRounds,
            }}
            onComplete={handleStreamComplete}
            onStop={() => setIsStreaming(false)}
            isActive={isStreaming}
          />
        )}

        {/* Post-stream actions */}
        {streamDone && !isStreaming && (
          <div className="flex items-center justify-end gap-5 pt-4">
            <button
              onClick={handleReviseAgain}
               className="text-[11px] font-bold text-navy-400 uppercase tracking-widest border border-white/10 px-8 py-3 rounded-xl hover:bg-white/5 hover:text-white transition-all"
            >
              Discard & Re-input
            </button>
            <button
              onClick={handleApproveStreamedVersion}
              className="group relative px-10 py-3 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all bg-neon-500 text-navy-950 shadow-[0_0_30px_rgba(190,242,100,0.2)] overflow-hidden"
            >
               <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
               <span className="relative z-10">Commit Synchronized Version</span>
            </button>
          </div>
        )}

        {/* Cancel back to draft */}
        {!isStreaming && !streamDone && (
          <div className="pt-2">
            <button
              onClick={() => setUiState('draft')}
              className="text-[10px] font-bold text-navy-600 hover:text-navy-400 uppercase tracking-[0.2em] transition-all flex items-center gap-2 group"
            >
              <span className="w-6 h-[1px] bg-navy-800 group-hover:w-10 group-hover:bg-navy-600 transition-all" />
              Abandon Revision protocol
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
      <div className="space-y-8 animate-in zoom-in-95 duration-500">
        <SectionHeader 
          customStatus={
            <div className="flex items-center gap-2 bg-cyan-500/20 border border-cyan-500/30 px-3 py-1 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Manual Override Active</span>
            </div>
          }
        />

        <div className="glass-card bg-navy-900 border-neon-500/50 shadow-[0_0_50px_rgba(190,242,100,0.05)] overflow-hidden transition-all duration-700">
          <textarea
            ref={textareaRef}
            value={editBuffer}
            onChange={(e) => setEditBuffer(e.target.value)}
            className="w-full resize-none px-8 py-8 text-[17px] text-white leading-relaxed font-serif bg-transparent focus:outline-none min-h-[300px] scrollbar-hide"
            autoFocus
          />
          <div className="bg-navy-950/80 px-8 py-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-[9px] font-bold text-navy-600 uppercase tracking-widest font-sans">Human verification required for commitment</span>
            <span className="text-[10px] font-mono text-neon-500/50">{editBuffer.length} characters cached</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-5 pt-4">
          <button
            onClick={() => setUiState('draft')}
            className="text-[11px] font-bold text-navy-400 uppercase tracking-widest border border-white/10 px-8 py-3 rounded-xl hover:bg-white/5 hover:text-white transition-all"
          >
            Cancel Changes
          </button>
          <button
            onClick={handleSaveEdit}
            disabled={!editBuffer.trim()}
            className="group relative px-10 py-3 rounded-xl text-[11px] font-bold uppercase tracking-[0.2em] transition-all bg-neon-500 text-navy-950 shadow-[0_0_30px_rgba(190,242,100,0.2)] overflow-hidden disabled:opacity-20"
          >
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative z-10 flex items-center gap-2">
              Capture & Commit
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE D — Approved
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-in slide-in-from-top-4 duration-1000">
      <SectionHeader 
        customStatus={
          <div className="flex items-center gap-2 bg-neon-500/10 border border-neon-500/30 px-3 py-1 rounded-lg shadow-[0_0_15px_rgba(190,242,100,0.1)]">
             <svg className="w-3.5 h-3.5 text-neon-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
             <span className="text-[10px] font-bold text-neon-400 uppercase tracking-widest">Protocol Finalized</span>
          </div>
        }
      />

      {/* Final locked card */}
      <div className="glass-card bg-neon-500/[0.02] border-neon-500/20 border-l-4 border-l-neon-500 overflow-hidden shadow-[0_0_40px_rgba(190,242,100,0.05)]">
        <div className="p-8">
          <p className="text-[17px] text-white/90 leading-relaxed font-serif whitespace-pre-wrap">
            {currentContent}
          </p>
        </div>

        {/* Citations */}
        {currentSection.sourceCitations.length > 0 && (
          <div className="border-t border-neon-500/10 px-8 py-5 group">
            <button
              onClick={() => setCitationsOpen((p) => !p)}
              className="flex items-center gap-3 text-[10px] font-bold text-navy-500 hover:text-white uppercase tracking-widest transition-all"
            >
              <div className="w-4 h-[1px] bg-navy-800 transition-all group-hover:w-6" />
              {citationsOpen ? 'Hide Internal Metadata' : `Show Section citations (${currentSection.sourceCitations.length})`}
            </button>
            <div className={`overflow-hidden transition-all duration-500 ${citationsOpen ? 'max-h-96 opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
               <ul className="space-y-2">
                {currentSection.sourceCitations.map((c, i) => (
                  <li key={i} className="text-[12px] text-navy-400 font-mono flex items-center gap-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-navy-800 flex-shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Post-approval action row */}
      <div className="flex items-center justify-end gap-5 pt-4">
        {/* Manual override */}
        <button
          onClick={() => {
            setEditBuffer(currentContent);
            setUiState('editing');
            invalidateDownstream(section as any);
          }}
          className="text-[11px] font-bold text-navy-400 uppercase tracking-widest border border-white/10 px-8 py-3 rounded-xl hover:bg-white/5 hover:text-white transition-all"
        >
          Manual Override
        </button>

        {/* Re-enter AI revision flow */}
        <button
          onClick={() => {
            setFeedback('');
            setStreamDone(false);
            setStreamedContent('');
            setIsStreaming(false);
            setUiState('revising');
          }}
          className="text-[11px] font-bold text-purple-400 uppercase tracking-widest border border-purple-500/30 px-8 py-3 rounded-xl hover:bg-purple-500/10 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] transition-all flex items-center gap-2"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Refine Block
        </button>
      </div>
    </div>
  );
}
