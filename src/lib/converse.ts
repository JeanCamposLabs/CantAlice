/**
 * Client for the `converse` Edge Function — the AI conversation partner.
 * Sends a typed message or a recorded audio clip plus the recent history, and
 * gets back a transcript, the tutor's reply, an optional pt-BR correction, and
 * the reply spoken as audio.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY, IS_CLOUD_CONFIGURED } from '../config'
import { getValidAccessToken } from '../spotify/auth'

export interface Turn {
  role: 'user' | 'assistant'
  content: string
}

export interface ConverseResult {
  transcript: string
  reply: string
  tip: string
  /** Base64 mp3 of the spoken reply, or null. */
  audio: string | null
}

export const IS_CONVERSE_CONFIGURED = IS_CLOUD_CONFIGURED

function endpoint(): string {
  return `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/converse`
}

export class ConverseError extends Error {
  constructor(public code: 'not_configured' | 'unauthorized' | 'failed') {
    super(code)
  }
}

export async function converse(input: {
  scenario?: string | null
  history: Turn[]
  text?: string
  audioBase64?: string
  audioMime?: string
}): Promise<ConverseResult> {
  const token = await getValidAccessToken()
  if (!token) throw new ConverseError('unauthorized')

  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'x-spotify-token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      scenario: input.scenario ?? null,
      history: input.history,
      text: input.text,
      audio: input.audioBase64,
      audioMime: input.audioMime,
    }),
  })

  if (res.status === 503) throw new ConverseError('not_configured')
  if (res.status === 401) throw new ConverseError('unauthorized')
  if (!res.ok) throw new ConverseError('failed')
  return (await res.json()) as ConverseResult
}

/** Read a recorded Blob as a bare base64 string (no data: prefix). */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/** Play a base64 mp3 returned by the function. Resolves when playback ends. */
export function playBase64Mp3(b64: string): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(`data:audio/mp3;base64,${b64}`)
    audio.onended = () => resolve()
    audio.onerror = () => resolve()
    void audio.play().catch(() => resolve())
  })
}
