import crypto from "crypto";
import axios from "axios";
import { db } from "../firebaseAdmin.js";
import { chunkText } from "./chunker.js";
import { deleteChunks, queryChunks, upsertChunks, vectorStoreEnabled } from "./vectorStore.js";
import { ensureDocNode } from "./graphWriter.js";

const WORKSPACE_DOCS = "workspace_docs";
const WORKSPACE_DOC_CHUNKS = "workspace_doc_chunks";

const MAX_DOC_CHARS = Number(process.env.KNOWLEDGE_MAX_DOC_CHARS || 200000);
const MAX_CHUNKS_PER_DOC = Number(process.env.KNOWLEDGE_MAX_CHUNKS_PER_DOC || 300);
const MAX_CHUNKS_PER_WORKSPACE_PER_DAY = Number(
  process.env.KNOWLEDGE_MAX_CHUNKS_PER_WORKSPACE_PER_DAY || 0,
);
const CHUNK_SIZE = Number(process.env.KNOWLEDGE_CHUNK_SIZE || 1200);
const CHUNK_OVERLAP = Number(process.env.KNOWLEDGE_CHUNK_OVERLAP || 120);
const FALLBACK_DOC_WINDOW_DAYS = Number(process.env.KNOWLEDGE_FALLBACK_DAYS || 30);
const FALLBACK_CHUNK_LIMIT = Number(process.env.KNOWLEDGE_FALLBACK_CHUNKS || 50);

const EMBED_URL_BASE = (process.env.AI_NLP_SERVICE_URL || "").replace(/\/+$/, "");
const APP_TOKEN = process.env.SERVICE_APP_TOKEN || process.env.APP_TOKEN || "";

function normalizeContent(raw) {
  return String(raw || "").replace(/\r\n/g, "\n").trim();
}

function hashContent(raw) {
  return crypto.createHash("sha256").update(normalizeContent(raw)).digest("hex");
}

async function findDuplicate(workspaceId, docHash) {
  if (!workspaceId || !docHash) return null;
  const snap = await db
    .collection(WORKSPACE_DOCS)
    .where("workspaceId", "==", workspaceId)
    .where("docHash", "==", docHash)
    .limit(1)
    .get();
  const doc = snap.docs[0];
  if (!doc) return null;
  return { id: doc.id, ...(doc.data() || {}) };
}

async function embedTexts(texts = []) {
  if (!Array.isArray(texts) || !texts.length) return [];
  if (!EMBED_URL_BASE) throw new Error("AI_NLP_SERVICE_URL is not configured");
  const url = `${EMBED_URL_BASE}/api/ai/embed`;
  const headers = {};
  if (APP_TOKEN) headers["x-app-token"] = APP_TOKEN;
  const { data } = await axios.post(
    url,
    { texts },
    {
      headers,
      timeout: Number(process.env.KNOWLEDGE_EMBED_TIMEOUT_MS || 45000),
    },
  );
  if (!data || !Array.isArray(data.embeddings)) {
    throw new Error("Embedding service returned no embeddings");
  }
  if (data.embeddings.length !== texts.length) {
    throw new Error("Embedding service returned mismatched embeddings length");
  }
  return data.embeddings;
}

async function enforceWorkspaceChunkBudget(workspaceId, nextChunkCount) {
  if (!workspaceId || !nextChunkCount) return { ok: true };
  if (!MAX_CHUNKS_PER_WORKSPACE_PER_DAY) return { ok: true };
  const since = new Date();
  since.setDate(since.getDate() - 1);
  const snap = await db
    .collection(WORKSPACE_DOC_CHUNKS)
    .where("workspaceId", "==", workspaceId)
    .where("createdAt", ">=", since)
    .limit(MAX_CHUNKS_PER_WORKSPACE_PER_DAY + nextChunkCount + 5)
    .get();
  const current = snap.size;
  if (current + nextChunkCount > MAX_CHUNKS_PER_WORKSPACE_PER_DAY) {
    return {
      ok: false,
      reason: `Workspace daily chunk budget exceeded (${current + nextChunkCount}/${MAX_CHUNKS_PER_WORKSPACE_PER_DAY}).`,
    };
  }
  return { ok: true };
}

function buildChunkId(docId, index) {
  return `${docId}_chunk_${index}`;
}

