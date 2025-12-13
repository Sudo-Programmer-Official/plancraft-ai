import { validateDraft } from '../services/validationService.js'

export async function validatePostDraft(req, res, next) {
  try {
    const draft = req.body?.draft || req.body || {}
    const result = validateDraft(draft)
    res.json({ success: true, ...result })
  } catch (err) {
    next(err)
  }
}
