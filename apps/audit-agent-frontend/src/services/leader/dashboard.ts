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

const mapLeaderSummary = (data: any) => data?.stats || data?.overview || data

export async function fetchLeaderSummary() {
  try {
    // Prefer the broader /overview route to avoid 404s on older deployments
    const { data } = await growthClient.get('/leader/overview')
    return mapLeaderSummary(data)
  } catch (error: any) {
    // Fallback: some deployments expose only /leader/overview/stats
    if (error?.response?.status === 404) {
      const { data } = await growthClient.get('/leader/overview/stats')
      return mapLeaderSummary(data)
    }
    throw error
  }
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
