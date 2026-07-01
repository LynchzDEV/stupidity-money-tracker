export interface ShareAmount {
  userId: string
  amount: number
}

// Split a satang total equally across users. Any leftover satang (total not
// divisible by headcount) is spread one-per-person across the first members so
// the shares always sum back to the exact total — never lose or invent money.
export function computeEqualShares(totalSatang: number, userIds: string[]): ShareAmount[] {
  const n = userIds.length
  if (n === 0) return []
  const base = Math.floor(totalSatang / n)
  const remainder = totalSatang - base * n
  return userIds.map((userId, i) => ({ userId, amount: base + (i < remainder ? 1 : 0) }))
}

export function sharesSumTo(totalSatang: number, shares: ShareAmount[]): boolean {
  return shares.reduce((sum, s) => sum + s.amount, 0) === totalSatang
}
