/**
 * Cloud progress storage via a Supabase Edge Function.
 *
 * The function authenticates the caller by their Spotify access token (it calls
 * Spotify /me to resolve the user id), so each user can only read/write their
 * own row. We still send the public Supabase anon/publishable key in the
 * standard API headers, while the Spotify token travels in a custom header.
 *
 * No-ops gracefully when cloud sync isn't configured.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY, IS_CLOUD_CONFIGURED } from '../config'

function endpoint(): string {
  return `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/progress`
}

function headers(spotifyToken: string): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'x-spotify-token': spotifyToken,
    'Content-Type': 'application/json',
  }
}

/** Fetch the stored progress blob for the current user, or null. */
export async function cloudGet<T = unknown>(spotifyToken: string): Promise<T | null> {
  if (!IS_CLOUD_CONFIGURED) return null
  const res = await fetch(endpoint(), { method: 'GET', headers: headers(spotifyToken) })
  if (!res.ok) throw new Error(`cloudGet ${res.status}`)
  const json = (await res.json()) as { data: T | null }
  return json.data ?? null
}

/** Persist the progress blob for the current user. */
export async function cloudSet(spotifyToken: string, data: unknown): Promise<void> {
  if (!IS_CLOUD_CONFIGURED) return
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: headers(spotifyToken),
    body: JSON.stringify({ data }),
  })
  if (!res.ok) throw new Error(`cloudSet ${res.status}`)
}
