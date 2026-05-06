import { VoyageEmbeddings } from '@langchain/community/embeddings/voyage';
import type { Embeddings } from '@langchain/core/embeddings';

/**
 * Returns a VoyageEmbeddings instance (voyage-2, 1024 dimensions).
 * Requires VOYAGE_API_KEY in all environments — dev and production.
 * Get a free key at https://voyageai.com (50M free tokens).
 *
 * Throws immediately if the key is absent so misconfiguration is caught
 * at startup rather than producing silent zero-vector results.
 */
export function getEmbeddings(): Embeddings {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    throw new Error(
      '[embeddings] VOYAGE_API_KEY is required. ' +
      'Get a free key at https://voyageai.com (50M free tokens).',
    );
  }
  return new VoyageEmbeddings({
    apiKey,
    modelName: 'voyage-2',
  });
}
