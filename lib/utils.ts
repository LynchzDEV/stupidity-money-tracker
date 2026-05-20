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

export function formatTHB(satang: number): string {
  const baht = satang / 100
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    currencyDisplay: 'symbol',
    minimumFractionDigits: 2,
  }).format(baht).replace('THB', '฿').trim()
}
