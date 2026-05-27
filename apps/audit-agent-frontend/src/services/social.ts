import { postingClient } from './leader/http'

const SOCIAL_DISABLED_MESSAGE =
  'Social integrations are currently disabled in this deployment.'

function isSocialEnabled() {
  return String(import.meta.env.VITE_ENABLE_SOCIAL_INTEGRATIONS || '').toLowerCase() === 'true'
}

function disabledStatus() {
  return {
    accounts: {
      linkedin: { connected: false, meta: null },
      instagram: { connected: false, meta: null },
      twitter: { connected: false, meta: null },
    },
    enabledSocials: {
      linkedin: false,
      instagram: false,
      twitter: false,
    },
    disabled: true,
  }
}

function throwDisabled() {
  const err: any = new Error(SOCIAL_DISABLED_MESSAGE)
  err.code = 'SOCIAL_DISABLED'
  throw err
}

export async function getSocialStatus(workspaceId?: string | null) {
  if (!isSocialEnabled()) return disabledStatus()
  const { data } = await postingClient.get('/social/status', { params: workspaceId ? { workspaceId } : {} })
  return data || {}
}

export async function getLinkedInAuthUrl(returnTo?: string) {
  if (!isSocialEnabled()) throwDisabled()
  try {
    const { data } = await postingClient.get('/social/linkedin/connect', { params: returnTo ? { returnTo } : {} })
    return data?.url as string | undefined
  } catch (_err: any) {
    const { data } = await postingClient.get('/auth/linkedin', { params: returnTo ? { returnTo } : {} })
    return data?.url as string | undefined
  }
}

export async function getInstagramAuthUrl(returnTo?: string) {
  if (!isSocialEnabled()) throwDisabled()
  try {
    const { data } = await postingClient.get('/social/instagram/connect', { params: returnTo ? { returnTo } : {} })
    return data?.url as string | undefined
  } catch (_err: any) {
    const { data } = await postingClient.get('/auth/instagram', { params: returnTo ? { returnTo } : {} })
    return data?.url as string | undefined
  }
}

export async function getTwitterAuthUrl(returnTo?: string) {
  if (!isSocialEnabled()) throwDisabled()
  try {
    const { data } = await postingClient.get('/social/twitter/connect', { params: returnTo ? { returnTo } : {} })
    return data?.url as string | undefined
  } catch (_err: any) {
    const { data } = await postingClient.get('/auth/twitter', { params: returnTo ? { returnTo } : {} })
    return data?.url as string | undefined
  }
}

export async function disconnectSocial(platform: 'linkedin' | 'instagram' | 'twitter') {
  if (!isSocialEnabled()) throwDisabled()
  const { data } = await postingClient.post(`/social/disconnect/${platform}`)
  return data
}

export async function setSocialEnabled(workspaceId: string, provider: string, enabled: boolean) {
  if (!isSocialEnabled()) throwDisabled()
  const { data } = await postingClient.post('/social/workspace-enabled', { workspaceId, provider, enabled })
  return data
}
