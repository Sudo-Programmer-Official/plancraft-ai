import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiGet, apiPost } from '@/lib/api'
import { useToastStore } from '@/stores/toastStore'
import { trackEvent } from '@/services/analytics'
import {
  fetchOrgInvites,
  sendOrgInvite,
  acceptInviteToken,
  resendOrgInvite,
  revokeOrgInvite,
} from '@/services/inviteService'
import { useAuthStore } from '@/stores/authStore'

type ContextMode = 'personal' | 'team'

export interface Org {
  id: string
  name?: string
  slug?: string
  role?: string
  timezone?: string | null
}

export const useOrgStore = defineStore('org', () => {
  const enabled = computed(() => import.meta.env.VITE_ENABLE_TEAMS === 'true')
  const authStore = useAuthStore()

  const activeContext = ref<ContextMode>('personal')
  const activeOrgId = ref<string | null>(null)
  const orgs = ref<Org[]>([])
  const invitesByOrg = ref<Record<string, any[]>>({})
  const invitesLoading = ref(false)
  const invitesError = ref<string | null>(null)
  const currentOrg = computed(() => orgs.value.find(o => o.id === activeOrgId.value) || null)
  const lastOrgId = ref<string | null>(null)
  const teamsEntryRequested = ref(false)
  const lastLoadedUserId = ref<string | null>(null)
  const toastStore = useToastStore()

  function storageKey(forUser?: string | null) {
    const uid = forUser || authStore?.user?.uid || 'anonymous'
    return `teams:lastOrg:${uid}`
  }

  function rememberLastOrg(orgId: string | null, userId?: string | null) {
    try {
      const key = storageKey(userId)
      if (!orgId) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, orgId)
      }
    } catch {}
    lastOrgId.value = orgId
  }

  function loadLastOrgFromStorage(userId?: string | null) {
    try {
      const value = localStorage.getItem(storageKey(userId))
      lastOrgId.value = value && value.trim() ? value : null
    } catch {
      lastOrgId.value = null
    }
    return lastOrgId.value
  }

  function ensureLastOrgLoaded(userId?: string | null) {
    const resolvedUser = userId || authStore?.user?.uid || null
    if (lastLoadedUserId.value === resolvedUser) return lastOrgId.value
    lastLoadedUserId.value = resolvedUser
    return loadLastOrgFromStorage(resolvedUser)
  }

  const initialOrgId = ensureLastOrgLoaded()
  if (initialOrgId) {
    activeOrgId.value = initialOrgId
    activeContext.value = 'team'
  }

  function setOrg(orgId: string) {
    activeOrgId.value = orgId
    activeContext.value = 'team'
    rememberLastOrg(orgId)
  }

  function clearOrg() {
    activeOrgId.value = null
    activeContext.value = 'personal'
    rememberLastOrg(null)
  }

  async function fetchOrgs() {
    if (!enabled.value) return []
    const res = await apiGet('/api/orgs')
    orgs.value = Array.isArray(res) ? res : []
    if (!orgs.value.length) {
      return orgs.value
    }

    const preferred = ensureLastOrgLoaded() || activeOrgId.value
    const match = preferred && orgs.value.find((org) => org.id === preferred)
    if (match) {
      setOrg(match.id)
    } else if (!activeOrgId.value) {
      setOrg(orgs.value[0].id)
    }
    return orgs.value
  }

  async function createOrg(payload: string | { name: string; timezone?: string | null }) {
    if (!enabled.value) throw new Error('Teams disabled')
    const body = typeof payload === 'string'
      ? { name: payload, timezone: null }
      : { name: payload.name, timezone: payload.timezone || null }
    const res = await apiPost('/api/orgs', body)
    const id = res?.id as string
    const slug = res?.slug as string | undefined
    const name = body.name
    if (id) {
      orgs.value.push({ id, name, slug, role: 'owner', timezone: body.timezone || null })
      setOrg(id)
    }
    return { id, name, slug }
  }

  async function seedSampleProject(orgId: string) {
    if (!orgId) return null
    try {
      const payload = {
        name: 'Getting Started',
        key: 'GST',
        status: 'active',
        leadUid: authStore?.user?.uid || null,
        defaultAssignees: authStore?.user?.uid ? [authStore.user.uid] : [],
      }
      return await apiPost(`/api/orgs/${orgId}/projects`, payload)
    } catch (err) {
      console.warn('[orgStore] Seed project failed', err)
      return null
    }
  }

  function setInvites(orgId: string, list: any[]) {
    invitesByOrg.value = {
      ...invitesByOrg.value,
      [orgId]: Array.isArray(list) ? list : [],
    }
  }

  async function fetchInvites(orgId: string) {
    if (!orgId) return []
    invitesLoading.value = true
    invitesError.value = null
    try {
      const result = await fetchOrgInvites(orgId)
      setInvites(orgId, result)
      return invitesByOrg.value[orgId]
    } catch (err: any) {
      invitesError.value = err?.message || 'Failed to load invites'
      throw err
    } finally {
      invitesLoading.value = false
    }
  }

  async function sendInvite(orgId: string, email: string, role = 'member') {
    if (!orgId) throw new Error('Missing orgId')
    const trimmed = String(email || '').trim()
    if (!trimmed) throw new Error('Email is required')
    try {
      const invite = await sendOrgInvite({ orgId, email: trimmed, role })
      setInvites(orgId, [invite, ...(invitesByOrg.value[orgId] || [])])
      toastStore.push('Invite sent!', { type: 'success', duration: 2500 })
      trackEvent('invite_sent', { orgId, role })
      return invite
    } catch (err: any) {
      toastStore.push(err?.response?.data?.error || err?.message || 'Failed to send invite', {
        type: 'error',
        duration: 3200,
      })
      throw err
    }
  }

  async function acceptInvite(token: string, options?: { source?: string }) {
    if (!token) throw new Error('Missing invite token')
    try {
      const result = await acceptInviteToken(token)
      if (result?.orgId) {
        await fetchOrgs()
        trackEvent('invite_accepted', { orgId: result.orgId, role: result.role })
        if (options?.source === 'public') {
          trackEvent('invite_accepted_public', { orgId: result.orgId, role: result.role })
        }
      }
      toastStore.push('Welcome to the team! 🎉', { type: 'success', duration: 3200 })
      return result
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to accept invite'
      toastStore.push(message, { type: 'error', duration: 3200 })
      const analyticsPayload: Record<string, any> = { reason: message }
      if (options?.source === 'public') {
        analyticsPayload.source = 'public'
      }
      trackEvent('invite_rejected', analyticsPayload)
      throw err
    }
  }

  async function resendInvite(orgId: string, inviteId: string) {
    if (!orgId || !inviteId) throw new Error('Missing invite identifiers')
    try {
      const updated = await resendOrgInvite(orgId, inviteId)
      const current = invitesByOrg.value[orgId] || []
      const next = current.map((invite) => (invite.id === inviteId ? { ...invite, ...updated } : invite))
      setInvites(orgId, next)
      toastStore.push('Invite resent', { type: 'success', duration: 2500 })
      trackEvent('invite_resent', { orgId, inviteId })
      return updated
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to resend invite'
      toastStore.push(message, { type: 'error', duration: 3200 })
      trackEvent('invite_resend_failed', { orgId, inviteId, reason: message })
      throw err
    }
  }

  async function revokeInvite(orgId: string, inviteId: string) {
    if (!orgId || !inviteId) throw new Error('Missing invite identifiers')
    try {
      const updated = await revokeOrgInvite(orgId, inviteId)
      const current = invitesByOrg.value[orgId] || []
      const next = current.filter((invite) => invite.id !== inviteId)
      setInvites(orgId, next)
      toastStore.push('Invite revoked', { type: 'success', duration: 2500 })
      trackEvent('invite_revoked', { orgId, inviteId })
      return updated
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || 'Failed to revoke invite'
      toastStore.push(message, { type: 'error', duration: 3200 })
      trackEvent('invite_revoke_failed', { orgId, inviteId, reason: message })
      throw err
    }
  }

  function requestTeamsEntry() {
    teamsEntryRequested.value = true
  }

  function consumeTeamsEntryRequest() {
    const flag = teamsEntryRequested.value
    teamsEntryRequested.value = false
    return flag
  }

  return {
    enabled,
    activeContext,
    activeOrgId,
    currentOrg,
    orgs,
    invitesByOrg,
    invitesLoading,
    invitesError,
    lastOrgId,
    teamsEntryRequested,
    setOrg,
    clearOrg,
    fetchOrgs,
    createOrg,
    seedSampleProject,
    fetchInvites,
    sendInvite,
    acceptInvite,
    resendInvite,
    revokeInvite,
    ensureLastOrgLoaded,
    requestTeamsEntry,
    consumeTeamsEntryRequest,
  }
})
