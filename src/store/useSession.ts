/**
 * Ephemeral session state (not persisted): Spotify auth status, the logged-in
 * user, and the track currently open in the karaoke view.
 */
import { create } from 'zustand'
import type { SpotifyTrack, SpotifyUser } from '../spotify/api'

export type AuthState = 'unknown' | 'loggedout' | 'loggedin'

interface SessionState {
  auth: AuthState
  user: SpotifyUser | null
  /** Whether the current account can stream full songs via the SDK. */
  isPremium: boolean
  /** The track Alice is currently practising (drives the karaoke view). */
  activeTrack: SpotifyTrack | null

  setAuth: (auth: AuthState) => void
  setUser: (user: SpotifyUser | null) => void
  setActiveTrack: (track: SpotifyTrack | null) => void
}

export const useSession = create<SessionState>((set) => ({
  auth: 'unknown',
  user: null,
  isPremium: false,
  activeTrack: null,

  setAuth: (auth) => set({ auth }),
  setUser: (user) => set({ user, isPremium: user?.product === 'premium' }),
  setActiveTrack: (activeTrack) => set({ activeTrack }),
}))
