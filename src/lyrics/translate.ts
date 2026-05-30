/**
 * English → Portuguese translation via MyMemory — a free, CORS-friendly,
 * no-key translation API (with a generous anonymous daily quota).
 *
 * We cache aggressively in memory + localStorage because lyric lines and
 * vocabulary words repeat constantly, and the quota is per-day.
 */
import { TRANSLATE_BASE } from '../config'

const MEMORY = new Map<string, string>()
const LS_KEY = 'canta-alice:translations'

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

  try {
    const params = new URLSearchParams({
      q: clean,
      langpair: 'en|pt-BR',
    })
    const res = await fetch(`${TRANSLATE_BASE}?${params}`)
    if (!res.ok) throw new Error('translate failed')
    const data = await res.json()
    const out: string = data?.responseData?.translatedText ?? ''
    // Guard against MyMemory's in-band warning/quota messages, which arrive as
    // ALL-CAPS notices in the "translatedText" field rather than as errors.
    const looksLikeWarning =
      !out ||
      data?.responseStatus === 403 ||
      /PLEASE SELECT|MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(out)
    const result = looksLikeWarning ? clean : out
    MEMORY.set(key, result)
    persist()
    return result
  } catch {
    return clean
  }
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
