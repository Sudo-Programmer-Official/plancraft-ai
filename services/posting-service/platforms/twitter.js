import { postTweet } from '../services/twitterService.js'

export async function publishTwitter({ userId, caption }) {
  if (!userId) throw new Error('Twitter publish requires userId')
  const text = caption || ''
  return postTweet({ userId, text })
}
