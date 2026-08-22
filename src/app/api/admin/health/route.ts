import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { NextResponse } from 'next/server'

import { store } from '@/lib/store'

import { isAuthenticated } from '@/lib/auth'
import { readRecords } from '@/lib/content'
import { mailConfigured, readOutbox } from '@/lib/mail'
import { readFaults } from '@/lib/report'
import { readUsers } from '@/lib/users'
import { CONTENT_KEYS } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STARTED = Date.now()

const CONTENT = path.join(process.cwd(), 'content')
const UPLOADS = path.join(process.cwd(), 'public', 'uploads')

/** Bytes held by everything in one directory, one level deep. */
async function sizeOf(dir: string) {
  try {
    const names = await fs.readdir(dir)
    const sizes = await Promise.all(
      names.map(async (name) => {
        try {
          const stat = await fs.stat(path.join(dir, name))
          return stat.isFile() ? stat.size : 0
        } catch {
          return 0
        }
      }),
    )
    return { files: names.length, bytes: sizes.reduce((sum, n) => sum + n, 0) }
  } catch {
    return { files: 0, bytes: 0 }
  }
}

/**
 * What the parish office needs to know about the machine underneath: whether
 * the settings that matter are actually set, whether it can still write, and
 * how much has piled up.
 */
export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const writable = await store.writable()

  const missing: string[] = []
  for (const key of CONTENT_KEYS) {
    try {
      await fs.access(path.join(CONTENT, `${key}.json`))
    } catch {
      missing.push(key)
    }
  }

  const users = await readUsers()
  const secret = process.env.ADMIN_SESSION_SECRET ?? ''
  const faults = await readFaults()

  // Settings that are wrong rather than merely unset get said plainly.
  const warnings: string[] = []
  if (!writable) {
    warnings.push(
      store.name === 'disk'
        ? 'The content folder cannot be written to — no edit will save.'
        : 'The database cannot be written to — no edit will save. Check the storage settings.',
    )
  }
  if (missing.length) warnings.push(`Missing content files: ${missing.join(', ')}`)
  if (secret.length < 32) {
    warnings.push('ADMIN_SESSION_SECRET is short or unset. Use a long random string.')
  }
  if (users.length === 0) {
    warnings.push('No staff accounts yet — the site is still using the .env.local login.')
  }
  if (process.env.ADMIN_PASSWORD === 'mangalassery1893') {
    warnings.push('The demo password from .env.example is still in use.')
  }
  if (users.length === 0 && !process.env.ADMIN_PASSWORD && process.env.NODE_ENV === 'production') {
    warnings.push(
      'No accounts and no ADMIN_PASSWORD — nobody can sign in. Set one in .env.local and restart.',
    )
  }
  if (process.env.NODE_ENV === 'production' && !process.env.RAZORPAY_KEY_ID) {
    warnings.push('Razorpay is not configured — online giving falls back to bank and UPI details.')
  }
  if (!mailConfigured()) {
    warnings.push(
      'No mail server is set up. Nothing the site writes is being delivered — see Letters sent.',
    )
  } else {
    const failed = (await readOutbox()).filter((letter) => letter.status === 'failed').length
    if (failed > 0) warnings.push(`${failed} letters could not be delivered — see Letters sent.`)
  }

  const [contentSize, uploadSize, backupSize] = await Promise.all([
    sizeOf(CONTENT),
    sizeOf(UPLOADS),
    sizeOf(path.join(CONTENT, '.backups')),
  ])

  const counts = {
    messages: (await readRecords('messages')).length,
    subscribers: (await readRecords('subscribers')).length,
    donations: (await readRecords('donations')).length,
    'hall-bookings': (await readRecords('hall-bookings')).length,
    'hall-reviews': (await readRecords('hall-reviews')).length,
    audit: (await readRecords('audit')).length,
    outbox: (await readRecords('outbox')).length,
  }

  return NextResponse.json(
    {
      ok: warnings.length === 0,
      warnings,
      writable,
      missing,
      uptimeSeconds: Math.round((Date.now() - STARTED) / 1000),
      node: process.version,
      platform: `${os.type()} ${os.release()}`,
      environment: process.env.NODE_ENV ?? 'development',
      accounts: users.length,
      mail: mailConfigured(),
      openFaults: faults.filter((fault) => !fault.cleared).length,
      storage: { content: contentSize, uploads: uploadSize, backups: backupSize },
      counts,
      at: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
