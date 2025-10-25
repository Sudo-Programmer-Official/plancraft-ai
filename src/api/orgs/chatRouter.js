import express from 'express';
import admin, { db } from '../../../server/firebaseAdmin.js';
import withOrgAuth from './middlewares/withOrgAuth.js';

const router = express.Router({ mergeParams: true });

router.use(withOrgAuth);

function roomCollection(orgId) {
  return db.collection(`orgs/${orgId}/chatRooms`);
}

function messagesCollection(orgId, roomId) {
  return roomCollection(orgId).doc(roomId).collection('messages');
}

function sanitizeRoomPayload(body = {}) {
  const name = String(body.name || '').trim();
  if (!name) {
    const err = new Error('Missing room name');
    err.status = 400;
    throw err;
  }
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const projectId = typeof body.projectId === 'string' ? body.projectId.trim() || null : null;
  return { name, description, projectId };
}

router.get('/rooms', async (req, res) => {
  try {
    const { orgId } = req.params;
    const limit = Number(req.query.limit || 50);
    const snap = await roomCollection(orgId).orderBy('updatedAt', 'desc').limit(limit).get();
    const rooms = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(rooms);
  } catch (err) {
    console.error('GET /chat/rooms error', err);
    res.status(500).json({ error: 'Failed to load rooms' });
  }
});

router.post('/rooms', async (req, res) => {
  try {
    const { orgId } = req.params;
    const room = sanitizeRoomPayload(req.body);
    const now = new Date();
    const data = {
      ...room,
      createdAt: now,
      updatedAt: now,
      createdBy: req.user?.uid || null,
      memberCount: 0,
      lastMessageAt: null,
      pinnedMessageIds: [],
    };
    const ref = await roomCollection(orgId).add(data);
    res.json({ id: ref.id, ...data });
  } catch (err) {
    console.error('POST /chat/rooms error', err);
    res.status(err?.status || 500).json({ error: err?.message || 'Failed to create room' });
  }
});

router.get('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { orgId, roomId } = req.params;
    const limit = Number(req.query.limit || 50);
    const cursor = req.query.cursor ? String(req.query.cursor) : null;

    let query = messagesCollection(orgId, roomId)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (cursor) {
      const cursorDoc = await messagesCollection(orgId, roomId).doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snap = await query.get();
    const messages = snap.docs
      .map((doc) => ({ id: doc.id, roomId, ...doc.data() }))
      .reverse();
    const nextCursor = snap.docs.length === limit ? snap.docs[snap.docs.length - 1].id : null;
    res.json({ messages, nextCursor });
  } catch (err) {
    console.error('GET /chat/messages error', err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

router.post('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { orgId, roomId } = req.params;
    const { text = '', attachments = [] } = req.body || {};
    const content = String(text || '').trim();
    if (!content && !Array.isArray(attachments)) {
      return res.status(400).json({ error: 'Missing message content' });
    }

    const now = new Date();
    const data = {
      text: content,
      attachments: Array.isArray(attachments) ? attachments : [],
      senderUid: req.user?.uid || null,
      senderName: req.user?.name || null,
      roomId,
      createdAt: now,
      updatedAt: now,
      pinned: false,
      reactions: [],
    };
    const ref = await messagesCollection(orgId, roomId).add(data);
    await roomCollection(orgId)
      .doc(roomId)
      .set({ lastMessageAt: now, updatedAt: now }, { merge: true });
    res.json({ id: ref.id, ...data });
  } catch (err) {
    console.error('POST /chat/messages error', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

router.post('/rooms/:roomId/pin', async (req, res) => {
  try {
    const { orgId, roomId } = req.params;
    const { messageId, pinned = true } = req.body || {};
    if (!messageId) return res.status(400).json({ error: 'Missing messageId' });

    await messagesCollection(orgId, roomId)
      .doc(messageId)
      .set({ pinned: !!pinned, pinnedAt: pinned ? new Date() : null, pinnedBy: pinned ? req.user?.uid || null : null }, { merge: true });

    if (pinned) {
      await roomCollection(orgId)
        .doc(roomId)
        .set(
          { pinnedMessageIds: admin.firestore.FieldValue.arrayUnion(messageId), updatedAt: new Date() },
          { merge: true },
        );
    } else {
      await roomCollection(orgId)
        .doc(roomId)
        .set(
          { pinnedMessageIds: admin.firestore.FieldValue.arrayRemove(messageId), updatedAt: new Date() },
          { merge: true },
        );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /chat/pin error', err);
    res.status(500).json({ error: 'Failed to update pinned message' });
  }
});

router.post('/rooms/:roomId/uploads', async (req, res) => {
  try {
    const { orgId, roomId } = req.params;
    const { data, mimeType, filename } = req.body || {};
    if (!data) return res.status(400).json({ error: 'Missing file data' });

    const decoded = decodeUpload(data, mimeType);
    if (!decoded) return res.status(400).json({ error: 'Invalid attachment data' });

    const storagePath = `orgs/${orgId}/chat/${roomId}/${Date.now()}_${filename || 'attachment'}`;
    await admin.storage().bucket().file(storagePath).save(decoded.buffer, {
      contentType: decoded.mimeType,
      metadata: { orgId, roomId, uploadedBy: req.user?.uid || null },
    });

    const signedUrls = await admin.storage().bucket().file(storagePath).getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });

    res.json({ path: storagePath, url: signedUrls?.[0], mimeType: decoded.mimeType });
  } catch (err) {
    console.error('POST /chat/uploads error', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

function decodeUpload(input, inferredMime) {
  try {
    if (typeof input !== 'string') return null;
    let mimeType = inferredMime || 'application/octet-stream';
    let base64 = input;
    if (input.startsWith('data:')) {
      const [, meta, payload] = input.match(/^data:(.*?);base64,(.*)$/) || [];
      if (!payload) return null;
      mimeType = inferredMime || meta || mimeType;
      base64 = payload;
    }
    const buffer = Buffer.from(base64, 'base64');
    return { buffer, mimeType };
  } catch (err) {
    console.error('decodeUpload error', err);
    return null;
  }
}

export default router;
