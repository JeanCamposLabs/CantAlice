import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Loader2 } from 'lucide-react'
import { translateAny } from '../lyrics/translate'
import { useLibrary } from '../store/useLibrary'
import { LANGUAGES } from '../config'

export function AddPhraseModal({ onClose }: { onClose: () => void }) {
  const targetLang = useLibrary((s) => s.targetLang) ?? 'en'
  const addCustomPhrase = useLibrary((s) => s.addCustomPhrase)
  const lang = LANGUAGES[targetLang]

  const [inputLang, setInputLang] = useState<'pt' | 'target'>('pt')
  const [input, setInput] = useState('')
  const [translated, setTranslated] = useState('')
  const [translating, setTranslating] = useState(false)
  const debounceRef = useRef<number | undefined>(undefined)

  const fromCode = inputLang === 'pt' ? 'pt' : lang.google
  const toCode = inputLang === 'pt' ? lang.google : 'pt'

  useEffect(() => {
    const clean = input.trim()
    if (!clean) {
      setTranslated('')
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(async () => {
      setTranslating(true)
      try {
        const result = await translateAny(clean, fromCode, toCode)
        setTranslated(result)
      } finally {
        setTranslating(false)
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [input, fromCode, toCode])

  const switchTab = (tab: 'pt' | 'target') => {
    setInputLang(tab)
    setInput('')
    setTranslated('')
  }

  const targetPhrase = inputLang === 'pt' ? translated : input.trim()
  const ptPhrase = inputLang === 'pt' ? input.trim() : translated
  const canSave = targetPhrase.length > 0 && ptPhrase.length > 0

  const save = () => {
    if (!canSave) return
    addCustomPhrase(targetLang, targetPhrase, ptPhrase)
    onClose()
  }

  const langLabel = lang.name.charAt(0).toUpperCase() + lang.name.slice(1)

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-night-900/70 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="glass-strong pb-safe relative z-10 w-full max-w-lg overflow-y-auto rounded-t-3xl p-6 sm:rounded-3xl sm:p-8"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl">Nova frase</h2>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="rounded-full p-2 text-mist/60 transition-colors hover:bg-white/10 hover:text-cream"
            >
              <X size={20} />
            </button>
          </div>

          {/* Language tab toggle */}
          <div className="mb-5 flex rounded-2xl bg-white/8 p-1">
            <button
              onClick={() => switchTab('pt')}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                inputLang === 'pt' ? 'bg-rose-400/25 text-rose-100' : 'text-mist/60 hover:text-cream'
              }`}
            >
              Digitar em português
            </button>
            <button
              onClick={() => switchTab('target')}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                inputLang === 'target'
                  ? 'bg-rose-400/25 text-rose-100'
                  : 'text-mist/60 hover:text-cream'
              }`}
            >
              Digitar em {lang.name}
            </button>
          </div>

          <div className="space-y-4">
            {/* Primary input */}
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.18em] text-mist/45">
                {inputLang === 'pt' ? 'Português' : langLabel}
              </label>
              <textarea
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  inputLang === 'pt'
                    ? 'Digite a frase em português…'
                    : `Digite a frase em ${lang.name}…`
                }
                rows={2}
                className="w-full resize-none rounded-2xl bg-white/8 px-4 py-3 text-cream placeholder:text-mist/30 focus:outline-none focus:ring-2 focus:ring-rose-400/40"
              />
            </div>

            {/* Translation output — editable */}
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <label className="text-xs uppercase tracking-[0.18em] text-mist/45">
                  {inputLang === 'pt' ? langLabel : 'Português'} — tradução
                </label>
                {translating && <Loader2 size={12} className="animate-spin text-mist/40" />}
              </div>
              <textarea
                value={translated}
                onChange={(e) => setTranslated(e.target.value)}
                placeholder="A tradução aparece aqui — você pode corrigir"
                rows={2}
                className="w-full resize-none rounded-2xl bg-white/8 px-4 py-3 text-cream placeholder:text-mist/30 focus:outline-none focus:ring-2 focus:ring-rose-400/40"
              />
            </div>
          </div>

          <button
            onClick={save}
            disabled={!canSave}
            className="btn-primary mt-5 w-full justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={16} /> Salvar frase
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
