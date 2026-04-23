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

function routeAfterQuality(state: GraphState): string[] | typeof END {
  if (state.error || state.transcriptQualityScore < 0.4) {
    return END;
  }
  return ['soapNode', 'riskNode'];
}

// ─── Graph Definition ─────────────────────────────────────────────────────────

const workflow = new StateGraph(GraphStateAnnotation)
  .addNode('transcriptQualityNode', transcriptQualityNode)
  .addNode('soapNode', soapNode)
  .addNode('riskNode', riskNode)
  .addNode('dsmNode', dsmNode)
  .addNode('planNode', planNode)
  .addNode('hallucinationGuardNode', hallucinationGuardNode)
  .addNode('reviewBundlerNode', reviewBundlerNode)
  // Entry
  .addEdge('__start__', 'transcriptQualityNode')
  // Quality gate fan-out
  .addConditionalEdges('transcriptQualityNode', routeAfterQuality)
  // Run DSM and Guard immediately after SOAP
  .addEdge('soapNode', 'dsmNode')
  .addEdge('soapNode', 'hallucinationGuardNode')
  // Run Plan after both SOAP and Risk are complete
  .addEdge('soapNode', 'planNode')
  .addEdge('riskNode', 'planNode')
  // Fan-in all parallel branches to the final bundler
  .addEdge('dsmNode', 'reviewBundlerNode')
  .addEdge('planNode', 'reviewBundlerNode')
  .addEdge('hallucinationGuardNode', 'reviewBundlerNode')
  .addEdge('reviewBundlerNode', END);

export const ehrGraph = workflow.compile();
