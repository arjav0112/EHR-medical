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

function routeAfterQuality(state: GraphState): 'parallel_soap_risk' | typeof END {
  if (state.error || state.transcriptQualityScore < 0.4) {
    return END;
  }
  return 'parallel_soap_risk';
}

// ─── Graph Definition ─────────────────────────────────────────────────────────

const workflow = new StateGraph(GraphStateAnnotation)
  .addNode('transcriptQualityNode', transcriptQualityNode)
  .addNode('soapNode', soapNode)
  .addNode('riskNode', riskNode)
  .addNode('dsmNode', dsmNode)
  .addNode('planNode', planNode)
  .addNode('reviewBundlerNode', reviewBundlerNode)
  // Entry
  .addEdge('__start__', 'transcriptQualityNode')
  // Quality gate
  .addConditionalEdges('transcriptQualityNode', routeAfterQuality, {
    parallel_soap_risk: 'soapNode',
    [END]: END,
  })
  // Parallel SOAP + Risk (fan-out from quality, then fan-in at dsm)
  .addEdge('transcriptQualityNode', 'riskNode')
  .addEdge('soapNode', 'dsmNode')
  .addEdge('riskNode', 'dsmNode')
  // Sequential tail
  .addEdge('dsmNode', 'planNode')
  .addEdge('planNode', 'reviewBundlerNode')
  .addEdge('reviewBundlerNode', END);

export const ehrGraph = workflow.compile();
