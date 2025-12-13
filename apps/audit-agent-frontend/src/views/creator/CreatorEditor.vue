<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-4">
    <header class="flex items-center justify-between">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Creator Mode</p>
        <h1 class="text-3xl font-bold mt-2">Editor</h1>
        <p class="text-slate-400 text-sm">Create once, repurpose everywhere.</p>
      </div>
      <div class="flex gap-2">
        <button class="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm" @click="generateHook">AI Hook</button>
        <button
          class="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm"
          :disabled="validating"
          @click="validateDraftRemote"
        >
          {{ validating ? 'Validating…' : 'Validate' }}
        </button>
        <button
          class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold disabled:opacity-60"
          :disabled="saving"
          @click="saveDraft"
        >
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </header>

    <EditorToolbar :actions="toolbarActions" @action="handleToolbarAction">
      <template #status>
        <div class="flex items-center gap-2 text-xs text-slate-400">
          <span :class="badgeClass(platformHealth.instagram)">IG {{ platformHealth.instagram }}</span>
          <span :class="badgeClass(platformHealth.twitter)">X {{ platformHealth.twitter }}</span>
          <span :class="badgeClass(platformHealth.linkedin)">LI {{ platformHealth.linkedin }}</span>
        </div>
      </template>
    </EditorToolbar>

    <div class="grid lg:grid-cols-5 gap-4">
      <div class="lg:col-span-3 space-y-4">
        <MediaPanel v-model="draft.media" :draftSnapshot="draft" />

        <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div class="grid md:grid-cols-3 gap-3">
            <div>
              <label class="block text-sm text-slate-300 mb-1">Hook (optional)</label>
              <input
                v-model="draft.text.hook"
                class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
                placeholder="A crisp opener for any platform"
              />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm text-slate-300 mb-1">Title (LinkedIn / long form)</label>
              <input
                v-model="draft.text.title"
                class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
                placeholder="Launch teaser for calm planning"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm text-slate-300 mb-1">Body</label>
            <textarea
              v-model="draft.text.body"
              rows="8"
              class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
              placeholder="Describe the idea, value, and story..."
            />
          </div>
          <div>
            <label class="block text-sm text-slate-300 mb-1">Call to action (optional)</label>
            <input
              v-model="draft.text.cta"
              class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
              placeholder="Tell people what to do next"
            />
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div class="grid md:grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-slate-300 mb-1">Link</label>
              <input
                v-model="linkInput"
                class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
                placeholder="https://example.com"
                @blur="applyLink"
              />
              <p class="text-[11px] text-slate-500 mt-1">LinkedIn/Twitter show preview; Instagram flagged as non-clickable.</p>
            </div>
            <div>
              <label class="block text-sm text-slate-300 mb-1">Hashtags</label>
              <input
                v-model="hashtagsInput"
                class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
                placeholder="#calm #productivity"
                @input="applyHashtags"
              />
              <p class="text-[11px] text-slate-500 mt-1">IG: keep ~15, X: 2-3, LI: 3-5</p>
            </div>
          </div>
          <div class="grid md:grid-cols-2 gap-3">
            <div>
              <label class="block text-sm text-slate-300 mb-1">Mentions</label>
              <input
                v-model="mentionsInput"
                class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
                placeholder="@brand @partner"
                @input="applyMentions"
              />
            </div>
            <div class="flex items-center gap-2 text-xs text-slate-300">
              <span class="px-2 py-1 rounded-full bg-slate-800 border border-slate-700">#{{ draft.tags.hashtags.length }} hashtags</span>
              <span class="px-2 py-1 rounded-full bg-slate-800 border border-slate-700">@{{ draft.tags.mentions.length }} mentions</span>
            </div>
          </div>
          <div v-if="firstLink" class="rounded-lg border border-slate-800 bg-slate-900 p-3 flex gap-3 items-center">
            <div class="w-12 h-12 rounded bg-slate-800 flex items-center justify-center text-slate-400 text-xs">{{ linkHost }}</div>
            <div class="flex-1">
              <p class="text-sm font-semibold">{{ firstLink.title || firstLink.url }}</p>
              <p class="text-xs text-slate-500 truncate">{{ firstLink.url }}</p>
            </div>
            <button class="text-[11px] text-rose-300" @click="removeLink">Remove</button>
          </div>
        </div>

        <RepurposeActions @repurpose="onRepurpose" />
      </div>

      <div class="lg:col-span-2 space-y-4">
        <div class="p-3 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div class="flex items-center justify-between">
            <p class="text-sm font-semibold text-slate-200">Platform readiness</p>
            <span class="text-xs text-slate-400">Soft warnings, not hard blocks</span>
          </div>
          <div class="mt-2 space-y-2">
            <div v-for="platform in ['instagram','twitter','linkedin']" :key="platform" class="flex items-start gap-2">
              <span class="text-xs px-2 py-1 rounded-full border border-slate-700 capitalize">{{ platform }}</span>
              <div class="text-xs text-slate-300">
                <div v-if="!warnings[platform].length" class="text-emerald-300">🟢 Platform ready</div>
                <ul v-else class="list-disc list-inside space-y-1 text-amber-200">
                  <li v-for="(w, idx) in warnings[platform]" :key="idx">{{ w }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <PlatformPreviewInstagram
          :caption="instagramPreview.caption"
          :hashtags="instagramPreview.hashtags"
          :media="instagramPreview.media"
          :warnings="warnings.instagram"
          :connected="true"
        />
        <PlatformPreviewTwitter
          :tweets="twitterPreview.tweets"
          :media="twitterPreview.media"
          :warnings="warnings.twitter"
          :connected="true"
        />
        <PlatformPreviewLinkedIn
          :title="draft.text.title"
          :content="linkedInPreview.body"
          :link="firstLink"
          :media="linkedInPreview.media"
          :warnings="warnings.linkedin"
          :connected="true"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import EditorToolbar from '@/components/creator/EditorToolbar.vue'
import RepurposeActions from '@/components/creator/RepurposeActions.vue'
import MediaPanel from '@/components/creator/MediaPanel.vue'
import PlatformPreviewInstagram from '@/components/creator/PlatformPreviewInstagram.vue'
import PlatformPreviewLinkedIn from '@/components/creator/PlatformPreviewLinkedIn.vue'
import PlatformPreviewTwitter from '@/components/creator/PlatformPreviewTwitter.vue'
import { fetchVariant, saveVariantDraft, validateDraft as validateDraftApi } from '@/services/creatorApi'
import {
  adaptForInstagram,
  adaptForLinkedIn,
  adaptForTwitter,
  createEmptyDraft,
  normalizeHashtags,
  normalizeMentions,
  validateDraftClient,
} from '@/services/creator/draftModel'

const router = useRouter()
const route = useRoute()
const saving = ref(false)
const validating = ref(false)
const draft = reactive(createEmptyDraft())
const warnings = reactive({ instagram: [], twitter: [], linkedin: [] })
const hashtagsInput = ref('')
const mentionsInput = ref('')
const linkInput = ref('')
const variantId = route.params.id?.toString?.() || 'new'

const toolbarActions = [
  { label: 'Hook', type: 'hook' },
  { label: 'Outline', type: 'outline' },
  { label: 'CTA', type: 'cta' },
]

function handleToolbarAction(type) {
  if (type === 'hook') draft.text.hook = `${draft.text.hook || ''}\nHook: Unlock calm productivity.`.trim()
}

function generateHook() {
  draft.text.hook = `${draft.text.hook || ''}\nAI Hook: Your calendar can be compassionate.`.trim()
}

async function saveDraft() {
  saving.value = true
  try {
    await saveVariantDraft(variantId === 'new' ? undefined : variantId, {
      title: draft.text.title,
      body: draft.text.body,
      hook: draft.text.hook,
      cta: draft.text.cta,
      media: draft.media,
      links: draft.links,
      tags: draft.tags,
      platform: 'instagram',
      type: 'post',
      status: 'draft',
    })
    ElMessage.success('Saved')
    router.push('/creator')
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || 'Failed to save')
  } finally {
    saving.value = false
  }
}

