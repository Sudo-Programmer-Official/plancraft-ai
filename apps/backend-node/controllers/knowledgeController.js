import { createWorkspaceDoc, processWorkspaceDoc, searchWorkspaceKnowledge } from "../services/knowledge/knowledgeService.js";
import { db } from "../services/firebaseAdmin.js";

const ALLOWED_MIME_TYPES = ["text/plain", "text/markdown", "text/x-markdown", "application/json"];

function selectWorkspaceId(req) {
  return (
    req.body?.workspaceId ||
    req.body?.workspace_id ||
    req.params?.workspaceId ||
    req.query?.workspaceId ||
    req.headers?.["x-workspace-id"] ||
    null
  );
}

function readUploadedFile(file) {
  if (!file) return null;
  if (file.mimetype && file.mimetype.includes("pdf")) {
    const err = new Error("PDF not supported yet");
    err.code = "UNSUPPORTED";
    throw err;
  }
  if (file.mimetype && !ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    const err = new Error(`Unsupported file type: ${file.mimetype}`);
    err.code = "UNSUPPORTED";
    throw err;
  }
  return file.buffer?.toString("utf-8") || "";
}

export async function createDocHandler(req, res) {
  try {
    const workspaceId = selectWorkspaceId(req);
    const ownerUid = req.user?.uid || null;
    const { title, source = "paste", text } = req.body || {};
    const hasFile = !!req.file;
    const mimeType = hasFile ? req.file.mimetype : "text/plain";
    const docTitle = title || (hasFile ? req.file.originalname : "Untitled document");

    let rawText = text;
    if (hasFile) {
      rawText = readUploadedFile(req.file);
    }

    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });
    if (!ownerUid) return res.status(401).json({ error: "Unauthorized" });
    if (!rawText || !String(rawText).trim()) {
      return res.status(400).json({ error: "No text provided" });
    }

    const result = await createWorkspaceDoc({
      workspaceId,
      ownerUid,
      title: docTitle,
      source: hasFile ? source || "upload" : source || "paste",
      text: rawText,
      mimeType,
    });
    return res.status(201).json(result);
  } catch (err) {
    const status = err?.code === "UNSUPPORTED" ? 400 : 500;
    const message = err?.message || "Failed to create document";
    console.error("[Knowledge] create doc failed", message);
    return res.status(status).json({ error: message });
  }
}

export async function processDocHandler(req, res) {
  try {
    const { docId } = req.params || {};
    const workspaceId = selectWorkspaceId(req);
    if (!docId) return res.status(400).json({ error: "docId is required" });
    const docSnap = await db.collection("workspace_docs").doc(docId).get();
    if (!docSnap.exists) return res.status(404).json({ error: "Document not found" });
    const docData = docSnap.data() || {};
    if (workspaceId && docData.workspaceId && workspaceId !== docData.workspaceId) {
      return res.status(403).json({ error: "Document does not belong to workspace" });
    }
    // Kick off processing asynchronously to avoid request timeouts
    processWorkspaceDoc(docId, { expectedWorkspaceId: workspaceId || null })
      .catch(async (err) => {
        console.error("[Knowledge] background processing failed", err?.message || err);
        try {
          await db
            .collection("workspace_docs")
            .doc(docId)
            .set(
              { status: "failed", error: err?.message || "Processing failed", updatedAt: new Date() },
              { merge: true },
            );
        } catch {}
      });
    return res.json({ status: "processing" });
  } catch (err) {
    console.error("[Knowledge] process doc failed", err?.message || err);
    return res.status(500).json({ error: "Failed to process document" });
  }
}

export async function searchKnowledgeHandler(req, res) {
  try {
    const workspaceId = selectWorkspaceId(req);
    const { q, topK, docId } = req.query || {};
    if (!workspaceId) return res.status(400).json({ error: "workspaceId is required" });
    if (!q) return res.status(400).json({ error: "q is required" });
    const result = await searchWorkspaceKnowledge({
      workspaceId,
      query: q,
      topK: Number(topK) || 6,
      docId: docId || null,
    });
    try {
      await db.collection("knowledge_usage_logs").add({
        workspaceId,
        userId: req.user?.uid || null,
        type: "search",
        source: result.source || "fallback",
        items: Array.isArray(result.items) ? result.items.length : 0,
        createdAt: new Date(),
      });
    } catch {}
    // Normalize response contract
    return res.json({
      items: result.items || [],
      source: result.source || "fallback",
      cacheKey: result.cacheKey || null,
      moreAvailable: Boolean(result.moreAvailable),
    });
  } catch (err) {
    console.error("[Knowledge] search failed", err?.message || err);
    return res.status(500).json({ error: "Failed to search knowledge" });
  }
}
