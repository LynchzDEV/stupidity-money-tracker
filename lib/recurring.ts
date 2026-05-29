export interface RecurrenceState {
  dayOfMonth: number
  startPeriod: string
  endPeriod: string | null
  lastRunPeriod: string | null
  isActive: boolean
}

export function periodOf(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function clampDay(year: number, month: number, day: number): number {
  const lastDay = new Date(year, month, 0).getDate()
  return Math.min(day, lastDay)
}

export function isRuleDue(rule: RecurrenceState, today: Date): boolean {
  if (!rule.isActive) return false

  const period = periodOf(today)
  if (period < rule.startPeriod) return false
  if (rule.endPeriod && period > rule.endPeriod) return false
  if (rule.lastRunPeriod === period) return false

  const clamped = clampDay(today.getFullYear(), today.getMonth() + 1, rule.dayOfMonth)
  return today.getDate() >= clamped
}

export function dueDateForToday(rule: RecurrenceState, today: Date): Date {
  const clamped = clampDay(today.getFullYear(), today.getMonth() + 1, rule.dayOfMonth)
  return new Date(today.getFullYear(), today.getMonth(), clamped)
}
