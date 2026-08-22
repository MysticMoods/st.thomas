import { promises as fs } from 'node:fs'
import path from 'node:path'

import { NextResponse } from 'next/server'

import { store } from '@/lib/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STARTED = Date.now()

/**
 * The endpoint an uptime monitor watches.
 *
 * It answers the two questions that actually matter for this site: can it read
 * its content, and can it still write to disk? The second is the one that bites
 * — the dashboard saves to the filesystem, so a full or read-only disk breaks
 * every edit while the pages carry on serving as though nothing were wrong.
 *
 * Nothing here identifies the parish or its people, so it is safe to leave open
 * for a monitor to poll.
 */
export async function GET() {
  const checks: Record<string, boolean> = { content: false, writable: false }

  // Whether the parish's words can still be read, and whether an edit made now
  // would save. Both go through the store, so this says something true whether
  // the site keeps its content in a folder or in a database.
  try {
    await store.readContent('site')
    checks.content = true
  } catch {
    checks.content = false
  }

  checks.writable = await store.writable()

  const ok = checks.content && checks.writable

  return NextResponse.json(
    {
      ok,
      checks,
      storage: store.name,
      uptimeSeconds: Math.round((Date.now() - STARTED) / 1000),
      at: new Date().toISOString(),
    },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
