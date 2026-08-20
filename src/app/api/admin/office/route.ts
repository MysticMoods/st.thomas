import path from 'node:path'

import { NextResponse } from 'next/server'

import { audit } from '@/lib/audit'
import { currentSession } from '@/lib/auth'
import { readContent, readRecords, writeJson } from '@/lib/content'
import { officeDecided } from '@/lib/letters'
import { post } from '@/lib/mail'
import type { OfficeContent } from '@/lib/types'
import type { OfficeKind, OfficeRequest } from '@/app/api/office/route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const KINDS: OfficeKind[] = ['intentions', 'certificates', 'prayers']
const STATUSES = new Set(['pending', 'done', 'declined'])

function fileFor(kind: OfficeKind) {
  return path.join(process.cwd(), 'content', `${kind}.json`)
}

/** Everything waiting at the parish office, all three queues at once. */
export async function GET() {
  if (!(await currentSession())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const [intentions, certificates, prayers] = await Promise.all(
    KINDS.map((kind) => readRecords(kind) as Promise<OfficeRequest[]>),
  )

  return NextResponse.json(
    { intentions, certificates, prayers },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

/**
 * Marks one request done or declined, and tells the person who asked — a
 * certificate ready to collect is worth an email rather than a second visit.
 */
export async function PATCH(request: Request) {
  const staff = await currentSession()
  if (!staff) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const kind = String(body?.kind ?? '') as OfficeKind
  const id = String(body?.id ?? '')
  const status = String(body?.status ?? '')
  const note = String(body?.note ?? '').trim().slice(0, 300)

  if (!KINDS.includes(kind) || !id || !STATUSES.has(status)) {
    return NextResponse.json({ error: 'Need a request and a status' }, { status: 422 })
  }

  const list = (await readRecords(kind)) as OfficeRequest[]
  const found = list.find((entry) => entry.id === id)
  if (!found) return NextResponse.json({ error: 'No such request' }, { status: 404 })

  found.status = status as OfficeRequest['status']
  found.decidedAt = new Date().toISOString()
  if (note) found.note = note

  await writeJson(fileFor(kind), list)

  if (status === 'done' && found.email) {
    const office = await readContent<OfficeContent>('office')
    const label =
      kind === 'certificates'
        ? office.certificates.types.find((entry) => entry.id === found.type)?.label.en ?? 'Certificate'
        : office.intentions.types.find((entry) => entry.id === found.type)?.label.en ?? 'Holy Mass'
    post(officeDecided(found, label, note))
  }

  await audit({
    request,
    actor: staff.username,
    role: staff.role,
    action: 'office-decide',
    target: id,
    detail: `${kind} ${found.type || ''} -> ${status}`.trim(),
  })

  return NextResponse.json({ ok: true, request: found })
}

/** Removes one outright — a duplicate, or something sent in error. */
export async function DELETE(request: Request) {
  const staff = await currentSession()
  if (!staff) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let kind = '' as OfficeKind
  let id = ''
  try {
    const body = await request.json()
    kind = String(body?.kind ?? '') as OfficeKind
    id = String(body?.id ?? '')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!KINDS.includes(kind) || !id) {
    return NextResponse.json({ error: 'Need a request' }, { status: 422 })
  }

  const list = (await readRecords(kind)) as OfficeRequest[]
  const left = list.filter((entry) => entry.id !== id)
  if (left.length === list.length) {
    return NextResponse.json({ error: 'No such request' }, { status: 404 })
  }

  await writeJson(fileFor(kind), left)
  await audit({
    request,
    actor: staff.username,
    role: staff.role,
    action: 'office-delete',
    target: id,
    detail: kind,
  })

  return NextResponse.json({ ok: true })
}
