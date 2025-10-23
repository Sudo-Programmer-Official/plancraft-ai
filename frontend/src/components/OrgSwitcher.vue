<template>
  <div v-if="enabled" class="org-switcher">
    <label>Team:</label>
    <select v-model="selected" @change="onSwitch">
      <option v-for="org in orgs" :key="org.id" :value="org.id">
        {{ org.name || org.id }}
      </option>
    </select>
    <button type="button" @click="onCreate">Create Team</button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useOrgStore } from '../stores/orgStore'

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
  const id = await orgStore.createOrg(name)
  if (id) {
    selected.value = id
    orgStore.setOrg(id)
    router.push({ name: 'team-projects', params: { orgId: id } })
  }
}
</script>

<style scoped>
.org-switcher { display: flex; gap: 8px; align-items: center; }
select { min-width: 160px; }
</style>
