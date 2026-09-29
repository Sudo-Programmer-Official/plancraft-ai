import { ref } from 'vue'

// One quick-capture sheet for the whole app: the layout binds it to the
// shell, and any screen (e.g. Today's "Add task") can open it.
const captureOpen = ref(false)

export function useCaptureSheet() {
  return {
    captureOpen,
    openCapture: () => {
      captureOpen.value = true
    },
  }
}
