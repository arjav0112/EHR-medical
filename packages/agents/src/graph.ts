import { Annotation, StateGraph, END } from '@langchain/langgraph';
import type {
  SessionInput,
  SOAPNote,
  RiskFlag,
  DiagnosisSuggestion,
  TreatmentPlan,
  ReviewPackage,
  AuditEntry,
} from './types/index';
import { transcriptQualityNode } from './agents/transcriptQualityAgent';
import { soapNode } from './agents/soapAgent';
import { riskNode } from './agents/riskAgent';
import { dsmNode } from './agents/dsmAgent';
import { planNode } from './agents/planAgent';
import { hallucinationGuardNode } from './agents/hallucinationGuardAgent';
import { reviewBundlerNode } from './agents/reviewBundler';

// ─── State Annotation ─────────────────────────────────────────────────────────

export const GraphStateAnnotation = Annotation.Root({
  input: Annotation<SessionInput>(),
  transcriptQualityScore: Annotation<number>({
    default: () => 0,
    reducer: (_, next) => next,
  }),
  soapNote: Annotation<Partial<SOAPNote>>({
    default: () => ({}),
    reducer: (prev, next) => ({ ...prev, ...next }),
  }),
  riskFlags: Annotation<RiskFlag[]>({
    default: () => [],
    reducer: (_, next) => next,
  }),
  diagnosisSuggestions: Annotation<DiagnosisSuggestion[]>({
    default: () => [],
    reducer: (_, next) => next,
  }),
  treatmentPlan: Annotation<TreatmentPlan | null>({
    default: () => null,
    reducer: (_, next) => next,
  }),
  reviewPackage: Annotation<ReviewPackage | null>({
    default: () => null,
    reducer: (_, next) => next,
  }),
  hallucinationReport: Annotation<import('./types/index').HallucinationReport | null>({
    default: () => null,
    reducer: (_, next) => next,
  }),
  auditLog: Annotation<AuditEntry[]>({
    default: () => [],
    reducer: (prev, next) => [...prev, ...next],
  }),
  error: Annotation<string | null>({
    default: () => null,
    reducer: (_, next) => next,
  }),
});

export type GraphState = typeof GraphStateAnnotation.State;

// ─── Routing ──────────────────────────────────────────────────────────────────

function routeAfterQuality(state: GraphState): string | typeof END {
  if (state.error || state.transcriptQualityScore < 0.4) {
    return END;
  }
  return 'soapNode';
}

function routeAfterSoap(state: GraphState): string | typeof END {
  if (state.error) return END;
  return 'parallelAnalysis';
}

// ─── Graph Definition ─────────────────────────────────────────────────────────
// Execution order (fixes the state-dependency bug and reduces critical path):
//
//  transcriptQualityNode
//       ↓
//    soapNode  (33s — must complete first; riskNode needs soapNote.objective)
//       ↓
//   [riskNode, dsmNode, hallucinationGuardNode]  ← parallel fan-out (max ~18s)
//       ↓
//    planNode  (needs riskFlags from riskNode)
//       ↓
//  reviewBundlerNode

const workflow = new StateGraph(GraphStateAnnotation)
  .addNode('transcriptQualityNode', transcriptQualityNode)
  .addNode('soapNode', soapNode)
  // Post-SOAP parallel nodes — all can run concurrently using soapNote
  .addNode('riskNode', riskNode)
  .addNode('dsmNode', dsmNode)
  .addNode('hallucinationGuardNode', hallucinationGuardNode)
  .addNode('planNode', planNode)
  .addNode('reviewBundlerNode', reviewBundlerNode)

  // Entry
  .addEdge('__start__', 'transcriptQualityNode')

  // Quality gate → soap (sequential, soap needs clean transcript)
  .addConditionalEdges('transcriptQualityNode', routeAfterQuality, {
    soapNode: 'soapNode',
    [END]: END,
  })

  // After SOAP is complete: fan-out to risk, dsm, hallucination checks (all parallel)
  // These all have soapNote available now — fixes the riskNode state-dependency bug
  .addEdge('soapNode', 'riskNode')
  .addEdge('soapNode', 'dsmNode')
  .addEdge('soapNode', 'hallucinationGuardNode')

  // planNode waits for riskNode (needs riskFlags for risk-aware plan)
  .addEdge('riskNode', 'planNode')

  // Fan-in: reviewBundler runs after all analysis is done
  .addEdge('dsmNode', 'reviewBundlerNode')
  .addEdge('planNode', 'reviewBundlerNode')
  .addEdge('hallucinationGuardNode', 'reviewBundlerNode')

  .addEdge('reviewBundlerNode', END);

export const ehrGraph = workflow.compile();
