<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 px-6 py-8">
    <header class="text-center mb-10">
      <h1 class="text-4xl font-bold text-gray-800 mb-2 animate-fade-in">
        Today's Reflections
      </h1>
      <p class="text-lg text-gray-600 animate-fade-in-delay">
        Write, breathe, and let go — your personal sanctuary awaits.
      </p>
    </header>

    <main class="max-w-4xl mx-auto grid gap-6 animate-slide-up">
      <!-- Mood Tracker -->
      <section class="bg-white p-6 rounded-2xl shadow-md">
        <h2 class="text-xl font-semibold text-gray-700 mb-3">How are you feeling?</h2>
        <div class="grid grid-cols-5 gap-3">
          <button
            v-for="mood in moods"
            :key="mood.emoji"
            @click="selectMood(mood)"
            class="p-4 rounded-xl border border-gray-200 hover:bg-indigo-50 transition flex flex-col items-center"
            :class="{ 'bg-indigo-100': selectedMood?.emoji === mood.emoji }"
          >
            <span class="text-3xl">{{ mood.emoji }}</span>
            <p class="text-xs text-gray-500 mt-1">{{ mood.label }}</p>
          </button>
        </div>
      </section>

      <!-- Voice Journal -->
      <section class="bg-white p-6 rounded-2xl shadow-md">
        <h2 class="text-xl font-semibold text-gray-700 mb-3">Voice Journal</h2>
        <div class="flex flex-col gap-4">
          <textarea
            v-model="entryText"
            placeholder="What’s on your mind today..."
            rows="5"
            class="w-full p-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none text-gray-700"
          ></textarea>
          <p v-if="enhancedText" class="text-sm text-indigo-500 italic">
            ✨ Enhanced: {{ enhancedText }}
          </p>

          <div class="flex flex-wrap justify-between gap-3">
            <button
              @click="toggleRecording"
              :class="[
                'px-6 py-2 rounded-full font-medium transition',
                isRecording ? 'bg-red-500 text-white' : 'bg-indigo-500 text-white'
              ]"
            >
              {{ isRecording ? '🎙️ Recording… Tap to Stop' : '🎤 Start Recording' }}
            </button>

            <button
              @click="saveEntry"
              :disabled="!entryText.trim() && !selectedMood"
              class="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-full transition"
            >
              Save Entry
            </button>
          </div>
        </div>
      </section>

      <!-- Previous Logs -->
      <section
        v-if="logs.length"
        class="bg-white p-6 rounded-2xl shadow-md"
        ref="logsSection"
      >
        <h2 class="text-xl font-semibold text-gray-700 mb-3">Previous Entries</h2>
        <ul class="space-y-3 max-h-72 overflow-y-auto pr-1">
          <li
            v-for="log in logs"
            :key="log.id"
            class="border p-4 rounded-xl text-sm text-gray-600 bg-gray-50 hover:bg-indigo-50 cursor-pointer"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="font-medium text-gray-700">{{ log.date }}</span>
              <span class="text-xl">{{ log.mood?.emoji }}</span>
            </div>
            <p class="text-gray-700">{{ log.text }}</p>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import { saveEntryToFirebase, fetchEntries } from '@/services/firebaseService'
import { useVoiceRecorder } from '@/composables/useVoiceRecorder'
import { useAIEnhancer } from '@/composables/useAIEnhancer'

const moods = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '😢', label: 'Sad' },
  { emoji: '😠', label: 'Frustrated' },
  { emoji: '😐', label: 'Neutral' },
];

const selectedMood = ref(null);
const entryText = ref('');
const enhancedText = ref('');
const logs = ref([]);
const logsSection = ref(null);

const { isRecording, startRecording, stopRecording } = useVoiceRecorder(async (raw) => {
  enhancedText.value = await useAIEnhancer(raw);
  entryText.value = enhancedText.value;
})

function selectMood(mood) {
  selectedMood.value = mood;
}

function toggleRecording() {
  isRecording.value ? stopRecording() : startRecording();
}

async function saveEntry() {
  if (!entryText.value.trim() && !selectedMood.value) return;

  const entry = {
    id: crypto.randomUUID?.() || Date.now(),
    date: new Date().toLocaleString(),
    mood: selectedMood.value,
    text: entryText.value.trim(),
    timestamp: Date.now(),
  };

  await saveEntryToFirebase(entry);
  logs.value.unshift(entry);

  nextTick(() => {
    if (logsSection.value) {
      logsSection.value.scrollTop = 0;
    }
  });

  entryText.value = '';
  selectedMood.value = null;
  enhancedText.value = '';
}

onMounted(async () => {
  logs.value = await fetchEntries()
})
</script>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fade-in-delay {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.animate-fade-in {
  animation: fade-in 0.8s ease forwards;
}
.animate-fade-in-delay {
  animation: fade-in-delay 1.2s ease forwards;
}
.animate-slide-up {
  animation: slide-up 1s ease forwards;
}
</style>