export async function createWorkspaceDoc({ workspaceId, ownerUid, title, source, text, mimeType }) {
  if (!workspaceId) throw new Error("workspaceId is required");
  if (!ownerUid) throw new Error("ownerUid is required");
  const normalizedText = normalizeContent(text);
  const docHash = hashContent(normalizedText);

  const duplicate = await findDuplicate(workspaceId, docHash);
  if (duplicate) {
    return {
      docId: duplicate.id,
      duplicate: true,
      status: duplicate.status || "ready",
    };
  }

  const now = new Date();
  const docRef = db.collection(WORKSPACE_DOCS).doc();

  if (normalizedText.length > MAX_DOC_CHARS) {
    await docRef.set({
      workspaceId,
      ownerUid,
      title: title || "Untitled document",
      source: source || "paste",
      mimeType: mimeType || "text/plain",
      status: "failed",
      error: `Document too large (${normalizedText.length} chars > limit ${MAX_DOC_CHARS}).`,
      createdAt: now,
      updatedAt: now,
      docHash,
    });
    return { docId: docRef.id, status: "failed", error: "Document too large" };
  }

  await docRef.set({
    workspaceId,
    ownerUid,
    title: title || "Untitled document",
    source: source || "paste",
    mimeType: mimeType || "text/plain",
    status: "processing",
    error: null,
    rawText: normalizedText,
    docHash,
    vectorStatus: "pending",
    processedChunks: 0,
    totalChunks: 0,
    lastProcessedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  return { docId: docRef.id, status: "processing" };
}

async function deleteExistingChunks(workspaceId, docId, keepIds = []) {
  const snap = await db.collection(WORKSPACE_DOC_CHUNKS).where("docId", "==", docId).get();
  const stale = [];
  snap.forEach((doc) => {
    if (!keepIds.includes(doc.id)) stale.push(doc.id);
  });
  if (!stale.length) return;
  const queue = [...stale];
  // Firestore batch deletes (500 max)
  while (queue.length) {
    const slice = queue.splice(0, 450);
    const batch = db.batch();
    slice.forEach((id) => batch.delete(db.collection(WORKSPACE_DOC_CHUNKS).doc(id)));
    await batch.commit();
  }
  try {
    await deleteChunks(workspaceId, stale);
  } catch (err) {
    console.warn("[Knowledge] failed to delete vector chunks", err?.message || err);
  }
}

export async function processWorkspaceDoc(docId, { force = false, expectedWorkspaceId } = {}) {
  const docRef = db.collection(WORKSPACE_DOCS).doc(docId);
  const snap = await docRef.get();
  if (!snap.exists) throw new Error("Document not found");
  const doc = snap.data() || {};
  const workspaceId = doc.workspaceId;
  if (expectedWorkspaceId && workspaceId !== expectedWorkspaceId) {
    throw new Error("Document does not belong to workspace");
  }
  const rawText = normalizeContent(doc.rawText || "");

  if (!workspaceId) throw new Error("Document missing workspaceId");
  if (!rawText) {
    await docRef.set(
      { status: "failed", error: "No text found to process", updatedAt: new Date() },
      { merge: true },
    );
    return { status: "failed", error: "No text found to process" };
  }

  if (!force && rawText.length > MAX_DOC_CHARS) {
    await docRef.set(
      {
        status: "failed",
        error: `Document too large (${rawText.length} chars > limit ${MAX_DOC_CHARS}).`,
        updatedAt: new Date(),
      },
      { merge: true },
    );
    return { status: "failed", error: "Document too large" };
  }

  const docHash = doc.docHash || hashContent(rawText);
  const chunks = chunkText(rawText, { maxChars: CHUNK_SIZE, overlapChars: CHUNK_OVERLAP });

  if (!chunks.length) {
    await docRef.set(
      { status: "failed", error: "No content after chunking", updatedAt: new Date() },
      { merge: true },
    );
    return { status: "failed", error: "No content after chunking" };
  }
  if (chunks.length > MAX_CHUNKS_PER_DOC) {
    await docRef.set(
      {
        status: "failed",
        error: `Chunk limit exceeded (${chunks.length} > ${MAX_CHUNKS_PER_DOC}).`,
        updatedAt: new Date(),
      },
      { merge: true },
    );
    return { status: "failed", error: "Chunk limit exceeded" };
  }

  const budget = await enforceWorkspaceChunkBudget(workspaceId, chunks.length);
  if (!budget.ok) {
    await docRef.set({ status: "failed", error: budget.reason, updatedAt: new Date() }, { merge: true });
    return { status: "failed", error: budget.reason };
  }

  await docRef.set(
    {
      status: "processing",
      error: null,
      updatedAt: new Date(),
      processedChunks: 0,
      totalChunks: chunks.length,
      docHash,
      vectorStatus: "pending",
    },
    { merge: true },
  );

  const chunkDocs = [];
  const chunkIds = [];
  chunks.forEach((chunk, idx) => {
    const chunkId = buildChunkId(docId, idx);
    chunkIds.push(chunkId);
    chunkDocs.push({
      id: chunkId,
      data: {
        workspaceId,
        docId,
        chunkIndex: idx,
        text: chunk.text,
        tokensApprox: chunk.tokensApprox,
        embeddingId: chunkId,
        metadata: chunk.metadata || {},
        createdAt: new Date(),
      },
    });
  });

  // Replace existing chunks
  await deleteExistingChunks(workspaceId, docId, chunkIds);
  for (let i = 0; i < chunkDocs.length; i += 10) {
    const slice = chunkDocs.slice(i, i + 10);
    const batch = db.batch();
    slice.forEach((doc) => {
      batch.set(db.collection(WORKSPACE_DOC_CHUNKS).doc(doc.id), doc.data, { merge: true });
    });
    await batch.commit();
    await docRef.set(
      { processedChunks: Math.min(chunkDocs.length, i + slice.length), lastProcessedAt: new Date() },
      { merge: true },
    );
  }

  let vectorStatus = "skipped";
  try {
    const embeddings = await embedTexts(chunkDocs.map((c) => c.data.text));
    const payload = chunkDocs.map((c, idx) => ({
      chunkId: c.id,
      docId,
      chunkIndex: c.data.chunkIndex,
      text: c.data.text,
      metadata: c.data.metadata,
      embedding: embeddings[idx],
    }));
    const upserted = await upsertChunks(workspaceId, payload);
    vectorStatus = upserted?.skipped ? "skipped" : "completed";
  } catch (err) {
    vectorStatus = "skipped";
    console.warn("[Knowledge] embedding/upsert failed; continuing without vectors", err?.message || err);
  }

  await docRef.set(
    {
      status: "ready",
      error: null,
      updatedAt: new Date(),
      processedChunks: chunkDocs.length,
      totalChunks: chunkDocs.length,
      vectorStatus,
      lastProcessedAt: new Date(),
    },
    { merge: true },
  );

  try {
    await ensureDocNode({ workspaceId, docId, title: doc.title || "Document", source: doc.source || "doc" });
  } catch (err) {
    console.warn("[Knowledge] failed to upsert doc node", err?.message || err);
  }

  return { status: "ready", vectorStatus, totalChunks: chunkDocs.length };
}

export async function searchWorkspaceKnowledge({ workspaceId, query, topK = 6, docId = null }) {
  if (!workspaceId) throw new Error("workspaceId is required");
  const q = normalizeContent(query);
  if (!q) return { items: [], source: "fallback", cacheKey: null, moreAvailable: false };

  const cacheKey = hashContent(`${workspaceId}:${q}`).slice(0, 12);
  if (vectorStoreEnabled()) {
    try {
      const [embedding] = await embedTexts([q]);
      let { matches } = await queryChunks(workspaceId, embedding, topK * 2);
      if (docId) {
        matches = matches.filter((m) => !m.docId || m.docId === docId);
      }
      if (matches?.length) {
        const sliced = matches.slice(0, topK);
        const items = sliced.map((m) => ({
          docId: m.docId,
          chunkId: m.chunkId,
          text: m.text,
          score: m.score,
          source: "vector",
          metadata: m.metadata || {},
        }));
        return { items, source: "vector", cacheKey, moreAvailable: matches.length > items.length };
      }
    } catch (err) {
      console.warn("[Knowledge] vector search failed, falling back", err?.message || err);
    }
  }

  // Fallback keyword search over recent chunks
  const since = new Date();
  since.setDate(since.getDate() - FALLBACK_DOC_WINDOW_DAYS);
  let readyDocIds = [];
  if (docId) {
    const docSnap = await db.collection(WORKSPACE_DOCS).doc(docId).get();
    if (docSnap.exists && docSnap.data()?.status === "ready") {
      readyDocIds = [docId];
    }
  } else {
    const readyDocsSnap = await db
      .collection(WORKSPACE_DOCS)
      .where("workspaceId", "==", workspaceId)
      .where("status", "==", "ready")
      .orderBy("createdAt", "desc")
      .limit(8)
      .get();
    readyDocIds = readyDocsSnap.docs
      .filter((d) => {
        const createdAt = d.data()?.createdAt;
        if (!createdAt) return true;
        const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        return created >= since;
      })
      .map((d) => d.id);
  }

  const chunkCandidates = [];
  for (let i = 0; i < readyDocIds.length; i += 10) {
    const batchIds = readyDocIds.slice(i, i + 10);
    if (!batchIds.length) break;
    if (chunkCandidates.length >= FALLBACK_CHUNK_LIMIT) break;
    const snap = await db
      .collection(WORKSPACE_DOC_CHUNKS)
      .where("workspaceId", "==", workspaceId)
      .where("docId", "in", batchIds)
      .orderBy("createdAt", "desc")
      .limit(FALLBACK_CHUNK_LIMIT)
      .get();
    snap.forEach((doc) => chunkCandidates.push({ id: doc.id, ...(doc.data() || {}) }));
  }

  const tokens = q
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .slice(0, 12);

  const candidatePool = chunkCandidates.slice(0, FALLBACK_CHUNK_LIMIT);

  const scored = candidatePool.map((c) => {
    const text = String(c.text || "").toLowerCase();
    let score = 0;
    tokens.forEach((tok) => {
      if (!tok) return;
      const matches = text.split(tok).length - 1;
      score += matches;
    });
    // simple recency boost
    const createdAt = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt || Date.now());
    const ageDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, 1.5 - ageDays * 0.1);
    return { ...c, score: score + recencyBoost };
  });

  const top = scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((c) => ({
      docId: c.docId,
      chunkId: c.id,
      text: c.text,
      score: c.score,
      source: "fallback",
      metadata: c.metadata || {},
    }));

  return { items: top, source: "fallback", cacheKey, moreAvailable: scored.length > top.length };
}
