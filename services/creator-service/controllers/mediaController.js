import { uploadMedia } from '../services/storageClient.js'
import { saveMedia } from '../firestore/mediaRepository.js'

export async function upload(req, res, next) {
  try {
    const { url, dataUrl } = req.body || {}
    const result = await uploadMedia({ url, dataUrl })
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}

function uid(req) {
  const id = req.user?.uid
  if (!id) throw new Error('Missing user id')
  return id
}

export async function recordMedia(req, res, next) {
  try {
    const media = await saveMedia(uid(req), req.body || {})
    res.status(201).json({ success: true, media })
  } catch (err) {
    next(err)
  }
}
