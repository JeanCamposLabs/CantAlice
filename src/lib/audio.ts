/**
 * Playback of server-synthesized speech (the base64 mp3 clips returned by the
 * `converse` Edge Function). One voice at a time: starting a clip stops the
 * previous one and any browser TTS, so replies and replays never talk over
 * each other.
 */

let current: HTMLAudioElement | null = null

/** Stop whatever synthesized clip is playing (no-op when nothing is). */
export function stopSpokenAudio(): void {
  if (current) {
    current.pause()
    current = null
  }
}

/** Play a base64 mp3 returned by the function. Resolves when playback ends. */
export function playBase64Mp3(b64: string): Promise<void> {
  return new Promise((resolve) => {
    stopSpokenAudio()
    // Also silence the browser voice, so the clip never overlaps with TTS.
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
    const audio = new Audio(`data:audio/mp3;base64,${b64}`)
    current = audio
    const done = () => {
      if (current === audio) current = null
      resolve()
    }
    audio.onended = done
    audio.onerror = done
    void audio.play().catch(done)
  })
}
