import { langConfig } from './lang'

/**
 * Speak a short phrase aloud using the browser's Speech Synthesis, in the
 * user's target language (English/Spanish) by default. Must be called from a
 * user gesture on iOS. No-ops gracefully where unsupported.
 */
export function speak(text: string, lang?: string): void {
  const clean = text.trim()
  if (!clean) return
  const synth = window.speechSynthesis
  if (!synth) return
  const locale = lang ?? langConfig().speech
  try {
    synth.cancel() // stop anything already speaking
    const utter = new SpeechSynthesisUtterance(clean)
    utter.lang = locale
    utter.rate = 0.92
    utter.pitch = 1
    // Prefer a voice matching the target language when one is available.
    const prefix = locale.slice(0, 2).toLowerCase()
    const voices = synth.getVoices()
    const match = voices.find((v) => v.lang?.toLowerCase().startsWith(prefix))
    if (match) utter.voice = match
    synth.speak(utter)
  } catch {
    /* unsupported — ignore */
  }
}

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

/**
 * Like speak(), but returns a Promise that resolves when the utterance ends.
 * Falls back to a word-count ceiling so it always resolves on mobile where
 * the speechSynthesis `onend` event is unreliable.
 */
export function speakAndWait(text: string, lang?: string): Promise<void> {
  return new Promise((resolve) => {
    const clean = text.trim()
    if (!clean) { resolve(); return }
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null
    if (!synth) { resolve(); return }
    const locale = lang ?? langConfig().speech
    try {
      synth.cancel()
      const utter = new SpeechSynthesisUtterance(clean)
      utter.lang = locale
      utter.rate = 0.92
      utter.pitch = 1
      const prefix = locale.slice(0, 2).toLowerCase()
      const voices = synth.getVoices()
      const match = voices.find((v) => v.lang?.toLowerCase().startsWith(prefix))
      if (match) utter.voice = match
      // ~120ms per word + 1.2s padding keeps us from hanging on mobile
      const wordCount = clean.split(/\s+/).length
      const ceiling = setTimeout(resolve, wordCount * 120 + 1200)
      utter.onend = () => { clearTimeout(ceiling); resolve() }
      utter.onerror = () => { clearTimeout(ceiling); resolve() }
      synth.speak(utter)
    } catch {
      resolve()
    }
  })
}
