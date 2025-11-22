<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-4">
    <header class="flex items-center justify-between">
      <div>
        <p class="uppercase text-xs tracking-[0.35em] text-indigo-300/80">Creator Mode</p>
        <h1 class="text-3xl font-bold mt-2">Publish & Schedule</h1>
        <p class="text-slate-400 text-sm">Choose platforms, variants, and timing.</p>
      </div>
      <button class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-semibold" @click="submit">
        Publish / Schedule
      </button>
    </header>

    <div class="grid lg:grid-cols-3 gap-4">
      <section class="lg:col-span-2 p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
        <div class="grid md:grid-cols-2 gap-3">
          <label class="space-y-2 text-sm text-slate-200">
            Platform
            <select v-model="form.platform" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm">
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="linkedin">LinkedIn</option>
              <option value="twitter">Twitter</option>
            </select>
          </label>
          <label class="space-y-2 text-sm text-slate-200">
            Variant
            <select v-model="form.variantKey" class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm">
              <option value="ig_feed">IG Feed</option>
              <option value="ig_story">IG Story</option>
              <option value="ig_reel">IG Reel</option>
              <option value="linkedin_post">LinkedIn Post</option>
              <option value="twitter_thread">Twitter Thread</option>
            </select>
          </label>
        </div>

        <label class="space-y-2 text-sm text-slate-200">
          Caption / Body
          <textarea
            v-model="form.caption"
            rows="6"
            class="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm"
            placeholder="Final copy..."
          />
        </label>

        <MediaUploadCard title="Media" @upload="setFiles" :files="files" />

        <ScheduleSelector v-model="form.scheduleDate" />
      </section>

      <section class="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
        <h3 class="text-lg font-semibold">Platform Preview</h3>
        <PlatformPreviewInstagram v-if="form.platform === 'instagram'" :caption="form.caption" />
        <PlatformPreviewLinkedIn v-else-if="form.platform === 'linkedin'" :content="form.caption" />
        <PlatformPreviewTwitter v-else :tweets="[form.caption]" />
      </section>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import MediaUploadCard from '@/components/creator/MediaUploadCard.vue'
import ScheduleSelector from '@/components/creator/ScheduleSelector.vue'
import PlatformPreviewInstagram from '@/components/creator/PlatformPreviewInstagram.vue'
import PlatformPreviewLinkedIn from '@/components/creator/PlatformPreviewLinkedIn.vue'
import PlatformPreviewTwitter from '@/components/creator/PlatformPreviewTwitter.vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const form = reactive({
  platform: 'instagram',
  variantKey: 'ig_feed',
  caption: '',
  scheduleDate: '',
})
const files = ref([])

function setFiles(list) {
  files.value = list
}

function submit() {
  // Placeholder: call posting-service /publish
  router.push('/creator')
}
</script>
