/**
 * Unifies the two ways Alice can hear a song:
 *
 *  • "spotify"  — full track via the Web Playback SDK (Spotify Premium).
 *                 Lyric sync is precise because we know the real position.
 *  • "preview"  — a 30-second preview clip via an <audio> element, for free
 *                 accounts. Synced lyrics may not line up (the preview is a
 *                 fragment), so the karaoke view shows lyrics statically.
 *
 * The hook exposes a single, stable interface. Position is exposed as a
 * getter (not state) so consumers can sample it inside their own rAF loop
 * without forcing a re-render every frame.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SpotifyTrack } from '../spotify/api'
import { playTrack, resumePlayback, pausePlayback } from '../spotify/api'
import { playerController } from '../spotify/player'
import { usePlayer } from './usePlayer'

export type PlaybackMode = 'spotify' | 'preview' | 'unavailable'

export interface Playback {
  mode: PlaybackMode
  isPlaying: boolean
  durationMs: number
  ready: boolean
  error: string | null
  getPosition: () => number
  toggle: () => void
  seek: (ms: number) => void
  restart: () => void
}

export function useKaraokePlayback(
  track: SpotifyTrack | null,
  isPremium: boolean,
): Playback {
  const sdk = usePlayer()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [previewPlaying, setPreviewPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Whether *this* track has been started on the Spotify device at least once.
  const startedUriRef = useRef<string | null>(null)

  const mode: PlaybackMode = useMemo(() => {
    if (isPremium && sdk.ready && sdk.deviceId) return 'spotify'
    if (track?.previewUrl) return 'preview'
    return 'unavailable'
  }, [isPremium, sdk.ready, sdk.deviceId, track?.previewUrl])

  // The track-change cleanup below must see the *current* mode, not the one
  // captured when the track loaded (the SDK can become ready mid-track,
  // flipping preview → spotify; a stale closure would then skip the pause).
  const modeRef = useRef(mode)
  modeRef.current = mode

  // — Manage the preview <audio> element —
  useEffect(() => {
    if (mode !== 'preview' || !track?.previewUrl) return
    const audio = new Audio(track.previewUrl)
    audio.preload = 'auto'
    audioRef.current = audio
    const onPlay = () => setPreviewPlaying(true)
    const onPause = () => setPreviewPlaying(false)
    const onEnd = () => setPreviewPlaying(false)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.pause()
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnd)
      audioRef.current = null
      setPreviewPlaying(false)
    }
  }, [mode, track?.previewUrl])

  // Stop everything when the track changes / unmounts.
  useEffect(() => {
    startedUriRef.current = null
    setError(null)
    return () => {
      if (modeRef.current === 'spotify') {
        playerController.pause().catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.id])

  const isThisTrackLoaded =
    mode === 'spotify' && sdk.trackUri === track?.uri

  const isPlaying =
    mode === 'spotify' ? Boolean(isThisTrackLoaded && sdk.isPlaying) : previewPlaying

  const durationMs =
    mode === 'spotify'
      ? isThisTrackLoaded
        ? sdk.durationMs
        : (track?.durationMs ?? 0)
      : 30_000

  const getPosition = useCallback((): number => {
    if (mode === 'spotify') {
      return isThisTrackLoaded ? playerController.getPosition() : 0
    }
    return (audioRef.current?.currentTime ?? 0) * 1000
  }, [mode, isThisTrackLoaded])

  const toggle = useCallback(async () => {
    setError(null)
    try {
      if (mode === 'spotify' && track && sdk.deviceId) {
        await playerController.activate()
        if (startedUriRef.current !== track.uri) {
          // First press for this track: start it on our device.
          await playTrack(sdk.deviceId, track.uri)
          startedUriRef.current = track.uri
        } else if (sdk.isPlaying) {
          await pausePlayback(sdk.deviceId)
        } else {
          await resumePlayback(sdk.deviceId)
        }
      } else if (mode === 'preview' && audioRef.current) {
        if (audioRef.current.paused) await audioRef.current.play()
        else audioRef.current.pause()
      }
    } catch {
      setError('Não consegui controlar a reprodução. Tente novamente.')
    }
  }, [mode, track, sdk.deviceId, sdk.isPlaying])

  const seek = useCallback(
    (ms: number) => {
      if (mode === 'spotify') {
        playerController.seek(ms).catch(() => {})
      } else if (audioRef.current) {
        audioRef.current.currentTime = Math.max(0, ms / 1000)
      }
    },
    [mode],
  )

  const restart = useCallback(() => seek(0), [seek])

  return {
    mode,
    isPlaying,
    durationMs,
    ready: mode !== 'unavailable',
    error,
    getPosition,
    toggle,
    seek,
    restart,
  }
}
