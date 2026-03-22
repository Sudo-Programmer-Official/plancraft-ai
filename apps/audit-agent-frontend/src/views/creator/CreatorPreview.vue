<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-4">
    <header class="flex items-center justify-between">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Creator Mode</p>
        <h1 class="text-3xl font-bold mt-2">Preview</h1>
        <p class="text-slate-400 text-sm">Platform-native previews for your variants.</p>
      </div>
      <button
        class="px-4 py-2 rounded-lg text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
        :class="autoDeployEnabled ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-800 border border-slate-700 text-slate-300'"
        :disabled="!autoDeployEnabled"
        @click="openPublish"
      >
        {{ autoDeployEnabled ? 'Publish →' : 'Publish Disabled' }}
      </button>
    </header>

    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <PlatformPreviewInstagram :caption="mock.ig_feed.caption" :hashtags="mock.ig_feed.hashtags" />
      <PlatformPreviewTwitter :tweets="mock.twitter_thread.tweets" />
      <PlatformPreviewLinkedIn :content="mock.linkedin_post.content" />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PlatformPreviewInstagram from '@/components/creator/PlatformPreviewInstagram.vue'
import PlatformPreviewTwitter from '@/components/creator/PlatformPreviewTwitter.vue'
import PlatformPreviewLinkedIn from '@/components/creator/PlatformPreviewLinkedIn.vue'
import { useFeatureFlagsStore } from '@/stores/featureFlagsStore'

const router = useRouter()
const featureFlagsStore = useFeatureFlagsStore()
const autoDeployEnabled = computed(() => featureFlagsStore.isEnabled('AUTO_DEPLOY'))

onMounted(() => {
  featureFlagsStore.ensureLoaded().catch(() => {})
})

function openPublish() {
  if (!autoDeployEnabled.value) {
    ElMessage.info('Auto deployment is temporarily disabled while we stabilize the publishing flow.')
    return
  }
  router.push('/creator/publish/new')
}

const mock = {
  ig_feed: { caption: 'Welcome to Creator Mode', hashtags: ['plancraftai'] },
  twitter_thread: { tweets: ['Tweet 1', 'Tweet 2'] },
  linkedin_post: { content: 'LinkedIn body goes here.' },
}
</script>
