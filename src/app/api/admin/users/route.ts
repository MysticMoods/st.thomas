import { NextResponse } from 'next/server'

import { audit } from '@/lib/audit'
import { currentSession, requireOwner } from '@/lib/auth'
import {
  type Role,
  ROLE_LABELS,
  asRole,
  isRole,
  mayManagePeople,
} from '@/lib/permissions'
import { CONTENT_KEYS, type ContentKey } from '@/lib/types'
import {
  MIN_PASSWORD,
  type User,
  hashPassword,
  newId,
  ownersLeft,
  passwordProblem,
  publicUser,
  readUsers,
  writeUsers,
} from '@/lib/users'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Parish staff accounts.
 *
 * Owners may make, change and remove accounts. An editor may do exactly one
 * thing here: change their own password. The last owner cannot be removed,
 * demoted or disabled, because a parish locked out of its own dashboard has no
 * way back in short of editing files on the server.
 */

function bad(error: string, status = 422) {
  return NextResponse.json({ error }, { status })
}

/**
 * The sections an account may edit, taken from what the browser sent.
 *
 * Only names the site actually has are kept. A section that does not exist
 * would sit in the file for ever, and a list quietly full of typos is a list
 * that grants nothing while looking as though it grants something.
 */
function readSections(value: unknown): ContentKey[] {
  if (!Array.isArray(value)) return []
  const known = new Set<string>(CONTENT_KEYS)
  return [...new Set(value.map(String))].filter((key): key is ContentKey =>
    known.has(key),
  )
}

export async function GET() {
  const session = await currentSession()
  if (!session) return bad('Unauthorised', 401)

  const all = await readUsers()
  // Everybody needs to know who they are — it is how the dashboard decides what
  // to show them, and how somebody changes their own password. Only an owner
  // needs the roster. A treasurer has no business reading the staff list.
  const users = mayManagePeople(session.role)
    ? all
    : all.filter((user) => user.username === session.username)

  return NextResponse.json(
    {
      users: users.map(publicUser),
      you: session,
      /** True while the environment pair is still the only way in. */
      bootstrap: all.every((user) => user.disabled),
      minPassword: MIN_PASSWORD,
      // The panel offers exactly what the server will accept, so the two can
      // never drift into showing a role that is then refused.
      roles: Object.entries(ROLE_LABELS).map(([id, r]) => ({ id, ...r })),
      sections: CONTENT_KEYS,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(request: Request) {
  const owner = await requireOwner()
  if (!owner) return bad('Only an owner may add accounts', 403)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return bad('Invalid request body', 400)
  }

  const username = String(body?.username ?? '').trim().toLowerCase()
  const name = String(body?.name ?? '').trim().slice(0, 80)
  const password = String(body?.password ?? '')
  const role: Role = isRole(body?.role) ? body.role : 'editor'
  const sections = readSections(body?.sections)

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return bad('A user ID is 3 to 32 letters, digits, dot, dash or underscore.')
  }
  if (!name) return bad('Give the person a name.')
  const problem = passwordProblem(password)
  if (problem) return bad(problem)

  const users = await readUsers()
  if (users.some((user) => user.username === username)) {
    return bad('That user ID is already taken.', 409)
  }

  // The first stored account replaces the environment login. Make sure the
  // parish keeps a way in by insisting the first one is an owner.
  const first = users.length === 0
  const { salt, hash } = hashPassword(password)
  const record: User = {
    id: newId(),
    username,
    name,
    role: first ? 'owner' : role,
    ...(sections.length ? { sections } : {}),
    salt,
    hash,
    createdAt: new Date().toISOString(),
  }

  users.push(record)
  await writeUsers(users)
  await audit({
    request,
    actor: owner.username,
    role: owner.role,
    action: 'user-create',
    target: username,
    detail: `${record.role}${first ? ' — first stored account' : ''}`,
  })

  return NextResponse.json({ ok: true, user: publicUser(record), replacedBootstrap: first })
}

export async function PATCH(request: Request) {
  const session = await currentSession()
  if (!session) return bad('Unauthorised', 401)

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return bad('Invalid request body', 400)
  }

  const id = String(body?.id ?? '')
  const users = await readUsers()
  const user = users.find((entry) => entry.id === id)
  if (!user) return bad('No such account', 404)

  const isOwner = session.role === 'owner'
  const isSelf = user.username === session.username
  if (!isOwner && !isSelf) return bad('You may only change your own password', 403)

  const changed: string[] = []

  if (typeof body.password === 'string' && body.password) {
    const problem = passwordProblem(body.password)
    if (problem) return bad(problem)
    const { salt, hash } = hashPassword(body.password)
    user.salt = salt
    user.hash = hash
    changed.push('password')
  }

  if (typeof body.name === 'string' && body.name.trim()) {
    user.name = body.name.trim().slice(0, 80)
    changed.push('name')
  }

  if (isOwner && isRole(body.role)) {
    const next = asRole(body.role)
    if (user.role === 'owner' && next !== 'owner' && ownersLeft(users, user.id) === 0) {
      return bad('This is the last owner. Make somebody else an owner first.', 409)
    }
    user.role = next
    changed.push(`role ${next}`)
  }

  // Which pages they may edit. Only an owner sets it, and an empty list means
  // every section — the same as an account made before any of this existed.
  if (isOwner && body.sections !== undefined) {
    const sections = readSections(body.sections)
    if (sections.length) user.sections = sections
    else delete user.sections
    changed.push(sections.length ? `${sections.length} sections` : 'all sections')
  }

  if (isOwner && typeof body.disabled === 'boolean') {
    if (body.disabled && user.role === 'owner' && ownersLeft(users, user.id) === 0) {
      return bad('This is the last owner. Make somebody else an owner first.', 409)
    }
    user.disabled = body.disabled
    changed.push(body.disabled ? 'suspended' : 'restored')
  }

  if (changed.length === 0) return bad('Nothing to change.')

  await writeUsers(users)
  await audit({
    request,
    actor: session.username,
    role: session.role,
    action: 'user-update',
    target: user.username,
    detail: changed.join(', '),
  })

  return NextResponse.json({ ok: true, user: publicUser(user) })
}

export async function DELETE(request: Request) {
  const owner = await requireOwner()
  if (!owner) return bad('Only an owner may remove accounts', 403)

  let id = ''
  try {
    id = String((await request.json())?.id ?? '')
  } catch {
    return bad('Invalid request body', 400)
  }

  const users = await readUsers()
  const user = users.find((entry) => entry.id === id)
  if (!user) return bad('No such account', 404)
  if (user.username === owner.username) return bad('You cannot remove your own account.', 409)
  if (user.role === 'owner' && ownersLeft(users, user.id) === 0) {
    return bad('This is the last owner. Make somebody else an owner first.', 409)
  }

  await writeUsers(users.filter((entry) => entry.id !== id))
  await audit({
    request,
    actor: owner.username,
    role: owner.role,
    action: 'user-delete',
    target: user.username,
  })

  return NextResponse.json({ ok: true })
}
