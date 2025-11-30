import { proxyAi } from '../services/aiClient.js'
import { createDraft } from '../firestore/draftsRepository.js'

function uid(req) {
  const id = req.user?.uid
  if (!id) throw new Error('Missing user id')
  return id
}

export async function runRepurpose(req, res, next) {
  try {
    const payload = req.body || {}
    const data = await proxyAi('repurpose', payload)
    res.json({ success: true, variants: data?.variants || data })
  } catch (err) {
    next(err)
  }
}

export async function saveRepurpose(req, res, next) {
  try {
    const userId = uid(req)
    const variants = req.body?.variants || {}
    const saved = []
    for (const [variant, content] of Object.entries(variants)) {
      const draft = await createDraft(userId, {
        title: content?.title || variant,
        type: content?.type || variant,
        body: content?.body || content?.text || '',
        variant,
      })
      saved.push(draft)
    }
    res.json({ success: true, saved })
  } catch (err) {
    next(err)
  }
}
