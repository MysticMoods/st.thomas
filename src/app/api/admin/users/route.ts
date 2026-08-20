import { NextResponse } from 'next/server'

import { audit } from '@/lib/audit'
import { currentSession, requireOwner } from '@/lib/auth'
import {
  MIN_PASSWORD,
  type Role,
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

export async function GET() {
  const session = await currentSession()
  if (!session) return bad('Unauthorised', 401)

  const users = await readUsers()
  return NextResponse.json(
    {
      users: users.map(publicUser),
      you: session,
      /** True while the environment pair is still the only way in. */
      bootstrap: users.length === 0,
      minPassword: MIN_PASSWORD,
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
  const role: Role = body?.role === 'owner' ? 'owner' : 'editor'

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

  if (isOwner && (body.role === 'owner' || body.role === 'editor')) {
    if (user.role === 'owner' && body.role === 'editor' && ownersLeft(users, user.id) === 0) {
      return bad('This is the last owner. Make somebody else an owner first.', 409)
    }
    user.role = body.role
    changed.push(`role ${body.role}`)
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
