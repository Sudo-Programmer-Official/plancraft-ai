<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-4">
    <header class="flex items-center justify-between">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Creator Mode</p>
        <h1 class="text-3xl font-bold mt-2">Repurpose Engine</h1>
        <p class="text-slate-400 text-sm">Input once, get platform-native variants.</p>
      </div>
      <button class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold" @click="runRepurpose">
        Run AI repurpose
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
import { reactive, ref } from 'vue'
import RepurposeActions from '@/components/creator/RepurposeActions.vue'
import PlatformPreviewInstagram from '@/components/creator/PlatformPreviewInstagram.vue'
import PlatformPreviewTwitter from '@/components/creator/PlatformPreviewTwitter.vue'
import PlatformPreviewLinkedIn from '@/components/creator/PlatformPreviewLinkedIn.vue'

const source = ref('')
const selectedTarget = ref(null)
const output = reactive({
  ig_feed: { caption: 'Hook + CTA go here.', hashtags: ['plancraftai', 'calmplanning'] },
  twitter_thread: { tweets: ['Tweet 1', 'Tweet 2'] },
  linkedin_post: { content: 'LinkedIn body goes here.' },
})

function setTarget(target) {
  selectedTarget.value = target
}

function runRepurpose() {
  // Placeholder: call creator-service /creator/ai/repurpose
  output.ig_feed.caption = `${source.value.slice(0, 120)}...`
}
</script>
