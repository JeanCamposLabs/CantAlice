/**
 * FSRS — Free Spaced Repetition Scheduler (v4.5, 17-parameter model).
 *
 * This is the modern algorithm Anki ships today: instead of a single "ease
 * factor", it models each card's memory as a *stability* (how many days until
 * recall probability drops to the target retention) and a *difficulty* (1–10).
 * After every review it updates both from the elapsed time and the grade, and
 * schedules the next review at the point where recall is expected to fall to
 * REQUEST_RETENTION (90%).
 *
 * The engine is pure: `schedule()` takes a card's state + a grade and returns
 * the next state and the interval in days. Same-session re-queueing of "Again"
 * cards is handled by the review UI, not here.
 *
 * Reference: https://github.com/open-spaced-repetition/fsrs4anki/wiki
 */

/** 1 = Again, 2 = Hard, 3 = Good, 4 = Easy (the four Anki grades). */
export type Rating = 1 | 2 | 3 | 4
export type CardPhase = 'new' | 'review' | 'relearning'

export interface SrsState {
  /** When the card is next due (epoch ms). 0 while still new. */
  due: number
  /** Memory stability in days. 0 while new. */
  stability: number
  /** Difficulty, 1 (easy) … 10 (hard). 0 while new. */
  difficulty: number
  reps: number
  lapses: number
  /** Last review time (epoch ms). 0 if never reviewed. */
  lastReview: number
  phase: CardPhase
}

export function newCard(): SrsState {
  return { due: 0, stability: 0, difficulty: 0, reps: 0, lapses: 0, lastReview: 0, phase: 'new' }
}

export const isNew = (c: SrsState): boolean => c.phase === 'new' || c.lastReview === 0

// — Default FSRS-4.5 weights (trained on the public Anki dataset) —
const W = [
  0.4197, 1.1869, 3.0412, 15.2441, 7.1434, 0.6477, 1.0007, 0.0674, 1.6597, 0.1712, 1.1178, 2.0225,
  0.0904, 0.3025, 2.1214, 0.2498, 2.9466,
]

const DECAY = -0.5
/** Solving R(t)=(1+FACTOR·t/S)^DECAY for the 90% point gives this constant. */
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1
const REQUEST_RETENTION = 0.9
const MS_DAY = 86_400_000

const clampD = (d: number) => Math.min(Math.max(d, 1), 10)

/** Probability of recall after `elapsedDays` given current stability. */
function retrievability(elapsedDays: number, stability: number): number {
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY)
}

const initialStability = (g: Rating) => Math.max(W[g - 1], 0.1)
const initialDifficulty = (g: Rating) => clampD(W[4] - Math.exp(W[5] * (g - 1)) + 1)
const meanReversion = (init: number, current: number) => W[7] * init + (1 - W[7]) * current

function nextDifficulty(d: number, g: Rating): number {
  const next = d - W[6] * (g - 3)
  return clampD(meanReversion(initialDifficulty(4), next))
}

function nextRecallStability(d: number, s: number, r: number, g: Rating): number {
  const hard = g === 2 ? W[15] : 1
  const easy = g === 4 ? W[16] : 1
  return (
    s *
    (1 +
      Math.exp(W[8]) *
        (11 - d) *
        Math.pow(s, -W[9]) *
        (Math.exp(W[10] * (1 - r)) - 1) *
        hard *
        easy)
  )
}

function nextForgetStability(d: number, s: number, r: number): number {
  return W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r))
}

/** Days until the card decays to the target retention, rounded to ≥1. */
function intervalFromStability(stability: number): number {
  const days = (stability / FACTOR) * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1)
  return Math.max(1, Math.round(days))
}

export interface Scheduled {
  state: SrsState
  /** Days until next review. 0 means "again, same session / today". */
  intervalDays: number
}

/**
 * Apply a grade to a card and return its next state + scheduled interval.
 * Pure — does not mutate the input.
 */
export function schedule(card: SrsState, rating: Rating, now = Date.now()): Scheduled {
  let { stability, difficulty } = card
  let { reps, lapses } = card

  if (isNew(card)) {
    stability = initialStability(rating)
    difficulty = initialDifficulty(rating)
  } else {
    const elapsed = Math.max(0, (now - card.lastReview) / MS_DAY)
    const r = retrievability(elapsed, card.stability)
    difficulty = nextDifficulty(card.difficulty, rating)
    if (rating === 1) {
      lapses += 1
      stability = nextForgetStability(difficulty, card.stability, r)
    } else {
      stability = nextRecallStability(difficulty, card.stability, r, rating)
    }
  }

  reps += 1

  // "Again" relearns today (and is re-queued within the session by the UI).
  const intervalDays = rating === 1 ? 0 : intervalFromStability(stability)
  const phase: CardPhase = rating === 1 ? 'relearning' : 'review'
  const due = now + intervalDays * MS_DAY

  return {
    state: { due, stability, difficulty, reps, lapses, lastReview: now, phase },
    intervalDays,
  }
}

/** Preview the interval (in days) each grade would produce, for the buttons. */
export function previewIntervals(card: SrsState, now = Date.now()): Record<Rating, number> {
  return {
    1: schedule(card, 1, now).intervalDays,
    2: schedule(card, 2, now).intervalDays,
    3: schedule(card, 3, now).intervalDays,
    4: schedule(card, 4, now).intervalDays,
  }
}

/** Human-friendly pt-BR interval label for a grade button. */
export function formatInterval(days: number): string {
  if (days <= 0) return 'de novo'
  if (days === 1) return '1 dia'
  if (days < 30) return `${days} dias`
  if (days < 365) {
    const m = Math.round(days / 30)
    return m === 1 ? '~1 mês' : `~${m} meses`
  }
  const y = Math.round((days / 365) * 10) / 10
  return y === 1 ? '~1 ano' : `~${y} anos`
}
