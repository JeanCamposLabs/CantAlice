import { langConfig } from './lang'
import { stopSpokenAudio } from './audio'

/**
 * Speech synthesis for short phrases, in the user's target language
 * (English/Spanish) by default. Must be called from a user gesture on iOS.
 * No-ops gracefully where unsupported.
 */

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

/** Build a ready-to-speak utterance, preferring a voice in the target locale. */
function makeUtterance(text: string, lang?: string): SpeechSynthesisUtterance {
  const locale = lang ?? langConfig().speech
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = locale
  utter.rate = 0.92
  utter.pitch = 1
  const prefix = locale.slice(0, 2).toLowerCase()
  const match = window.speechSynthesis
    .getVoices()
    .find((v) => v.lang?.toLowerCase().startsWith(prefix))
  if (match) utter.voice = match
  return utter
}

/** Speak a short phrase aloud, cancelling anything already speaking. */
export function speak(text: string, lang?: string): void {
  const clean = text.trim()
  if (!clean) return
  const synth = window.speechSynthesis
  if (!synth) return
  try {
    stopSpokenAudio() // never talk over a cloud-voice clip
    synth.cancel() // stop anything already speaking
    synth.speak(makeUtterance(clean, lang))
  } catch {
    /* unsupported — ignore */
  }
}

/**
 * Like speak(), but returns a Promise that resolves when the utterance ends.
 * Falls back to a word-count ceiling so it always resolves on mobile where
 * the speechSynthesis `onend` event is unreliable. The ceiling is generous —
 * at rate 0.92 speech runs at roughly 350 ms per word, and resolving early
 * would let the next step start while the voice is still talking.
 */
export function speakAndWait(text: string, lang?: string): Promise<void> {
  return new Promise((resolve) => {
    const clean = text.trim()
    if (!clean) { resolve(); return }
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
    if (!synth) { resolve(); return }
    try {
      stopSpokenAudio()
      synth.cancel()
      const utter = makeUtterance(clean, lang)
      const wordCount = clean.split(/\s+/).length
      const ceiling = setTimeout(resolve, wordCount * 450 + 2000)
      utter.onend = () => { clearTimeout(ceiling); resolve() }
      utter.onerror = () => { clearTimeout(ceiling); resolve() }
      synth.speak(utter)
    } catch {
      resolve()
    }
  })
}
