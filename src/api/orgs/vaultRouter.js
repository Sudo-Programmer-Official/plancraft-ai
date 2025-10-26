// import express from 'express';
// import { db } from '../../../server/firebaseAdmin.js';
// import withOrgAuth from './middlewares/withOrgAuth.js';
// import { rebuildVault } from '../../services/vaultIndexer.js';
// import { searchVault } from '../../services/vaultSearchService.js';
// import { notifyVaultEvent } from '../../services/notifierService.js';

// const router = express.Router({ mergeParams: true });

// router.use(withOrgAuth);

// const DEFAULT_LIMIT = Number(process.env.VAULT_LIST_LIMIT || 25);
// const MAX_LIMIT = Number(process.env.VAULT_LIST_MAX || 100);

// function clampLimit(value) {
//   const parsed = Number(value);
//   if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_LIMIT;
//   return Math.min(parsed, MAX_LIMIT);
// }

// function serializeTimestamp(value) {
//   if (!value) return null;
//   if (typeof value.toDate === 'function') return value.toDate().toISOString();
//   if (value instanceof Date) return value.toISOString();
//   const parsed = new Date(value);
//   return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
// }

// function serializeVaultDoc(doc, extra = {}) {
//   const data = doc.data();
//   return {
//     id: doc.id,
//     type: data.type || 'unknown',
//     sourceId: data.sourceId || null,
//     title: data.title || null,
//     summary: data.summary || null,
//     content: data.content || null,
//     metadata: data.metadata || {},
//     createdAt: serializeTimestamp(data.createdAt),
//     updatedAt: serializeTimestamp(data.updatedAt),
//     createdBy: data.createdBy || null,
//     score: extra.score ?? null,
//   };
// }

// router.get('/', async (req, res) => {
//   try {
//     const { orgId } = req.params;
//     const type = typeof req.query.type === 'string' ? req.query.type : null;
//     const limit = clampLimit(req.query.limit);
//     const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;

//     let ref = db.collection(`orgs/${orgId}/vault`);
//     if (type) {
//       ref = ref.where('type', '==', type);
//     }
//     ref = ref.orderBy('createdAt', 'desc');

//     if (cursor) {
//       const cursorSnap = await db.doc(`orgs/${orgId}/vault/${cursor}`).get();
//       if (!cursorSnap.exists) {
//         return res.status(400).json({ error: 'Invalid cursor' });
//       }
//       ref = ref.startAfter(cursorSnap);
//     }

//     const snap = await ref.limit(limit).get();
//     const items = snap.docs.map((doc) => serializeVaultDoc(doc));
//     const nextCursor = snap.size === limit ? snap.docs[snap.docs.length - 1].id : null;

//     res.json({ items, nextCursor });
//   } catch (err) {
//     console.error('GET /api/orgs/:orgId/vault error', err);
//     res.status(500).json({ error: 'Failed to list vault items' });
//   }
// });

// router.get('/search', async (req, res) => {
//   try {
//     const { orgId } = req.params;
//     const query = typeof req.query.q === 'string' ? req.query.q : '';
//     const limit = clampLimit(req.query.limit);

//     const result = await searchVault({ orgId, query, limit });
//     const items = (result?.results || []).map((item) => {
//       const { embedding, score, ...rest } = item || {};
//       return serializeVaultDoc(
//         {
//           id: item.id,
//           data: () => rest,
//         },
//         { score },
//       );
//     });

//     res.json({ items });
//   } catch (err) {
//     console.error('GET /api/orgs/:orgId/vault/search error', err);
//     res.status(500).json({ error: 'Failed to search vault' });
//   }
// });

// router.post('/refresh', async (req, res) => {
//   try {
//     if (!['owner', 'admin'].includes(req.orgRole)) {
//       return res.status(403).json({ error: 'Requires admin or owner role' });
//     }
//     const { orgId } = req.params;
//     const result = await rebuildVault({ orgId });
//     res.json({ ok: true, ...result });

//     notifyVaultEvent({
//       orgId,
//       itemId: 'reindex',
//       title: `${req.user?.name || 'Vault refreshed'}`,
//       body: 'Knowledge vault has been reindexed.',
//       actorUid: req.user?.uid || null,
//     }).catch((err) => console.warn('[notify] vault.refresh failed:', err));
//   } catch (err) {
//     console.error('POST /api/orgs/:orgId/vault/refresh error', err);
//     res.status(500).json({ error: 'Failed to refresh vault' });
//   }
// });

// router.delete('/:vaultId', async (req, res) => {
//   try {
//     if (!['owner', 'admin'].includes(req.orgRole)) {
//       return res.status(403).json({ error: 'Requires admin or owner role' });
//     }
//     const { orgId, vaultId } = req.params;
//     const ref = db.doc(`orgs/${orgId}/vault/${vaultId}`);
//     const snap = await ref.get();
//     if (!snap.exists) return res.status(404).json({ error: 'Vault item not found' });
//     await ref.delete();
//     res.json({ ok: true });

//     notifyVaultEvent({
//       orgId,
//       itemId: vaultId,
//       title: `${req.user?.name || 'Vault update'}`,
//       body: 'A knowledge item was removed.',
//       actorUid: req.user?.uid || null,
//     }).catch((err) => console.warn('[notify] vault.delete failed:', err));
//   } catch (err) {
//     console.error('DELETE /api/orgs/:orgId/vault/:vaultId error', err);
//     res.status(500).json({ error: 'Failed to delete vault item' });
//   }
// });

// export default router;

import express from "express";
import { db } from "../../../server/firebaseAdmin.js";
import withOrgAuth from "./middlewares/withOrgAuth.js";
import { rebuildVault } from "../../services/vaultIndexer.js";
import { searchVault } from "../../services/vaultSearchService.js";
import { notifyVaultEvent } from "../../services/notifierService.js";

