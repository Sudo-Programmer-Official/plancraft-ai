import api from '@/services/api'

function normalizeWorkspace(payload = {}) {
  const color = payload.theme || payload.color || 'indigo'
  return {
    id: payload.id,
    name: payload.name || 'Workspace',
    icon: payload.icon || '📦',
    color,
    theme: color,
    description: payload.description || '',
    workspaceType: payload.workspaceType || 'team',
    timezone: payload.timezone || 'UTC',
    ownerId: payload.ownerId || null,
    role: payload.role || payload.membershipRole || 'viewer',
    membershipStatus: payload.membershipStatus || payload.status || 'active',
    createdAt: payload.created_at || payload.createdAt || null,
    updatedAt: payload.updated_at || payload.updatedAt || null,
    lastOpenedAt: payload.lastOpenedAt || payload.last_opened_at || null,
  }
}

export async function fetchWorkspaces() {
  const { data } = await api.get('/workspaces')
  const list = Array.isArray(data?.workspaces) ? data.workspaces : []
  return list.map((ws) => normalizeWorkspace(ws))
}

export async function createWorkspaceDoc(_userId, payload) {
  const body = {
    name: payload?.name,
    icon: payload?.icon,
    theme: payload?.color || payload?.theme,
    timezone: payload?.timezone,
    workspaceType: payload?.workspaceType,
    description: payload?.description,
  }
  const { data } = await api.post('/workspaces', body)
  return normalizeWorkspace({ ...(data?.workspace || {}), role: data?.role || 'admin' })
}

export async function ensureDefaultWorkspace() {
  const existing = await fetchWorkspaces()
  if (existing.length) return existing[0]
  return createWorkspaceDoc(null, {
    name: 'Personal',
    icon: '✨',
    color: 'indigo',
    workspaceType: 'personal',
    description: 'Your personal space for tasks, notes, and drafts.',
  })
}

export async function updateWorkspaceMeta(_userId, workspaceId, patch = {}) {
  if (!workspaceId) return null
  const body = {
    ...patch,
    theme: patch.color || patch.theme,
  }
  const { data } = await api.patch(`/workspaces/${workspaceId}`, body)
  return normalizeWorkspace(data?.workspace || {})
}

export async function touchWorkspaceOpened(_userId, workspaceId) {
  if (!workspaceId) return
  try {
    await api.patch(`/workspaces/${workspaceId}`, { lastOpenedAt: new Date().toISOString() })
  } catch {
    /* no-op */
  }
}

export async function fetchWorkspaceMembers(workspaceId) {
  if (!workspaceId) return { members: [], invites: [] }
  const { data } = await api.get(`/workspaces/${workspaceId}/members`)
  return {
    members: Array.isArray(data?.members) ? data.members : [],
    invites: Array.isArray(data?.invites) ? data.invites : [],
  }
}

export async function sendWorkspaceInvite(workspaceId, payload) {
  if (!workspaceId) throw new Error('workspaceId is required')
  const { email, role, expiresInDays } = payload || {}
  const { data } = await api.post(`/workspaces/${workspaceId}/invite`, {
    email,
    role,
    expiresInDays,
  })
  return data
}

export async function getInviteDetails(token) {
  if (!token) throw new Error('Missing token')
  const { data } = await api.get(`/workspaces/invites/${token}`)
  return data
}

export async function acceptInvite(token) {
  if (!token) throw new Error('Missing token')
  const { data } = await api.post(`/workspaces/invites/${token}/accept`)
  return data
}

export async function removeMember(workspaceId, userId) {
  if (!workspaceId || !userId) throw new Error('workspaceId and userId are required')
  const { data } = await api.delete(`/workspaces/${workspaceId}/members/${userId}`)
  return data
}

export async function updateMemberRole(workspaceId, userId, role) {
  if (!workspaceId || !userId) throw new Error('workspaceId and userId are required')
  const { data } = await api.patch(`/workspaces/${workspaceId}/members/${userId}`, { role })
  return data?.member || null
}
