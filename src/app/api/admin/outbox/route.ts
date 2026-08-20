import { NextResponse } from 'next/server'

import { audit } from '@/lib/audit'
import { currentSession } from '@/lib/auth'
import { clearOutbox, mailConfigured, readOutbox, verifyMail } from '@/lib/mail'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Every letter the site has tried to post, and whether the post works at all. */
export async function GET(request: Request) {
  if (!(await currentSession())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const letters = await readOutbox()
  const check = new URL(request.url).searchParams.get('check') === '1'

  return NextResponse.json(
    {
      letters,
      configured: mailConfigured(),
      // Talking to the mail server takes a moment, so it is only done on ask.
      ...(check ? { check: await verifyMail() } : {}),
      counts: {
        sent: letters.filter((letter) => letter.status === 'sent').length,
        failed: letters.filter((letter) => letter.status === 'failed').length,
        undelivered: letters.filter((letter) => letter.status === 'not-configured').length,
      },
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function DELETE(request: Request) {
  const session = await currentSession()
  if (!session) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const before = (await readOutbox()).length
  await clearOutbox()
  await audit({
    request,
    actor: session.username,
    role: session.role,
    action: 'outbox-clear',
    detail: `${before} cleared`,
  })

  return NextResponse.json({ ok: true, cleared: before })
}
