<template>
  <section class="team-pulse">
    <header class="pulse-header">
      <div>
        <h1>Team Pulse</h1>
        <p v-if="currentProject">Weekly health snapshot for {{ currentProject.name }}</p>
        <p v-else>Select a project to view its pulse.</p>
      </div>
      <div class="actions">
        <select v-model="selectedProjectId" :disabled="!projects.length">
          <option disabled value="">Select project</option>
          <option v-for="project in projects" :key="project.id" :value="project.id">
            {{ project.name }} · {{ project.status }}
          </option>
        </select>
        <button type="button" class="refresh" @click="refresh" :disabled="loading">
          {{ loading ? 'Refreshing…' : 'Refresh' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="pulse-loading">Loading weekly pulse…</div>

    <div v-else-if="weekly" class="pulse-grid">
      <section class="summary-card">
        <header>
          <h2>Weekly Summary</h2>
          <button
            v-if="weekly.audio?.url"
            type="button"
            class="audio-btn"
            @click="playAudio(weekly.audio.url)"
          >
            🔊 Play Recap
          </button>
        </header>
        <p class="summary-text">{{ weekly.summary.text }}</p>
        <footer>
          <span>Completion rate: <strong>{{ weekly.stats.totals.completionRate }}%</strong></span>
          <span>Blocked: <strong>{{ weekly.stats.totals.blocked }}</strong></span>
          <span>Overdue: <strong>{{ weekly.stats.totals.overdue }}</strong></span>
        </footer>
      </section>

      <section class="stats-card">
        <h2>Momentum</h2>
        <div class="stat-row">
          <div class="stat">
            <span class="label">Total Tasks</span>
            <strong>{{ weekly.stats.totals.total }}</strong>
          </div>
          <div class="stat">
            <span class="label">Completed</span>
            <strong>{{ weekly.stats.totals.completed }}</strong>
          </div>
          <div class="stat">
            <span class="label">Active</span>
            <strong>{{ weekly.stats.totals.active }}</strong>
          </div>
        </div>
        <div class="contributors" v-if="weekly.stats.topContributors.length">
          <h3>Top Contributors</h3>
          <ul>
            <li v-for="contributor in weekly.stats.topContributors" :key="contributor.owner">
              <strong>{{ contributor.owner || 'Unassigned' }}</strong>
              <span>{{ contributor.completed }} completed · {{ contributor.updated }} updates</span>
            </li>
          </ul>
        </div>
      </section>

      <section class="highlights-card" v-if="weekly.stats.highlights.length">
        <h2>Highlights</h2>
        <ul>
          <li v-for="highlight in weekly.stats.highlights" :key="highlight.id">
            <div>
              <strong>{{ highlight.title }}</strong>
              <span class="meta">{{ formatStatus(highlight.status) }}</span>
            </div>
            <div class="meta">
              <span v-if="highlight.assignedTo">👤 {{ highlight.assignedTo }}</span>
              <span v-if="typeof highlight.progress === 'number'">📈 {{ highlight.progress }}%</span>
            </div>
          </li>
        </ul>
      </section>

      <section class="sentiment-card">
        <h2>Team Sentiment</h2>
        <div class="sentiment-content" v-if="weekly.stats.sentiment.trend.length">
          <svg class="sentiment-chart" viewBox="0 0 120 60" preserveAspectRatio="none">
            <polyline
              :points="sentimentPoints"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            />
          </svg>
          <p>Average score: <strong>{{ weekly.stats.sentiment.average }}</strong></p>
        </div>
        <p v-else class="empty">No reflections logged this week.</p>
      </section>

      <section class="monthly-card">
        <h2>Monthly Insights</h2>
        <div class="insight-grid">
          <div class="insight">
            <span class="label">Positive Days</span>
            <strong>{{ weekly.monthly.positiveDays }}</strong>
          </div>
          <div class="insight">
            <span class="label">Reflection Streak</span>
            <strong>{{ weekly.monthly.streak }}</strong>
          </div>
        </div>
        <div class="badges" v-if="weekly.monthly.badges.length">
          <h3>New Badges</h3>
          <ul>
            <li v-for="badge in weekly.monthly.badges" :key="badge.id">
              <strong>{{ badge.label }}</strong>
              <span>{{ badge.description }}</span>
            </li>
          </ul>
        </div>
        <p v-else class="empty">Keep logging reflections to unlock monthly badges.</p>
      </section>

      <section class="coach-card">
        <h2>AI Coach</h2>
        <p>Ask for a quick nudge or let the coach riff on the latest recap.</p>
        <textarea v-model="coachPrompt" placeholder="Ask for a focus suggestion…" rows="3" />
        <div class="coach-actions">
          <button type="button" class="coach-btn" @click="askCoach" :disabled="coachLoading">
            {{ coachLoading ? 'Thinking…' : 'Ask Coach' }}
          </button>
          <button
            v-if="coachResponse?.speechUrl"
            type="button"
            class="coach-audio"
            @click="playAudio(coachResponse.speechUrl)"
          >
            🔊 Listen
          </button>
        </div>
        <article v-if="coachResponse" class="coach-response">
          {{ coachResponse.text }}
        </article>
      </section>
    </div>

    <div v-else class="pulse-empty">
      <p>Select a project to generate your first pulse report.</p>
    </div>

    <p v-if="error" class="pulse-error">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useOrgStore } from '@/stores/orgStore'
import { useProjectStore } from '@/stores/projectStore'
import { useTeamPulseStore } from '@/stores/teamPulseStore'

const route = useRoute()
const orgStore = useOrgStore()
const projectStore = useProjectStore()
const pulseStore = useTeamPulseStore()

const orgId = computed(() => {
  const param = route.params.orgId
  const id = typeof param === 'string' ? param : Array.isArray(param) ? param[0] : null
  return id || orgStore.activeOrgId
})

const projects = computed(() => projectStore.projects)
const weekly = computed(() => pulseStore.weekly)
const loading = computed(() => pulseStore.loading)
const coachLoading = computed(() => pulseStore.coachLoading)
const coachResponse = computed(() => pulseStore.coach)
const error = computed(() => pulseStore.error)

const selectedProjectId = ref('')
const coachPrompt = ref('')

const currentProject = computed(() => projects.value.find((p) => p.id === selectedProjectId.value) || null)

const sentimentPoints = computed(() => {
  const trend = weekly.value?.stats.sentiment.trend || []
  if (!trend.length) return ''
  const max = Math.max(...trend.map((entry) => entry.score), 1)
  const min = Math.min(...trend.map((entry) => entry.score), -1)
  const range = max - min || 1
  return trend
    .map((entry, index) => {
      const x = (index / Math.max(trend.length - 1, 1)) * 120
      const normalized = (entry.score - min) / range
      const y = 60 - normalized * 50 - 5
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
})

watch(
  orgId,
  async (id) => {
    if (!id) {
      selectedProjectId.value = ''
      pulseStore.clear()
      return
    }
    orgStore.setOrg(id)
    try {
      const list = await projectStore.load(id)
      if (list.length && !selectedProjectId.value) {
        selectedProjectId.value = list[0].id
      }
    } catch (err) {
      console.error('Failed to load projects', err)
    }
  },
  { immediate: true },
)

watch(
  selectedProjectId,
  async (projectId) => {
    if (!projectId || !orgId.value) {
      pulseStore.clear()
      return
    }
    try {
      await pulseStore.loadWeekly(orgId.value, projectId, { audio: true })
    } catch (err) {
      console.error('Failed to load weekly pulse', err)
    }
  },
  { immediate: true },
)

async function refresh() {
  if (!orgId.value || !selectedProjectId.value) return
  try {
    await pulseStore.loadWeekly(orgId.value, selectedProjectId.value, { audio: true })
  } catch (err) {
    console.error('Failed to refresh pulse', err)
  }
}

async function askCoach() {
  if (!orgId.value || !selectedProjectId.value) return
  try {
    await pulseStore.requestCoach(orgId.value, selectedProjectId.value, coachPrompt.value.trim())
  } catch (err) {
    console.error('Coach request failed', err)
  }
}

function playAudio(url: string) {
  if (!url) return
  const audio = new Audio(url)
  audio.play().catch((err) => {
    console.error('Audio playback failed', err)
  })
}

function formatStatus(status?: string) {
  if (!status) return 'Pending'
  const normalized = status.replace('_', ' ')
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

onMounted(() => {
  if (orgId.value) orgStore.setOrg(orgId.value)
})
</script>

<style scoped>
.team-pulse {
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: var(--text-primary);
}

.pulse-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.pulse-header h1 {
  margin: 0;
  font-size: 1.8rem;
  color: var(--text-primary);
}

.pulse-header p {
  margin: 4px 0 0;
  color: var(--text-secondary);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.actions select {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--border-soft);
  background: var(--bg-elevated);
  color: var(--text-primary);
  min-width: 220px;
}

.actions select:focus-visible {
  outline: none;
  border-color: color-mix(in srgb, var(--accent) 55%, transparent 45%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent 84%);
}

.actions .refresh {
  border: none;
  border-radius: 999px;
  background: var(--accent-gradient);
  color: #fff;
  padding: 8px 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
}

.actions .refresh:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgba(99, 102, 241, 0.28);
}

.pulse-loading,
.pulse-empty {
  padding: 28px;
  background: var(--bg-elevated);
  border: 1px dashed var(--border-soft);
  border-radius: 16px;
  text-align: center;
  color: var(--text-secondary);
}

.pulse-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
}

.summary-card,
.stats-card,
.highlights-card,
.sentiment-card,
.monthly-card,
.coach-card {
  background: var(--bg-elevated);
  border-radius: 16px;
  border: 1px solid var(--border-soft);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: color-mix(in srgb, var(--shadow-elevated) 55%, transparent 45%);
}

.summary-card header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-card h2,
.stats-card h2,
.highlights-card h2,
.sentiment-card h2,
.monthly-card h2,
.coach-card h2 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.summary-text {
  margin: 0;
  line-height: 1.5;
  color: var(--text-secondary);
}

.summary-card footer {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.audio-btn {
  border: none;
  border-radius: 999px;
  padding: 6px 12px;
  background: color-mix(in srgb, var(--accent) 20%, var(--bg-elevated) 80%);
  color: color-mix(in srgb, var(--accent) 70%, var(--text-primary) 30%);
  font-weight: 600;
  cursor: pointer;
}

.stat-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.stat {
  flex: 1;
  min-width: 110px;
  background: color-mix(in srgb, var(--accent) 14%, var(--bg-elevated) 86%);
  padding: 12px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: var(--text-primary);
}

.label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.contributors ul,
.highlights-card ul,
.monthly-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.contributors li,
.highlights-card li,
.monthly-card li {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: color-mix(in srgb, var(--bg-elevated) 88%, transparent 12%);
  border-radius: 12px;
  padding: 10px;
}

.meta {
  font-size: 0.85rem;
  color: var(--text-secondary);
  display: flex;
  gap: 10px;
}

.sentiment-card {
  align-items: stretch;
}

.sentiment-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: stretch;
}

.sentiment-chart {
  width: 100%;
  height: 80px;
  color: color-mix(in srgb, var(--accent) 70%, var(--text-primary) 30%);
}

.empty {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.insight-grid {
  display: flex;
  gap: 12px;
}

.insight {
  flex: 1;
  background: color-mix(in srgb, #10b981 16%, var(--bg-elevated) 84%);
  border-radius: 12px;
  padding: 12px;
  color: color-mix(in srgb, #047857 70%, var(--text-primary) 30%);
}

.badges li {
  background: color-mix(in srgb, var(--accent) 20%, var(--bg-elevated) 80%);
  border-radius: 999px;
  padding: 4px 10px;
  color: var(--text-primary);
}

.coach-card textarea {
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--border-soft);
  padding: 10px;
  resize: vertical;
  font-size: 0.95rem;
  background: var(--bg-surface);
  color: var(--text-primary);
}

.coach-card textarea:focus-visible {
  outline: none;
  border-color: color-mix(in srgb, var(--accent) 55%, transparent 45%);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent 84%);
}

.coach-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.coach-btn {
  border: none;
  border-radius: 999px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #ec4899, #6366f1);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.coach-audio {
  border: none;
  border-radius: 999px;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--accent) 24%, var(--bg-elevated) 76%);
  color: color-mix(in srgb, var(--accent) 70%, var(--text-primary) 30%);
  cursor: pointer;
}

.coach-response {
  margin: 0;
  background: color-mix(in srgb, var(--accent) 18%, var(--bg-elevated) 82%);
  padding: 12px;
  border-radius: 12px;
  color: var(--text-primary);
  line-height: 1.5;
}

.pulse-error {
  color: color-mix(in srgb, var(--accent-danger) 70%, var(--text-primary) 30%);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .pulse-grid {
    grid-template-columns: 1fr;
  }
  .actions select {
    min-width: 0;
    width: 100%;
  }
}
</style>
