import { uploadMedia } from '../services/storageClient.js'

export async function upload(req, res, next) {
  try {
    const { url, dataUrl } = req.body || {}
    const result = await uploadMedia({ url, dataUrl })
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}
