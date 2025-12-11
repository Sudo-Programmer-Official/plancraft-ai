import {
  listSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '../firestore/calendarRepository.js'

function uid(req) {
  const id = req.user?.uid
  if (!id) throw new Error('Missing user id')
  return id
}

function workspaceId(req) {
  return req.headers['x-workspace-id'] || req.query?.workspaceId || req.body?.workspaceId || null
}

export async function getSchedule(req, res, next) {
  try {
    const entries = await listSchedule(uid(req), workspaceId(req))
    res.json({ success: true, schedule: entries })
  } catch (err) {
    next(err)
  }
}

export async function postSchedule(req, res, next) {
  try {
    const entry = await createSchedule(uid(req), { ...(req.body || {}), workspaceId: workspaceId(req) })
    res.status(201).json({ success: true, entry })
  } catch (err) {
    next(err)
  }
}

export async function putSchedule(req, res, next) {
  try {
    const entry = await updateSchedule(uid(req), req.params.id, { ...(req.body || {}), workspaceId: workspaceId(req) })
    if (!entry) return res.status(404).json({ success: false, error: 'Schedule not found' })
    res.json({ success: true, entry })
  } catch (err) {
    next(err)
  }
}

export async function removeSchedule(req, res, next) {
  try {
    const deleted = await deleteSchedule(uid(req), req.params.id, workspaceId(req))
    if (!deleted) return res.status(404).json({ success: false, error: 'Schedule not found' })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
