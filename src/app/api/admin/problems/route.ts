import { NextResponse } from 'next/server'

import { audit } from '@/lib/audit'
import { requireArea } from '@/lib/auth'
import { clearFaults, readFaults } from '@/lib/report'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Faults the site has hit, for the dashboard. */
export async function GET() {
  if (!(await requireArea('system'))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const faults = await readFaults()
  return NextResponse.json({ faults }, { headers: { 'Cache-Control': 'no-store' } })
}

/** Wipes the list once somebody has dealt with what is on it. */
export async function DELETE(request: Request) {
  const session = await requireArea('system')
  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const before = (await readFaults()).length
  await clearFaults()
  await audit({
    request,
    actor: session.username,
    role: session.role,
    action: 'problems-clear',
    detail: `${before} cleared`,
  })

  return NextResponse.json({ ok: true, cleared: before })
}
