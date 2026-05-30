/**
 * Central configuration for Canta, Alice.
 *
 * The Spotify Client ID is PUBLIC by design — the Authorization Code with PKCE
 * flow never exposes a client secret, so it is safe to ship in a static site.
 * Replace the placeholder below with the Client ID from your own Spotify app
 * (https://developer.spotify.com/dashboard). Setup instructions live in README.md.
 *
 * You can also override it at build time with the VITE_SPOTIFY_CLIENT_ID env var,
 * which is what the GitHub Actions deploy uses if a repository secret is set.
 */
export const SPOTIFY_CLIENT_ID: string =
  (import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined)?.trim() ||
  'PASTE_YOUR_SPOTIFY_CLIENT_ID_HERE'

/**
 * The OAuth redirect URI must EXACTLY match one registered in your Spotify app
 * settings. We compute it from the current page so it works both locally
 * (http://127.0.0.1:5173/...) and on GitHub Pages
 * (https://<user>.github.io/CantAlice/). Register BOTH there.
 *
 * Note: Spotify requires 127.0.0.1 rather than "localhost" for loopback.
 */
export function getRedirectUri(): string {
  const { origin, pathname } = window.location
  // Strip any trailing file (e.g. index.html) but keep the app base path.
  const base = pathname.replace(/\/[^/]*$/, '/')
  return `${origin}${base}`
}

/** Scopes we request from Spotify. */
export const SPOTIFY_SCOPES = [
  'streaming', // Web Playback SDK
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
].join(' ')

export const IS_SPOTIFY_CONFIGURED = SPOTIFY_CLIENT_ID !== 'PASTE_YOUR_SPOTIFY_CLIENT_ID_HERE'

/** LRClib — free, open, no-key synced-lyrics API. */
export const LRCLIB_BASE = 'https://lrclib.net/api'

/**
 * Translation endpoint (MyMemory) — free, CORS-friendly, no key required for
 * modest volume. Used to translate English lyric lines and words to Portuguese.
 */
export const TRANSLATE_BASE = 'https://api.mymemory.translated.net/get'

export const STORAGE_KEY = 'canta-alice:v1'
