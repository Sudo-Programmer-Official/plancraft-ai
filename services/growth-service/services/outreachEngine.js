import { callAi } from './aiClient.js'

export async function runOutreachEngine(kind, input, user) {
  const token = user?.token || user?.firebaseToken || null
  const map = {
    outreach: 'outreach-message',
    'comment': 'comment',
    'community-post': 'community-post',
  }
  const type = map[kind] || 'outreach-message'
  return callAi(type, input, token)
}
