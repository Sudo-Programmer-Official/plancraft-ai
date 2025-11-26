import { growthClient } from './http'

export interface LeaderLocation {
  id?: string
  type: 'event' | 'occasion' | 'issue' | 'contact' | string
  label: string
  lat: number
  lng: number
  refId?: string
  metadata?: Record<string, any>
}

const mapLocation = (raw: any): LeaderLocation => ({
  id: raw?.id || raw?._id || raw?.locationId,
  type: raw?.type || 'event',
  label: raw?.label || raw?.name || 'Location',
  lat: Number(raw?.lat ?? raw?.latitude ?? 0),
  lng: Number(raw?.lng ?? raw?.longitude ?? 0),
  refId: raw?.refId,
  metadata: raw?.metadata || raw,
})

export async function fetchLeaderLocations(): Promise<LeaderLocation[]> {
  const { data } = await growthClient.get('/leader/locations')
  return (data?.locations || []).map(mapLocation)
}
