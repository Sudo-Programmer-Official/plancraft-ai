import api from '@/services/api'

/**
 * Request a short-lived GPT link code for the current user.
 * @param {string} userId Firebase UID requesting the link.
 * @param {object} [options]
 * @param {number} [options.ttlMinutes] Optional override for expiry minutes.
 */
export async function createGptLinkCode(userId, options = {}) {
  if (!userId) throw new Error('Missing userId')
  const payload = { userId }
  if (options.ttlMinutes) payload.ttlMinutes = options.ttlMinutes
  const res = await api.post('/gpt/auth/link', payload)
  return res?.data || {}
}
