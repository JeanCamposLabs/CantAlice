/**
 * Speak a short English phrase aloud using the browser's Speech Synthesis.
 * Used to hear the pronunciation of saved words. Must be called from a user
 * gesture on iOS. No-ops gracefully where unsupported.
 */
export function speak(text: string, lang = 'en-US'): void {
  const clean = text.trim()
  if (!clean) return
  const synth = window.speechSynthesis
  if (!synth) return
  try {
    synth.cancel() // stop anything already speaking
    const utter = new SpeechSynthesisUtterance(clean)
    utter.lang = lang
    utter.rate = 0.92
    utter.pitch = 1
    // Prefer an English voice when one is available.
    const voices = synth.getVoices()
    const en = voices.find((v) => v.lang?.toLowerCase().startsWith('en'))
    if (en) utter.voice = en
    synth.speak(utter)
  } catch {
    /* unsupported — ignore */
  }
}

export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window
