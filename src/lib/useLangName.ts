import { useLibrary } from '../store/useLibrary'
import { LANGUAGES, type LangConfig } from '../config'

/** The full config for the language the user is currently learning. */
export function useLang(): LangConfig {
  const lang = useLibrary((s) => s.targetLang)
  return LANGUAGES[lang] ?? LANGUAGES.en
}

/** The pt-BR name of the language the user is learning ("inglês" / "espanhol"). */
export function useLangName(): string {
  return useLang().name
}
