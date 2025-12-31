const PINECONE_API_KEY = process.env.PINECONE_API_KEY || "";
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || "plancraft-memory";

let client = null;
let index = null;
let pineconeModulePromise = null;

function vectorStoreEnabled() {
  return Boolean(PINECONE_API_KEY && PINECONE_INDEX_NAME);
}

async function loadPinecone() {
  if (!pineconeModulePromise) {
    // Lazy-load Pinecone so startup doesn't crash when the dependency is unavailable or optional
    pineconeModulePromise = import("@pinecone-database/pinecone").catch((err) => {
      pineconeModulePromise = null;
      throw err;
    });
  }
  return pineconeModulePromise;
}

async function getIndex() {
  if (!vectorStoreEnabled()) {
    throw new Error("Vector store disabled (missing PINECONE_API_KEY or PINECONE_INDEX_NAME)");
  }
  if (!client) {
    const { Pinecone } = await loadPinecone();
    client = new Pinecone({ apiKey: PINECONE_API_KEY });
    index = client.index(PINECONE_INDEX_NAME);
  }
  return index;
}

export async function upsertChunks(workspaceId, chunks = []) {
  if (!vectorStoreEnabled() || !workspaceId || !Array.isArray(chunks) || !chunks.length) return { upserted: 0, skipped: !vectorStoreEnabled() };
  const idx = await getIndex();
  const namespace = idx.namespace(String(workspaceId));
  const vectors = chunks
    .filter((c) => Array.isArray(c.embedding) && c.embedding.length)
    .map((c) => ({
      id: c.chunkId,
      values: c.embedding,
      metadata: {
        docId: c.docId,
        chunkId: c.chunkId,
        chunkIndex: c.chunkIndex,
        heading: c.metadata?.heading || null,
        text: c.text || "",
        workspaceId,
      },
    }));
  if (!vectors.length) return { upserted: 0, skipped: true };
  await namespace.upsert(vectors);
  return { upserted: vectors.length, skipped: false };
}

export async function deleteChunks(workspaceId, chunkIds = []) {
  if (!vectorStoreEnabled() || !workspaceId || !chunkIds.length) return;
  const idx = await getIndex();
  const namespace = idx.namespace(String(workspaceId));
  await namespace.deleteMany(chunkIds);
}

export async function queryChunks(workspaceId, embedding, topK = 6) {
  if (!vectorStoreEnabled() || !workspaceId || !Array.isArray(embedding) || !embedding.length) {
    return { matches: [], enabled: false };
  }
  const idx = await getIndex();
  const namespace = idx.namespace(String(workspaceId));
  const res = await namespace.query({
    vector: embedding,
    topK: Number(topK) || 6,
    includeMetadata: true,
  });
  const matches = (res?.matches || []).map((m) => ({
    score: m.score,
    chunkId: m.id,
    docId: m.metadata?.docId || null,
    text: m.metadata?.text || "",
    metadata: {
      heading: m.metadata?.heading || null,
      chunkIndex: m.metadata?.chunkIndex ?? null,
    },
  }));
  return { matches, enabled: true };
}

export { vectorStoreEnabled };
