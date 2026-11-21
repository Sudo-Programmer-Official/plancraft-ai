<template>
  <!-- The widget is injected only while the marketing landing page is mounted. -->
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue'

const SITE_KEY = 'fdw_6c8bebe2b5439f052687c03d26431a52b958'
const LOADER_ID = 'frontdeskwise-widget-loader'
const LOADER_SRC = 'https://www.frontdeskwise.com/widget.js'
const API_BASE = 'https://www.frontdeskwise.com'
const SHELL_SRC = 'https://www.frontdeskwise.com/widget-shell.js'

function removeWidget() {
  document
    .querySelectorAll(
      `script[data-site="${SITE_KEY}"], [data-frontdeskwise-widget="${SITE_KEY}"]`,
    )
    .forEach((element) => element.remove())

  if (window.__FRONTDESKWISE_WIDGET_BOOTSTRAP__?.siteKey === SITE_KEY) {
    delete window.__FRONTDESKWISE_WIDGET_BOOTSTRAP__
  }
}

onMounted(() => {
  if (document.getElementById(LOADER_ID)) return

  const script = document.createElement('script')
  script.id = LOADER_ID
  script.async = true
  script.src = LOADER_SRC
  script.dataset.site = SITE_KEY
  script.dataset.api = API_BASE
  script.dataset.shell = SHELL_SRC
  script.dataset.pages = '/'
  document.head.appendChild(script)
})

onBeforeUnmount(removeWidget)
</script>
