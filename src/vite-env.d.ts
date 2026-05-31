/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPOTIFY_CLIENT_ID?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_OWNER_EMAIL?: string
  readonly VITE_OWNER_WHATSAPP?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
