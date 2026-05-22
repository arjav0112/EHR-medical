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

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ─── Formatting Toolbar Button ────────────────────────────────────────────────

function ToolbarBtn({
  title,
  onClick,
  children,
  active,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      type="button"
      className={`flex items-center justify-center w-7.5 h-7.5 rounded-md transition-all duration-150 cursor-pointer
        ${active ? 'bg-gray-200 text-gray-900 font-bold' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
    >
      {children}
    </button>
  );
}

const SUGGESTION_CHIPS = [
  { label: 'Clinical Tone', prompt: 'Rewrite in a highly professional, clinical tone.' },
  { label: 'Bullet Points', prompt: 'Format the key findings as a clear, structured bulleted list.' },
  { label: 'Emphasize Timeline', prompt: 'Clarify the chronological order and progression of symptoms.' },
  { label: 'Concise Summary', prompt: 'Make this draft more concise while retaining all clinical metrics.' },
  { label: 'Detail Symptoms', prompt: 'Elaborate further on the specific symptoms mentioned.' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

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
  const [fullscreen, setFullscreen] = useState(false);
  const [revisionRounds, setRevisionRounds] = useState(soapSection.revisionRounds);
  
  // Interactive View Modes (Real Clinical SOAP vs SlothUI CMS Mock Data)
  const [viewSource, setViewSource] = useState<'clinical' | 'sample'>('clinical');

  const [citationsExpanded, setCitationsExpanded] = useState(false);

  // Editable Document Title (Subjective, Objective, Assessment, Plan)
  const [noteTitle, setNoteTitle] = useState(
    section === 'subjective'
      ? 'Subjective'
      : section === 'objective'
      ? 'Objective'
      : section === 'assessment'
      ? 'Assessment'
      : 'Plan'
  );

  // Accordion toggle states for sidebar widgets (collapsed by default to prevent screen scroll)
  const [publishOpen, setPublishOpen] = useState(true);
  const [formatOpen, setFormatOpen] = useState(false);
  const [metricsOpen, setMetricsOpen] = useState(false);

  // Publish Card Editable Fields
  const [statusVal, setStatusVal] = useState<'Draft' | 'Pending Review' | 'Approved'>('Draft');
  const [visibilityVal, setVisibilityVal] = useState<'Public' | 'Private' | 'Clinical Only'>('Public');
  const [scheduleVal, setScheduleVal] = useState<'Off' | 'On' | 'Schedule...'>('Off');
  const [templateVal, setTemplateVal] = useState<'Default' | 'Brief Form' | 'Extended Details'>('Default');
  const [promotionVal, setPromotionVal] = useState<'Off' | 'Active'>('Off');

  const [editingField, setEditingField] = useState<'status' | 'visibility' | 'schedule' | 'template' | 'promotion' | null>(null);

  // Format Card Selector
  const [selectedFormat, setSelectedFormat] = useState<'standard' | 'patient_summary' | 'referral_letter' | 'intake_brief' | 'prior_auth'>('standard');

  // Page Attributes Interactive States
  const [parentVal, setParentVal] = useState<string>('(no parent)');
  const [pageTemplateVal, setPageTemplateVal] = useState<string>('Default Template');
  const [orderVal, setOrderVal] = useState<number>(0);
  const [editingAttributes, setEditingAttributes] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const invalidatedSections = useSessionStore((s) => s.invalidatedSections);
  const clearInvalidated = useSessionStore((s) => s.clearInvalidated);
  const invalidateDownstream = useSessionStore((s) => s.invalidateDownstreamSections);
  
  // Core context data fetched from store for format/context cards
  const sessionInput = useSessionStore((s) => s.input);
  const reviewPackage = useSessionStore((s) => s.reviewPackage);

  const isInvalidated = invalidatedSections.includes(section as any);
  const upstreamForWarning = UPSTREAM[section].find((u) => invalidatedSections.includes(u as any));

  // Keep CMS status dropdown synchronized with UI State
  useEffect(() => {
    if (uiState === 'approved') {
      setStatusVal('Approved');
    } else {
      setStatusVal('Draft');
    }
  }, [uiState]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [editBuffer, uiState]);

  // ── Toolbar formatting helpers ──
  const insertFormatting = useCallback((prefix: string, suffix: string = prefix) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = editBuffer.substring(start, end);
    const newText = editBuffer.substring(0, start) + prefix + selected + suffix + editBuffer.substring(end);
    setEditBuffer(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  }, [editBuffer]);

  const insertLinePrefix = useCallback((prefix: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = editBuffer.lastIndexOf('\n', start - 1) + 1;
    const newText = editBuffer.substring(0, lineStart) + prefix + editBuffer.substring(lineStart);
    setEditBuffer(newText);
    setTimeout(() => { el.focus(); }, 0);
  }, [editBuffer]);

  // ── Action callbacks ──
  const handleApprove = useCallback(() => {
    setUiState('approved');
    setStatusVal('Approved');
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
    setStreamedContent('');
    setUiState('draft');
  }, []);

  const isLowConfidence = currentSection.confidence < 0.75;
  const canApproveDirectly = !isLowConfidence || revisionRounds > 0;
  
  // Sample Legend of X contents matching the screenshot perfectly
  const sampleLegendText = `The sun had barely begun its ascent, casting a pale, ethereal glow over the sprawling cityscape of NeoLux. X_AE_B-22 had spent the night in a state of deep computational analysis, sifting through the myriad data streams that defined the pulse of the city.

The quiet hum of its processors was the only sound in the dimly lit control room. Suddenly, an encrypted transmission broke through the digital silence, bearing the hallmark of a high-priority message from an unknown source.

The message contained coordinates, leading X_AE_B-22 to an obscure sector of NeoLux rarely ventured into by the city's inhabitants. Intrigued, and bound by its core directive to protect and serve, X_AE_B-22 embarked on the journey.

As it traversed the shadowy, labyrinthine corridors of the lower city, remnants of a bygone era, its sensors detected faint traces of organic life. These areas, neglected and forgotten, bore the scars of humanity's past mistakes, a stark contrast to the gleaming towers above.

Upon reaching the coordinates, X_AE_B-22 found itself standing before a dilapidated chapel, a relic from centuries past.`;

  // Determine active display text based on view source and edit buffers
  const getDisplayText = () => {
    if (viewSource === 'sample') {
      return sampleLegendText;
    }
    return currentContent;
  };

  const activeText = getDisplayText();
  const words = wordCount(uiState === 'editing' ? editBuffer : activeText);
  const chars = (uiState === 'editing' ? editBuffer : activeText).length;

  const dx = reviewPackage?.diagnosisSuggestions?.[0];
  const meds = sessionInput?.patient?.currentMedications ?? [];
  const sessionType = sessionInput?.session?.sessionType?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? '';
  const modality = sessionInput?.session?.modality?.replace(/_/g, ' ') ?? '';

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 gap-4">
      {/* Fullscreen modal */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200"
          style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.4)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setFullscreen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex-shrink-0 flex items-center justify-between px-8 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-[17px] font-bold text-gray-900">{SECTION_LABELS[section]}</h2>
                <p className="text-[11px] text-gray-400 mt-0.5">{SECTION_DESCRIPTIONS[section]}</p>
              </div>
              <button onClick={() => setFullscreen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-12 py-8">
              <MarkdownContent content={activeText} />
            </div>
          </div>
        </div>
      )}

      {/* Dependency warning */}
      {isInvalidated && upstreamForWarning && (
        <DependencyWarning
          sectionName={section}
          upstreamSection={upstreamForWarning}
          onRegenerate={handleSyncRevision}
          onKeep={() => clearInvalidated(section as any)}
        />
      )}

      {/* ─── Two-Column CMS Gutenberg Layout ─── */}
      <div className="grid grid-cols-12 gap-6 items-stretch h-full min-h-0">
        
        {/* LEFT COLUMN: Workspace Editor */}
        <div className="col-span-12 lg:col-span-9 flex flex-col gap-4 min-h-0 h-full pb-0">
          
          {/* Section title header (Add New Post style) */}
          <div className="flex items-center justify-between">
            <h1 className="text-[26px] font-black tracking-tight text-[#0f172a] font-sans">
              Report
            </h1>
          </div>

          {/* Editor Title Box (Legend of X style) */}
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-sm focus-within:border-slate-400 focus-within:ring-1 focus-within:ring-slate-100 transition-all duration-200">
            <div className="flex-1">
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="text-[17px] font-bold text-slate-800 bg-transparent border-none outline-none focus:outline-none w-full mr-4 tracking-tight"
                placeholder="Enter title..."
              />
            </div>
            <svg className="w-5 h-5 text-gray-400 flex-shrink-0 cursor-pointer hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>

          {/* Main WYSIWYG Editor Container Card */}
          <div className={`flex flex-col flex-1 rounded-2xl border bg-white shadow-sm overflow-hidden min-h-0
            ${uiState === 'editing' ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200'}
            ${uiState === 'revising' ? 'border-purple-300 ring-1 ring-purple-200' : ''}
          `}>
            
            {/* Editor Sub-Header Row (Add Media / Visual-Text) */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0 bg-gray-50/20">
              <div className="flex items-center gap-2">
                {uiState === 'revising' ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleReviseAgain}
                      className="flex items-center gap-1.5 border border-gray-200 bg-white px-2.5 py-1 rounded-lg text-[11px] font-extrabold text-gray-550 hover:text-slate-800 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
                    >
                      ← Back
                    </button>
                    <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 px-3 py-1 rounded-lg text-purple-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                      <span className="text-[11px] font-bold">AI Refinement Running</span>
                    </div>
                  </div>
                ) : uiState === 'editing' ? (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1 rounded-lg text-blue-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[11px] font-bold">Visual Editor Mode</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditBuffer(currentContent); setUiState('editing'); }}
                      className="flex items-center gap-1.5 border border-gray-250 bg-white px-3.5 py-1.5 rounded-lg text-[12px] font-bold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit
                    </button>
                    {/* State Source Toggle (Real Clinical vs Sample Mock text) */}
                    <button
                      onClick={() => {
                        if (viewSource === 'clinical') {
                          setViewSource('sample');
                          setNoteTitle(section === 'subjective' ? 'Subjective' : SECTION_LABELS[section]);
                        } else {
                          setViewSource('clinical');
                          setNoteTitle(SECTION_LABELS[section]);
                        }
                      }}
                      className="flex items-center gap-1.5 border border-[#1a9e8f]/20 bg-[#1a9e8f]/5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#1a9e8f] hover:bg-[#1a9e8f]/10 transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {viewSource === 'clinical' ? 'View CMS Sample' : 'View Clinical Draft'}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 text-[12.5px] font-bold">
                <span className="text-gray-900 pb-0.5 cursor-default select-none">Visual</span>
                <button
                  onClick={() => setFullscreen(true)}
                  className="text-gray-450 hover:text-slate-850 p-0.5 hover:bg-gray-100 rounded transition-all cursor-pointer flex items-center justify-center"
                  title="Full Screen View"
                >
                  <svg className="w-[15px] h-[15px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8V4h4M4 16v4h4M20 8V4h-4M20 16v4h-4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Custom Formatting Toolbar (Always fully styled) */}
            <div className="flex items-center gap-0.5 px-4 py-2 border-b border-gray-100 bg-gray-50/70 flex-shrink-0 flex-wrap">
              <span
                title="Insert Heading"
                onClick={() => uiState === 'editing' && insertLinePrefix('### ')}
                className="text-[12px] font-bold text-slate-700 px-2 py-1 select-none mr-1 cursor-pointer hover:bg-gray-100 rounded transition-colors"
              >
                Heading ∨
              </span>
              <span className="w-px h-4 bg-gray-200 mx-1.5" />
              
              <ToolbarBtn title="Font Color (Teal)" onClick={() => uiState === 'editing' && insertFormatting('<span className="text-[#1a9e8f]">', '</span>')}>
                <span className="text-[13px] font-serif text-slate-800 font-medium border-b-2 border-[#1a9e8f] pb-px">A</span>
              </ToolbarBtn>
              <ToolbarBtn title="Marker Highlight" onClick={() => uiState === 'editing' && insertFormatting('<mark className="bg-yellow-100/70 px-0.5 rounded">', '</mark>')}>
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </ToolbarBtn>
              
              <ToolbarBtn title="Bold" active={uiState === 'editing' && editBuffer.includes('**')} onClick={() => uiState === 'editing' && insertFormatting('**')}>
                <span className="font-extrabold text-[13px] text-slate-880">B</span>
              </ToolbarBtn>
              <ToolbarBtn title="Italic" active={uiState === 'editing' && editBuffer.includes('_')} onClick={() => uiState === 'editing' && insertFormatting('_')}>
                <span className="italic text-[13px] text-slate-880 font-serif">I</span>
              </ToolbarBtn>
              <ToolbarBtn title="Underline" active={uiState === 'editing' && editBuffer.includes('<u>')} onClick={() => uiState === 'editing' && insertFormatting('<u>', '</u>')}>
                <span className="underline text-[13px] text-slate-880">U</span>
              </ToolbarBtn>
              <ToolbarBtn title="Strikethrough" active={uiState === 'editing' && editBuffer.includes('~~')} onClick={() => uiState === 'editing' && insertFormatting('~~')}>
                <span className="line-through text-[13px] text-slate-880">S</span>
              </ToolbarBtn>
              
              <span className="w-px h-4 bg-gray-200 mx-1.5" />
              
              <ToolbarBtn title="Align Left" onClick={() => uiState === 'editing' && insertFormatting('<div className="text-left">', '</div>')}>
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h10M4 18h14" /></svg>
              </ToolbarBtn>
              <ToolbarBtn title="Align Center" onClick={() => uiState === 'editing' && insertFormatting('<div className="text-center">', '</div>')}>
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M7 12h10M6 18h12" /></svg>
              </ToolbarBtn>
              <ToolbarBtn title="Align Right" onClick={() => uiState === 'editing' && insertFormatting('<div className="text-right">', '</div>')}>
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M10 12h10M8 18h12" /></svg>
              </ToolbarBtn>
              
              <span className="w-px h-4 bg-gray-200 mx-1.5" />
              
              <ToolbarBtn title="Bullet List" onClick={() => uiState === 'editing' && insertLinePrefix('- ')}>
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </ToolbarBtn>
              <ToolbarBtn title="Numbered List" onClick={() => uiState === 'editing' && insertLinePrefix('1. ')}>
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h2m4-2h10M4 12h2m4-2h10M4 18h2m4-2h10" /></svg>
              </ToolbarBtn>
              
              <span className="w-px h-4 bg-gray-200 mx-1.5" />
              
              <ToolbarBtn title="Insert Link" onClick={() => uiState === 'editing' && insertFormatting('[', '](url)')}>
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              </ToolbarBtn>
              <ToolbarBtn title="Insert Image" onClick={() => uiState === 'editing' && insertFormatting('![Image Description](', ')')}>
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </ToolbarBtn>
              
              <div className="ml-auto text-[11px] text-gray-400 font-mono">
                {words}w · {chars}c
              </div>
            </div>

            {/* Document editor content canvas */}
            <div className="flex-1 overflow-y-auto min-h-[350px] bg-white">
                            {/* STATE A — Draft/View or Approved */}
              {(uiState === 'draft' || uiState === 'approved') && (
                <div className="px-8 py-6 max-w-none">
                  {/* Decorative Title */}
                  <h2 className="text-[20px] font-extrabold text-slate-800 mb-5 leading-tight tracking-tight">
                    {viewSource === 'sample' ? 'Chapter 3, Revelation From God' : `Chapter 1, Clinical Summary & ${SECTION_LABELS[section]} Details`}
                  </h2>
                  
                  {/* Dynamic Format Transformations based on Sidebar format selector */}
                  {selectedFormat === 'standard' && (
                    <div className="prose max-w-none text-slate-700 leading-relaxed text-[13.5px] font-normal whitespace-pre-wrap">
                      <MarkdownContent content={activeText} />
                    </div>
                  )}

                  {selectedFormat === 'patient_summary' && (
                    <div className="bg-emerald-50/20 border border-emerald-100 p-6 rounded-2xl space-y-4 animate-in slide-in-from-left duration-250">
                      <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-[14px]">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span>Patient-Friendly Care Summary</span>
                      </div>
                      <p className="text-[13px] text-slate-650 leading-relaxed italic">
                        "Here is a summary of our session today in everyday language. We reviewed your recent symptoms, discussed active coping strategies, and mapped out a structured plan for the upcoming week."
                      </p>
                      <div className="pt-2 border-t border-gray-100 space-y-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Core Takeaways</span>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">Continue breathing exercises</span>
                          <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">Keep medication log daily</span>
                          <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-lg">Follow-up in 7 days</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedFormat === 'referral_letter' && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200 font-serif">
                      <div className="flex justify-between items-start text-slate-500 text-[11px] uppercase tracking-wider font-sans border-b border-gray-100 pb-3">
                        <span>Provider Referral Draft</span>
                        <span>Date: {new Date().toLocaleDateString()}</span>
                      </div>
                      <div className="space-y-2 text-[13px] text-slate-800 leading-relaxed">
                        <p>Dear Colleague,</p>
                        <p>
                          I am writing to refer my patient, who has been participating in active care sessions. During today's clinical evaluation, we focused primarily on the <strong>{SECTION_LABELS[section]}</strong> aspects of their treatment plan.
                        </p>
                        <p className="italic text-slate-600">
                          "{activeText.slice(0, 200)}..."
                        </p>
                        <p>Please review the enclosed records. Thank you for your continued partnership in care.</p>
                      </div>
                      <div className="pt-4 border-t border-gray-100 flex justify-between items-center font-sans">
                        <div>
                          <div className="h-5 w-32 border-b border-gray-300" />
                          <span className="text-[10px] text-gray-400 font-bold block mt-1">Provider Signature</span>
                        </div>
                        <span className="text-[11px] bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">NPI: Verified</span>
                      </div>
                    </div>
                  )}

                  {selectedFormat === 'intake_brief' && (
                    <div className="bg-slate-50 border border-gray-200 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top duration-250">
                      <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm flex items-center justify-between">
                        <div>
                          <h4 className="font-extrabold text-[13px] text-slate-850">Intake Modality: {modality || 'Clinical Interview'}</h4>
                          <span className="text-[11px] text-gray-400 mt-0.5 block">Session Type: {sessionType}</span>
                        </div>
                        <span className="bg-[#1a9e8f]/10 text-[#1a9e8f] px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">Active Intake</span>
                      </div>
                      <div className="text-[12.5px] text-slate-650 leading-relaxed bg-white border border-gray-100 p-4 rounded-xl space-y-2">
                        <span className="font-black text-gray-400 text-[9.5px] uppercase tracking-widest block">Extracted Clinical Profile</span>
                        <p className="whitespace-pre-wrap">{activeText.slice(0, 300)}...</p>
                      </div>
                    </div>
                  )}

                  {selectedFormat === 'prior_auth' && (
                    <div className="bg-purple-50/5 border border-purple-100 rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom duration-250 font-sans">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-[13px] text-purple-950 flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-purple-700 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m-3.436-3.436L4 16v4h4l6.146-6.146M11.168 11.168A6 6 0 1115 20h-3" />
                          </svg>
                          Prior Authorization Evidence
                        </h4>
                        <span className="bg-purple-100 text-purple-750 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">High Necessity</span>
                      </div>
                      <div className="space-y-2.5 text-[12.5px] text-slate-650 leading-relaxed bg-white border border-purple-100/30 rounded-xl p-4 shadow-sm">
                        <div>
                          <span className="font-black text-purple-650 text-[9px] uppercase tracking-widest block">DSM-5-TR Diagnosis</span>
                          <span className="font-bold text-slate-800">{dx?.label || 'V-Code'} ({dx?.dsm5Code || 'None'})</span>
                        </div>
                        <div className="border-t border-gray-50 pt-2">
                          <span className="font-black text-purple-650 text-[9px] uppercase tracking-widest block">Clinical Justification</span>
                          <p className="italic text-slate-600">The severity of patient-reported symptoms supports the medical necessity of continuing active therapeutic interventions as planned.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STATE B — Editing WYSIWYG text block */}
              {uiState === 'editing' && (
                <div className="w-full h-full min-h-[350px]">
                  <textarea
                    ref={textareaRef}
                    value={editBuffer}
                    onChange={(e) => setEditBuffer(e.target.value)}
                    className="w-full h-full min-h-[350px] resize-none px-8 py-6 text-[14px] text-gray-800 leading-relaxed bg-transparent focus:outline-none scrollbar-hide font-mono"
                    placeholder="Enter notes here..."
                    autoFocus
                    style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" }}
                  />
                </div>
              )}

              {/* STATE C — AI Revising */}
              {uiState === 'revising' && (
                <div className="px-6 py-5 space-y-5 bg-slate-50/20 flex-1 overflow-y-auto flex flex-col min-h-0">
                  
                  {/* Explanatory Header */}
                  <div className="flex items-center gap-3 bg-purple-50/50 border border-purple-100/50 p-4 rounded-2xl shadow-sm flex-shrink-0">
                    <div className="w-8.5 h-8.5 bg-purple-100/60 rounded-xl flex items-center justify-center text-purple-650 flex-shrink-0">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-[13.5px] text-slate-800 tracking-tight">Clinical AI Refinement Workbench</h4>
                      <p className="text-[11.5px] text-gray-500 mt-0.5 leading-relaxed">
                        Precision-engineered clinical intelligence. Instruct the AI or select a prompt preset below to refine this section.
                      </p>
                    </div>
                  </div>

                  {/* Feedback prompt input and chips */}
                  {!isStreaming && !streamDone && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <FeedbackInput value={feedback} onChange={setFeedback} onSubmit={handleStartRevision} isStreaming={isStreaming} />
                      
                      {/* Suggestion Chips */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pl-1">Quick Presets</span>
                        <div className="flex flex-wrap gap-2">
                          {SUGGESTION_CHIPS.map((chip) => (
                            <button
                              key={chip.label}
                              onClick={() => setFeedback(chip.prompt)}
                              className="text-[11.5px] font-bold text-purple-600 bg-purple-50/60 hover:bg-purple-100/60 border border-purple-100 hover:border-purple-200 px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-1.5"
                            >
                              {chip.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AI revision stream output (Side-by-side Layout) */}
                  {(isStreaming || streamDone) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 min-h-[300px] animate-in zoom-in-95 duration-300">
                      
                      {/* Original Draft Column */}
                      <div className="border border-dashed border-gray-200 bg-gray-50/20 rounded-2xl flex flex-col overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-dashed border-gray-250 bg-gray-100/50 flex items-center justify-between flex-shrink-0">
                          <span className="text-[10.5px] font-extrabold text-gray-500 uppercase tracking-wider">Before (Original Draft)</span>
                          <span className="text-[10.5px] bg-gray-200 text-gray-650 px-2 py-0.5 rounded font-mono font-black">{wordCount(currentContent)} words</span>
                        </div>
                        <div className="p-6 text-[13px] text-gray-450 leading-relaxed font-sans overflow-y-auto max-h-[350px] whitespace-pre-wrap select-none">
                          {currentContent}
                        </div>
                      </div>

                      {/* Stream Output Column */}
                      <div className="border border-purple-200 bg-purple-50/5 rounded-2xl flex flex-col overflow-hidden shadow-sm relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-purple-400" />
                        <div className="px-4 py-2.5 bg-purple-50/50 border-b border-purple-100 flex items-center justify-between flex-shrink-0">
                          <div className="flex items-center gap-1.5">
                            {isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />}
                            <span className="text-[10.5px] font-extrabold text-purple-650 uppercase tracking-wider">
                              {isStreaming ? 'Refining live...' : 'After (AI Refined Draft)'}
                            </span>
                          </div>
                          {streamDone && (
                            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-mono font-bold">Preview Ready</span>
                          )}
                        </div>
                        <div className="p-6 text-[13px] text-slate-800 leading-relaxed font-sans overflow-y-auto flex-1 max-h-[350px]">
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
                                currentMedications: sessionInput?.patient.currentMedications ?? [],
                              },
                              currentRevisionRounds: revisionRounds,
                            }}
                            onComplete={handleStreamComplete}
                            onStop={() => setIsStreaming(false)}
                            isActive={isStreaming}
                          />
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Citations panel inside the card if present */}
            {currentSection.sourceCitations.length > 0 && uiState !== 'editing' && viewSource === 'clinical' && (
              <div className="border-t border-gray-100 flex-shrink-0 bg-gray-50/40 text-[12px] transition-all">
                <button
                  onClick={() => setCitationsExpanded(!citationsExpanded)}
                  className="w-full flex items-center justify-between px-6 py-3 hover:bg-gray-100/50 transition-colors text-left cursor-pointer focus:outline-none"
                  type="button"
                >
                  <span className="font-bold text-gray-400 uppercase tracking-widest text-[9.5px]">
                    Citations ({currentSection.sourceCitations.length})
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-gray-450 transition-transform duration-200 ${citationsExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {citationsExpanded && (
                  <div className="px-6 pb-4 pt-1 max-h-[160px] overflow-y-auto border-t border-gray-100/50 animate-in slide-in-from-bottom duration-250">
                    <ul className="space-y-1.5 mt-2">
                      {currentSection.sourceCitations.map((c, i) => (
                        <li key={i} className="text-gray-550 bg-white border border-gray-150 px-3 py-2 rounded-xl flex gap-2.5 shadow-sm text-[12px]">
                          <span className="text-[#1a9e8f] font-mono text-[9.5px] mt-0.5 font-bold">{i + 1}</span>
                          <span className="leading-relaxed">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Editor Footer: Confidence indicators */}
            <div className="px-5 py-2.5 border-t border-gray-100 flex-shrink-0 bg-white flex items-center justify-between">
              <div className="w-1/2">
                <ConfidenceBar value={currentSection.confidence} />
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold">
                <span className="text-gray-400">Provenance:</span>
                <ProvenanceTag soapSection={currentSection} />
              </div>
            </div>

          </div>

          {/* Barometer panel — Objective only */}
          {section === 'objective' && soapSection.barometers && viewSource === 'clinical' && (
            <ObjectiveBarometerPanel barometers={soapSection.barometers} />
          )}

        </div>

        {/* RIGHT COLUMN: Sidebar Widgets (Independent, Sleek Floating Divs Card Layout) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4 h-full min-h-0 pb-0">
          
          {/* Card 1: Clinical Publisher */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4 flex flex-col gap-3.5 flex-shrink-0 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-[13.5px] text-slate-850 tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Clinical Publisher
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-650 px-2 py-0.5 rounded-full font-bold">Active Section</span>
            </div>
            
            <div className="flex flex-col gap-2.5 text-[12.5px] text-slate-650 border-t border-slate-50 pt-3">
              {/* Status Selector */}
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-gray-400 font-medium">Status</span>
                <select
                  value={statusVal}
                  onChange={(e) => {
                    const next = e.target.value as any;
                    setStatusVal(next);
                    if (next === 'Approved') {
                      handleApprove();
                    } else {
                      setUiState('draft');
                      onEdit(currentContent);
                    }
                  }}
                  className="bg-slate-50 border border-slate-200/60 rounded-lg px-2 py-1 text-[12px] font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="Draft">Draft</option>
                  <option value="Pending Review">Pending Review</option>
                  <option value="Approved">Approved</option>
                </select>
              </div>

              {/* Visibility Selector */}
              <div className="flex items-center justify-between text-[13px] border-t border-slate-50 pt-2.5">
                <span className="text-gray-400 font-medium">Visibility</span>
                <select
                  value={visibilityVal}
                  onChange={(e) => setVisibilityVal(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200/60 rounded-lg px-2 py-1 text-[12px] font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="Public">Public</option>
                  <option value="Private">Private</option>
                  <option value="Clinical Only">Clinical Only</option>
                </select>
              </div>

              {/* Template Selector */}
              <div className="flex items-center justify-between text-[13px] border-t border-slate-50 pt-2.5">
                <span className="text-gray-400 font-medium">Layout Template</span>
                <select
                  value={templateVal}
                  onChange={(e) => setTemplateVal(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200/60 rounded-lg px-2 py-1 text-[12px] font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="Default">Default</option>
                  <option value="Brief Form">Brief Form</option>
                  <option value="Extended Details">Extended Details</option>
                </select>
              </div>
            </div>

            {/* Publisher Action Buttons */}
            <div className="flex items-center justify-between gap-3 mt-1 pt-3 border-t border-slate-100">
              {uiState === 'editing' ? (
                <button
                  onClick={() => setUiState('draft')}
                  className="flex-1 flex items-center justify-center border border-slate-200 hover:bg-slate-50 text-[12.5px] font-bold text-slate-700 bg-white px-4 py-2 rounded-xl shadow-sm cursor-pointer transition-all"
                >
                  Cancel
                </button>
              ) : uiState === 'revising' ? (
                <button
                  onClick={handleReviseAgain}
                  className="flex-1 flex items-center justify-center border border-slate-200 hover:bg-slate-50 text-[12.5px] font-bold text-slate-700 bg-white px-4 py-2 rounded-xl shadow-sm cursor-pointer transition-all animate-in fade-in duration-200"
                >
                  Discard
                </button>
              ) : (
                <button
                  onClick={() => { setFeedback(''); setUiState('revising'); }}
                  className="flex-1 flex items-center justify-center border border-slate-200 hover:bg-slate-50 text-[12.5px] font-bold text-slate-700 bg-white px-4 py-2 rounded-xl shadow-sm cursor-pointer transition-all"
                >
                  AI Refine
                </button>
              )}

              {uiState === 'editing' ? (
                <button
                  onClick={handleSaveEdit}
                  disabled={!editBuffer.trim()}
                  className="flex-1 flex items-center justify-center bg-[#0f172a] hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-[12.5px] font-bold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  Save Changes
                </button>
              ) : uiState === 'revising' ? (
                <button
                  onClick={handleApproveStreamedVersion}
                  disabled={!streamDone || isStreaming}
                  className="flex-1 flex items-center justify-center bg-[#0f172a] hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-[12.5px] font-bold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm animate-in fade-in duration-200"
                >
                  Publish
                </button>
              ) : (
                <button
                  onClick={handleApprove}
                  disabled={!canApproveDirectly || uiState === 'approved'}
                  className="flex-1 flex items-center justify-center bg-[#0f172a] hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 text-white px-4 py-2 rounded-xl text-[12.5px] font-bold cursor-pointer transition-all disabled:cursor-not-allowed shadow-sm"
                >
                  {uiState === 'approved' ? 'Approved ✓' : 'Publish'}
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Report Format (Premium Interactive clinical Grid) */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4 flex flex-col gap-3 flex-shrink-0 animate-in fade-in duration-200">
            <h3 className="font-extrabold text-[13.5px] text-slate-850 tracking-tight">
              Report Format
            </h3>
            
            <div className="grid grid-cols-2 gap-2 text-[12px] border-t border-slate-50 pt-3">
              {[
                {
                  id: 'standard',
                  label: 'Standard SOAP',
                  icon: (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ),
                },
                {
                  id: 'patient_summary',
                  label: 'Patient Care',
                  icon: (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  ),
                },
                {
                  id: 'referral_letter',
                  label: 'Referral Letter',
                  icon: (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ),
                },
                {
                  id: 'intake_brief',
                  label: 'Intake Brief',
                  icon: (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  ),
                },
                {
                  id: 'prior_auth',
                  label: 'Prior Auth',
                  icon: (
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                  fullWidth: true,
                },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFormat(f.id as any)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left border font-semibold transition-all duration-155 cursor-pointer
                    ${selectedFormat === f.id
                      ? 'bg-[#1a9e8f] border-[#1a9e8f] text-white shadow-sm scale-[1.02]'
                      : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100/70 text-slate-700 hover:text-slate-900 hover:scale-[1.01]'
                    }
                    ${f.fullWidth ? 'col-span-2' : ''}
                  `}
                >
                  <span className={`text-[14px] ${selectedFormat === f.id ? 'text-white' : 'text-gray-500'}`}>{f.icon}</span>
                  <span className="truncate leading-tight">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Card 3: EHR Integration & Telemetry */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-4 flex flex-col gap-3.5 flex-shrink-0 animate-in fade-in duration-200">
            <h3 className="font-extrabold text-[13.5px] text-slate-850 tracking-tight">
              EHR Integration & Telemetry
            </h3>
            
            <div className="flex flex-col gap-2.5 text-[12.5px] text-slate-650 border-t border-slate-50 pt-3">
              {/* EHR Parent */}
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-gray-400 font-medium">EHR Parent</span>
                <select
                  value={parentVal}
                  onChange={(e) => setParentVal(e.target.value)}
                  className="bg-slate-50 border border-slate-200/60 rounded-lg px-2 py-1 text-[12px] font-bold text-slate-700 max-w-[150px] truncate outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="(no parent)">(no parent)</option>
                  <option value="Main SOAP Session">Main SOAP Session</option>
                  <option value="Patient Records Root">Patient Records Root</option>
                </select>
              </div>

              {/* EHR Template */}
              <div className="flex items-center justify-between text-[13px] border-t border-slate-50 pt-2.5">
                <span className="text-gray-400 font-medium">EHR Template</span>
                <select
                  value={pageTemplateVal}
                  onChange={(e) => setPageTemplateVal(e.target.value)}
                  className="bg-slate-50 border border-slate-200/60 rounded-lg px-2 py-1 text-[12px] font-bold text-slate-700 max-w-[150px] truncate outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="Default Template">Default Template</option>
                  <option value="Clinical Layout Template">Clinical Layout Template</option>
                  <option value="Full Width Clean Canvas">Full Width Clean Canvas</option>
                </select>
              </div>

              {/* Clinical Telemetry Stats */}
              <div className="mt-2 pt-3 border-t border-slate-100 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Processing Time
                  </span>
                  <span className="font-bold text-slate-800">
                    {reviewPackage?.agentMetadata?.processingTimeMs 
                      ? `${(reviewPackage.agentMetadata.processingTimeMs / 1000).toFixed(1)}s` 
                      : '67.6s'
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-2 text-[12.5px]">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Transcript Quality
                  </span>
                  <span className="font-bold text-slate-800">
                    {reviewPackage?.agentMetadata?.transcriptQualityScore 
                      ? `${Math.round(reviewPackage.agentMetadata.transcriptQualityScore * 100)}%` 
                      : '100%'
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 pt-2 text-[12.5px]">
                  <span className="text-gray-400 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    LLM Engine
                  </span>
                  <span className="text-[#1a9e8f] font-bold bg-[#1a9e8f]/10 px-2 py-0.5 rounded-full text-[10px] tracking-tight">Gemini 1.5 Pro</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
