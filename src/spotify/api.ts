/**
 * Thin wrapper around the Spotify Web API endpoints we use.
 * All calls go through `spotifyFetch`, which injects a fresh access token.
 */
import { getValidAccessToken } from './auth'

const API = 'https://api.spotify.com/v1'

export interface SpotifyArtist {
  id: string
  name: string
}

export interface SpotifyImage {
  url: string
  width: number | null
  height: number | null
}

export interface SpotifyTrack {
  id: string
  uri: string
  name: string
  durationMs: number
  artists: SpotifyArtist[]
  album: {
    name: string
    images: SpotifyImage[]
  }
  previewUrl: string | null
}

export interface SpotifyUser {
  id: string
  displayName: string | null
  imageUrl: string | null
  product: string | null // "premium" | "free" | ...
}

async function spotifyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getValidAccessToken()
  if (!token) throw new Error('NOT_AUTHENTICATED')

  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (res.status === 204) return undefined as T
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Spotify API ${res.status}: ${text}`)
  }
  // Some endpoints (play/pause) return empty bodies.
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

interface RawTrack {
  id: string
  uri: string
  name: string
  duration_ms: number
  preview_url: string | null
  artists: { id: string; name: string }[]
  album: { name: string; images: SpotifyImage[] }
}

function mapTrack(t: RawTrack): SpotifyTrack {
  return {
    id: t.id,
    uri: t.uri,
    name: t.name,
    durationMs: t.duration_ms,
    previewUrl: t.preview_url,
    artists: t.artists.map((a) => ({ id: a.id, name: a.name })),
    album: { name: t.album.name, images: t.album.images },
  }
}

// Some Spotify accounts/tokens reject the `limit` query param on /search with
// "Invalid limit" (HTTP 400), even for in-range values. Once we see that, we
// stop sending `limit` for the rest of the session (Spotify defaults to 20).
let searchLimitRejected = false

export async function searchTracks(query: string, limit = 24): Promise<SpotifyTrack[]> {
  if (!query.trim()) return []
  const safeLimit = Math.min(50, Math.max(1, Math.trunc(limit)))

  const buildParams = (withLimit: boolean) => {
    const qs = new URLSearchParams({ q: query.trim(), type: 'track' })
    if (withLimit) qs.set('limit', String(safeLimit))
    return qs
  }

  const run = async (withLimit: boolean) => {
    const data = await spotifyFetch<{ tracks: { items: RawTrack[] } }>(
      `/search?${buildParams(withLimit)}`,
    )
    return data.tracks.items.map(mapTrack)
  }

  try {
    return await run(!searchLimitRejected)
  } catch (e) {
    if (!searchLimitRejected && /invalid limit/i.test((e as Error).message)) {
      searchLimitRejected = true
      return run(false)
    }
    throw e
  }
}

export async function getTrack(id: string): Promise<SpotifyTrack> {
  const data = await spotifyFetch<RawTrack>(`/tracks/${id}`)
  return mapTrack(data)
}

export async function getCurrentUser(): Promise<SpotifyUser> {
  const data = await spotifyFetch<{
    id: string
    display_name: string | null
    images: SpotifyImage[]
    product: string | null
  }>('/me')
  return {
    id: data.id,
    displayName: data.display_name,
    imageUrl: data.images?.[0]?.url ?? null,
    product: data.product,
  }
}

/** Move playback to our Web Playback SDK device and (optionally) start a track. */
export async function transferPlayback(deviceId: string, play = false): Promise<void> {
  await spotifyFetch('/me/player', {
    method: 'PUT',
    body: JSON.stringify({ device_ids: [deviceId], play }),
  })
}

export async function playTrack(deviceId: string, uri: string, positionMs = 0): Promise<void> {
  const params = new URLSearchParams({ device_id: deviceId })
  await spotifyFetch(`/me/player/play?${params}`, {
    method: 'PUT',
    body: JSON.stringify({ uris: [uri], position_ms: positionMs }),
  })
}

export async function pausePlayback(deviceId: string): Promise<void> {
  const params = new URLSearchParams({ device_id: deviceId })
  await spotifyFetch(`/me/player/pause?${params}`, { method: 'PUT' })
}

export async function resumePlayback(deviceId: string): Promise<void> {
  const params = new URLSearchParams({ device_id: deviceId })
  await spotifyFetch(`/me/player/play?${params}`, { method: 'PUT' })
}

export async function seek(deviceId: string, positionMs: number): Promise<void> {
  const params = new URLSearchParams({
    device_id: deviceId,
    position_ms: String(Math.max(0, Math.round(positionMs))),
  })
  await spotifyFetch(`/me/player/seek?${params}`, { method: 'PUT' })
}
