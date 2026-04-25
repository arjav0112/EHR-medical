import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import type { GraphState } from '../graph';
import type { RunnableConfig } from '@langchain/core/runnables';

const QualityOutputSchema = z.object({
  score: z.number().min(0).max(1),
  clarity: z.number().min(0).max(1),
  speakerSeparation: z.number().min(0).max(1),
  completeness: z.number().min(0).max(1),
  clinicalRelevance: z.number().min(0).max(1),
  failureReason: z.string().optional(),
});

const SYSTEM_PROMPT = `You are a clinical transcript quality assessor.
Score the provided therapy session transcript on four dimensions (each 0-1):
- clarity: Is the text legible, grammatically coherent, free of excessive noise?
- speakerSeparation: Are speaker turns clearly labeled (e.g., "Clinician:", "Patient:")?
- completeness: Does it capture a reasonably full session (not truncated mid-sentence)?
- clinicalRelevance: Does it contain clinical content useful for SOAP note generation?

The overall score is the average of all four.
If the transcript is too short, gibberish, or contains no identifiable clinical exchange, set failureReason.
Return structured JSON only.`;

export async function transcriptQualityNode(
  state: GraphState,
  config: RunnableConfig
): Promise<Partial<GraphState>> {
  try {
    console.log('>>> [transcriptQualityNode] Config received:', JSON.stringify({
      tags: config?.tags,
      metadata: config?.metadata,
      callbacksLength: (config?.callbacks as any[])?.length,
    }));

    const model = new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
      temperature: 0,
      maxRetries: 6,
    }).withStructuredOutput(QualityOutputSchema);

    const result = await model.invoke([
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Assess this transcript:\n\n${state.input.session.transcript}`,
      },
    ], config);

    const score =
      (result.clarity +
        result.speakerSeparation +
        result.completeness +
        result.clinicalRelevance) /
      4;

    if (score < 0.4) {
      return {
        transcriptQualityScore: score,
        error: `LOW_QUALITY_TRANSCRIPT: ${result.failureReason ?? 'Score below minimum threshold (0.4). clarity=${result.clarity}, speakerSeparation=${result.speakerSeparation}, completeness=${result.completeness}, clinicalRelevance=${result.clinicalRelevance}'}`,
        auditLog: [
          {
            timestamp: new Date().toISOString(),
            section: 'transcript_quality',
            action: 'ai_generated',
            details: `Quality check failed: score=${score.toFixed(2)}`,
          },
        ],
      };
    }

    return {
      transcriptQualityScore: score,
      auditLog: [
        {
          timestamp: new Date().toISOString(),
          section: 'transcript_quality',
          action: 'ai_generated',
          details: `Quality score: ${score.toFixed(2)}`,
        },
      ],
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `TRANSCRIPT_QUALITY_ERROR: ${message}` };
  }
}
