/**
 * Minimal type declarations for the Spotify Web Playback SDK
 * (loaded via <script> in index.html).
 * See https://developer.spotify.com/documentation/web-playback-sdk
 */
interface SpotifyPlayerInit {
  name: string
  getOAuthToken: (cb: (token: string) => void) => void
  volume?: number
}

interface SpotifyPlaybackTrack {
  uri: string
  name: string
  duration_ms: number
  artists: { name: string; uri: string }[]
  album: { name: string; images: { url: string }[] }
}

interface SpotifyPlaybackState {
  paused: boolean
  position: number
  duration: number
  track_window: {
    current_track: SpotifyPlaybackTrack
  }
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>
  disconnect: () => void
  addListener: (event: string, cb: (arg: any) => void) => boolean
  removeListener: (event: string) => boolean
  getCurrentState: () => Promise<SpotifyPlaybackState | null>
  setName: (name: string) => Promise<void>
  getVolume: () => Promise<number>
  setVolume: (volume: number) => Promise<void>
  pause: () => Promise<void>
  resume: () => Promise<void>
  togglePlay: () => Promise<void>
  seek: (positionMs: number) => Promise<void>
  previousTrack: () => Promise<void>
  nextTrack: () => Promise<void>
  activateElement: () => Promise<void>
}

interface Window {
  onSpotifyWebPlaybackSDKReady: () => void
  Spotify: {
    Player: new (init: SpotifyPlayerInit) => SpotifyPlayer
  }
}
