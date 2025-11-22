<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-4">
    <header class="flex items-center justify-between">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Creator Mode</p>
        <h1 class="text-3xl font-bold mt-2">Preview</h1>
        <p class="text-slate-400 text-sm">Platform-native previews for your variants.</p>
      </div>
      <RouterLink to="/creator/publish/new" class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold">
        Publish →
      </RouterLink>
    </header>

    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      <PlatformPreviewInstagram :caption="mock.ig_feed.caption" :hashtags="mock.ig_feed.hashtags" />
      <PlatformPreviewTwitter :tweets="mock.twitter_thread.tweets" />
      <PlatformPreviewLinkedIn :content="mock.linkedin_post.content" />
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import PlatformPreviewInstagram from '@/components/creator/PlatformPreviewInstagram.vue'
import PlatformPreviewTwitter from '@/components/creator/PlatformPreviewTwitter.vue'
import PlatformPreviewLinkedIn from '@/components/creator/PlatformPreviewLinkedIn.vue'

const mock = {
  ig_feed: { caption: 'Welcome to Creator Mode', hashtags: ['plancraftai'] },
  twitter_thread: { tweets: ['Tweet 1', 'Tweet 2'] },
  linkedin_post: { content: 'LinkedIn body goes here.' },
}
</script>
