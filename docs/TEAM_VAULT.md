# Knowledge Vault — Sprint 8 Phase 8.1

The Knowledge Vault unifies meeting transcripts, chat insights, and project tasks into a single Firestore-backed index per organization. This index powers semantic search, in-app browsing, and downstream features such as the Org Feed and AI Digest.

## Data flow

1. **Sources** — Data is pulled from:
   - `orgs/{orgId}/tasks`
   - `orgs/{orgId}/meetings`
   - `orgs/{orgId}/chatRooms/*/insights`
2. **Indexer** — `src/services/vaultIndexer.js` normalizes each source into `{ type, sourceId, title, summary, content, metadata }`, trims long fields, and calls `embedText()` for vector storage.
3. **Storage** — Entries are written to `orgs/{orgId}/vault/{itemId}` with `searchText` (for fallback keyword search) and `embedding` (for cosine similarity).
4. **API surface** — `src/api/orgs/vaultRouter.js` exposes REST endpoints for listing, refreshing, semantic search, and admin-only deletion.
5. **Search** — `src/services/vaultSearchService.js` wraps OpenAI embeddings (`text-embedding-3-*`) with a cosine similarity helper and keyword fallback when embeddings are unavailable.
6. **Frontend** — `TeamVault.vue` + `VaultSidebar.vue` + `teamVaultStore.ts` deliver filters, pagination, and search in the `/team/:orgId/vault` route.

## API endpoints

| Method | Endpoint | Description | Auth |
| --- | --- | --- | --- |
| `GET` | `/api/orgs/:orgId/vault` | List vault entries (supports `type`, `limit`, `cursor`) | Org member |
| `GET` | `/api/orgs/:orgId/vault/search?q=` | Semantic search with embedding & keyword fallback | Org member |
| `POST` | `/api/orgs/:orgId/vault/refresh` | Rebuild the vault from source collections | Org owner/admin |
| `DELETE` | `/api/orgs/:orgId/vault/:vaultId` | Remove an entry (e.g., bad summary) | Org owner/admin |

### Response shape

```
GET /api/orgs/org123/vault?type=task&limit=25
{
  "items": [
    {
      "id": "vaultDocId",
      "type": "task",
      "sourceId": "taskId",
      "title": "Resolve billing webhook errors",
      "summary": "Task completed in project revamp",
      "content": "Investigated the retry logic…",
      "metadata": {
        "status": "completed",
        "projectId": "projectAlpha"
      },
      "createdAt": "2025-02-15T12:30:02.000Z",
      "updatedAt": "2025-02-18T08:11:45.000Z",
      "createdBy": "uid123",
      "score": null
    }
  ],
  "nextCursor": "vaultDocId"
}
```

Search responses add a `score` (0–1) sorted descending; when embeddings are unavailable `score` falls back to `0.1` and keyword matching via `searchText`.

## Firestore schema & security

- Collection path: `orgs/{orgId}/vault/{itemId}`
- Fields stored: `type`, `sourceId`, `title`, `summary`, `content`, `metadata`, `embedding`, `searchText`, `createdAt`, `updatedAt`, `createdBy`
- Security rules (`firestore.rules`):
  - Members can read vault entries.
  - Owners/Admins can create/update/delete (client writes are typically disabled; the server uses Admin SDK).
- Indexes (`indexes.json`):
  - Composite index on `type ASC, createdAt DESC` for filtered pagination.

## Frontend experience

- Route: `/team/:orgId/vault` (behind `VITE_ENABLE_TEAMS` flag)
- Components:
  - `TeamVault.vue`: Shell with search bar, responsive layout, load-more button.
  - `VaultSidebar.vue`: Filter pills, last-sync status, admin refresh indicator.
  - `teamVaultStore.ts`: Pinia store handling pagination, refresh, search, and optimistic deletions.
- Features:
  - Type filters (All / Tasks / Chats / Meetings) with counts.
  - Debounced semantic search with loading states.
  - Admin-only “Rebuild Index” button calling `POST /vault/refresh`.
  - Responsive mobile filter fallback when the sidebar collapses.

## Environment variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `OPENAI_EMBED_ENDPOINT` | Embeddings API endpoint | `https://api.openai.com/v1/embeddings` |
| `OPENAI_EMBED_MODEL` | Embedding model for vault search | `text-embedding-3-small` |
| `OPENAI_EMBED_DIMENSION` | Optional dimensionality clamp | `1536` |
| `VAULT_MAX_TASKS` | Task fetch cap per rebuild | `300` |
| `VAULT_MAX_MEETINGS` | Meeting fetch cap per rebuild | `150` |
| `VAULT_MAX_CHAT_INSIGHTS` | Chat insight fetch cap per room | `300` |
| `VAULT_CONTENT_LIMIT` | Max characters to store per entry | `4000` |
| `VITE_VAULT_PAGE_LIMIT` | Frontend pagination limit override | `25` |

## QA checklist

- `POST /api/orgs/:orgId/vault/refresh` succeeds (admin token) and returns item counts.
- `GET /api/orgs/:orgId/vault` paginates correctly with and without `type`.
- `GET /api/orgs/:orgId/vault/search?q=` returns ranked results < 1s (fallback keyword path works when `OPENAI_API_KEY` is missing).
- Firestore security review:
  - Member can read entries but receives `403` when attempting delete.
  - Non-members receive `403` on list/search endpoints.
- Frontend:
  - `/team/:orgId/vault` loads, filters work, search debounce updates results, load-more respects pagination.
  - Admin refresh button triggers rebuild and reloads the list.

## Next steps

- Phase 8.2 will consume vault updates to power the Org Feed and notifications.
- Phase 8.3 reuses Vault search summaries for weekly AI digests and PDF exports.
- Consider background jobs/Cloud Functions for incremental indexing to avoid full rebuilds on every refresh.
