import { useEffect } from 'react'
import { useLibrary } from '../store/useLibrary'
import { translate } from './translate'

/**
 * Bumping this re-translates every saved word once (per device) with the
 * current translation provider. Use it whenever translation quality improves so
 * existing decks aren't stuck with old, lower-quality translations.
 */
const TRANSLATIONS_VERSION = 2

/**
 * One-time background pass that re-translates saved words + their example
 * phrases with the better translator. Runs once per device (guarded by a local
 * version marker), lightly throttled. Deterministic output means it won't fight
 * cloud sync across devices.
 */
export function useRefreshTranslations(): void {
  useEffect(() => {
    if (useLibrary.getState().translationsVersion >= TRANSLATIONS_VERSION) return
    let cancelled = false

    ;(async () => {
      const words = Object.values(useLibrary.getState().vocab)
      for (const w of words) {
        if (cancelled) return
        const translation = await translate(w.word)
        const exampleTranslation = w.example?.text ? await translate(w.example.text) : undefined
        if (cancelled) return
        useLibrary.getState().refreshWordTranslation(w.word, translation, exampleTranslation)
        await new Promise((r) => setTimeout(r, 80))
      }
      if (!cancelled) useLibrary.getState().setTranslationsVersion(TRANSLATIONS_VERSION)
    })()

    return () => {
      cancelled = true
    }
  }, [])
}
