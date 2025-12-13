function normalizeArray(val = []) {
  if (Array.isArray(val)) return val.filter(Boolean)
  if (typeof val === 'string') {
    return val
      .split(/[\s,]+/)
      .map((v) => v.trim())
      .filter(Boolean)
  }
  return []
}

function countMedia(media = []) {
  const images = media.filter((m) => m?.type === 'image')
  const videos = media.filter((m) => m?.type === 'video')
  return { images, videos }
}

function twitterTweets(body = '') {
  if (!body) return []
  const maxLen = 280
  const words = body.split(/\s+/)
  const tweets = []
  let current = ''
  for (const word of words) {
    if (!word) continue
    if ((current + ' ' + word).trim().length > maxLen) {
      if (current) tweets.push(current.trim())
      current = word
    } else {
      current = `${current} ${word}`.trim()
    }
  }
  if (current) tweets.push(current.trim())
  return tweets
}

export function validateDraft(draft = {}) {
  const warnings = { instagram: [], twitter: [], linkedin: [] }
  const media = Array.isArray(draft.media) ? draft.media : []
  const { images, videos } = countMedia(media)
  const hashtags = normalizeArray(draft.tags?.hashtags)
  const body = draft.text?.body || ''
  const cta = draft.text?.cta || ''
  const hook = draft.text?.hook || ''
  const linkedinBody = [draft.text?.title, hook, body, cta].filter(Boolean).join('\n\n')

  // Instagram
  if (!media.length) warnings.instagram.push('Add at least one image or video for Instagram feed.')
  if (images.length > 10) warnings.instagram.push('Instagram feed supports up to 10 images.')
  if (videos.length > 1) warnings.instagram.push('Instagram feed supports one video per post.')
  if (hashtags.length > 15) warnings.instagram.push('Consider keeping hashtags under ~15 for Instagram.')
  if ((draft.links || []).length) warnings.instagram.push('Links are not clickable in feed; move to bio or story.')

  // Twitter
  const tweets = twitterTweets([hook, body, cta].filter(Boolean).join(' '))
  if (!tweets.length) warnings.twitter.push('Add text to generate a Twitter thread.')
  if (tweets.some((t) => t.length > 280)) warnings.twitter.push('One or more tweets exceed 280 characters.')
  if (hashtags.length > 3) warnings.twitter.push('Use 2-3 hashtags for best performance on Twitter.')
  if (media.length > 4) warnings.twitter.push('Twitter supports up to 4 images or 1 video.')

  // LinkedIn
  if (linkedinBody.length > 2800) warnings.linkedin.push('LinkedIn posts work best under ~2800 characters.')
  if (media.length > 9) warnings.linkedin.push('LinkedIn supports up to 9 images or 1 video.')

  return { warnings, meta: { mediaCount: media.length, hashtags: hashtags.length, tweets: tweets.length } }
}
