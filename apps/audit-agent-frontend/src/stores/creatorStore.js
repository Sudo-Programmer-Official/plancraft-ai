import { defineStore } from 'pinia'
import { ref, reactive } from 'vue'
import { fetchCreatorPlan, saveCreatorPlan } from '@/services/creatorApi'

export const useCreatorStore = defineStore('creator', () => {
  const campaigns = ref([])
  const current = reactive({ id: null, data: {} })
  const loading = ref(false)

  async function loadCampaign(id) {
    loading.value = true
    try {
      const data = await fetchCreatorPlan(id)
      current.id = id
      current.data = data || {}
    } finally {
      loading.value = false
    }
  }

  async function saveCampaign(id, payload) {
    loading.value = true
    try {
      const saved = await saveCreatorPlan(id, payload)
      current.id = id
      current.data = saved || payload
    } finally {
      loading.value = false
    }
  }

  return { campaigns, current, loading, loadCampaign, saveCampaign }
})
