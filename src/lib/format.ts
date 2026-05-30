/** Format milliseconds as m:ss. */
export function formatTime(ms: number): string {
  if (!isFinite(ms) || ms < 0) ms = 0
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** A warm, time-of-day greeting in Portuguese. */
export function greeting(name = 'Alice'): string {
  const h = new Date().getHours()
  if (h < 6) return `Boa madrugada, ${name}`
  if (h < 12) return `Bom dia, ${name}`
  if (h < 18) return `Boa tarde, ${name}`
  return `Boa noite, ${name}`
}

/** Pluralize a Portuguese noun naïvely (good enough for our small set). */
export function plural(n: number, singular: string, pluralForm: string): string {
  return n === 1 ? singular : pluralForm
}
