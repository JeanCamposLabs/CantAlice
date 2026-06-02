# Codex audit handoff - 2026-06-02

## Scope inspected

- React/Vite PWA: Spotify PKCE auth, player API usage, local progress store, SRS flow, lyrics/translation clients, build config.
- Supabase layer: `progress` and `translate` Edge Functions, schema/RLS posture, function JWT settings.
- Deployment layer: GitHub Pages workflow, build-time env handling, public app manifest/assets.

## Checks run

- `npm ci`
- `npm run lint`
- `npm run build`
- `npm audit --audit-level=moderate`

All checks passed.

## Confident fix made

- Corrected the cloud sync client comment in `src/sync/cloud.ts`. The code correctly sends the public Supabase key in standard API headers, but the comment still described it as a project JWT. That was stale after the move to Supabase publishable keys and conflicted with the README/config guidance.

## Human decisions / next-agent notes

- Spotify access and refresh tokens are stored in `localStorage`, which is normal for a static PKCE app but means any future XSS bug can become account-token exposure. Before broader public use, decide whether to add hosting-level CSP/security headers, move token handling behind a backend, or keep the current static-only tradeoff.
- Both Supabase Edge Functions allow `Access-Control-Allow-Origin: *`. `progress` verifies the caller through Spotify and `translate` stores no user data, so this is not an immediate code bug. If the app becomes public or cost-sensitive, decide whether to restrict origins and/or add rate limiting for the translation proxy.
- `translate` can proxy DeepL and Tatoeba without app authentication. If the DeepL key is enabled, monitor quota and abuse risk; consider rate limits before sharing the app outside the intended audience.
- The deploy workflow still includes a historical branch trigger (`claude/alice-english-music-learning-D48pU`). Confirm whether that branch should continue deploying to Pages.
