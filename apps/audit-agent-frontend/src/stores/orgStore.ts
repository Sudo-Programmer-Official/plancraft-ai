import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiGet, apiPost } from '@/lib/api'

type ContextMode = 'personal' | 'team'

export interface Org {
  id: string
  name?: string
  slug?: string
  role?: string
}

export const useOrgStore = defineStore('org', () => {
  const enabled = computed(() => import.meta.env.VITE_ENABLE_TEAMS === 'true')

  const activeContext = ref<ContextMode>('personal')
  const activeOrgId = ref<string | null>(null)
  const orgs = ref<Org[]>([])
  const currentOrg = computed(() => orgs.value.find(o => o.id === activeOrgId.value) || null)

  function setOrg(orgId: string) {
    activeOrgId.value = orgId
    activeContext.value = 'team'
  }

  function clearOrg() {
    activeOrgId.value = null
    activeContext.value = 'personal'
  }

  async function fetchOrgs() {
    if (!enabled.value) return []
    const res = await apiGet('/api/orgs')
    orgs.value = Array.isArray(res) ? res : []
    if (orgs.value.length && !activeOrgId.value) {
      setOrg(orgs.value[0].id)
    }
    return orgs.value
  }

  async function createOrg(name: string) {
    if (!enabled.value) throw new Error('Teams disabled')
    const res = await apiPost('/api/orgs', { name })
    const id = res?.id as string
    const slug = res?.slug as string | undefined
    if (id) {
      orgs.value.push({ id, name, slug, role: 'owner' })
      setOrg(id)
    }
    return id
  }

  return {
    enabled,
    activeContext,
    activeOrgId,
    currentOrg,
    orgs,
    setOrg,
    clearOrg,
    fetchOrgs,
    createOrg,
  }
})

