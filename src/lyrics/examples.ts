/**
 * Real-world example sentences — the "Reverso Context" idea: show a saved word
 * inside a natural phrase, not on its own, and *not* the song's own lyric line.
 *
 * We gather candidate sentences from two free, CORS-friendly sources — the
 * Wiktionary REST API (broad coverage of usage examples) and the Dictionary API
 * (dictionaryapi.dev) — pick the cleanest real sentence that uses the word, and
 * translate it to Portuguese. If neither has anything usable we return null and
 * the card simply shows the word + translation.
 */
import { translate } from './translate'

const WIKTIONARY = 'https://en.wiktionary.org/api/rest_v1/page/definition'
const DICT_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en'

export interface Example {
  /** The example phrase in English. */
  text: string
  /** Its Portuguese translation. */
  translation: string
  source: 'wiktionary' | 'dictionary'
}

const cache = new Map<string, Example | null>()

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Strip HTML (Wiktionary examples arrive as markup) down to plain text. */
function stripHtml(s: string): string {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(s, 'text/html').body.textContent ?? ''
  }
  return s.replace(/<[^>]+>/g, '')
}

/** Split a possibly multi-sentence example into individual sentences. */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

async function wiktionaryExamples(word: string): Promise<string[]> {
  try {
    const res = await fetch(`${WIKTIONARY}/${encodeURIComponent(word)}`)
    if (!res.ok) return []
    const data = (await res.json()) as Record<
      string,
      { definitions?: { examples?: string[]; parsedExamples?: { example?: string }[] }[] }[]
    >
    const out: string[] = []
    for (const def of data.en ?? []) {
      for (const d of def.definitions ?? []) {
        for (const pe of d.parsedExamples ?? []) if (pe.example) out.push(stripHtml(pe.example))
        for (const e of d.examples ?? []) out.push(stripHtml(e))
      }
    }
    return out
  } catch {
    return []
  }
}

async function dictionaryExamples(word: string): Promise<string[]> {
  try {
    const res = await fetch(`${DICT_BASE}/${encodeURIComponent(word)}`)
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    const out: string[] = []
    for (const entry of data) {
      for (const m of (entry?.meanings ?? []) as { definitions?: { example?: string }[] }[]) {
        for (const d of m.definitions ?? []) if (d.example) out.push(d.example)
      }
    }
    return out
  } catch {
    return []
  }
}

/** Choose the best real sentence that actually uses the word. */
function pickExample(raw: string[], word: string): string | null {
  const re = new RegExp(`\\b${escapeRe(word.toLowerCase())}`, 'i')
  const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length
  const all = raw.flatMap(sentences)
  const usable = all.filter(
    (s) => re.test(s) && s.length >= 15 && s.length <= 140 && wordCount(s) >= 3,
  )
  const pool = usable.length ? usable : all.filter((s) => re.test(s) && wordCount(s) >= 2)
  if (!pool.length) return null
  // Prefer a complete sentence (ends with punctuation), then the shortest.
  pool.sort((a, b) => {
    const pa = /[.!?]$/.test(a) ? 0 : 1
    const pb = /[.!?]$/.test(b) ? 0 : 1
    return pa - pb || a.length - b.length
  })
  return pool[0]
}

/** Fetch an example phrase for `word` (+ its Portuguese translation). */
export async function fetchExample(word: string): Promise<Example | null> {
  const key = word.trim().toLowerCase()
  if (!key) return null
  if (cache.has(key)) return cache.get(key)!

  const [wikt, dict] = await Promise.all([wiktionaryExamples(key), dictionaryExamples(key)])
  // Wiktionary first — its examples tend to be the most natural; dictionary as
  // a complement so we still find something when Wiktionary is sparse.
  const text = pickExample(wikt, key) ?? pickExample(dict, key)

  if (!text) {
    cache.set(key, null)
    return null
  }

  const source: Example['source'] = pickExample(wikt, key) ? 'wiktionary' : 'dictionary'
  const translation = await translate(text)
  const example: Example = { text, translation, source }
  cache.set(key, example)
  return example
}
