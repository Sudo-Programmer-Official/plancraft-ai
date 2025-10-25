import { Server } from 'socket.io';
import admin, { db } from '../../server/firebaseAdmin.js';

const DEFAULT_PATH = process.env.SOCKET_IO_PATH || '/ws/chat';

const presence = new Map(); // Map<roomKey, Map<uid, { name, lastSeen }>>

function roomKey(orgId, roomId) {
  return `org:${orgId}:room:${roomId}`;
}

async function verifyMembership({ orgId, uid }) {
  if (!orgId || !uid) return false;
  try {
    const doc = await db.doc(`orgs/${orgId}/members/${uid}`).get();
    return doc.exists;
  } catch (err) {
    console.error('[chatGateway] membership check failed', err);
    return false;
  }
}

function recordPresence(orgId, roomId, user) {
  const key = roomKey(orgId, roomId);
  if (!presence.has(key)) presence.set(key, new Map());
  presence.get(key).set(user.uid, { name: user.name || null, lastSeen: Date.now() });
}

function removePresence(orgId, roomId, uid) {
  const key = roomKey(orgId, roomId);
  if (!presence.has(key)) return;
  const map = presence.get(key);
  map.delete(uid);
  if (!map.size) presence.delete(key);
}

function formatPresence(orgId, roomId) {
  const key = roomKey(orgId, roomId);
  const map = presence.get(key);
  if (!map) return [];
  return Array.from(map.entries()).map(([uid, info]) => ({
    uid,
    name: info.name,
    lastSeen: info.lastSeen,
  }));
}

async function persistMessage({ orgId, roomId, message }) {
  const now = new Date();
  const ref = await db
    .collection(`orgs/${orgId}/chatRooms/${roomId}/messages`)
    .add({ ...message, createdAt: now, updatedAt: now, pinned: false, reactions: [] });

  await db
    .collection(`orgs/${orgId}/chatRooms`)
    .doc(roomId)
    .set({ lastMessageAt: now, updatedAt: now }, { merge: true });

  return { id: ref.id, ...message, createdAt: now, updatedAt: now, pinned: false, reactions: [] };
}

export function initChatGateway(server) {
  const io = new Server(server, {
    path: DEFAULT_PATH,
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      const orgId = socket.handshake.auth?.orgId || socket.handshake.query?.orgId;
      if (!token) throw new Error('Missing token');
      if (!orgId) throw new Error('Missing orgId');

      const decoded = await admin.auth().verifyIdToken(token);
      const member = await verifyMembership({ orgId, uid: decoded.uid });
      if (!member) throw new Error('Not a member of org');

      socket.data.user = { uid: decoded.uid, name: decoded.name || decoded.email || decoded.uid };
      socket.data.orgId = orgId;
      next();
    } catch (err) {
      console.error('[chatGateway] auth failed', err);
      next(err);
    }
  });

  io.on('connection', (socket) => {
    const { user, orgId } = socket.data;

    socket.on('room:join', async ({ roomId }) => {
      if (!roomId) return;
      socket.join(roomKey(orgId, roomId));
      recordPresence(orgId, roomId, user);
      io.to(roomKey(orgId, roomId)).emit('presence:update', formatPresence(orgId, roomId));
    });

    socket.on('room:leave', ({ roomId }) => {
      if (!roomId) return;
      socket.leave(roomKey(orgId, roomId));
      removePresence(orgId, roomId, user.uid);
      io.to(roomKey(orgId, roomId)).emit('presence:update', formatPresence(orgId, roomId));
    });

    socket.on('chat:typing', ({ roomId, typing }) => {
      if (!roomId) return;
      socket.to(roomKey(orgId, roomId)).emit('chat:typing', {
        roomId,
        uid: user.uid,
        name: user.name,
        typing: !!typing,
      });
    });

    socket.on('chat:message', async ({ roomId, text = '', attachments = [] }) => {
      try {
        if (!roomId) return;
        const content = String(text || '').trim();
        if (!content && !attachments.length) return;
        const message = {
          roomId,
          text: content,
          attachments: Array.isArray(attachments) ? attachments : [],
          senderUid: user.uid,
          senderName: user.name,
        };
        const stored = await persistMessage({ orgId, roomId, message });
        io.to(roomKey(orgId, roomId)).emit('chat:message', stored);
      } catch (err) {
        console.error('[chatGateway] message error', err);
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    socket.on('chat:pin', async ({ roomId, messageId, pinned }) => {
      if (!roomId || !messageId) return;
      try {
        await db
          .collection(`orgs/${orgId}/chatRooms/${roomId}/messages`)
          .doc(messageId)
          .set(
            {
              pinned: !!pinned,
              pinnedAt: pinned ? new Date() : null,
              pinnedBy: pinned ? user.uid : null,
            },
            { merge: true },
          );
        io.to(roomKey(orgId, roomId)).emit('chat:pin', { roomId, messageId, pinned: !!pinned });
      } catch (err) {
        console.error('[chatGateway] pin error', err);
      }
    });

    socket.on('disconnect', () => {
      const rooms = Array.from(socket.rooms || []);
      rooms.forEach((key) => {
        if (key.startsWith('org:')) {
          const [, orgLabel, orgValue, roomLabel, roomValue] = key.split(':');
          if (orgLabel === 'org' && roomLabel === 'room') {
            removePresence(orgValue, roomValue, user.uid);
            io.to(key).emit('presence:update', formatPresence(orgValue, roomValue));
          }
        }
      });
    });
  });

  console.log(`[chatGateway] Socket.IO listening on path ${DEFAULT_PATH}`);

  return io;
}

export default initChatGateway;
