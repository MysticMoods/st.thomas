'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

/**
 * The site's own reader count, and its own fault reporting.
 *
 * There is no third party here and no cookie. One page view is a number in
 * today's column; a "visit" is this browser session saying it is its first page.
 * Anyone who has asked their browser not to be tracked is not counted at all,
 * and the dashboard is never counted.
 */

const VISIT_KEY = 'stc-visit'
/** Faults are sent at most this many times per page, to avoid a loop. */
const MAX_FAULTS = 3

function send(url: string, body: unknown) {
  try {
    const payload = JSON.stringify(body)
    // sendBeacon survives the page being closed mid-navigation.
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))
      return
    }
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* a counter must never break the page it is counting */
  }
}

export function SiteMetrics() {
  const pathname = usePathname()
  const faults = useRef(0)

  // one line per page view
  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return
    const dnt =
      navigator.doNotTrack === '1' ||
      (window as { doNotTrack?: string }).doNotTrack === '1'
    if (dnt) return

    let first = false
    try {
      first = window.sessionStorage.getItem(VISIT_KEY) !== 'seen'
      if (first) window.sessionStorage.setItem(VISIT_KEY, 'seen')
    } catch {
      /* private browsing can refuse storage; the view still counts */
    }

    send('/api/metrics', { path: pathname, referrer: document.referrer, first })
  }, [pathname])

  // and a note home when something breaks in a visitor's browser
  useEffect(() => {
    const report = (message: string, where: string, detail?: string) => {
      if (faults.current >= MAX_FAULTS) return
      faults.current += 1
      send('/api/report', { message, where, detail })
    }

    const onError = (event: ErrorEvent) => {
      report(
        event.message || 'Script error',
        `${pathname ?? ''} ${event.filename ?? ''}:${event.lineno ?? 0}`.trim(),
        event.error instanceof Error ? event.error.stack : undefined,
      )
    }

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      report(
        reason instanceof Error ? reason.message : String(reason ?? 'Unhandled rejection'),
        `${pathname ?? ''} (unhandled promise)`,
        reason instanceof Error ? reason.stack : undefined,
      )
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [pathname])

  return null
}
