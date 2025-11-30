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

export async function getDrafts(req, res, next) {
  try {
    const drafts = await listDrafts(uid(req))
    res.json({ success: true, drafts })
  } catch (err) {
    next(err)
  }
}

export async function postDraft(req, res, next) {
  try {
    const draft = await createDraft(uid(req), req.body || {})
    res.status(201).json({ success: true, draft })
  } catch (err) {
    next(err)
  }
}

export async function putDraft(req, res, next) {
  try {
    const draft = await updateDraft(uid(req), req.params.id, req.body || {})
    res.json({ success: true, draft })
  } catch (err) {
    next(err)
  }
}

export async function removeDraft(req, res, next) {
  try {
    await deleteDraft(uid(req), req.params.id)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function getInspiration(req, res, next) {
  try {
    const notes = await listInspiration(uid(req))
    res.json({ success: true, notes })
  } catch (err) {
    next(err)
  }
}

export async function postInspiration(req, res, next) {
  try {
    const note = await createInspiration(uid(req), req.body || {})
    res.status(201).json({ success: true, note })
  } catch (err) {
    next(err)
  }
}
