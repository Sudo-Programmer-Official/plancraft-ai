export type MediaType = 'image' | 'video' | 'gif'
export type MediaProvider = 'upload' | 'url'

export type MediaItem = {
  id: string
  type: MediaType
  url: string
  thumbnailUrl?: string | null
  width?: number | null
  height?: number | null
  durationSec?: number | null
  aspectRatio?: string | null
  provider: MediaProvider
}

export type LinkItem = {
  url: string
  title?: string | null
  previewImage?: string | null
  showPreview?: boolean
}

export type TextBlock = {
  title?: string | null
  body: string
  hook?: string | null
  cta?: string | null
}

export type TagBlock = {
  hashtags: string[]
  mentions: string[]
}

export type PlatformConfig = Record<string, any>

export type PostDraft = {
  id?: string
  workspaceId?: string | null
  authorId?: string | null
  text: TextBlock
  media: MediaItem[]
  links: LinkItem[]
  tags: TagBlock
  platforms: {
    instagram?: PlatformConfig
    twitter?: PlatformConfig
    linkedin?: PlatformConfig
  }
  createdAt?: string | null
  updatedAt?: string | null
}

export const createEmptyDraft = (): PostDraft => ({
  text: { title: '', body: '', hook: '', cta: '' },
  media: [],
  links: [],
  tags: { hashtags: [], mentions: [] },
  platforms: {},
})

export function deriveAspectRatio(width?: number | null, height?: number | null): string | null {
  if (!width || !height || width <= 0 || height <= 0) return null
  const ratio = width / height
  if (Math.abs(ratio - 1) < 0.05) return '1:1'
  if (Math.abs(ratio - 4 / 5) < 0.05) return '4:5'
  if (Math.abs(ratio - 9 / 16) < 0.05) return '9:16'
  return `${ratio.toFixed(2)}:1`
}

export function normalizeHashtags(input: string | string[]): string[] {
  const raw = Array.isArray(input) ? input.join(' ') : input || ''
  return raw
    .split(/[\s,]+/)
    .map((h) => h.trim().replace(/^#/, ''))
    .filter(Boolean)
}

export function normalizeMentions(input: string | string[]): string[] {
  const raw = Array.isArray(input) ? input.join(' ') : input || ''
  return raw
    .split(/[\s,]+/)
    .map((m) => m.trim().replace(/^@/, ''))
    .filter(Boolean)
}

function clampHashtags(tags: string[], max: number): string[] {
  return tags.slice(0, Math.max(max, 0))
}

export type AdaptedInstagram = {
  caption: string
  media: MediaItem[]
  hashtags: string[]
}

export type AdaptedTwitter = {
  tweets: string[]
  media: MediaItem[]
}

export type AdaptedLinkedIn = {
  title?: string | null
  body: string
  link?: LinkItem | null
  media?: MediaItem[]
}

export function adaptForInstagram(draft: PostDraft): AdaptedInstagram {
  const hashtags = clampHashtags(draft.tags.hashtags || [], 30)
  const captionParts = [draft.text.hook, draft.text.body, draft.text.cta, hashtags.map((h) => `#${h}`)]
    .flat()
    .filter(Boolean)
    .join('\n\n')
  const media = (draft.media || []).slice(0, 10)
  return { caption: captionParts, media, hashtags }
}

export function splitIntoTweets(body: string): string[] {
  if (!body) return []
  const maxLen = 280
  const words = body.split(/\s+/)
  const tweets: string[] = []
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
  return tweets.length ? tweets : [body.slice(0, maxLen)]
}

export function adaptForTwitter(draft: PostDraft): AdaptedTwitter {
  const body = [draft.text.hook, draft.text.body, draft.text.cta].filter(Boolean).join(' ')
  const tweets = splitIntoTweets(body).slice(0, 8)
  const media = (draft.media || []).slice(0, 4)
  return { tweets, media }
}

export function adaptForLinkedIn(draft: PostDraft): AdaptedLinkedIn {
  const bodyParts = [draft.text.title, draft.text.hook, draft.text.body, draft.text.cta].filter(Boolean)
  const body = bodyParts.join('\n\n')
  const link = draft.links?.[0] || null
  return { title: draft.text.title, body, link, media: draft.media?.slice(0, 9) || [] }
}

export type PlatformWarnings = {
  instagram: string[]
  twitter: string[]
  linkedin: string[]
}

export function validateDraftClient(draft: PostDraft): PlatformWarnings {
  const warnings: PlatformWarnings = { instagram: [], twitter: [], linkedin: [] }
  const media = draft.media || []
  const images = media.filter((m) => m.type === 'image')
  const videos = media.filter((m) => m.type === 'video')
  const hashtags = draft.tags?.hashtags || []

  if (!media.length) {
    warnings.instagram.push('Add at least one image or video for Instagram feed.')
  }
  if (images.length > 10) {
    warnings.instagram.push('Instagram feed supports up to 10 images.')
  }
  if (videos.length > 1) {
    warnings.instagram.push('Instagram feed supports a single video per post.')
  }
  if (hashtags.length > 15) {
    warnings.instagram.push('Consider keeping Instagram hashtags under ~15 for performance.')
  }

  const tweets = adaptForTwitter(draft).tweets
  if (!tweets.length) {
    warnings.twitter.push('Add text to generate a Twitter thread.')
  }
  if (tweets.some((t) => t.length > 280)) {
    warnings.twitter.push('One or more tweets exceed 280 characters.')
  }
  if (hashtags.length > 3) {
    warnings.twitter.push('Twitter performs best with 2-3 hashtags.')
  }
  if (media.length > 4) {
    warnings.twitter.push('Twitter supports up to 4 images or 1 video.')
  }

  const linkedinBody = adaptForLinkedIn(draft).body || ''
  if (linkedinBody.length > 2800) {
    warnings.linkedin.push('LinkedIn posts work best under ~2800 characters.')
  }
  if (media.length > 9) {
    warnings.linkedin.push('LinkedIn supports up to 9 images or 1 video.')
  }

  if ((draft.links || []).length && draft.platforms?.instagram !== false) {
    warnings.instagram.push('Links are not clickable in Instagram feed; place in bio or story.')
  }

  return warnings
}
