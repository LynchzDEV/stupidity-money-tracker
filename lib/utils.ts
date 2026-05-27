import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function thbToSatang(thb: number): number {
  return Math.round(thb * 100)
}

export function satangToTHB(satang: number): number {
  return satang / 100
}

// Parse a YYYY-MM-DD date string as noon Bangkok time (UTC+7).
// new Date("YYYY-MM-DD") is UTC midnight = 07:00 AM Bangkok — this avoids that.
export function parseDateString(dateStr: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
    ? new Date(dateStr + 'T12:00:00+07:00')
    : new Date(dateStr)
}

export function formatTHB(satang: number): string {
  const baht = satang / 100
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
  }).format(baht).replace('THB', '฿').trim()
}
