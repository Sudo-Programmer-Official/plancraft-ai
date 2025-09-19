// src/composables/useAIEnhancer.js
export async function useAIEnhancer(rawText) {
  if (!rawText) return ''
  // Simulated — later replace with GPT/Cloud Function/etc.
  const enhanced = rawText.replace(/i feel/gi, 'I’m currently feeling')
  return `✨ ${enhanced.trim()} ✨`
}