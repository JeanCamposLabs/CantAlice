/**
 * Playback of server-synthesized speech (the base64 mp3 clips returned by the
 * `converse` Edge Function). One voice at a time: starting a clip stops the
 * previous one and any browser TTS, so replies and replays never talk over
 * each other.
 */

let current: { audio: HTMLAudioElement; settle: () => void } | null = null

/** Stop whatever synthesized clip is playing (no-op when nothing is). */
export function stopSpokenAudio(): void {
  if (current) {
    const { audio, settle } = current
    current = null
    audio.pause()
    // Keep the promise contract: an interrupted clip still settles, so a
    // caller awaiting "play, then …" can never hang on a replaced clip.
    settle()
  }
}

/** Play a base64 mp3 returned by the function. Resolves when playback ends
 * (or when the clip is replaced/stopped). */
export function playBase64Mp3(b64: string): Promise<void> {
  return new Promise((resolve) => {
    stopSpokenAudio()
    // Also silence the browser voice, so the clip never overlaps with TTS.
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    const audio = new Audio(`data:audio/mp3;base64,${b64}`)
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      if (current?.audio === audio) current = null
      resolve()
    }
    current = { audio, settle: done }
    audio.onended = done
    audio.onerror = done
    void audio.play().catch(done)
  })
}