function onRepurpose(target) {
  router.push({ path: '/creator/repurpose', query: { target } })
}

function prefillFromSeed() {
  if (variantId !== 'new') return
  const seed = typeof route.query.seed === 'string' ? route.query.seed : ''
  if (!seed) return
  if (!draft.text.body) draft.text.body = seed
  if (!draft.text.title) {
    const suggested = typeof route.query.title === 'string' && route.query.title.trim().length
      ? route.query.title
      : seed.slice(0, 64) + (seed.length > 64 ? '…' : '')
    draft.text.title = suggested
  }
}

async function loadVariant() {
  if (!variantId || variantId === 'new') return
  try {
    const variant = await fetchVariant(variantId)
    draft.text.title = variant?.title || ''
    draft.text.body = variant?.body || variant?.hook || ''
    draft.text.hook = variant?.hook || ''
    draft.text.cta = variant?.cta || ''
    draft.media = variant?.media || []
    draft.links = variant?.links || []
    draft.tags.hashtags = normalizeHashtags(variant?.tags?.hashtags || [])
    draft.tags.mentions = normalizeMentions(variant?.tags?.mentions || [])
    hashtagsInput.value = draft.tags.hashtags.map((h) => `#${h}`).join(' ')
    mentionsInput.value = draft.tags.mentions.map((m) => `@${m}`).join(' ')
    linkInput.value = draft.links[0]?.url || ''
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || 'Failed to load variant')
  }
}

