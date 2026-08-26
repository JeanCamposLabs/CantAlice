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

/**
 * True for an app installed on the iPhone/iPad home screen.
 *
 * Worth singling out: Safari ships SpeechRecognition there but often refuses to
 * run it, and the site never appears under Ajustes → Safari → Microfone — so
 * "give the app permission" is advice that can't be followed. Opening the site
 * in Safari itself is the way out.
 */
export function isIosWebApp(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  // iPadOS reports itself as a Mac, so check for touch as well.
  const isApple = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  return isApple && Boolean(standalone)
}

/**
 * The right "mic is blocked" advice for this device. Shared by the composers
 * so the iPhone/iPad home-screen case always gets the workaround that works.
 */
export function micBlockedHint(): string {
  return isIosWebApp()
    ? 'O microfone está bloqueado. No iPhone/iPad, o app instalado na tela de início às vezes não recebe o microfone — abra o site pelo Safari e toque em "Permitir".'
    : 'Microfone bloqueado. No iPad: Ajustes → Safari → Sites → Microfone → Permitir.'
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
