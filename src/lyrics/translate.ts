/**
 * English → Portuguese (pt-BR) translation.
 *
 * Primary provider is Google's free, CORS-friendly, no-key endpoint, which is
 * markedly more accurate than the alternatives (correct word senses, natural
 * sentences). MyMemory is kept as a fallback for the rare case Google fails.
 *
 * We cache aggressively in memory + localStorage because lyric lines and
 * vocabulary words repeat constantly.
 */
import { TRANSLATE_BASE } from '../config'

const GOOGLE_BASE = 'https://translate.googleapis.com/translate_a/single'

/** Google's free endpoint — best quality, no key, CORS-enabled. */
async function googleTranslate(text: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ client: 'gtx', sl: 'en', tl: 'pt', dt: 't', q: text })
    const res = await fetch(`${GOOGLE_BASE}?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    // Shape: [ [ [translatedSegment, originalSegment, …], … ], … ]. Join all
    // segments so long lyric lines (which Google splits) come back whole.
    if (!Array.isArray(data) || !Array.isArray(data[0])) return null
    const out = data[0]
      .map((seg: unknown) => (Array.isArray(seg) ? (seg[0] as string) : ''))
      .join('')
      .trim()
    return out || null
  } catch {
    return null
  }
}

/** MyMemory fallback — free, but lower quality; used only if Google fails. */
async function myMemoryTranslate(text: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ q: text, langpair: 'en|pt-BR' })
    const res = await fetch(`${TRANSLATE_BASE}?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    const out: string = data?.responseData?.translatedText ?? ''
    // MyMemory returns ALL-CAPS in-band warnings/quota notices in this field.
    const looksLikeWarning =
      !out ||
      data?.responseStatus === 403 ||
      /PLEASE SELECT|MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(out)
    return looksLikeWarning ? null : out
  } catch {
    return null
  }
}

const MEMORY = new Map<string, string>()
// Bumped to :v2 when switching to Google so old, lower-quality MyMemory
// translations are discarded and rebuilt with the better provider.
const LS_KEY = 'canta-alice:translations:v2'

function loadCache(): void {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const obj = JSON.parse(raw) as Record<string, string>
      for (const [k, v] of Object.entries(obj)) MEMORY.set(k, v)
    }
  } catch {
    /* ignore */
  }
}
loadCache()

let saveTimer: number | undefined
function persist(): void {
  clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    try {
      // Keep the cache bounded.
      const entries = [...MEMORY.entries()].slice(-2000)
      localStorage.setItem(LS_KEY, JSON.stringify(Object.fromEntries(entries)))
    } catch {
      /* storage full — ignore */
    }
  }, 600)
}

/** Translate a single English string to Portuguese (pt-BR). */
export async function translate(text: string): Promise<string> {
  const clean = text.trim()
  if (!clean) return ''
  const key = clean.toLowerCase()
  const cached = MEMORY.get(key)
  if (cached !== undefined) return cached

  // Google first (best quality), then MyMemory.
  const translated = (await googleTranslate(clean)) ?? (await myMemoryTranslate(clean))
  if (translated) {
    MEMORY.set(key, translated)
    persist()
    return translated
  }
  // Both failed — echo the input but don't cache it, so we retry next time.
  return clean
}

/** Translate many lines, lightly throttled to stay friendly to the API. */
export async function translateMany(texts: string[]): Promise<string[]> {
  const out: string[] = []
  for (const t of texts) {
    const wasCached = MEMORY.has(t.trim().toLowerCase())
    out.push(await translate(t))
    // Small gap between uncached (network) requests; cached ones are instant.
    if (!wasCached) {
      await new Promise((r) => setTimeout(r, 120))
    }
  }
  return out
}
