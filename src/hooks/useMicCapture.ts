/**
 * The held-microphone state machine shared by the conversation composers.
 *
 * Speech recognition is preferred (instant, free); a browser that refuses it
 * once — Safari on an installed iPhone/iPad app hands out a recognizer that
 * never delivers — is switched to recording (the server transcribes) for the
 * rest of the session. The mic is the speaker's to close: capture runs until
 * stop() (or the safety watchdog, on either engine), never until the first
 * pause.
 *
 * Owns the recognizer/recorder handles and releases them on unmount — even
 * when the permission prompt is still up — so navigating away mid-capture can
 * never leave the microphone hot.
 */
import { useEffect, useRef, useState } from 'react'
import { canListen, listenHeld, type HeldListen } from '../lib/listen'
import { canRecord, startRecording, type Recorder } from '../lib/record'

/** Shared "heard nothing" advice, so the composers never drift apart. */
export const NOTHING_HEARD_HINT = 'Não ouvi nada. Toque no microfone e fale de novo.'

// Session-wide engine choice: once this browser proves recognition doesn't
// deliver, every composer (and every remount) goes straight to recording
// instead of failing one attempt each to relearn it.
let sessionEngine: 'speech' | 'record' = canListen ? 'speech' : 'record'

// Whether recognition has ever delivered text this session. An empty capture
// only downgrades the engine while this is false: silence from a proven
// recognizer means the speaker said nothing, not that the engine is broken
// (the broken case — Safari on an installed iPhone/iPad app — never delivers
// anything at all).
let speechDelivered = false

/** What came out of a capture. */
export type CaptureResult =
  | { kind: 'text'; text: string }
  | { kind: 'clip'; blob: Blob; mime: string }
  /** Nothing captured. `blocked` = the mic looks unusable, not just quiet. */
  | { kind: 'empty'; blocked: boolean }
  /** Nothing was capturing (e.g. a second stop racing the first). */
  | { kind: 'noop' }

export type StartOutcome =
  | { ok: true }
  /** `canceled` = the capture was stopped while the mic was still opening —
   * nothing to tell the user about. */
  | { ok: false; reason: 'unsupported' | 'denied' | 'canceled' }

export interface MicCapture {
  /** True while the mic is open — including while the permission prompt is
   * still up, so page-level guards hold for the whole capture. */
  capturing: boolean
  /** Live recognition preview ('' on the recording engine). */
  partial: string
  /**
   * Open the mic. `onAutoStop` receives the result if the capture ends on its
   * own (watchdog or an unrecoverable mic error) instead of via stop().
   */
  start: (opts?: {
    lang?: string
    onAutoStop?: (r: CaptureResult) => void
  }) => Promise<StartOutcome>
  /** Close the mic and resolve with what was captured. */
  stop: () => Promise<CaptureResult>
  /** Close and discard (also releases the mic). */
  cancel: () => void
}

export function useMicCapture(maxMs = 60_000): MicCapture {
  const [capturing, setCapturing] = useState(false)
  const [partial, setPartial] = useState('')

  const heldRef = useRef<HeldListen | null>(null)
  const recorderRef = useRef<Recorder | null>(null)
  const aliveRef = useRef(true)
  /** startRecording() still awaiting the permission prompt. */
  const openingRef = useRef(false)
  /** Bumped by stop()/cancel() so a start still awaiting the permission
   * prompt knows it was called off and releases the mic on arrival. */
  const epochRef = useRef(0)
  const autoStopRef = useRef<((r: CaptureResult) => void) | null>(null)

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      epochRef.current++
      heldRef.current?.cancel()
      heldRef.current = null
      recorderRef.current?.cancel()
      recorderRef.current = null
    }
  }, [])

  const stop = async (): Promise<CaptureResult> => {
    const wasOpening = openingRef.current
    epochRef.current++
    autoStopRef.current = null
    setCapturing(false)
    setPartial('')

    // — Recognition path —
    const held = heldRef.current
    if (held) {
      heldRef.current = null
      const said = (await held.stop()).trim()
      if (said) {
        speechDelivered = true
        return { kind: 'text', text: said }
      }
      // Nothing came back. If this recognizer has never delivered anything,
      // assume it's the broken kind and record from here on; if it has, this
      // was just silence — don't take the working engine away.
      if (canRecord && !speechDelivered) {
        sessionEngine = 'record'
        return { kind: 'empty', blocked: false }
      }
      return { kind: 'empty', blocked: !speechDelivered && !canRecord }
    }

    // — Recording path (the server transcribes the clip) —
    const rec = recorderRef.current
    recorderRef.current = null
    if (!rec) {
      // A tap-to-send while the permission prompt was still up: the pending
      // start releases the mic, and the tap deserves a hint, not silence.
      return wasOpening ? { kind: 'empty', blocked: false } : { kind: 'noop' }
    }
    const clip = await rec.stop()
    if (!clip) return { kind: 'empty', blocked: false }
    return { kind: 'clip', blob: clip.blob, mime: clip.mime }
  }

  // onAutoStop runs from closures created when the capture started; the ref
  // keeps them calling the current stop() (fresh state, same engine handles).
  const stopRef = useRef(stop)
  useEffect(() => {
    stopRef.current = stop
  })

  const start: MicCapture['start'] = async (opts = {}) => {
    // Already open (or opening): treat as success, there is a live mic.
    if (heldRef.current || recorderRef.current || openingRef.current) return { ok: true }
    const epoch = ++epochRef.current
    autoStopRef.current = opts.onAutoStop ?? null
    setPartial('')

    if (sessionEngine === 'speech') {
      const held = listenHeld({
        lang: opts.lang,
        maxMs,
        onPartial: (t) => {
          if (t) speechDelivered = true
          if (aliveRef.current) setPartial(t)
        },
        // The hold died on its own (watchdog / mic error): close the capture
        // as if the speaker had stopped it, so the screen never shows a live
        // mic that is actually dead.
        onEnd: () => {
          if (!aliveRef.current || heldRef.current !== held) return
          const notify = autoStopRef.current
          void stopRef.current().then((r) => notify?.(r))
        },
      })
      heldRef.current = held
      setCapturing(true)
      return { ok: true }
    }

    if (!canRecord) return { ok: false, reason: 'unsupported' }
    // The permission-prompt window already counts as capturing: the stop
    // control stays visible and page-level guards hold for the whole capture.
    openingRef.current = true
    setCapturing(true)
    try {
      const rec = await startRecording()
      if (!aliveRef.current || epochRef.current !== epoch) {
        // The screen went away, or stop()/cancel() was tapped while the
        // prompt was up — this capture was called off; release the mic.
        rec.cancel()
        return { ok: false, reason: 'canceled' }
      }
      recorderRef.current = rec
      // Recording gets the same safety net recognition has: a capture can
      // never stay open forever. (No-op if this capture already ended.)
      setTimeout(() => {
        if (recorderRef.current !== rec) return
        const notify = autoStopRef.current
        void stopRef.current().then((r) => notify?.(r))
      }, maxMs)
      return { ok: true }
    } catch {
      if (epochRef.current === epoch) setCapturing(false)
      return { ok: false, reason: 'denied' }
    } finally {
      openingRef.current = false
    }
  }

  const cancel = () => {
    epochRef.current++
    autoStopRef.current = null
    heldRef.current?.cancel()
    heldRef.current = null
    recorderRef.current?.cancel()
    recorderRef.current = null
    setCapturing(false)
    setPartial('')
  }

  return { capturing, partial, start, stop, cancel }
}