function applyHashtags() {
  draft.tags.hashtags = normalizeHashtags(hashtagsInput.value)
}

function applyMentions() {
  draft.tags.mentions = normalizeMentions(mentionsInput.value)
}

function applyLink() {
  const url = linkInput.value.trim()
  if (!url) {
    draft.links = []
    return
  }
  draft.links = [{ url, title: null, previewImage: null, showPreview: true }]
}

function removeLink() {
  linkInput.value = ''
  draft.links = []
}

const instagramPreview = computed(() => adaptForInstagram(draft))
const twitterPreview = computed(() => adaptForTwitter(draft))
const linkedInPreview = computed(() => adaptForLinkedIn(draft))
const firstLink = computed(() => draft.links?.[0] || null)
const linkHost = computed(() => {
  try {
    const u = new URL(firstLink.value?.url || '')
    return u.hostname.replace(/^www\./, '')
  } catch {
    return 'link'
  }
})

function refreshWarnings() {
  const localWarnings = validateDraftClient(draft)
  warnings.instagram = [...localWarnings.instagram]
  warnings.twitter = [...localWarnings.twitter]
  warnings.linkedin = [...localWarnings.linkedin]
}

async function validateDraftRemote() {
  validating.value = true
  try {
    refreshWarnings()
    try {
      const remote = await validateDraftApi(draft)
      if (remote?.warnings) {
        warnings.instagram = remote.warnings.instagram || warnings.instagram
        warnings.twitter = remote.warnings.twitter || warnings.twitter
        warnings.linkedin = remote.warnings.linkedin || warnings.linkedin
      }
    } catch (err) {
      console.warn('Remote validation failed, using local warnings only', err?.message || err)
    }
    ElMessage.success('Validation completed')
  } catch (err) {
    ElMessage.error(err?.response?.data?.error || 'Validation failed')
  } finally {
    validating.value = false
  }
}

const platformHealth = computed(() => ({
  instagram: warnings.instagram.length ? 'Warn' : 'Ready',
  twitter: warnings.twitter.length ? 'Warn' : 'Ready',
  linkedin: warnings.linkedin.length ? 'Warn' : 'Ready',
}))

function badgeClass(status) {
  const base = 'px-2 py-1 rounded-full border text-[11px]'
  if (status === 'Ready') return `${base} border-emerald-500/50 text-emerald-200 bg-emerald-500/10`
  return `${base} border-amber-400/50 text-amber-200 bg-amber-500/10`
}

watch(
  () => draft,
  () => refreshWarnings(),
  { deep: true, immediate: true },
)

onMounted(() => {
  prefillFromSeed()
  loadVariant()
})
</script>
