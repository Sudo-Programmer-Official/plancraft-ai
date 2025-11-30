import { getTokensByUser, saveUserTokens } from '../firestore/tokensRepository.js'

export async function getSocialStatus(req, res, next) {
  try {
    const userId = req.user?.uid
    if (!userId) return res.status(401).json({ success: false, error: 'Missing user id' })
    const tokens = await getTokensByUser(userId)
    const map = {}
    ;['linkedin', 'instagram', 'twitter', 'whatsapp'].forEach((key) => {
      const t = tokens?.[key]
      map[key] = {
        connected: !!t?.accessToken,
        meta: t?.meta || null,
        updatedAt: t?.updatedAt || null,
        expiresAt: t?.expiresAt || null,
      }
    })
    res.json({ success: true, accounts: map })
  } catch (err) {
    next(err)
  }
}

export async function disconnectSocial(req, res, next) {
  try {
    const userId = req.user?.uid
    if (!userId) return res.status(401).json({ success: false, error: 'Missing user id' })
    const { platform } = req.params
    const allowed = ['linkedin', 'instagram', 'twitter']
    if (!allowed.includes(platform)) {
      return res.status(400).json({ success: false, error: 'Unsupported platform' })
    }
    await saveUserTokens(userId, { [platform]: {} })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}
