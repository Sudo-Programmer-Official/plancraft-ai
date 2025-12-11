import {
  listDrafts,
  createDraft,
  updateDraft,
  deleteDraft,
  listInspiration,
  createInspiration,
} from '../firestore/draftsRepository.js'

function uid(req) {
  const id = req.user?.uid
  if (!id) throw new Error('Missing user id')
  return id
}

function workspaceId(req) {
  return req.headers['x-workspace-id'] || req.query?.workspaceId || req.body?.workspaceId || null
}

export async function getDrafts(req, res, next) {
  try {
    const drafts = await listDrafts(uid(req), workspaceId(req))
    res.json({ success: true, drafts })
  } catch (err) {
    next(err)
  }
}

export async function postDraft(req, res, next) {
  try {
    const draft = await createDraft(uid(req), req.body || {}, workspaceId(req))
    res.status(201).json({ success: true, draft })
  } catch (err) {
    next(err)
  }
}

export async function putDraft(req, res, next) {
  try {
    const draft = await updateDraft(uid(req), req.params.id, req.body || {}, workspaceId(req))
    if (!draft) return res.status(404).json({ success: false, error: 'Draft not found' })
    res.json({ success: true, draft })
  } catch (err) {
    next(err)
  }
}

export async function removeDraft(req, res, next) {
  try {
    const removed = await deleteDraft(uid(req), req.params.id, workspaceId(req))
    if (!removed) return res.status(404).json({ success: false, error: 'Draft not found' })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function getInspiration(req, res, next) {
  try {
    const notes = await listInspiration(uid(req), workspaceId(req))
    res.json({ success: true, notes })
  } catch (err) {
    next(err)
  }
}

export async function postInspiration(req, res, next) {
  try {
    const note = await createInspiration(uid(req), req.body || {}, workspaceId(req))
    res.status(201).json({ success: true, note })
  } catch (err) {
    next(err)
  }
}
