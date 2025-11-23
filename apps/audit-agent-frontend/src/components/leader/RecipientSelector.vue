<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-slate-200">Recipients</h3>
      <button
        class="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:border-indigo-500"
        @click="loadData"
      >
        Refresh
      </button>
    </div>
    <div class="grid gap-3 md:grid-cols-2">
      <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
        <div class="text-xs text-slate-400 uppercase tracking-wide">Contacts</div>
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <label
            v-for="c in contacts"
            :key="c.contactId"
            class="flex items-center gap-2 text-sm text-slate-200 cursor-pointer"
          >
            <input type="checkbox" :value="c" v-model="selectedContactsInternal" />
            <span>{{ c.name }} <span class="text-slate-500 text-xs" v-if="c.tags?.length">({{ c.tags.join(', ') }})</span></span>
          </label>
        </div>
      </div>
      <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
        <div class="text-xs text-slate-400 uppercase tracking-wide">Groups</div>
        <div class="space-y-1 max-h-48 overflow-y-auto">
          <label
            v-for="g in groups"
            :key="g.groupId"
            class="flex items-center gap-2 text-sm text-slate-200 cursor-pointer"
          >
            <input type="checkbox" :value="g" v-model="selectedGroupsInternal" />
            <span>{{ g.name }} <span class="text-slate-500 text-xs" v-if="g.tags?.length">({{ g.tags.join(', ') }})</span></span>
          </label>
        </div>
      </div>
    </div>
    <div class="text-xs text-slate-400">
      Selected: {{ totalRecipients }} recipient(s)
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watchEffect } from 'vue'
import { fetchContacts, fetchGroups } from '@/services/leaderApi'

const emit = defineEmits(['update:contacts', 'update:groups', 'update:count'])

const contacts = ref([])
const groups = ref([])
const selectedContactsInternal = ref([])
const selectedGroupsInternal = ref([])

const totalRecipients = computed(() => selectedContactsInternal.value.length + selectedGroupsInternal.value.length)

watchEffect(() => {
  emit('update:contacts', selectedContactsInternal.value)
  emit('update:groups', selectedGroupsInternal.value)
  emit('update:count', totalRecipients.value)
})

async function loadData() {
  try {
    const [c, g] = await Promise.all([fetchContacts(), fetchGroups()])
    contacts.value = c || []
    groups.value = g || []
  } catch (e) {
    console.warn('Failed loading contacts/groups', e)
  }
}

loadData()
</script>
