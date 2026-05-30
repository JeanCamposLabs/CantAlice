/**
 * React binding for the Spotify Web Playback SDK singleton.
 * Returns a live snapshot of playback state for the UI and lyric sync.
 */
import { useSyncExternalStore } from 'react'
import { playerController, type PlayerSnapshot } from '../spotify/player'

export function usePlayer(): PlayerSnapshot {
  return useSyncExternalStore(
    (cb) => playerController.subscribe(cb),
    () => playerController.current,
    () => playerController.current,
  )
}
