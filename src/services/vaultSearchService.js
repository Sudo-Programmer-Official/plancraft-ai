import { db } from '../../server/firebaseAdmin.js';

const EMBEDDING_ENDPOINT = process.env.OPENAI_EMBED_ENDPOINT || 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = process.env.OPENAI_EMBED_MODEL || process.env.OPENAI_MODEL || 'text-embedding-3-small';
const EMBEDDING_DIMENSION = Number(process.env.OPENAI_EMBED_DIMENSION || 1536);
const SEARCH_CACHE_TTL = Number(process.env.VAULT_SEARCH_CACHE_MS || 15_000);
const MAX_CANDIDATE_LIMIT = Number(process.env.VAULT_SEARCH_CANDIDATE_LIMIT || 320);

const searchCache = new Map(); // Map<string, { results: any[], expires: number }>

function normalizeText(text = '') {
  return String(text || '').trim();
}

function cacheKey(orgId, query, limit) {
  return `${orgId}::${query}::${limit}`;
}

function getCachedResult(key) {
  const cached = searchCache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.results;
  }
  if (cached) searchCache.delete(key);
  return null;
}

function setCachedResult(key, results) {
  searchCache.set(key, { results, expires: Date.now() + SEARCH_CACHE_TTL });
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

  const key = cacheKey(orgId, text, limit);
  const cached = getCachedResult(key);
  if (cached) {
    return { results: cached };
  }

  const embedding = await embedText(text);
  if (!embedding) {
    // fallback: keyword search
    const snap = await db
      .collection(`orgs/${orgId}/vault`)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    const needle = text.toLowerCase();
    const results = snap.docs
      .map((doc) => ({ id: doc.id, score: 0.1, ...doc.data() }))
      .filter((doc) => {
        const haystack = normalizeText(doc.searchText || `${doc.title || ''} ${doc.summary || ''} ${doc.content || ''}`);
        return haystack.includes(needle);
      });
    const sliced = results.slice(0, limit);
    setCachedResult(key, sliced);
    return { results: sliced };
  }

  const candidateLimit = Math.min(
    MAX_CANDIDATE_LIMIT,
    Math.max(limit * 6, 120),
  );

  const candidatesSnap = await db
    .collection(`orgs/${orgId}/vault`)
    .orderBy('createdAt', 'desc')
    .limit(candidateLimit)
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
    .filter((item) => item.score > 0.05 || normalizeText(`${item.title} ${item.summary}`).includes(text.toLowerCase()))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  setCachedResult(key, scored);

  return { results: scored };
}

export function invalidateVaultSearchCache(orgId) {
  const prefix = `${orgId}::`;
  for (const key of Array.from(searchCache.keys())) {
    if (key.startsWith(prefix)) {
      searchCache.delete(key);
    }
  }
}

export default {
  embedText,
  searchVault,
  invalidateVaultSearchCache,
};
