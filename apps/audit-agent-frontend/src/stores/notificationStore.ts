import { defineStore } from 'pinia'
import { computed, reactive } from 'vue'

type RouteName =
  | 'team-feed'
  | 'team-projects'
  | 'team-boards'
  | 'team-tasks'
  | 'team-chat'
  | 'team-pulse'
  | 'team-meetings'
  | 'team-vault'
  | 'team-analytics'
  | 'team-automations'

interface BadgeState {
  [route: string]: number
}

export const channelRouteMap: Record<string, RouteName> = {
  feed: 'team-feed',
  task: 'team-tasks',
  tasks: 'team-tasks',
  chat: 'team-chat',
  message: 'team-chat',
  meeting: 'team-meetings',
  meetings: 'team-meetings',
  vault: 'team-vault',
  knowledge: 'team-vault',
  project: 'team-projects',
}

export const useNotificationStore = defineStore('notification', () => {
  const badges: BadgeState = reactive({})

  function increment(route: string, amount = 1) {
    if (!route) return
    badges[route] = (badges[route] || 0) + Math.max(1, amount)
  }

  function bumpChannel(channel: string, amount = 1) {
    const normalized = channel?.toLowerCase?.() || 'feed'
    const route = channelRouteMap[normalized] || 'team-feed'
    increment(route, amount)
  }

  function set(route: string, value: number) {
    if (!route) return
    badges[route] = Math.max(0, Math.round(value))
  }

  function clear(route: string) {
    if (!route) return
    badges[route] = 0
  }

  function clearByChannel(channel: string) {
    const route = channelRouteMap[channel?.toLowerCase?.() || ''] || null
    if (route) clear(route)
  }

  function resetAll() {
    Object.keys(badges).forEach((key) => {
      badges[key] = 0
    })
  }

  const totalUnread = computed(() =>
    Object.values(badges).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0),
  )

  return {
    badges,
    totalUnread,
    increment,
    bumpChannel,
    set,
    clear,
    clearByChannel,
    resetAll,
  }
})
