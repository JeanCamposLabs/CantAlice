import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// The site is served from https://<user>.github.io/CantAlice/ on GitHub Pages,
// so assets must be referenced under the /CantAlice/ base. For local dev we keep
// the root base. Override with the BASE_PATH env var if the repo is renamed.
const base = process.env.BASE_PATH ?? (process.env.NODE_ENV === 'production' ? '/CantAlice/' : '/')

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'es2020',
  },
})
