import express from 'express';
import admin, { db } from '../../../server/firebaseAdmin.js';
import withOrgAuth from '../orgs/middlewares/withOrgAuth.js';

const router = express.Router({ mergeParams: true });

router.use(withOrgAuth);

function roomDoc(orgId, roomId) {
  return db.doc(`orgs/${orgId}/rtcRooms/${roomId}`);
}

function ensureRoomId(roomId) {
  if (!roomId) {
    const err = new Error('Missing roomId');
    err.status = 400;
    throw err;
  }
}

function cleanOffer(offer = {}) {
  const { type, sdp } = offer;
  if (!type || !sdp) {
    const err = new Error('Invalid offer payload');
    err.status = 400;
    throw err;
  }
  return { type, sdp };
}

function cleanAnswer(answer = {}) {
  const { type, sdp } = answer;
  if (!type || !sdp) {
    const err = new Error('Invalid answer payload');
    err.status = 400;
    throw err;
  }
  return { type, sdp };
}

function cleanCandidate(candidate = {}) {
  const { candidate: cand, sdpMid = null, sdpMLineIndex = null, usernameFragment = null } = candidate;
  if (!cand) {
    const err = new Error('Invalid ICE candidate payload');
    err.status = 400;
    throw err;
  }
  return {
    candidate: cand,
    sdpMid,
    sdpMLineIndex,
    usernameFragment,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
}

router.post('/offer', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { roomId, offer, metadata = {} } = req.body || {};
    ensureRoomId(roomId);
    const sanitized = cleanOffer(offer);

    const data = {
      roomId,
      offer: sanitized,
      offerBy: req.user?.uid || null,
      offerAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        ...metadata,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await roomDoc(orgId, roomId).set(
      {
        ...data,
        answer: admin.firestore.FieldValue.delete(),
        answerBy: admin.firestore.FieldValue.delete(),
        answerAt: admin.firestore.FieldValue.delete(),
        offerCandidates: [],
        answerCandidates: [],
        participants: admin.firestore.FieldValue.arrayUnion(req.user?.uid || 'unknown'),
        expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 1000 * 60 * 120)),
      },
      { merge: true },
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /rtc/offer error', err);
    res.status(err?.status || 500).json({ error: err?.message || 'Failed to store offer' });
  }
});

router.post('/answer', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { roomId, answer } = req.body || {};
    ensureRoomId(roomId);
    const sanitized = cleanAnswer(answer);

    await roomDoc(orgId, roomId).set(
      {
        answer: sanitized,
        answerBy: req.user?.uid || null,
        answerAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        participants: admin.firestore.FieldValue.arrayUnion(req.user?.uid || 'unknown'),
      },
      { merge: true },
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /rtc/answer error', err);
    res.status(err?.status || 500).json({ error: err?.message || 'Failed to store answer' });
  }
});

router.post('/ice', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { roomId, candidate, role } = req.body || {};
    ensureRoomId(roomId);
    if (!role || !['offer', 'answer'].includes(role)) {
      return res.status(400).json({ error: 'Missing or invalid role (offer|answer)' });
    }

    const sanitized = cleanCandidate(candidate);
    const field =
      role === 'offer'
        ? { offerCandidates: admin.firestore.FieldValue.arrayUnion(sanitized) }
        : { answerCandidates: admin.firestore.FieldValue.arrayUnion(sanitized) };

    await roomDoc(orgId, roomId).set(
      {
        ...field,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /rtc/ice error', err);
    res.status(err?.status || 500).json({ error: err?.message || 'Failed to store candidate' });
  }
});

router.get('/room/:roomId', async (req, res) => {
  try {
    const { orgId, roomId } = req.params;
    ensureRoomId(roomId);
    const snap = await roomDoc(orgId, roomId).get();
    if (!snap.exists) {
      return res.json(null);
    }
    res.json(snap.data());
  } catch (err) {
    console.error('GET /rtc/room error', err);
    res.status(err?.status || 500).json({ error: err?.message || 'Failed to load room' });
  }
});

router.delete('/room/:roomId', async (req, res) => {
  try {
    const { orgId, roomId } = req.params;
    ensureRoomId(roomId);
    await roomDoc(orgId, roomId).delete();
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /rtc/room error', err);
    res.status(err?.status || 500).json({ error: err?.message || 'Failed to delete room' });
  }
});

export default router;
