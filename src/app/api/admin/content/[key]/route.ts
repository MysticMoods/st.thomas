import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { isAuthenticated } from '@/lib/auth'
import { contentVersion, readContent, writeContent } from '@/lib/content'
import { CONTENT_KEYS, type ContentKey } from '@/lib/types'

export const runtime = 'nodejs'

function guard(key: string): key is ContentKey {
  return (CONTENT_KEYS as readonly string[]).includes(key)
}

export async function GET(_request: Request, ctx: { params: Promise<{ key: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const { key } = await ctx.params
  if (!guard(key)) return NextResponse.json({ error: 'Unknown section' }, { status: 404 })

  return NextResponse.json({
    key,
    data: await readContent(key),
    version: await contentVersion(key),
  })
}

export async function PUT(request: Request, ctx: { params: Promise<{ key: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }
  const { key } = await ctx.params
  if (!guard(key)) return NextResponse.json({ error: 'Unknown section' }, { status: 404 })

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
  const current = await contentVersion(key)
  if (version && version !== current) {
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
  // Push the edit to the public site straight away rather than waiting for the
  // homepage's five minute revalidation window.
  revalidatePath('/')
  revalidatePath('/sitemap.xml')

  return NextResponse.json({ ok: true, key, version: await contentVersion(key) })
}
