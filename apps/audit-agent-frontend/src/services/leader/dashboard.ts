import { growthClient, postingClient } from './http'

export async function fetchEventsStats() {
  const { data } = await growthClient.get('/leader/events/stats')
  return data
}

export async function fetchUpcomingOccasions() {
  const { data } = await growthClient.get('/leader/occasions/upcoming')
  return data
}

export async function fetchMessagesStats() {
  const { data } = await postingClient.get('/messages/stats')
  return data
}

export async function fetchRecentIssues() {
  const { data } = await growthClient.get('/leader/issues/recent')
  return data
}

export async function fetchLeaderSummary() {
  const { data } = await growthClient.get('/leader/overview/stats')
  return data?.stats || data?.overview || data
}

export async function fetchDashboardSnapshot() {
  const [events, occasions, messages, issues, summary] = await Promise.allSettled([
    fetchEventsStats(),
    fetchUpcomingOccasions(),
    fetchMessagesStats(),
    fetchRecentIssues(),
    fetchLeaderSummary(),
  ])

  const pick = (res: PromiseSettledResult<any>) => (res.status === 'fulfilled' ? res.value : null)

  return {
    events: pick(events),
    occasions: pick(occasions),
    messages: pick(messages),
    issues: pick(issues),
    summary: pick(summary),
  }
}
