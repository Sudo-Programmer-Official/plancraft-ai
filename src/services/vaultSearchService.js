import { db } from '../../server/firebaseAdmin.js';

const EMBEDDING_ENDPOINT = process.env.OPENAI_EMBED_ENDPOINT || 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = process.env.OPENAI_EMBED_MODEL || process.env.OPENAI_MODEL || 'text-embedding-3-small';
const EMBEDDING_DIMENSION = Number(process.env.OPENAI_EMBED_DIMENSION || 1536);

function normalizeText(text = '') {
  return String(text || '').trim();
}

export async function embedText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch(EMBEDDING_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: normalized,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[vaultSearchService.embedText] OpenAI error', response.status, errorText);
      return null;
    }

    const json = await response.json();
    const vector = json?.data?.[0]?.embedding;
    if (!Array.isArray(vector)) return null;
    return vector.slice(0, EMBEDDING_DIMENSION);
  } catch (err) {
    console.error('[vaultSearchService.embedText] error', err);
    return null;
  }
}

function cosineSimilarity(a = [], b = []) {
  if (!a.length || !b.length) return 0;
  const length = Math.min(a.length, b.length);
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i += 1) {
    const va = Number(a[i]) || 0;
    const vb = Number(b[i]) || 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchVault({ orgId, query, limit = 20 }) {
  const text = normalizeText(query);
  if (!text) return { results: [] };

  const embedding = await embedText(text);
  if (!embedding) {
    // fallback: keyword search
    const snap = await db
      .collection(`orgs/${orgId}/vault`)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    const results = snap.docs
      .map((doc) => ({ id: doc.id, score: 0.1, ...doc.data() }))
      .filter((doc) => normalizeText(`${doc.content} ${doc.summary}`).includes(text.toLowerCase()));
    return { results: results.slice(0, limit) };
  }

  const candidatesSnap = await db
    .collection(`orgs/${orgId}/vault`)
    .orderBy('createdAt', 'desc')
    .limit(400)
    .get();

  const scored = candidatesSnap.docs
    .map((doc) => {
      const data = doc.data();
      const score = cosineSimilarity(embedding, data.embedding || []);
      return {
        id: doc.id,
        score,
        ...data,
      };
    })
    .filter((item) => item.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return { results: scored };
}

export default {
  embedText,
  searchVault,
};
