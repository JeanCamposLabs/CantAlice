/**
 * Real-world example sentences — the "Reverso Context" idea: show a word inside
 * natural phrases, with their Portuguese translation.
 *
 * Best source is Tatoeba (a CC-licensed parallel corpus) via our Supabase
 * function, which returns sentences already paired with human translations.
 * When the backend isn't configured we fall back to the Wiktionary + Dictionary
 * APIs and translate the chosen sentence ourselves.
 */
import { translate } from './translate'
import { backendExamples, IS_TRANSLATE_BACKEND } from './backend'

const WIKTIONARY = 'https://en.wiktionary.org/api/rest_v1/page/definition'
const DICT_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en'

export interface Example {
  /** The example phrase in English. */
  text: string
  /** Its Portuguese translation. */
  translation: string
  source: 'tatoeba' | 'wiktionary' | 'dictionary'
}

const singleCache = new Map<string, Example | null>()

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function stripHtml(s: string): string {
  if (typeof DOMParser !== 'undefined') {
    return new DOMParser().parseFromString(s, 'text/html').body.textContent ?? ''
  }
  return s.replace(/<[^>]+>/g, '')
}

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

/** Rank candidate sentences: prefer ones using the word, complete, concise. */
function rankSentences(raw: string[], word: string): string[] {
  const re = new RegExp(`\\b${escapeRe(word.toLowerCase())}`, 'i')
  const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length
  const all = raw.flatMap(sentences)
  const usable = all.filter(
    (s) => re.test(s) && s.length >= 15 && s.length <= 140 && wordCount(s) >= 3,
  )
  const pool = usable.length ? usable : all.filter((s) => re.test(s) && wordCount(s) >= 2)
  return pool.sort((a, b) => {
    const pa = /[.!?]$/.test(a) ? 0 : 1
    const pb = /[.!?]$/.test(b) ? 0 : 1
    return pa - pb || a.length - b.length
  })
}

/**
 * A list of bilingual example phrases for a word/phrase — powers the Tradutor
 * tab. Tatoeba first (already bilingual), else Wiktionary/Dictionary translated.
 */
export async function fetchExamples(query: string, limit = 6): Promise<Example[]> {
  const q = query.trim()
  if (!q) return []

  if (IS_TRANSLATE_BACKEND) {
    const bi = await backendExamples(q, limit)
    if (bi.length) return bi.map((b) => ({ ...b, source: 'tatoeba' as const }))
  }

  const [wikt, dict] = await Promise.all([wiktionaryExamples(q), dictionaryExamples(q)])
  const ranked = rankSentences(wikt.length ? wikt : dict, q).slice(0, limit)
  const source: Example['source'] = wikt.length ? 'wiktionary' : 'dictionary'
  return Promise.all(
    ranked.map(async (text) => ({ text, translation: await translate(text, { premium: true }), source })),
  )
}

/** A single best example phrase for a saved word (used on review cards). */
export async function fetchExample(word: string): Promise<Example | null> {
  const key = word.trim().toLowerCase()
  if (!key) return null
  if (singleCache.has(key)) return singleCache.get(key)!

  const list = await fetchExamples(key, 5)
  const example = list[0] ?? null
  singleCache.set(key, example)
  return example
}
