'use client'

import { cn } from '@/lib/utils'

/** The frame every operations panel sits in, so they all read the same. */
export function Panel({
  title,
  blurb,
  actions,
  children,
}: {
  title: string
  blurb: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgb(var(--line))] px-6 py-5">
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-[rgb(var(--ink))]">{title}</h1>
          <p className="mt-1 font-sans text-2xs text-[rgb(var(--muted))]">{blurb}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

export function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-16 rounded-sm" />
      ))}
    </div>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-sm border border-dashed border-[rgb(var(--line))] px-5 py-10 text-center font-sans text-sm text-[rgb(var(--muted))]">
      {children}
    </p>
  )
}

export function Problem({ children }: { children: React.ReactNode }) {
  if (!children) return null
  return (
    <p className="mb-5 rounded-sm border border-burgundy-400/40 bg-burgundy-500/10 px-4 py-3 font-sans text-sm text-burgundy-600 dark:text-burgundy-300">
      {children}
    </p>
  )
}

export function Pill({
  tone = 'quiet',
  children,
}: {
  tone?: 'quiet' | 'good' | 'warn' | 'bad'
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-3 py-1 font-sans text-[0.6rem] font-semibold uppercase tracking-[0.14em]',
        tone === 'quiet' && 'border-[rgb(var(--line))] text-[rgb(var(--muted))]',
        tone === 'good' && 'border-gold-400 text-gold-700 dark:text-gold-300',
        tone === 'warn' && 'border-gold-500/60 bg-gold-400/10 text-gold-700 dark:text-gold-300',
        tone === 'bad' && 'border-burgundy-400/60 text-burgundy-600 dark:text-burgundy-300',
      )}
    >
      {children}
    </span>
  )
}

/** A date said the way a parish office would say it. */
export function when(iso: string | null | undefined) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function sizeOf(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
