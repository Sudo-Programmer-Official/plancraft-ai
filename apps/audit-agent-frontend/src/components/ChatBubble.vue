<template>
  <div
    :class="[
      'chat-row flex items-end gap-3 w-full',
      isUser ? 'justify-end' : 'justify-start',
    ]"
  >
    <div v-if="!isUser" class="avatar flex-shrink-0">
      <div class="assistant-avatar" aria-hidden="true"></div>
    </div>

    <div
      :class="[
        'bubble max-w-[80%] sm:max-w-[70%] px-4 py-3 rounded-3xl shadow-lg space-y-2',
        isUser ? 'bubble-user' : 'bubble-assistant',
      ]"
    >
      <p class="text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-slate-100">
        <span v-if="typing" class="typing-dots" aria-label="Assistant is typing">
          <span></span>
          <span></span>
          <span></span>
        </span>
        <span v-else>{{ text }}</span>
      </p>

      <div
        v-if="hasActions"
        class="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10"
      >
        <button
          v-for="action in actions"
          :key="action.id"
          class="action-chip text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200"
          :class="[
            action.status === 'completed'
              ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40'
              : action.status === 'error'
                ? 'bg-red-500/20 text-red-200 border border-red-500/40'
                : 'bg-indigo-500/20 text-indigo-100 hover:bg-indigo-600/30 border border-indigo-500/40',
            action.status === 'pending' ? 'cursor-pointer' : 'cursor-default',
          ]"
          :disabled="action.status !== 'pending'"
          :title="action.message || action.label || prettifyType(action.type)"
          @click="$emit('action', action)"
        >
          <span v-if="action.status === 'completed'">✅</span>
          <span v-else-if="action.status === 'error'">⚠️</span>
          <span v-else>⚡️</span>
          <span class="ml-1">{{ action.label || prettifyType(action.type) }}</span>
        </button>
      </div>
    </div>

    <div v-if="isUser" class="avatar flex-shrink-0">
      <div class="user-avatar" :title="name || 'You'">
        {{ userInitial }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  sender: {
    type: String,
    default: 'assistant',
  },
  text: {
    type: String,
    default: '',
  },
  typing: {
    type: Boolean,
    default: false,
  },
  actions: {
    type: Array,
    default: () => [],
  },
  name: {
    type: String,
    default: '',
  },
})

defineEmits(['action'])

const isUser = computed(() => props.sender === 'user')
const hasActions = computed(() => Array.isArray(props.actions) && props.actions.length > 0)
const userInitial = computed(() => {
  if (!props.name) return '🙂'
  return props.name.trim().charAt(0).toUpperCase()
})

function prettifyType(type) {
  if (!type) return 'Run Action'
  return String(type)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
</script>

<style scoped>
.assistant-avatar {
  width: 42px;
  height: 42px;
  border-radius: 9999px;
  background: radial-gradient(circle at 30% 30%, rgba(129, 140, 248, 0.9), rgba(59, 130, 246, 0.5));
  box-shadow:
    0 0 18px rgba(99, 102, 241, 0.65),
    inset 0 0 12px rgba(56, 189, 248, 0.35);
  animation: pulse-glow 3.2s ease-in-out infinite;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 9999px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.85), rgba(167, 139, 250, 0.85));
  color: white;
  font-weight: 600;
  box-shadow:
    0 4px 14px rgba(236, 72, 153, 0.35),
    inset 0 0 8px rgba(255, 255, 255, 0.25);
}

.bubble-assistant {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.75), rgba(168, 85, 247, 0.65));
  border: 1px solid rgba(129, 140, 248, 0.35);
}

.bubble-user {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.85), rgba(14, 165, 233, 0.65));
  border: 1px solid rgba(249, 168, 212, 0.4);
}

.typing-dots {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.typing-dots span {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background-color: rgba(241, 245, 249, 0.85);
  animation: bounce 1.2s infinite ease-in-out;
}

.typing-dots span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dots span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: translateY(0);
    opacity: 0.7;
  }
  40% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

@keyframes pulse-glow {
  0%, 100% {
    transform: scale(1);
    box-shadow:
      0 0 18px rgba(99, 102, 241, 0.6),
      inset 0 0 10px rgba(56, 189, 248, 0.35);
  }
  50% {
    transform: scale(1.04);
    box-shadow:
      0 0 28px rgba(129, 140, 248, 0.8),
      inset 0 0 18px rgba(59, 130, 246, 0.45);
  }
}
</style>
