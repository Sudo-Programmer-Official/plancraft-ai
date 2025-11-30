import { postInstagramContent } from '../services/instagramService.js'

export async function publishInstagram({ userId, caption, mediaUrl, videoUrl }) {
  if (!userId) throw new Error('Instagram publish requires userId')
  const isVideo = !!videoUrl
  const media = videoUrl || mediaUrl
  return postInstagramContent({ userId, caption, mediaUrl: media, isVideo })
}
