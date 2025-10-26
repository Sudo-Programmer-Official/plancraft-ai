// import express from 'express';
// import { db } from '../../../server/firebaseAdmin.js';
// import withOrgAuth from './middlewares/withOrgAuth.js';

// const router = express.Router({ mergeParams: true });

// router.use(withOrgAuth);

// // List boards for an org (optionally by project)
// router.get('/', async (req, res) => {
//   try {
//     const { orgId } = req.params;
//     const { projectId } = req.query;
//     let ref = db.collection(`orgs/${orgId}/boards`).orderBy('createdAt', 'desc');
//     if (projectId) ref = ref.where('projectId', '==', projectId);
//     const snap = await ref.get();
//     const boards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
//     res.json(boards);
//   } catch (err) {
//     console.error('GET /api/orgs/:orgId/boards error', err);
//     res.status(500).json({ error: 'Failed to load boards' });
//   }
// });

// // Create board
// router.post('/', async (req, res) => {
//   try {
//     const { orgId } = req.params;
//     const { name, projectId = null, type = 'kanban', columns = [] } = req.body || {};
//     if (!name) return res.status(400).json({ error: 'Missing board name' });

//     const now = new Date();
//     const data = {
//       name,
//       projectId,
//       type,
//       columns,
//       createdAt: now,
//       updatedAt: now,
//     };
//     const ref = await db.collection(`orgs/${orgId}/boards`).add(data);
//     res.json({ id: ref.id, ...data });
//   } catch (err) {
//     console.error('POST /api/orgs/:orgId/boards error', err);
//     res.status(500).json({ error: 'Failed to create board' });
//   }
// });

// // Update board
// router.patch('/:boardId', async (req, res) => {
//   try {
//     const { orgId, boardId } = req.params;
//     const updates = { ...req.body, updatedAt: new Date() };
//     const ref = db.doc(`orgs/${orgId}/boards/${boardId}`);
//     const snap = await ref.get();
//     if (!snap.exists) return res.status(404).json({ error: 'Board not found' });

//     await ref.update(updates);
//     res.json({ id: boardId, ...snap.data(), ...updates });
//   } catch (err) {
//     console.error('PATCH /api/orgs/:orgId/boards/:boardId error', err);
//     res.status(500).json({ error: 'Failed to update board' });
//   }
// });

// // Delete board
// router.delete('/:boardId', async (req, res) => {
//   try {
//     const { orgId, boardId } = req.params;
//     await db.doc(`orgs/${orgId}/boards/${boardId}`).delete();
//     res.json({ ok: true });
//   } catch (err) {
//     console.error('DELETE /api/orgs/:orgId/boards/:boardId error', err);
//     res.status(500).json({ error: 'Failed to delete board' });
//   }
// });

// export default router;

import express from "express";
import { db } from "../../../server/firebaseAdmin.js";
import withOrgAuth from "./middlewares/withOrgAuth.js";

const router = express.Router({ mergeParams: true });

router.use(withOrgAuth);

/* ──────────────────────────────────────────────
 * GET /api/orgs/:orgId/boards
 * List boards for an org (optionally filtered by project)
 * ────────────────────────────────────────────── */
router.get("/", async (req, res) => {
  try {
    const { orgId } = req.params;
    const { projectId } = req.query;

    let ref = db
      .collection(`orgs/${orgId}/boards`)
      .orderBy("createdAt", "desc");

    if (projectId) ref = ref.where("projectId", "==", projectId);

    const snap = await ref.get();
    const boards = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    res.json(boards);
  } catch (err) {
    console.error("❌ GET /api/orgs/:orgId/boards error:", err);
    res.status(500).json({ error: "Failed to load boards" });
  }
});

/* ──────────────────────────────────────────────
 * POST /api/orgs/:orgId/boards
 * Create a new board
 * ────────────────────────────────────────────── */
router.post("/", async (req, res) => {
  try {
    const { orgId } = req.params;
    const {
      name,
      projectId = null,
      type = "kanban",
      columns = [],
    } = req.body || {};

    if (!name?.trim()) {
      return res.status(400).json({ error: "Missing board name" });
    }

    const now = new Date();
    const data = {
      name: name.trim(),
      projectId,
      type,
      columns: Array.isArray(columns) ? columns : [],
      createdAt: now,
      updatedAt: now,
      createdBy: req.user?.uid || null,
    };

    const ref = await db.collection(`orgs/${orgId}/boards`).add(data);
    res.status(201).json({ id: ref.id, ...data });
  } catch (err) {
    console.error("❌ POST /api/orgs/:orgId/boards error:", err);
    res.status(500).json({ error: "Failed to create board" });
  }
});

/* ──────────────────────────────────────────────
 * PATCH /api/orgs/:orgId/boards/:boardId
 * Update board metadata or structure
 * ────────────────────────────────────────────── */
router.patch("/:boardId", async (req, res) => {
  try {
    const { orgId, boardId } = req.params;
    const updates = { ...req.body, updatedAt: new Date() };

    const ref = db.doc(`orgs/${orgId}/boards/${boardId}`);
    const snap = await ref.get();

    if (!snap.exists) {
      return res.status(404).json({ error: "Board not found" });
    }

    await ref.update(updates);
    res.json({ id: boardId, ...snap.data(), ...updates });
  } catch (err) {
    console.error("❌ PATCH /api/orgs/:orgId/boards/:boardId error:", err);
    res.status(500).json({ error: "Failed to update board" });
  }
});

/* ──────────────────────────────────────────────
 * DELETE /api/orgs/:orgId/boards/:boardId
 * Delete a board
 * ────────────────────────────────────────────── */
router.delete("/:boardId", async (req, res) => {
  try {
    const { orgId, boardId } = req.params;
    const ref = db.doc(`orgs/${orgId}/boards/${boardId}`);

    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ error: "Board not found" });
    }

    await ref.delete();
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ DELETE /api/orgs/:orgId/boards/:boardId error:", err);
    res.status(500).json({ error: "Failed to delete board" });
  }
});

export default router;