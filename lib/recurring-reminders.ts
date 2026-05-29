import { prisma } from './prisma'
import { isRuleDue, dueDateForToday } from './recurring'

export interface DueReminder {
  id: string
  amount: number
  type: string
  category: string
  note: string | null
  merchantName: string | null
  dayOfMonth: number
  dueDate: string
}

export async function listDueReminders(bookId: string, today = new Date()): Promise<DueReminder[]> {
  const rules = await prisma.recurringRule.findMany({
    where: { bookId, isActive: true },
    orderBy: { dayOfMonth: 'asc' },
  })

  return rules
    .filter(rule => isRuleDue(rule, today))
    .map(rule => ({
      id: rule.id,
      amount: rule.amount,
      type: rule.type,
      category: rule.category,
      note: rule.note,
      merchantName: rule.merchantName,
      dayOfMonth: rule.dayOfMonth,
      dueDate: dueDateForToday(rule, today).toISOString(),
    }))
}
