import { Chunk } from '../models/index.js';

// Cosine similarity between two equal-length vectors (1 = same direction).
export function cosineSimilarity(a, b) {
  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }
  if (!magnitudeA || !magnitudeB) return 0;
  return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

// Pure function: scores chunks against a query vector, best first.
export function rankChunks(chunks, queryVector, topK) {
  return chunks
    .map((chunk) => ({ ...chunk, score: cosineSimilarity(queryVector, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// Best-matching chunks for a question, scoped strictly to one Project.
// Chunks without embeddings (older/partial materials) are skipped.
export async function retrieveEvidence(projectId, queryVector, { topK = 5 } = {}) {
  const chunks = await Chunk.find({ project: projectId, 'embedding.0': { $exists: true } })
    .populate('material', 'filename')
    .lean();

  if (chunks.length === 0) {
    return { matches: [], topScore: 0 };
  }

  const matches = rankChunks(chunks, queryVector, topK);
  return { matches, topScore: matches[0].score };
}