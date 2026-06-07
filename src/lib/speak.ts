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
