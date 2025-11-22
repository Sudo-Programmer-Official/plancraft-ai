import { getTokensByUser } from '../firestore/tokensRepository.js'

export async function getTokenBundle(userId) {
  return getTokensByUser(userId)
}
