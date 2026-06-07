import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { Flame, BookHeart, Trophy, Music2, Brain, Minus, Plus } from 'lucide-react'
import {
  useLibrary,
  currentStreak,
  selectDailyProgress,
  buildActivity,
  selectMasteredCount,
  selectVocab,
  selectSongs,
} from '../store/useLibrary'
import { useNav } from '../store/useNav'
import { GoalRing } from '../components/GoalRing'
import { plural } from '../lib/format'
import { LANGUAGES, type TargetLang } from '../config'

export function ProgressPage() {
  const streak = useLibrary(currentStreak)
  const progress = useLibrary(useShallow(selectDailyProgress))
  const history = useLibrary((s) => s.history)
  const activity = useMemo(() => buildActivity(history ?? {}, 14), [history])
  const mastered = useLibrary(selectMasteredCount)
  const vocab = useLibrary(useShallow(selectVocab))
  const known = useLibrary(useShallow((s) => selectSongs(s, 'known')))
  const dailyGoal = useLibrary((s) => s.dailyGoal)
  const setDailyGoal = useLibrary((s) => s.setDailyGoal)
  const dailyNewLimit = useLibrary((s) => s.dailyNewLimit)
  const setDailyNewLimit = useLibrary((s) => s.setDailyNewLimit)
  const targetLang = useLibrary((s) => s.targetLang)
  const setTargetLang = useLibrary((s) => s.setTargetLang)
  const go = useNav((s) => s.go)

  const maxBar = Math.max(dailyGoal, ...activity.map((a) => a.count), 1)
  const lang = targetLang ?? 'en'
  const langName = (LANGUAGES[lang] ?? LANGUAGES.en).name

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl">Seu progresso</h1>
        <p className="mt-2 text-mist/70">Cada dia de prática deixa o {langName} mais natural. 💛</p>
      </div>

      {/* Language being learned */}
      <div className="glass rounded-3xl p-5">
        <div className="text-xs uppercase tracking-[0.18em] text-mist/45">Idioma que estou aprendendo</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(LANGUAGES) as TargetLang[]).map((code) => (
            <button
              key={code}
              onClick={() => setTargetLang(code)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                lang === code
                  ? 'bg-rose-400/25 text-rose-100'
                  : 'bg-white/8 text-mist/70 hover:bg-white/15'
              }`}
            >
              {LANGUAGES[code].name}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-mist/45">
          Seu vocabulário e progresso são separados por idioma.
        </p>
      </div>

      {/* Goal + streak + editable target */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong flex flex-col items-center gap-6 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7"
      >
        <div className="flex items-center gap-5">
          <GoalRing done={progress.done} goal={progress.goal} met={progress.met} size={104} />
          <div>
            <div className="flex items-center gap-1.5 font-medium text-peach">
              <Flame size={18} />
              {streak > 0
                ? `${streak} ${plural(streak, 'dia', 'dias')} seguidos`
                : 'Comece sua sequência hoje'}
            </div>
            <h2 className="mt-1 font-display text-2xl">
              {progress.met ? 'Meta de hoje concluída! 🎉' : `${progress.done} de ${progress.goal} hoje`}
            </h2>
            <p className="mt-0.5 text-sm text-mist/65">
              {progress.met
                ? 'Você arrasou hoje.'
                : `Faltam ${Math.max(0, progress.goal - progress.done)} para a meta de hoje.`}
            </p>
          </div>
        </div>

        {/* Goal + pacing controls */}
        <div className="flex gap-8">
          <Stepper
            title="Meta diária"
            sub="cartões/dia"
            value={dailyGoal}
            onDec={() => setDailyGoal(Math.max(5, dailyGoal - 5))}
            onInc={() => setDailyGoal(Math.min(50, dailyGoal + 5))}
            decDisabled={dailyGoal <= 5}
            incDisabled={dailyGoal >= 50}
          />
          <Stepper
            title="Palavras novas"
            sub="por dia"
            value={dailyNewLimit}
            onDec={() => setDailyNewLimit(Math.max(0, dailyNewLimit - 5))}
            onInc={() => setDailyNewLimit(Math.min(50, dailyNewLimit + 5))}
            decDisabled={dailyNewLimit <= 0}
            incDisabled={dailyNewLimit >= 50}
          />
        </div>
      </motion.div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat icon={<Flame />} value={streak} label={plural(streak, 'dia seguido', 'dias seguidos')} tone="text-peach" />
        <Stat icon={<BookHeart />} value={vocab.length} label="palavras guardadas" tone="text-aurora-1" />
        <Stat icon={<Trophy />} value={mastered} label="dominadas" tone="text-gold" />
        <Stat icon={<Music2 />} value={known.length} label="já sei cantar" tone="text-rose-300" />
      </div>

      {/* 14-day activity */}
      <section>
        <h2 className="mb-4 font-display text-2xl">Últimos 14 dias</h2>
        <div className="glass rounded-3xl p-5">
          <div className="flex h-40 items-end justify-between gap-1.5">
            {activity.map((a) => {
              const h = a.count === 0 ? 3 : Math.round((a.count / maxBar) * 100)
              const hit = a.count >= dailyGoal && a.count > 0
              return (
                <div key={a.date} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      title={`${a.count} ${plural(a.count, 'cartão', 'cartões')}`}
                      className={`w-full rounded-md ${
                        a.count === 0
                          ? 'bg-white/8'
                          : hit
                            ? 'bg-gradient-to-t from-gold/60 to-gold'
                            : 'bg-gradient-to-t from-rose-400/50 to-rose-400'
                      }`}
                    />
                  </div>
                  <span className="text-[0.65rem] text-mist/40">{a.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="flex justify-center">
        <button onClick={() => go('vocab', 'review')} className="btn-primary">
          <Brain size={18} /> Revisar agora
        </button>
      </div>
    </div>
  )
}

function Stepper({
  title,
  sub,
  value,
  onDec,
  onInc,
  decDisabled,
  incDisabled,
}: {
  title: string
  sub: string
  value: number
  onDec: () => void
  onInc: () => void
  decDisabled?: boolean
  incDisabled?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs uppercase tracking-[0.18em] text-mist/45">{title}</span>
      <div className="flex items-center gap-2.5">
        <StepButton label={`Diminuir ${title}`} onClick={onDec} disabled={decDisabled}>
          <Minus size={18} />
        </StepButton>
        <span className="w-10 text-center font-display text-3xl text-cream">{value}</span>
        <StepButton label={`Aumentar ${title}`} onClick={onInc} disabled={incDisabled}>
          <Plus size={18} />
        </StepButton>
      </div>
      <span className="text-xs text-mist/45">{sub}</span>
    </div>
  )
}

function StepButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  label: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full bg-white/8 text-cream transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  )
}

function Stat({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode
  value: number
  label: string
  tone: string
}) {
  return (
    <div className="glass flex flex-col gap-1.5 rounded-3xl p-5">
      <span className={`grid h-10 w-10 place-items-center rounded-2xl bg-white/8 ${tone}`}>{icon}</span>
      <div className="mt-1 font-display text-3xl text-cream">{value}</div>
      <div className="text-sm text-mist/65">{label}</div>
    </div>
  )
}
