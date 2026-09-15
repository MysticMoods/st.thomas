import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { audit } from '@/lib/audit'
import { canEditSection, currentSession } from '@/lib/auth'
import { contentVersion, readContent, writeContent } from '@/lib/content'
import { CONTENT_KEYS, type ContentKey } from '@/lib/types'

export const runtime = 'nodejs'

function guard(key: string): key is ContentKey {
  return (CONTENT_KEYS as readonly string[]).includes(key)
}

export async function GET(_request: Request, ctx: { params: Promise<{ key: string }> }) {
  const session = await currentSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const { key } = await ctx.params
  if (!guard(key)) return NextResponse.json({ error: 'Unknown section' }, { status: 404 })
  // Reading a section is how the editor fills its form, so it is refused on the
  // same terms as saving one. Otherwise a hall manager could read the accounts
  // page into a form they are not allowed to submit.
  if (!canEditSection(session, key)) {
    return NextResponse.json({ error: 'Not your section to edit' }, { status: 403 })
  }

  return NextResponse.json({
    key,
    data: await readContent(key),
    version: await contentVersion(key),
  })
}

export async function PUT(request: Request, ctx: { params: Promise<{ key: string }> }) {
  const session = await currentSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const { key } = await ctx.params
  if (!guard(key)) return NextResponse.json({ error: 'Unknown section' }, { status: 404 })
  if (!canEditSection(session, key)) {
    return NextResponse.json({ error: 'Not your section to edit' }, { status: 403 })
  }

  let data: unknown
  let version: string | undefined
  try {
    const body = await request.json()
    data = body?.data
    version = typeof body?.version === 'string' ? body.version : undefined
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (data === undefined || data === null || typeof data !== 'object') {
    return NextResponse.json({ error: 'Payload must be an object' }, { status: 422 })
  }

  // Refuse a save built on a copy that is no longer current, so one stale tab
  // can never wipe out an edit someone else already saved.
  //
  // The version is required, not merely checked when offered. It used to be
  // optional, which meant the guard was really a guard against tabs and not
  // against anything else: leave the field out and the whole section could be
  // replaced with whatever was sent, no questions asked. The dashboard has
  // always sent it, so nothing that should work stops working.
  const current = await contentVersion(key)
  if (!version) {
    return NextResponse.json(
      {
        error:
          'This save did not say which version it was built on. Reload the section and try again.',
        version: current,
      },
      { status: 428 },
    )
  }
  if (version !== current) {
    return NextResponse.json(
      {
        error:
          'This section was changed elsewhere since you opened it. Press Revert to load the current version, then make your edit again.',
        version: current,
      },
      { status: 409 },
    )
  }

  await writeContent(key, data)
  await audit({
    request,
    actor: session.username,
    role: session.role,
    action: 'content-save',
    target: key,
    detail: `${JSON.stringify(data).length} characters`,
  })
  // Push the edit to the public site straight away rather than waiting for the
  // homepage's five minute revalidation window.
  revalidatePath('/')
  revalidatePath('/sitemap.xml')

  return NextResponse.json({ ok: true, key, version: await contentVersion(key) })
}
