<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-4">
    <header class="flex items-center justify-between">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Creator Mode</p>
        <h1 class="text-3xl font-bold mt-2">Creator Profile</h1>
        <p class="text-slate-400 text-sm">Define your voice, goals, and cadence. Autopilot uses this to draft for you.</p>
      </div>
      <button
        class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold disabled:opacity-60"
        :disabled="saving"
        @click="save"
      >
        {{ saving ? 'Saving…' : 'Save profile' }}
      </button>
    </header>

    <div class="grid lg:grid-cols-3 gap-4">
      <section class="lg:col-span-2 space-y-4">
        <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-lg font-semibold">Goals</h2>
            <span class="text-xs text-slate-500">Guides tone + CTAs</span>
          </div>
          <div class="grid sm:grid-cols-2 gap-3 text-sm text-slate-200">
            <label v-for="goal in goalKeys" :key="goal.key" class="flex items-center gap-2">
              <input v-model="profile.goals[goal.key]" type="checkbox" class="rounded border-slate-700 bg-slate-900" />
              <span>{{ goal.label }}</span>
            </label>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
          <div class="flex items-center justify-between mb-1">
            <h2 class="text-lg font-semibold">Tone</h2>
            <span class="text-xs text-slate-500">0 = left, 100 = right</span>
          </div>
          <div class="space-y-3">
            <div v-for="tone in toneKeys" :key="tone.key">
              <div class="flex justify-between text-xs text-slate-400 mb-1">
                <span>{{ tone.left }}</span>
                <span>{{ tone.right }}</span>
              </div>
              <input
                v-model.number="profile.tone[tone.key]"
                type="range"
                min="0"
                max="1"
                step="0.01"
                class="w-full accent-indigo-500"
              />
            </div>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">Topics</h2>
            <span class="text-xs text-slate-500">Comma-separated</span>
          </div>
          <input
            v-model="topicsInput"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
            placeholder="AI, Productivity, Career"
          />
          <div class="flex flex-wrap gap-2 text-xs text-slate-300">
            <span
              v-for="topic in profile.topics"
              :key="topic.topic"
              class="px-2 py-1 rounded-full border border-slate-700 bg-slate-800/70"
            >
              {{ topic.topic }}
            </span>
            <span v-if="!profile.topics.length" class="text-slate-500">Add at least one topic.</span>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">Platforms & cadence</h2>
            <span class="text-xs text-slate-500">Posts per week</span>
          </div>
          <div class="grid md:grid-cols-2 gap-3">
            <div
              v-for="platform in platformKeys"
              :key="platform"
              class="p-3 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2"
            >
              <label class="flex items-center justify-between text-sm font-semibold text-slate-200">
                <span class="capitalize">{{ platform }}</span>
                <input
                  v-model="platformToggles[platform]"
                  type="checkbox"
                  class="rounded border-slate-700 bg-slate-950"
                  @change="syncPlatforms(platform)"
                />
              </label>
              <label class="flex items-center gap-2 text-sm text-slate-300">
                <span class="text-xs text-slate-500 w-24">Per week</span>
                <input
                  v-model.number="profile.frequency[platform].perWeek"
                  type="number"
                  min="0"
                  class="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-sm"
                />
              </label>
            </div>
          </div>
        </div>
      </section>

      <section class="space-y-4">
        <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">Autopilot</h2>
            <span class="text-xs text-slate-500">Drafts only for now</span>
          </div>
          <label class="flex items-center justify-between text-sm">
            <span>Enable Autopilot</span>
            <input v-model="profile.autopilot.enabled" type="checkbox" class="rounded border-slate-700 bg-slate-950" />
          </label>
          <p class="text-xs text-slate-500">
            When on, AI will generate drafts using this profile. Publishing stays manual until you opt in.
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <h2 class="text-lg font-semibold">Voice & constraints</h2>
          <label class="space-y-1 text-sm text-slate-300">
            POV / role
            <input
              v-model="profile.voice.pov"
              class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
              placeholder="Founder, engineer, recruiter..."
            />
          </label>
          <label class="space-y-1 text-sm text-slate-300">
            Persona note
            <textarea
              v-model="profile.voice.personaNote"
              rows="2"
              class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
              placeholder="Calm, direct, story-driven..."
            />
          </label>
          <label class="space-y-1 text-sm text-slate-300">
            Avoid topics (comma-separated)
            <input
              v-model="constraintsInput.avoidTopics"
              class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
              placeholder="Politics, crypto..."
            />
          </label>
          <label class="space-y-1 text-sm text-slate-300">
            Forbidden phrases
            <input
              v-model="constraintsInput.forbiddenPhrases"
              class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
              placeholder="“10x”, “growth hack”, etc."
            />
          </label>
          <label class="space-y-1 text-sm text-slate-300">
            Compliance notes
            <textarea
              v-model="profile.constraints.complianceNotes"
              rows="2"
              class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/40"
              placeholder="Recruiting/legal guidelines to respect."
            />
          </label>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchCreatorProfile, saveCreatorProfile } from '@/services/creatorApi'

