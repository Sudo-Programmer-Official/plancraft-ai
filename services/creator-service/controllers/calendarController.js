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

export async function getSchedule(req, res, next) {
  try {
    const entries = await listSchedule(uid(req))
    res.json({ success: true, schedule: entries })
  } catch (err) {
    next(err)
  }
}

export async function postSchedule(req, res, next) {
  try {
    const entry = await createSchedule(uid(req), req.body || {})
    res.status(201).json({ success: true, entry })
  } catch (err) {
    next(err)
  }
}

export async function putSchedule(req, res, next) {
  try {
    const entry = await updateSchedule(uid(req), req.params.id, req.body || {})
    res.json({ success: true, entry })
  } catch (err) {
    next(err)
  }
}

export async function removeSchedule(req, res, next) {
  try {
    await deleteSchedule(uid(req), req.params.id)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
