# Knowledge Engine v1

Workspace-scoped ingestion → chunking → embeddings → search → AI grounding. Personal workspaces stay intact; viewers can read/search only.

## Firestore collections
- `workspace_docs/{docId}`: { workspaceId, ownerUid, title, source, mimeType, status(`processing|ready|failed`), vectorStatus(`pending|completed|skipped`), error, rawText (MVP), docHash, processedChunks, totalChunks, lastProcessedAt, createdAt, updatedAt }
- `workspace_doc_chunks/{chunkId}`: { workspaceId, docId, chunkIndex, text, tokensApprox, embeddingId, metadata, createdAt }

## Limits
- `KNOWLEDGE_MAX_DOC_CHARS` (default 200k)
- `KNOWLEDGE_MAX_CHUNKS_PER_DOC` (default 300)
- `KNOWLEDGE_MAX_CHUNKS_PER_WORKSPACE_PER_DAY` (optional, default 0 = off)
- Upload cap: `KNOWLEDGE_MAX_UPLOAD_BYTES` (default 5MB)
If exceeded, doc is marked `failed` with a friendly error.

## Deduplication
- `docHash = sha256(normalizedText)` stored on doc.
- Create rejects duplicates per workspace (returns existing docId, duplicate flag).

## Backend APIs (/api)
- `POST /knowledge/docs` — paste JSON `{workspaceId,title,source,text}` or multipart (`file`, workspaceId, title). Status starts `processing`. PDF → `PDF not supported yet`.
- `POST /knowledge/docs/:docId/process` — async-starts chunking/embedding; updates progress fields. Doc reprocess allowed.
- `GET /knowledge/search?workspaceId=...&q=...&topK=6&docId?=` — vector if available, otherwise bounded keyword fallback (ready docs only, last 30 days, max 50 chunks). Returns `{items:[{docId,chunkId,text,score,source,metadata}],source,cacheKey,moreAvailable}`.

## Chunking
- `services/knowledge/chunker.js`: ~1200 chars, 120 overlap, preserve markdown headings.
- Chunk metadata keeps `heading` when present.

## Embeddings & Vector store
- Backend generates embeddings locally via OpenAI (`text-embedding-3-small` by default).
- Pinecone via `@pinecone-database/pinecone`; namespace = `workspaceId`; metadata includes `docId`, `chunkId`, `chunkIndex`, `heading`, `text`.
- Vector optional; if missing, doc `vectorStatus=skipped` and search falls back.
Env: `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `OPENAI_API_KEY`, `OPENAI_EMBEDDING_MODEL`.

## AI NLP service
- App runtime now uses local `/api/nlp/*` handlers for outreach copy, image parsing, summaries, search, and orchestration.
- The old external NLP service path is no longer required by the mobile/web app.

## Frontend
- `KnowledgePanel.vue` (Settings) lets editors/admins paste/upload, view doc status, trigger processing, and call orchestrator to propose tasks. Viewers see/read only.
- Task proposals can be confirmed into Firestore tasks (with workspaceId + createdBy).

## Rules
- `workspace_docs`: read active member/admin; create/update editor/admin/owner, ownerUid must match auth; delete disabled.
- `workspace_doc_chunks`: read active member/admin; create/update editor/admin/owner; delete disabled.
Tasks rules untouched.

## Indexes (expected)
- `workspace_docs`: (workspaceId, status, createdAt|updatedAt)
- `workspace_doc_chunks`: (workspaceId, docId), (workspaceId, createdAt)
- Tasks existing indexes unchanged.

## Friendly errors
- Unsupported file → `PDF not supported yet`.
- Limits → doc.status `failed` with reason.
