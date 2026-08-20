'use client'

import { useEffect } from 'react'

/**
 * What a visitor sees when a page fails, and the only place the parish would
 * otherwise never hear about it. The fault goes to the dashboard's Problems
 * list before this is drawn.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    try {
      void fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error.message || 'Page failed to render',
          where: `${window.location.pathname} (page)`,
          detail: error.digest ? `digest ${error.digest}` : error.stack,
        }),
        keepalive: true,
      }).catch(() => {})
    } catch {
      /* nothing more to do */
    }
  }, [error])

  return (
    <main className="flex min-h-[70svh] items-center justify-center bg-[rgb(var(--page))] px-6 py-24">
      <div className="max-w-lg text-center">
        <p className="eyebrow">Something went wrong</p>
        <h1 className="heading-lg mt-5 text-[rgb(var(--ink))]">This page could not be shown</h1>
        <span className="gold-rule mx-auto mt-6 block" aria-hidden="true" />
        <p className="body-text mt-6">
          The parish office has been told. Try again in a moment, or ring the office if it matters
          today.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={reset} className="btn-primary">
            Try again
          </button>
          <a
            href="/"
            className="btn rounded-sm border border-[rgb(var(--line))] text-[rgb(var(--muted))] transition-colors hover:border-gold-400 hover:text-gold-500"
          >
            Back to the homepage
          </a>
        </div>
      </div>
    </main>
  )
}
