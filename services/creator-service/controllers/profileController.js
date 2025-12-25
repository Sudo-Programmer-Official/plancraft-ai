import { fetchProfile, saveProfile } from '../firestore/profileRepository.js'

function uid(req) {
  const id = req.user?.uid
  if (!id) throw new Error('Missing user id')
  return id
}

function workspaceId(req) {
  return req.headers['x-workspace-id'] || req.query?.workspaceId || req.body?.workspaceId || 'default'
}

export async function getProfile(req, res, next) {
  try {
    const wsId = workspaceId(req)
    const profile = await fetchProfile(uid(req), wsId)
    res.json({ success: true, profile })
  } catch (err) {
    next(err)
  }
}

export async function upsertProfile(req, res, next) {
  try {
    const wsId = workspaceId(req) || req.body?.workspaceId || 'default'
    const profile = await saveProfile(uid(req), req.body || {}, wsId)
    res.json({ success: true, profile })
  } catch (err) {
    next(err)
  }
}
