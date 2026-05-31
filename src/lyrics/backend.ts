/**
 * Client for the Supabase `translate` Edge Function — DeepL translation and
 * Tatoeba bilingual example sentences. No-ops gracefully when Supabase isn't
 * configured, so the app falls back to its built-in providers.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY, IS_CLOUD_CONFIGURED } from '../config'

/** The translation backend shares Supabase config with cloud sync. */
export const IS_TRANSLATE_BACKEND = IS_CLOUD_CONFIGURED

function endpoint(): string {
  return `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/translate`
}

function headers(): HeadersInit {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
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
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ mode: 'translate', texts }),
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
    const res = await fetch(endpoint(), {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ mode: 'examples', word: query, limit }),
    })
    if (!res.ok) return []
    const data = (await res.json()) as { examples?: BiExample[] }
    return Array.isArray(data.examples) ? data.examples : []
  } catch {
    return []
  }
}
