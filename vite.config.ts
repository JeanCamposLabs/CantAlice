import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The site is served from https://<user>.github.io/CantAlice/ on GitHub Pages,
// so assets must be referenced under the /CantAlice/ base. For local dev we keep
// the root base. Override with the BASE_PATH env var if the repo is renamed.
const base = process.env.BASE_PATH ?? (process.env.NODE_ENV === 'production' ? '/CantAlice/' : '/')

// Human-facing version, shown in the UI. Bump `version` in package.json to
// release (e.g. 1.0.0 → 1.1.0).
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}
const appVersion = pkg.version

// A *unique-per-deploy* build id used only to auto-detect new deploys on the
// client. In CI we pass the commit SHA (VITE_APP_VERSION); otherwise we fall
// back to a timestamp so local builds still get a distinct value.
const buildId = process.env.VITE_APP_VERSION || `dev-${Date.now()}`

// Emit a tiny, never-cached version.json next to index.html. The running app
// polls it and, when its build id differs from the one baked into the bundle,
// knows a fresh deploy is available.
function emitVersionFile(id: string, version: string) {
  return {
    name: 'emit-version-file',
    generateBundle() {
      // @ts-expect-error - `this` is the Rollup plugin context at build time.
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId: id, version }),
      })
    },
  }
}

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [react(), tailwindcss(), emitVersionFile(buildId, appVersion)],
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
  },
})


