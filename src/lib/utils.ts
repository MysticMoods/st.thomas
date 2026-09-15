import type { Lang } from './types'

/** Tiny class name joiner — keeps component markup readable. */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

const LOCALE: Record<Lang, string> = { en: 'en-IN', ml: 'ml-IN' }

export function formatDate(iso: string, lang: Lang, opts?: Intl.DateTimeFormatOptions) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(LOCALE[lang], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...opts,
  }).format(date)
}

export function formatNumber(value: number, lang: Lang) {
  return new Intl.NumberFormat(LOCALE[lang]).format(value)
}

/** 0 = Monday … 6 = Sunday, matching the parish calendar order. */
export function todayKey(): string {
  const keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  return keys[new Date().getDay()]
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

export function telHref(value: string) {
  return `tel:${value.replace(/[^\d+]/g, '')}`
}
