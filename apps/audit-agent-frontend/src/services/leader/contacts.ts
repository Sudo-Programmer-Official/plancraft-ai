import { growthClient, nlpClient } from './http'

export interface LeaderContact {
  id?: string
  name: string
  phone?: string
  email?: string
  tags?: string[]
  groupId?: string
  location?: { lat?: number; lng?: number; label?: string }
}

const mapContact = (raw: any): LeaderContact & { contactId?: string } => {
  const id = raw?.id || raw?._id || raw?.contactId
  return {
    id,
    contactId: id,
    name: raw?.name || raw?.title || 'Contact',
    phone: raw?.phone,
    email: raw?.email,
    tags: raw?.tags || [],
    groupId: raw?.groupId,
    location: raw?.location,
  }
}

export async function listContacts(): Promise<LeaderContact[]> {
  const { data } = await growthClient.get('/leader/contacts')
  return (data?.contacts || data || []).map(mapContact)
}

export async function listGroups(): Promise<any[]> {
  const { data } = await growthClient.get('/leader/contacts/groups')
  return (data?.groups || []).map((g: any) => {
    const id = g?.groupId || g?.id || g?._id
    return { ...g, id, groupId: id }
  })
}

export async function createContact(payload: LeaderContact) {
  const { data } = await growthClient.post('/leader/contacts', payload)
  return mapContact(data?.contact || payload)
}

export async function updateContact(id: string, payload: Partial<LeaderContact>) {
  try {
    const { data } = await growthClient.put(`/leader/contacts/${id}`, payload)
    return mapContact(data?.contact || { ...payload, id })
  } catch (error: any) {
    // Fallback for older deployments that only accept PATCH
    if (error?.response?.status === 404) {
      const { data } = await growthClient.patch(`/leader/contacts/${id}`, payload)
      return mapContact(data?.contact || { ...payload, id })
    }
    throw error
  }
}

export async function deleteContact(id: string) {
  await growthClient.delete(`/leader/contacts/${id}`)
  return true
}

export async function importContactsCsv(csvText: string) {
  const { data } = await growthClient.post('/leader/contacts/import', { csv: csvText })
  return data
}

export async function clusterContacts(payload: { contacts: LeaderContact[] }) {
  const { data } = await nlpClient.post('/cluster/contacts', payload)
  return data?.clusters || data?.output || []
}
