import { motion } from 'framer-motion'
import { useShallow } from 'zustand/react/shallow'
import { Flame, BookHeart, Trophy, Music2, Brain, Minus, Plus } from 'lucide-react'
import {
  useLibrary,
  currentStreak,
  selectDailyProgress,
  selectActivity,
  selectMasteredCount,
  selectVocab,
  selectSongs,
} from '../store/useLibrary'
import { useNav } from '../store/useNav'
import { GoalRing } from '../components/GoalRing'
import { plural } from '../lib/format'

export function ProgressPage() {
  const streak = useLibrary(currentStreak)
  const progress = useLibrary(useShallow(selectDailyProgress))
  const activity = useLibrary(useShallow((s) => selectActivity(s, 14)))
  const mastered = useLibrary(selectMasteredCount)
  const vocab = useLibrary(useShallow(selectVocab))
  const known = useLibrary(useShallow((s) => selectSongs(s, 'known')))
  const dailyGoal = useLibrary((s) => s.dailyGoal)
  const setDailyGoal = useLibrary((s) => s.setDailyGoal)
  const go = useNav((s) => s.go)

  const maxBar = Math.max(dailyGoal, ...activity.map((a) => a.count), 1)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl sm:text-5xl">Seu progresso</h1>
        <p className="mt-2 text-mist/70">Cada dia de prática deixa o inglês mais natural. 💛</p>
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

        {/* Daily goal stepper */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs uppercase tracking-[0.18em] text-mist/45">Meta diária</span>
          <div className="flex items-center gap-3">
            <StepButton
              label="Diminuir meta"
              onClick={() => setDailyGoal(Math.max(5, dailyGoal - 5))}
              disabled={dailyGoal <= 5}
            >
              <Minus size={18} />
            </StepButton>
            <span className="w-12 text-center font-display text-3xl text-cream">{dailyGoal}</span>
            <StepButton
              label="Aumentar meta"
              onClick={() => setDailyGoal(Math.min(50, dailyGoal + 5))}
              disabled={dailyGoal >= 50}
            >
              <Plus size={18} />
            </StepButton>
          </div>
          <span className="text-xs text-mist/45">cartões por dia</span>
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
