import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { audit } from '@/lib/audit'
import { requireOwner, requireArea } from '@/lib/auth'
import { listBackups, readBackup, writeContent } from '@/lib/content'
import { CONTENT_KEYS, type ContentKey } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * The saved copies kept under `content/.backups/`.
 *
 * Twenty are kept per section, written automatically before every save. Until
 * now they could only be recovered by opening a terminal on the server; this
 * lets an owner read one and put it back.
 */

function guard(key: string): key is ContentKey {
  return (CONTENT_KEYS as readonly string[]).includes(key)
}

export async function GET(request: Request) {
  if (!(await requireArea('system'))) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const url = new URL(request.url)
  const file = url.searchParams.get('file')

  // One saved copy, so it can be read before it is put back.
  if (file) {
    try {
      const { key, data } = await readBackup(file)
      return NextResponse.json({ file, key, data }, { headers: { 'Cache-Control': 'no-store' } })
    } catch {
      return NextResponse.json({ error: 'No such saved copy' }, { status: 404 })
    }
  }

  const key = url.searchParams.get('key') ?? ''
  if (key) {
    if (!guard(key)) return NextResponse.json({ error: 'Unknown section' }, { status: 404 })
    return NextResponse.json(
      { key, backups: await listBackups(key) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // A count per section, for the overview.
  const counts = await Promise.all(
    CONTENT_KEYS.map(async (entry) => ({
      key: entry,
      backups: (await listBackups(entry)).length,
      latest: (await listBackups(entry))[0]?.at ?? null,
    })),
  )
  return NextResponse.json({ sections: counts }, { headers: { 'Cache-Control': 'no-store' } })
}

/** Puts a saved copy back. The version being replaced is itself backed up. */
export async function POST(request: Request) {
  const owner = await requireOwner()
  if (!owner) {
    return NextResponse.json({ error: 'Only an owner may restore a backup' }, { status: 403 })
  }

  let file = ''
  try {
    file = String((await request.json())?.file ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!file) return NextResponse.json({ error: 'Name the copy to restore' }, { status: 422 })

  let restored: { key: ContentKey; data: unknown }
  try {
    restored = await readBackup(file)
  } catch {
    return NextResponse.json({ error: 'No such saved copy' }, { status: 404 })
  }

  // writeContent backs up what is there now first, so a restore is reversible.
  await writeContent(restored.key, restored.data)
  revalidatePath('/')

  await audit({
    request,
    actor: owner.username,
    role: owner.role,
    action: 'content-restore',
    target: restored.key,
    detail: file,
  })

  return NextResponse.json({ ok: true, key: restored.key })
}