const loading = ref(false)
const saving = ref(false)

const goalKeys = [
  { key: 'hiring', label: 'Hiring' },
  { key: 'brand', label: 'Personal brand' },
  { key: 'saas_growth', label: 'SaaS growth' },
  { key: 'thought_leadership', label: 'Thought leadership' },
]

const toneKeys = [
  { key: 'technical', left: 'Simple', right: 'Technical' },
  { key: 'bold', left: 'Calm', right: 'Bold' },
  { key: 'story', left: 'Direct', right: 'Story-driven' },
]

const platformKeys = ['linkedin', 'twitter', 'instagram', 'youtube']

const profile = reactive(createEmptyProfile())
const topicsInput = ref('')
const constraintsInput = reactive({ avoidTopics: '', forbiddenPhrases: '' })
const platformToggles = reactive({
  linkedin: false,
  twitter: false,
  instagram: false,
  youtube: false,
})

function createEmptyProfile() {
  return {
    platforms: [],
    goals: { hiring: false, brand: false, saas_growth: false, thought_leadership: false },
    tone: { technical: 0.5, bold: 0.5, story: 0.5 },
    topics: [],
    frequency: {
      linkedin: { perWeek: 0, windows: [] },
      twitter: { perWeek: 0, windows: [] },
      instagram: { perWeek: 0, windows: [] },
      youtube: { perWeek: 0, windows: [] },
    },
    doExamples: [],
    dontExamples: [],
    voice: { pov: 'founder', personaNote: '' },
    constraints: { avoidTopics: [], forbiddenPhrases: [], complianceNotes: '' },
    autopilot: { enabled: false, autoApprove: false, pauseOnDrop: true },
    analytics: { tz: null, preferredTimes: [], lastFeedbackAt: null },
  }
}

function parseList(str = '') {
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function syncPlatforms(platform) {
  if (platformToggles[platform]) {
    if (!profile.platforms.includes(platform)) profile.platforms.push(platform)
  } else {
    profile.platforms = profile.platforms.filter((p) => p !== platform)
  }
}

function hydrateToggles() {
  platformKeys.forEach((p) => {
    platformToggles[p] = profile.platforms.includes(p)
    if (!profile.frequency[p]) profile.frequency[p] = { perWeek: 0, windows: [] }
  })
}

async function loadProfile() {
  loading.value = true
  try {
    const data = (await fetchCreatorProfile()) || {}
    Object.assign(profile, createEmptyProfile(), data)
    topicsInput.value = (profile.topics || []).map((t) => t.topic).join(', ')
    constraintsInput.avoidTopics = (profile.constraints?.avoidTopics || []).join(', ')
    constraintsInput.forbiddenPhrases = (profile.constraints?.forbiddenPhrases || []).join(', ')
    hydrateToggles()
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || 'Failed to load profile')
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  try {
    profile.topics = parseList(topicsInput.value).map((topic) => ({ topic, weight: 0.5 }))
    profile.constraints.avoidTopics = parseList(constraintsInput.avoidTopics)
    profile.constraints.forbiddenPhrases = parseList(constraintsInput.forbiddenPhrases)
    platformKeys.forEach((p) => syncPlatforms(p))
    await saveCreatorProfile({ ...profile })
    ElMessage.success('Profile saved')
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || 'Failed to save profile')
  } finally {
    saving.value = false
  }
}

onMounted(loadProfile)
</script>
