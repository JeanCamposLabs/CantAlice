import { useLibrary } from '../store/useLibrary'
import { LANGUAGES } from '../config'

/** The pt-BR name of the language the user is learning ("inglês" / "espanhol"). */
export function useLangName(): string {
  const lang = useLibrary((s) => s.targetLang)
  return (LANGUAGES[lang] ?? LANGUAGES.en).name
}
