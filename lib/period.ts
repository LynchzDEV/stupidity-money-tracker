import { clampDay } from './recurring'

export interface Period {
  start: Date
  end: Date
}

export function currentPeriod(now: Date, resetDay: number): Period {
  const y = now.getFullYear()
  const m = now.getMonth()
  const thisClamp = clampDay(y, m + 1, resetDay)
  const start =
    now.getDate() >= thisClamp
      ? new Date(y, m, thisClamp)
      : new Date(y, m - 1, clampDay(y, m, resetDay))

  const sy = start.getFullYear()
  const sm = start.getMonth()
  const end = new Date(sy, sm + 1, clampDay(sy, sm + 2, resetDay))
  return { start, end }
}

export function daysUntil(now: Date, end: Date): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(0, Math.round((end.getTime() - today.getTime()) / 86_400_000))
}
