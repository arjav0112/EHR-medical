import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

/**
 * Returns a configured ChatGoogleGenerativeAI instance.
 * Centralised so any future model swap only happens here.
 *
 * @param temperature  Sampling temperature (default 0.2)
 * @param model        Gemini model name (default gemini-2.5-flash)
 */
export function getLLM(temperature = 0.2, model = 'gemini-2.5-flash') {
  return new ChatGoogleGenerativeAI({
    model,
    temperature,
    maxRetries: 6,
  });
}

/**
 * Streaming variant — identical config but streaming: true.
 * Used by revisionAgent for token-by-token SSE output.
 */
export function getStreamingLLM(temperature = 0.2, model = 'gemini-2.5-flash') {
  return new ChatGoogleGenerativeAI({
    model,
    temperature,
    streaming: true,
    maxRetries: 6,
  });
}
