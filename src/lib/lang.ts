/**
 * Active target-language accessor for non-React modules (translate, examples,
 * speak, listen). Reads the user's choice from the library store at call time,
 * so these modules don't need it threaded through every call site.
 */
import { useLibrary } from '../store/useLibrary'
import { LANGUAGES, DEFAULT_LANG, type LangConfig, type TargetLang } from '../config'

export function activeLang(): TargetLang {
  try {
    return useLibrary.getState().targetLang ?? DEFAULT_LANG
  } catch {
    return DEFAULT_LANG
  }
}

export function langConfig(): LangConfig {
  return LANGUAGES[activeLang()]
}
