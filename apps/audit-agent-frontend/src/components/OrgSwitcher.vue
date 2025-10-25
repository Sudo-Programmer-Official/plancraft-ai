<template>
  <div v-if="enabled" class="org-switcher">
    <label class="sr-only" for="org-select">Switch team</label>
    <select id="org-select" v-model="selected" @change="onSwitch">
      <option v-for="org in orgs" :key="org.id" :value="org.id">
        {{ org.name || org.id }}
      </option>
    </select>
    <button type="button" @click="onCreate">Create Team</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useOrgStore } from '@/stores/orgStore'

const router = useRouter()
const orgStore = useOrgStore()

const enabled = orgStore.enabled
const orgs = computed(() => orgStore.orgs)
const selected = ref('')

onMounted(async () => {
  if (!enabled.value) return
  const list = await orgStore.fetchOrgs()
  if (list.length && !selected.value) {
    selected.value = orgStore.activeOrgId || list[0].id
  }
})

watch(() => orgStore.activeOrgId, (val) => {
  if (val) selected.value = val
})

function onSwitch() {
  if (!selected.value) return
  orgStore.setOrg(selected.value)
  router.push({ name: 'team-projects', params: { orgId: selected.value } })
}

async function onCreate() {
  const name = window.prompt('Team name?')
  if (!name) return
  const timezone = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || null
    } catch {
      return null
    }
  })()
  const result = await orgStore.createOrg({ name, timezone })
  if (result?.id) {
    selected.value = result.id
    await orgStore.seedSampleProject(result.id)
    router.push({ name: 'team-projects', params: { orgId: result.id } })
  }
}
</script>

<style scoped>
.org-switcher { display: flex; gap: 10px; align-items: center; }
select { min-width: 180px; padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(15,23,42,0.18); background: #fff; color: #111827; }
button { padding: 6px 12px; border-radius: 8px; border: none; background: #1d4ed8; color: #fff; font-weight: 500; cursor: pointer; }
button:hover { background: #1e40af; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
</style>
