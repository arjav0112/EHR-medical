import { NextRequest } from 'next/server';
import { z } from 'zod';
import { reviseSection } from 'agents';

const ReviseInputSchema = z.object({
  section: z.enum(['subjective', 'objective', 'assessment', 'plan']),
  currentDraft: z.string().min(1),
  feedback: z.string().min(1),
  approvedSections: z.record(z.string()),
  transcript: z.string().min(1),
  patientContext: z.object({
    age: z.number(),
    gender: z.string(),
    knownDiagnoses: z.array(z.string()),
    sessionType: z.string(),
    currentMedications: z.array(z.string()),
  }),
  currentRevisionRounds: z.number().int().min(0).default(0),
});

function sse(data: object): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const parsed = ReviseInputSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'validation_error', issues: parsed.error.flatten() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { section, currentDraft, feedback, approvedSections, transcript, patientContext, currentRevisionRounds } =
    parsed.data;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const generator = reviseSection({
          section,
          currentDraft,
          feedback,
          approvedSections,
          transcript,
          patientContext,
        });

        for await (const event of generator) {
          if (event.done) {
            // Final metadata event
            controller.enqueue(
              sse({
                token: '',
                done: true,
                confidence: event.section.confidence ?? 0.8,
                provenanceTag: 'ai_revised',
                revisionRounds: currentRevisionRounds + 1,
                content: event.section.content,
              }),
            );
          } else {
            // Token chunk event
            controller.enqueue(sse({ token: event.chunk, done: false }));
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Revision failed';
        controller.enqueue(sse({ error: message, done: true }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering for true streaming
    },
  });
}
