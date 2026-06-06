// Supabase Edge Function: AI conversation partner for Canta, Alice.
//
// One turn of spoken conversation in a single call:
//   (optional) audio  --Whisper-->  transcript
//   transcript + history  --Claude-->  short in-character reply + gentle tip
//   reply  --OpenAI TTS-->  natural mp3 audio
//
// Auth: like `progress`, the caller proves identity with their Spotify access
// token (x-spotify-token) so this isn't an open, abusable endpoint.
//
// Secrets:  supabase secrets set ANTHROPIC_API_KEY=... OPENAI_API_KEY=...
// Deploy:   supabase functions deploy converse   (verify_jwt off via config.toml)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-spotify-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const OPENAI_KEY = Deno.env.get('OPENAI_API_KEY') ?? ''
const CHAT_MODEL = 'claude-haiku-4-5-20251001'

interface Turn {
  role: 'user' | 'assistant'
  content: string
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}

/** Transcribe a spoken clip (English) with OpenAI Whisper. */
async function transcribe(audioB64: string, mime: string): Promise<string> {
  const bytes = base64ToBytes(audioB64)
  const ext = mime.includes('mp4') ? 'mp4' : mime.includes('ogg') ? 'ogg' : 'webm'
  const form = new FormData()
  form.append('file', new File([bytes], `clip.${ext}`, { type: mime || 'audio/webm' }))
  form.append('model', 'whisper-1')
  form.append('language', 'en')
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_KEY}` },
    body: form,
  })
  if (!res.ok) throw new Error(`whisper ${res.status}`)
  const data = (await res.json()) as { text?: string }
  return (data.text ?? '').trim()
}

/** Get the tutor's reply (+ optional pt-BR correction) from Claude. */
async function chat(scenario: string | null, history: Turn[], userText: string) {
  const system =
    `You are a warm, patient English conversation partner for a Brazilian Portuguese ` +
    `speaker practising everyday spoken English (easy–intermediate level).` +
    (scenario ? ` Role-play this situation: ${scenario}.` : ' Have a friendly free chat.') +
    ` Rules: reply ONLY in English; keep it to 1–2 short, natural sentences; always end ` +
    `with a simple question to keep the conversation going. If the learner's last message ` +
    `had a noticeable English mistake, briefly note the correction in Brazilian Portuguese.` +
    ` Respond as strict JSON: {"reply": string, "tip": string}. "tip" is the pt-BR ` +
    `correction or "" if there was nothing worth correcting. No markdown, JSON only.`

  const messages = [...history.slice(-12), { role: 'user' as const, content: userText }]
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: CHAT_MODEL, max_tokens: 300, system, messages }),
  })
  if (!res.ok) throw new Error(`anthropic ${res.status}`)
  const data = (await res.json()) as { content?: { text?: string }[] }
  const raw = data.content?.[0]?.text ?? ''
  // Parse the JSON object, tolerating any stray text around it.
  try {
    const slice = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
    const parsed = JSON.parse(slice) as { reply?: string; tip?: string }
    return { reply: (parsed.reply ?? '').trim() || raw.trim(), tip: (parsed.tip ?? '').trim() }
  } catch {
    return { reply: raw.trim(), tip: '' }
  }
}

/** Synthesize the reply to natural speech (mp3, base64) with OpenAI TTS. */
async function speak(text: string, voice: string): Promise<string | null> {
  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'tts-1',
        voice: voice || 'nova',
        input: text,
        response_format: 'mp3',
      }),
    })
    if (!res.ok) return null
    return bytesToBase64(new Uint8Array(await res.arrayBuffer()))
  } catch {
    return null
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  if (!ANTHROPIC_KEY || !OPENAI_KEY) {
    return json({ error: 'not_configured' }, 503)
  }

  try {
    // Gate by Spotify identity (same model as `progress`).
    const spotifyToken = req.headers.get('x-spotify-token')
    if (!spotifyToken) return json({ error: 'missing spotify token' }, 401)
    const me = await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${spotifyToken}` },
    })
    if (!me.ok) return json({ error: 'invalid spotify token' }, 401)

    const body = (await req.json().catch(() => ({}))) as {
      scenario?: string | null
      history?: Turn[]
      text?: string
      audio?: string
      audioMime?: string
      voice?: string
      speak?: boolean
    }

    // 1) Resolve the user's utterance (speech or typed text).
    let userText = (body.text ?? '').trim()
    if (!userText && body.audio) {
      userText = await transcribe(body.audio, body.audioMime ?? 'audio/webm')
    }
    if (!userText) return json({ error: 'empty input' }, 400)

    // 2) Tutor reply.
    const { reply, tip } = await chat(body.scenario ?? null, body.history ?? [], userText)

    // 3) Voice the reply (unless the client opted out).
    const audio = body.speak === false ? null : await speak(reply, body.voice ?? 'nova')

    return json({ transcript: userText, reply, tip, audio })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
