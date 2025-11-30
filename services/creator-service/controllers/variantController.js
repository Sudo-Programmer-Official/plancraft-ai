import { getVariant, updateVariant } from '../firestore/variantsRepository.js'

function uid(req) {
  const id = req.user?.uid
  if (!id) throw new Error('Missing user id')
  return id
}

export async function fetchVariant(req, res, next) {
  try {
    const variant = await getVariant(uid(req), req.params.id)
    if (!variant) return res.status(404).json({ success: false, error: 'Variant not found' })
    res.json({ success: true, variant })
  } catch (err) {
    next(err)
  }
}

export async function patchVariant(req, res, next) {
  try {
    const variant = await updateVariant(uid(req), req.params.id, req.body || {})
    res.json({ success: true, variant })
  } catch (err) {
    next(err)
  }
}
