import { getTokensByUser, saveUserTokens } from '../firestore/tokensRepository.js'

export async function getTokens(req, res, next) {
  try {
    const { userId } = req.params
    const tokens = await getTokensByUser(userId)
    res.json({ success: true, tokens })
  } catch (err) {
    next(err)
  }
}

export async function saveTokens(req, res, next) {
  try {
    const { userId } = req.params
    const payload = req.body || {}
    await saveUserTokens(userId, payload)
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
