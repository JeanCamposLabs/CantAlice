/**
 * Client for the Supabase `translate` Edge Function — DeepL translation and
 * Tatoeba bilingual example sentences. No-ops gracefully when Supabase isn't
 * configured (or the user isn't logged in to Spotify), so the app falls back
 * to its built-in providers.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY, IS_CLOUD_CONFIGURED } from '../config'
import { getValidAccessToken } from '../spotify/auth'
import { activeLang } from '../lib/lang'

/** The translation backend shares Supabase config with cloud sync. */
export const IS_TRANSLATE_BACKEND = IS_CLOUD_CONFIGURED

function endpoint(): string {
  return `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/translate`
}

/**
 * The function authenticates callers by their Spotify token (it spends paid
 * DeepL/Claude quota, so it can't be an open endpoint). Null when logged out.
 */
async function headers(): Promise<HeadersInit | null> {
  const token = await getValidAccessToken()
  if (!token) return null
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'x-spotify-token': token,
    'Content-Type': 'application/json',
  }
}

export interface BiExample {
  text: string
  translation: string
}

/** DeepL translation of one or more strings; null if unavailable. */
export async function backendTranslate(texts: string[]): Promise<string[] | null> {
  if (!IS_TRANSLATE_BACKEND || texts.length === 0) return null
  try {
    const h = await headers()
    if (!h) return null
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ mode: 'translate', texts, lang: activeLang() }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { translations?: string[] | null }
    return Array.isArray(data.translations) ? data.translations : null
  } catch {
    return null
  }
}

/** Real bilingual example sentences for a word/phrase, from Tatoeba. */
export async function backendExamples(query: string, limit = 6): Promise<BiExample[]> {
  if (!IS_TRANSLATE_BACKEND) return []
  try {
    const h = await headers()
    if (!h) return []
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ mode: 'examples', word: query, limit, lang: activeLang() }),
    })
    if (!res.ok) return []
    const data = (await res.json()) as { examples?: BiExample[] }
    return Array.isArray(data.examples) ? data.examples : []
  } catch {
    return []
  }
}
