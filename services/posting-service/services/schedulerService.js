import { publishInstagram } from '../platforms/instagram.js'
import { publishFacebook } from '../platforms/facebook.js'
import { publishLinkedIn } from '../platforms/linkedin.js'
import { publishTwitter } from '../platforms/twitter.js'
import { saveScheduled, fetchDue, markStatus } from '../firestore/scheduledPostsRepository.js'

export async function publishImmediately(payload) {
  const handler = resolveHandler(payload.platform)
  return handler(payload)
}

export async function schedulePost(payload) {
  return saveScheduled(payload)
}

export async function processDue() {
  const due = await fetchDue()
  const results = []
  for (const item of due) {
    try {
      const handler = resolveHandler(item.platform)
      const res = await handler(item)
      await markStatus(item.id, 'posted')
      results.push({ id: item.id, status: 'posted', res })
    } catch (err) {
      await markStatus(item.id, 'failed', err.message)
      results.push({ id: item.id, status: 'failed', error: err.message })
    }
  }
  return results
}

function resolveHandler(platform) {
  const map = {
    instagram: publishInstagram,
    facebook: publishFacebook,
    linkedin: publishLinkedIn,
    twitter: publishTwitter,
  }
  const handler = map[platform]
  if (!handler) throw new Error(`Unsupported platform ${platform}`)
  return handler
}
