import { promises as fs } from 'node:fs'
import path from 'node:path'

import { NextResponse } from 'next/server'

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
  const content = path.join(process.cwd(), 'content')
  const checks: Record<string, boolean> = { content: false, writable: false }

  try {
    await fs.access(path.join(content, 'site.json'))
    checks.content = true
  } catch {
    checks.content = false
  }

  const probe = path.join(content, `.health.${process.pid}.tmp`)
  try {
    await fs.writeFile(probe, 'ok', 'utf-8')
    await fs.rm(probe, { force: true })
    checks.writable = true
  } catch {
    checks.writable = false
  }

  const ok = checks.content && checks.writable

  return NextResponse.json(
    {
      ok,
      checks,
      uptimeSeconds: Math.round((Date.now() - STARTED) / 1000),
      at: new Date().toISOString(),
    },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