const router = express.Router({ mergeParams: true });

// 🔒 Protect every route with org membership
router.use(withOrgAuth);

/* ──────────────────────────────────────────────────────────────
 * Utility Functions
 * ──────────────────────────────────────────────────────────── */

const DEFAULT_LIMIT = Number(process.env.VAULT_LIST_LIMIT || 25);
const MAX_LIMIT = Number(process.env.VAULT_LIST_MAX || 100);

function clampLimit(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function serializeTimestamp(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function serializeVaultDoc(doc, extra = {}) {
  if (!doc || typeof doc.data !== "function") return null;
  const data = doc.data() || {};
  return {
    id: doc.id,
    type: data.type || "unknown",
    sourceId: data.sourceId || null,
    title: data.title || null,
    summary: data.summary || null,
    content: data.content || null,
    metadata: data.metadata || {},
    createdAt: serializeTimestamp(data.createdAt),
    updatedAt: serializeTimestamp(data.updatedAt),
    createdBy: data.createdBy || null,
    score: extra.score ?? null,
  };
}

function isAdmin(req) {
  const role = String(req.orgRole || req.orgMember?.role || "").toLowerCase();
  return ["owner", "admin"].includes(role);
}

/* ──────────────────────────────────────────────────────────────
 * GET /api/orgs/:orgId/vault
 * List vault items (optional filter + pagination)
 * ──────────────────────────────────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    const { orgId } = req.params;
    const type = typeof req.query.type === "string" ? req.query.type : null;
    const limit = clampLimit(req.query.limit);
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : null;

    let ref = db.collection(`orgs/${orgId}/vault`).orderBy("createdAt", "desc");
    if (type) ref = ref.where("type", "==", type);

    if (cursor) {
      const cursorRef = db.doc(`orgs/${orgId}/vault/${cursor}`);
      const cursorSnap = await cursorRef.get();
      if (!cursorSnap.exists) {
        return res.status(400).json({ error: "Invalid pagination cursor" });
      }
      ref = ref.startAfter(cursorSnap);
    }

    const snap = await ref.limit(limit).get();
    const items = snap.docs.map((doc) => serializeVaultDoc(doc)).filter(Boolean);
    const nextCursor = snap.size === limit ? snap.docs[snap.docs.length - 1].id : null;

    res.json({ items, nextCursor });
  } catch (err) {
    console.error("❌ GET /api/orgs/:orgId/vault error", err);
    res.status(500).json({ error: "Failed to list vault items" });
  }
});

/* ──────────────────────────────────────────────────────────────
 * GET /api/orgs/:orgId/vault/search?q=...
 * Semantic / keyword search for vault items
 * ──────────────────────────────────────────────────────────── */
router.get("/search", async (req, res) => {
  try {
    const { orgId } = req.params;
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limit = clampLimit(req.query.limit);

    if (!query) return res.status(400).json({ error: "Missing search query" });

    const result = await searchVault({ orgId, query, limit });
    const items = (result?.results || []).map((item) => {
      const { score, embedding, ...data } = item || {};
      return serializeVaultDoc(
        { id: item.id, data: () => data },
        { score: typeof score === "number" ? Number(score.toFixed(4)) : null }
      );
    });

    res.json({ items });
  } catch (err) {
    console.error("❌ GET /api/orgs/:orgId/vault/search error", err);
    res.status(500).json({ error: "Failed to search vault" });
  }
});

/* ──────────────────────────────────────────────────────────────
 * POST /api/orgs/:orgId/vault/refresh
 * Rebuild/reindex the org vault (admin/owner only)
 * ──────────────────────────────────────────────────────────── */
router.post("/refresh", async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Requires admin or owner role" });
    }

    const { orgId } = req.params;
    const result = await rebuildVault({ orgId });

    res.json({ ok: true, ...result });

    // 🔔 Async notify other team members
    notifyVaultEvent({
      orgId,
      itemId: "reindex",
      title: `${req.user?.name || "Vault refreshed"}`,
      body: "Knowledge vault has been reindexed.",
      actorUid: req.user?.uid || null,
    }).catch((err) => console.warn("[notify] vault.refresh failed:", err));
  } catch (err) {
    console.error("❌ POST /api/orgs/:orgId/vault/refresh error", err);
    res.status(500).json({ error: "Failed to refresh vault" });
  }
});

/* ──────────────────────────────────────────────────────────────
 * DELETE /api/orgs/:orgId/vault/:vaultId
 * Soft-delete (admin/owner only)
 * ──────────────────────────────────────────────────────────── */
router.delete("/:vaultId", async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Requires admin or owner role" });
    }

    const { orgId, vaultId } = req.params;
    const ref = db.doc(`orgs/${orgId}/vault/${vaultId}`);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Vault item not found" });
    }

    // Instead of hard delete, mark as archived for audit
    await ref.update({
      archived: true,
      deletedAt: new Date(),
      deletedBy: req.user?.uid || null,
    });

    res.json({ ok: true, message: "Vault item archived" });

    // 🔔 Fire notification (non-blocking)
    notifyVaultEvent({
      orgId,
      itemId: vaultId,
      title: `${req.user?.name || "Vault update"}`,
      body: "A knowledge item was archived.",
      actorUid: req.user?.uid || null,
    }).catch((err) => console.warn("[notify] vault.delete failed:", err));
  } catch (err) {
    console.error("❌ DELETE /api/orgs/:orgId/vault/:vaultId error", err);
    res.status(500).json({ error: "Failed to delete vault item" });
  }
});

export default router;