# TEAM CHAT — Sprint 7 Phase 1

This quick reference covers the real-time chat layer introduced in Sprint 7.

---

## 1. Overview

- WebSocket signaling: Socket.IO gateway mounted at `SOCKET_IO_PATH` (default `/ws/chat`).
- REST helpers: `/api/orgs/:orgId/chat/rooms` (list/create), `/rooms/:roomId/messages`, `/rooms/:roomId/uploads`, `/rooms/:roomId/pin`.
- Data model: `orgs/{orgId}/chatRooms/{roomId}` with `messages/{messageId}` subcollection.
- Attachments: stored under `orgs/{orgId}/chat/{roomId}/...` in Firebase Storage.
- Presence & typing: handled in-memory inside `chatGateway` and broadcast to room participants.
- AI layer (Phase 2): `/rooms/:roomId/summary`, `/rooms/:roomId/reply`, `/chat/search`, `/chat/coach`.
  - `summary` produces bullets + optional suggested tasks (with `createTasks` flag).
  - `reply` provides tone-aware responses.
  - `search` spans chat, tasks, and meetings for quick lookups.
  - `coach` generates persona-based encouragement messages.

---

## 2. Environment Variables

| Variable | Description | Default |
| --- | --- | --- |
| `SOCKET_IO_PATH` | Backend Socket.IO path | `/ws/chat` |
| `VITE_SOCKET_IO_PATH` | Frontend Socket.IO path | `/ws/chat` |
| `CORS_ORIGIN` | Allowed origins for Socket.IO | `*` |

Install dependencies after pulling:

```
pnpm --filter teams-api add socket.io
pnpm --filter audit-agent-frontend add socket.io-client
```

---

## 3. Firestore Rules & Indexes

- `firestore.rules` now includes `chatRooms/{roomId}` + nested `messages/{messageId}` with RBAC checks.
- `indexes.json` adds collection group `messages` index on `(roomId ASC, createdAt DESC)`.

Run:

```
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## 4. Frontend Components

- `TeamChat.vue`: orchestrates sidebar + thread, handles uploads, pinning, typing.
- `ChatSidebar.vue`: displays rooms, presence count, quick create.
- `ChatThread.vue`: message timeline, attachments, typing indicators, composer.
- `ChatInsightsPanel.vue`: AI summary, reply suggestions, search results, persona coach.
- Store: `teamChatStore.ts` manages Socket.IO client, message history, presence.

Usage snippet in a component:

```ts
const chatStore = useTeamChatStore()
await chatStore.loadRooms(orgId)
await chatStore.joinRoom(orgId, roomId)
chatStore.emitMessage(orgId, { roomId, text: 'Hello team!' })
```

---

## 5. Smoke Test Checklist

1. Visit `/team/:orgId/chat` → ensure rooms load, first room auto-connects.
2. Send messages between two browsers → latency ≤ 1 s, presence counts update.
3. Pin/unpin messages → pinned badge toggles for all participants.
4. Upload attachment (<5 MB) → link appears, Storage object created.
5. Typing indicator visible while other user typing; clears when idle.
6. Click “Summarize thread” → summary + tasks appear in insights panel (OpenAI or fallback).
7. Request reply suggestions → three responses show for chosen tone; click suggestion populates composer.
8. Use persona coach → message renders in insights panel.
9. Run search query → results include chat/tasks/meeting matches.

---

Ready for Phase 2 once these pass (AI summary/search layering).
