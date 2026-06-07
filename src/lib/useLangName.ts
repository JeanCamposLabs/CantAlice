import { useLibrary } from '../store/useLibrary'
import { LANGUAGES } from '../config'

/** The pt-BR name of the language the user is learning ("inglês" / "espanhol"). */
export function useLangName(): string {
  return LANGUAGES[useLibrary((s) => s.targetLang)].name
}
