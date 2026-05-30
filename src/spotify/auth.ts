/**
 * Spotify Authorization Code flow with PKCE.
 *
 * Designed for a fully static site (GitHub Pages) — no backend, no client
 * secret. We store the verifier + tokens in localStorage and transparently
 * refresh the access token when it expires.
 */
import { SPOTIFY_CLIENT_ID, SPOTIFY_SCOPES, getRedirectUri } from '../config'

const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize'
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token'

const LS = {
  verifier: 'canta-alice:pkce_verifier',
  access: 'canta-alice:access_token',
  refresh: 'canta-alice:refresh_token',
  expires: 'canta-alice:expires_at',
}

// — PKCE helpers —
function randomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values, (v) => possible[v % possible.length]).join('')
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const data = new TextEncoder().encode(plain)
  return crypto.subtle.digest('SHA-256', data)
}

function base64url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** Kick off the login redirect to Spotify. */
export async function beginLogin(): Promise<void> {
  const verifier = randomString(64)
  const challenge = base64url(await sha256(verifier))
  localStorage.setItem(LS.verifier, verifier)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: SPOTIFY_SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    redirect_uri: getRedirectUri(),
  })
  window.location.href = `${AUTH_ENDPOINT}?${params.toString()}`
}

/**
 * Call once on app load. If we just came back from Spotify with a ?code=,
 * exchange it for tokens and clean the URL. Returns true if a code was handled.
 */
export async function handleRedirectCallback(): Promise<boolean> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error) {
    cleanUrl()
    // In Development Mode, a non-allow-listed account is rejected here.
    if (error === 'access_denied') {
      throw new Error(
        'O Spotify não liberou o acesso. Se esta não for a conta dona do app, ' +
          'peça para adicionar o seu e-mail do Spotify em User Management, no painel do app.',
      )
    }
    throw new Error(`O Spotify recusou a conexão: ${error}`)
  }
  if (!code) return false

  const verifier = localStorage.getItem(LS.verifier)
  if (!verifier) {
    // The PKCE verifier we saved before redirecting is gone — usually because
    // the flow returned in a different browser/context (e.g. opened in another
    // app, or private browsing cleared storage).
    cleanUrl()
    throw new Error(
      'A sessão de login se perdeu. Tente conectar de novo no mesmo navegador ' +
        '(sem aba anônima/privada).',
    )
  }

  const body = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    code_verifier: verifier,
  })

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    cleanUrl()
    throw new Error('Não consegui finalizar a conexão com o Spotify.')
  }
  const data = await res.json()
  storeTokens(data)
  localStorage.removeItem(LS.verifier)
  cleanUrl()
  return true
}

function storeTokens(data: {
  access_token: string
  refresh_token?: string
  expires_in: number
}): void {
  localStorage.setItem(LS.access, data.access_token)
  if (data.refresh_token) localStorage.setItem(LS.refresh, data.refresh_token)
  localStorage.setItem(LS.expires, String(Date.now() + data.expires_in * 1000))
}

function cleanUrl(): void {
  const { origin, pathname } = window.location
  window.history.replaceState({}, document.title, origin + pathname)
}

/** Refresh the access token using the stored refresh token. */
async function refreshToken(): Promise<string | null> {
  const refresh = localStorage.getItem(LS.refresh)
  if (!refresh) return null

  const body = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: refresh,
  })
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    logout()
    return null
  }
  const data = await res.json()
  storeTokens(data)
  return data.access_token
}

/**
 * Returns a valid access token, refreshing if needed, or null if not logged in.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const access = localStorage.getItem(LS.access)
  const expiresAt = Number(localStorage.getItem(LS.expires) ?? 0)
  if (!access) return null

  // Refresh 60s before actual expiry to avoid edge races.
  if (Date.now() > expiresAt - 60_000) {
    return refreshToken()
  }
  return access
}

export function isLoggedIn(): boolean {
  return Boolean(localStorage.getItem(LS.access))
}

export function logout(): void {
  localStorage.removeItem(LS.access)
  localStorage.removeItem(LS.refresh)
  localStorage.removeItem(LS.expires)
  localStorage.removeItem(LS.verifier)
}
