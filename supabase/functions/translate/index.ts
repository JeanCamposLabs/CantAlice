// Supabase Edge Function: translation (DeepL) + bilingual example sentences
// (Tatoeba) for Canta, Alice.
//
// Why a function: DeepL has no browser CORS and its key must stay secret;
// Tatoeba (a CC-licensed parallel corpus, our open "Reverso Context") also has
// no CORS. Proxying both here keeps the key server-side and adds CORS.
//
// Deploy:
//   supabase secrets set DEEPL_API_KEY=xxxxxxxx-xxxx-...:fx   # free key ends in :fx
//   supabase functions deploy translate
//
// If DEEPL_API_KEY is unset the translate endpoint returns translations:null
// and the app falls back to its built-in Google/MyMemory translators.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const DEEPL_KEY = Deno.env.get('DEEPL_API_KEY') ?? ''

/** Translate English → Brazilian Portuguese with DeepL. Null if unavailable. */
async function deepl(texts: string[]): Promise<string[] | null> {
  if (!DEEPL_KEY || texts.length === 0) return null
  const host = DEEPL_KEY.endsWith(':fx') ? 'api-free.deepl.com' : 'api.deepl.com'
  const params = new URLSearchParams()
  for (const t of texts) params.append('text', t)
  params.append('source_lang', 'EN')
  params.append('target_lang', 'PT-BR')
  try {
    const res = await fetch(`https://${host}/v2/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${DEEPL_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })
    if (!res.ok) return null
    const data = (await res.json()) as { translations?: { text: string }[] }
    return (data.translations ?? []).map((t) => t.text)
  } catch {
    return null
  }
}

/** Real bilingual example sentences (EN + PT) from Tatoeba. */
async function tatoeba(query: string, limit: number): Promise<{ text: string; translation: string }[]> {
  const url =
    `https://tatoeba.org/en/api_v0/search?from=eng&to=por&sort=relevance` +
    `&trans_filter=limit&trans_to=por&query=${encodeURIComponent(query)}`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'CantAlice/1.0 (learning app)' } })
    if (!res.ok) return []
    const data = (await res.json()) as {
      results?: { text?: string; translations?: { lang?: string; text?: string }[][] }[]
    }
    const out: { text: string; translation: string }[] = []
    for (const r of data.results ?? []) {
      let pt = ''
      for (const group of r.translations ?? []) {
        for (const tr of group) {
          if (tr?.lang === 'por' && tr.text) {
            pt = tr.text
            break
          }
        }
        if (pt) break
      }
      if (r.text && pt) out.push({ text: r.text, translation: pt })
      if (out.length >= limit) break
    }
    return out
  } catch {
    return []
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const body = (await req.json().catch(() => ({}))) as {
      mode?: string
      text?: string
      texts?: string[]
      word?: string
      query?: string
      limit?: number
    }

    if (body.mode === 'translate') {
      const texts = body.texts ?? (body.text ? [body.text] : [])
      const translations = await deepl(texts)
      return json({ provider: translations ? 'deepl' : null, translations })
    }

    if (body.mode === 'examples') {
      const q = (body.word ?? body.query ?? '').toString().trim()
      if (!q) return json({ examples: [] })
      return json({ examples: await tatoeba(q, Math.min(body.limit ?? 6, 12)) })
    }

    return json({ error: 'unknown mode' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
