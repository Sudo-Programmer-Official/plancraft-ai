<template>
  <div class="badges" :class="`badges--${size}`">
    <a
      v-if="showIos"
      :href="IOS_APP_URL"
      target="_blank"
      rel="noopener noreferrer"
      class="badge badge--apple"
      @click="onClick('app_store')"
    >
      <!-- Official Apple badge, used unmodified (developer.apple.com/app-store/marketing/guidelines). -->
      <img
        src="/marketing/badges/app-store-badge-black.svg"
        alt="Download on the App Store"
        width="120"
        height="40"
        :loading="lazy ? 'lazy' : 'eager'"
        decoding="async"
      />
    </a>
    <a
      v-if="showAndroid"
      :href="ANDROID_APP_URL"
      target="_blank"
      rel="noopener noreferrer"
      class="badge badge--google"
      @click="onClick('google_play')"
    >
      <!-- Official Google Play badge PNG; it ships with its own clear space. -->
      <img
        src="/marketing/badges/google-play-badge.png"
        alt="Get it on Google Play"
        width="646"
        height="250"
        :loading="lazy ? 'lazy' : 'eager'"
        decoding="async"
      />
    </a>
  </div>
</template>

<script setup>
import { trackEvent } from '@/services/analytics'
import { ANDROID_APP_URL, IOS_APP_URL } from '@/constants/appStores'

const props = defineProps({
  size: { type: String, default: 'md' }, // 'md' | 'lg'
  location: { type: String, default: 'unknown' },
  lazy: { type: Boolean, default: false },
  showIos: { type: Boolean, default: true },
  showAndroid: { type: Boolean, default: true },
})

function onClick(store) {
  trackEvent('store_badge_clicked', { store, location: props.location })
}
</script>

<style scoped>
.badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.badge {
  display: inline-flex;
  align-items: center;
  border-radius: 8px;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.badge:hover {
  transform: translateY(-1px);
}

.badge:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 3px;
}

.badge img {
  display: block;
  width: auto;
}

/* Apple badge: 40px is Apple's recommended minimum on screen. */
.badge--apple img {
  height: 44px;
}

/* The Google PNG includes built-in clear space (~16% per side), so it is drawn
   taller and pulled in with negative margins to match the Apple badge. */
.badge--google img {
  height: 64px;
  margin: -10px -10px;
}

.badges--lg .badge--apple img {
  height: 52px;
}

.badges--lg .badge--google img {
  height: 76px;
  margin: -12px -12px;
}
</style>
