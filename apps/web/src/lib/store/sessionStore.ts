import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SessionInput, ReviewPackage, AuditEntry } from 'agents';

// ─── Section dependency chain ─────────────────────────────────────────────────
// risk_flags  → nothing
// subjective  → assessment, plan
// objective   → assessment, plan
// assessment  → plan
// plan        → nothing
const DOWNSTREAM: Record<string, string[]> = {
  risk_flags: [],
  subjective: ['assessment', 'plan'],
  objective: ['assessment', 'plan'],
  assessment: ['plan'],
  plan: [],
};

export type SectionKey = 'risk_flags' | 'subjective' | 'objective' | 'assessment' | 'plan';
export type SectionStatus = 'draft' | 'approved' | 'edited' | 'revised' | 'locked';

interface SessionStoreState {
  sessionId: string | null;
  input: SessionInput | null;
  reviewPackage: ReviewPackage | null;
  processingStatus: 'idle' | 'processing' | 'complete' | 'error';
  activeSection: SectionKey;
  sectionStatuses: Record<SectionKey, SectionStatus>;
  invalidatedSections: SectionKey[];
  auditLog: AuditEntry[];
  error: string | null;
}

interface SessionStoreActions {
  setSessionId(id: string): void;
  setInput(input: SessionInput): void;
  setReviewPackage(pkg: ReviewPackage): void;
  setProcessingStatus(s: SessionStoreState['processingStatus']): void;
  setActiveSection(section: SectionKey): void;
  approveSection(section: SectionKey): void;
  editSection(section: SectionKey): void;
  markRevised(section: SectionKey): void;
  /** Persist edited or revised content back into reviewPackage.soapNote */
  updateSectionContent(section: 'subjective' | 'objective' | 'assessment' | 'plan', content: string): void;
  invalidateDownstreamSections(changedSection: SectionKey): void;
  clearInvalidated(section: SectionKey): void;
  addAuditEntry(entry: AuditEntry): void;
  setError(err: string | null): void;
  reset(): void;
}

type SessionStore = SessionStoreState & SessionStoreActions;

const INITIAL_STATUSES: Record<SectionKey, SectionStatus> = {
  risk_flags: 'draft',
  subjective: 'locked',
  objective: 'locked',
  assessment: 'locked',
  plan: 'locked',
};

const INITIAL_STATE: SessionStoreState = {
  sessionId: null,
  input: null,
  reviewPackage: null,
  processingStatus: 'idle',
  activeSection: 'risk_flags',
  sectionStatuses: { ...INITIAL_STATUSES },
  invalidatedSections: [],
  auditLog: [],
  error: null,
};

export const useSessionStore = create<SessionStore>()(
  devtools(
    (set, get) => ({
      ...INITIAL_STATE,

      setSessionId: (id) => set({ sessionId: id }, false, 'setSessionId'),

      setInput: (input) => set({ input }, false, 'setInput'),

      setReviewPackage: (pkg) =>
        set({ reviewPackage: pkg, processingStatus: 'complete' }, false, 'setReviewPackage'),

      setProcessingStatus: (status) => set({ processingStatus: status }, false, 'setStatus'),

      setActiveSection: (section) => set({ activeSection: section }, false, 'setActiveSection'),

      approveSection: (section) =>
        set(
          (state) => {
            const next = { ...state.sectionStatuses, [section]: 'approved' as SectionStatus };
            // risk_flags approved → unlock subjective + objective
            if (section === 'risk_flags') {
              if (next.subjective === 'locked') next.subjective = 'draft';
              if (next.objective === 'locked') next.objective = 'draft';
            }
            // subjective + objective both approved → unlock assessment
            const subObjApproved = next.subjective === 'approved' && next.objective === 'approved';
            if (subObjApproved) {
              if (next.assessment === 'locked') next.assessment = 'draft';
            }
            // assessment approved → unlock plan
            if (next.assessment === 'approved') {
              if (next.plan === 'locked') next.plan = 'draft';
            }
            return { sectionStatuses: next };
          },
          false,
          'approveSection',
        ),

      editSection: (section) =>
        set(
          (state) => ({
            sectionStatuses: { ...state.sectionStatuses, [section]: 'edited' },
          }),
          false,
          'editSection',
        ),

      markRevised: (section) =>
        set(
          (state) => ({
            sectionStatuses: { ...state.sectionStatuses, [section]: 'revised' },
          }),
          false,
          'markRevised',
        ),

      updateSectionContent: (section, content) =>
        set(
          (state) => {
            if (!state.reviewPackage) return {};
            return {
              reviewPackage: {
                ...state.reviewPackage,
                soapNote: {
                  ...state.reviewPackage.soapNote,
                  [section]: {
                    ...state.reviewPackage.soapNote[section],
                    content,
                  },
                },
              },
            };
          },
          false,
          'updateSectionContent',
        ),

      invalidateDownstreamSections: (changedSection) => {
        const downstream = DOWNSTREAM[changedSection] as SectionKey[];
        if (!downstream.length) return;
        set(
          (state) => {
            const next = { ...state.sectionStatuses };
            downstream.forEach((s) => {
              // Only mark as draft (not locked) if they were previously approved/edited
              if (next[s] === 'approved' || next[s] === 'edited' || next[s] === 'revised') {
                next[s] = 'draft';
              }
            });
            const invalidated = [
              ...new Set([...state.invalidatedSections, ...downstream]),
            ] as SectionKey[];
            return { sectionStatuses: next, invalidatedSections: invalidated };
          },
          false,
          'invalidateDownstream',
        );
      },

      clearInvalidated: (section) =>
        set(
          (state) => ({
            invalidatedSections: state.invalidatedSections.filter((s) => s !== section),
          }),
          false,
          'clearInvalidated',
        ),

      addAuditEntry: (entry) =>
        set(
          (state) => ({ auditLog: [...state.auditLog, entry] }),
          false,
          'addAuditEntry',
        ),

      setError: (error) => set({ error, processingStatus: 'error' }, false, 'setError'),

      reset: () => set(INITIAL_STATE, false, 'reset'),
    }),
    { name: 'ehr-session' },
  ),
);

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectAllApproved = (s: SessionStore) =>
  Object.values(s.sectionStatuses).every((v) => v === 'approved');

export const selectApprovedCount = (s: SessionStore) =>
  Object.values(s.sectionStatuses).filter((v) => v === 'approved').length;

export const selectIsLocked = (section: SectionKey) => (s: SessionStore) =>
  s.sectionStatuses[section] === 'locked';
