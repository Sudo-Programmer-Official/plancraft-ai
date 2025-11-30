import { postingClient } from './leader/http'

export async function getLinkedInAuthUrl(returnTo?: string) {
  const { data } = await postingClient.get('/auth/linkedin', { params: returnTo ? { returnTo } : {} })
  return data?.url as string | undefined
}

export async function refreshLinkedInToken() {
  const { data } = await postingClient.post('/auth/linkedin/refresh')
  return data
}

export async function postLinkedIn(content: { text: string; mediaUrl?: string; mediaDescription?: string }) {
  const { data } = await postingClient.post('/post/linkedin', content)
  return data
}
