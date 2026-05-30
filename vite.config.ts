import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The site is served from https://<user>.github.io/CantAlice/ on GitHub Pages,
// so assets must be referenced under the /CantAlice/ base. For local dev we keep
// the root base. Override with the BASE_PATH env var if the repo is renamed.
const base = process.env.BASE_PATH ?? (process.env.NODE_ENV === 'production' ? '/CantAlice/' : '/')

// A unique stamp per build, used to auto-detect new deploys on the client.
// In CI we pass the commit SHA (VITE_APP_VERSION); otherwise fall back to a
// timestamp so local builds still get a distinct value.
const appVersion = process.env.VITE_APP_VERSION || `dev-${Date.now()}`

// Emit a tiny, never-cached version.json next to index.html. The running app
// polls it and, when it differs from the version baked into the bundle, knows
// a fresh deploy is available.
function emitVersionFile(version: string) {
  return {
    name: 'emit-version-file',
    generateBundle() {
      // @ts-expect-error - `this` is the Rollup plugin context at build time.
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ version }),
      })
    },
  }
}

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [react(), tailwindcss(), emitVersionFile(appVersion)],
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
  },
})

