/**
 * Microphone recording, for browsers without SpeechRecognition (and for the
 * Portuguese half of "modo espelho", where the clip goes to Whisper instead).
 *
 * Kept deliberately small: start recording, get a stop() that resolves with the
 * clip and always releases the mic.
 */

export const canRecord =
  typeof navigator !== 'undefined' &&
  Boolean(navigator.mediaDevices?.getUserMedia) &&
  typeof MediaRecorder !== 'undefined'

export interface Clip {
  blob: Blob
  mime: string
}

export interface Recorder {
  /** Stop and resolve with the clip, or null if nothing was captured. */
  stop: () => Promise<Clip | null>
  /** Stop and throw the clip away (still releases the mic). */
  cancel: () => void
}

/** Ask for the mic and start recording. Rejects if permission is denied. */
export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const recorder = new MediaRecorder(stream)
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data)
  }
  recorder.start()

  // Releasing the tracks is what turns the browser's "recording" indicator off.
  const release = () => stream.getTracks().forEach((t) => t.stop())

  return {
    stop: () =>
      new Promise<Clip | null>((resolve) => {
        if (recorder.state === 'inactive') {
          release()
          resolve(null)
          return
        }
        recorder.onstop = () => {
          release()
          const mime = recorder.mimeType || 'audio/webm'
          const blob = new Blob(chunks, { type: mime })
          resolve(blob.size > 0 ? { blob, mime } : null)
        }
        try {
          recorder.stop()
        } catch {
          release()
          resolve(null)
        }
      }),
    cancel: () => {
      try {
        if (recorder.state !== 'inactive') recorder.stop()
      } catch {
        /* already stopped */
      }
      release()
    },
  }
}
