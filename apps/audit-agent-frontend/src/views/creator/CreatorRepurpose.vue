<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-4">
    <header class="flex items-center justify-between">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Creator Mode</p>
        <h1 class="text-3xl font-bold mt-2">Repurpose Engine</h1>
        <p class="text-slate-400 text-sm">Input once, get platform-native variants.</p>
      </div>
      <button
        class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold disabled:opacity-60"
        :disabled="loading"
        @click="runRepurpose"
      >
        {{ loading ? 'Running…' : 'Run AI repurpose' }}
      </button>
    </header>

    <div class="grid lg:grid-cols-3 gap-4">
      <div class="lg:col-span-1 p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
        <label class="text-sm text-slate-300">Source content</label>
        <textarea
          v-model="source"
          rows="10"
          class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50"
          placeholder="Paste script, article, or notes to repurpose..."
        />
        <RepurposeActions @repurpose="setTarget" />
      </div>

      <div class="lg:col-span-2 space-y-4">
        <section class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
          <h2 class="text-lg font-semibold mb-2">Preview</h2>
          <div class="flex flex-wrap gap-2 text-xs text-slate-300 mb-3">
            <span class="px-2 py-1 rounded-full border" :class="socials.instagram.connected ? 'border-emerald-400/60 text-emerald-100 bg-emerald-500/10' : 'border-slate-700 text-slate-400'">Instagram: {{ socials.instagram.connected ? 'Connected' : 'Not connected' }}</span>
            <span class="px-2 py-1 rounded-full border" :class="socials.twitter.connected ? 'border-emerald-400/60 text-emerald-100 bg-emerald-500/10' : 'border-slate-700 text-slate-400'">Twitter/X: {{ socials.twitter.connected ? 'Connected' : 'Not connected' }}</span>
            <span class="px-2 py-1 rounded-full border" :class="socials.linkedin.connected ? 'border-emerald-400/60 text-emerald-100 bg-emerald-500/10' : 'border-slate-700 text-slate-400'">LinkedIn: {{ socials.linkedin.connected ? 'Connected' : 'Not connected' }}</span>
          </div>
          <div class="grid md:grid-cols-2 gap-4">
            <PlatformPreviewInstagram :caption="output.ig_feed.caption" :hashtags="output.ig_feed.hashtags" />
            <PlatformPreviewTwitter :tweets="output.twitter_thread.tweets" />
            <PlatformPreviewLinkedIn :content="output.linkedin_post.content" />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import RepurposeActions from '@/components/creator/RepurposeActions.vue'
import PlatformPreviewInstagram from '@/components/creator/PlatformPreviewInstagram.vue'
import PlatformPreviewTwitter from '@/components/creator/PlatformPreviewTwitter.vue'
import PlatformPreviewLinkedIn from '@/components/creator/PlatformPreviewLinkedIn.vue'
import { runRepurpose as runRepurposeApi } from '@/services/creatorApi'
import { getSocialStatus } from '@/services/social'

const source = ref('')
const selectedTarget = ref(null)
const loading = ref(false)
const output = reactive({
  ig_feed: { caption: 'Hook + CTA go here.', hashtags: ['plancraftai', 'calmplanning'] },
  twitter_thread: { tweets: ['Tweet 1', 'Tweet 2'] },
  linkedin_post: { content: 'LinkedIn body goes here.' },
})
const socials = reactive({
  linkedin: { connected: false },
  instagram: { connected: false },
  twitter: { connected: false },
})

onMounted(loadSocials)

function setTarget(target) {
  selectedTarget.value = target
}

async function runRepurpose() {
  loading.value = true
  try {
    const { variants } = await runRepurposeApi({
      sourceContent: source.value,
      targetFormats: selectedTarget.value ? [selectedTarget.value] : ['reel_script', 'linkedin_post', 'twitter_thread'],
    })
    ;(variants || []).forEach((variant) => {
      const body = variant.body || variant.caption || ''
      if (variant.type?.includes('twitter')) {
        output.twitter_thread.tweets = body.split('\n').filter(Boolean)
      } else if (variant.type?.includes('linkedin')) {
        output.linkedin_post.content = body
      } else {
        output.ig_feed.caption = body
      }
    })
    ElMessage.success('Repurposed with AI')
  } catch (err) {
    const msg =
      err?.response?.data?.error ||
      err?.message ||
      'Failed to repurpose. Check that the creator service is running and reachable.'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

async function loadSocials() {
  try {
    const status = await getSocialStatus()
    const accounts = status?.accounts || status || {}
    socials.linkedin.connected = !!accounts.linkedin?.connected
    socials.instagram.connected = !!accounts.instagram?.connected
    socials.twitter.connected = !!accounts.twitter?.connected
  } catch (err) {
    console.warn('Failed to load social status', err?.message || err)
  }
}
</script>
