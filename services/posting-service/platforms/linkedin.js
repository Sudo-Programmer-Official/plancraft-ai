import { postLinkedInContent } from '../services/linkedinService.js'

export async function publishLinkedIn({ userId, caption, mediaUrl, mediaDescription }) {
  if (!userId) throw new Error('LinkedIn publish requires userId')
  return postLinkedInContent({
    userId,
    text: caption,
    mediaUrl,
    mediaDescription: mediaDescription || caption,
  })
}
