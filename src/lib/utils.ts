import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

/** "3 days ago", "just now". Dates in this product are always relative. */
export function relativeTime(timestamp: number, now = Date.now()): string {
  const diff = now - timestamp
  const abs = Math.abs(diff)
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  if (abs < 45_000) return 'just now'
  if (abs < hour) {
    const n = Math.round(abs / minute)
    return diff > 0 ? `${n}m ago` : `in ${n}m`
  }
  if (abs < day) {
    const n = Math.round(abs / hour)
    return diff > 0 ? `${n}h ago` : `in ${n}h`
  }
  if (abs < 7 * day) {
    const n = Math.round(abs / day)
    return diff > 0 ? `${n}d ago` : `in ${n}d`
  }
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Average shown to one decimal, or an em-free placeholder when there is none. */
export const formatScore = (value: number | null | undefined) =>
  value === null || value === undefined ? '--' : value.toFixed(1)
