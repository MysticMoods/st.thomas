/*
 * Moves what the parish has on disk into Supabase, once.
 *
 *   node scripts/migrate-to-supabase.mjs           see what would move
 *   node scripts/migrate-to-supabase.mjs --write   move it
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_KEY from .env.local. Safe to run
 * again: content sections and uploaded files are written by name, so a second
 * run overwrites rather than duplicates. Record lists are the exception — they
 * are appended, so the script refuses to touch a list that already holds rows
 * unless you pass --replace-lists.
 *
 * Nothing on disk is deleted. If the move goes wrong, clear the two settings in
 * .env.local and the site is back on its files as though nothing happened.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const CONTENT = path.join(ROOT, 'content')
const UPLOADS = path.join(ROOT, 'public', 'uploads')

const WRITE = process.argv.includes('--write')
const REPLACE_LISTS = process.argv.includes('--replace-lists')
// The lists a development machine fills with its own testing: messages from
// nobody, an activity log of test runs, letters posted to example.com. A parish
// starting for real is better off without them.
const NO_LISTS = process.argv.includes('--no-lists')

/** The seventeen sections the parish edits. */
const CONTENT_KEYS = [
  'site', 'about', 'mass', 'events', 'clergy', 'past-priests', 'stats',
  'ministries', 'gallery', 'notices', 'media', 'leadership', 'hall',
  'obituaries', 'committee', 'donation', 'office',
]

/** The lists the forms write into. */
const RECORD_LISTS = [
  'messages', 'donations', 'hall-bookings', 'hall-reviews',
  'audit', 'errors', 'outbox', 'intentions', 'certificates', 'prayers',
]

/** Small singleton files that are not part of the public schema. */
const STATE_KEYS = ['users', 'analytics']

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.avif': 'image/avif', '.pdf': 'application/pdf',
}

// ------------------------------------------------------------------ settings
function readEnv() {
  const file = path.join(ROOT, '.env.local')
  if (!existsSync(file)) throw new Error('No .env.local — nothing to read the settings from.')
  const out = {}
  for (const line of readFileSync(file, 'utf-8').split(/\r?\n/)) {
    if (!line.includes('=') || line.trim().startsWith('#')) continue
    out[line.slice(0, line.indexOf('=')).trim()] = line.slice(line.indexOf('=') + 1).trim()
  }
  return out
}

const env = readEnv()
const URL_BASE = (env.SUPABASE_URL || '').replace(/\/$/, '')
const KEY = env.SUPABASE_SERVICE_KEY || ''
if (!URL_BASE || !KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY must both be set in .env.local')
  process.exit(1)
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
}

async function rest(pathname, init = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${pathname}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  })
  if (!res.ok) {
    throw new Error(`${res.status} on ${pathname}: ${(await res.text()).slice(0, 300)}`)
  }
  const body = await res.text()
  return body ? JSON.parse(body) : []
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch {
    return undefined
  }
}

function version() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function kb(bytes) {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

// ------------------------------------------------------------------- the work
const plan = []
let moved = 0

async function moveDocuments() {
  for (const key of CONTENT_KEYS) {
    const file = path.join(CONTENT, `${key}.json`)
    const data = readJson(file)
    if (data === undefined) {
      plan.push(`  ${key.padEnd(14)} MISSING on disk — skipped`)
      continue
    }
    plan.push(`  ${key.padEnd(14)} ${kb(statSync(file).size)}`)
    if (!WRITE) continue
    await rest('documents', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key, data, version: version(), updated_at: new Date().toISOString() }),
    })
    moved += 1
  }

  for (const key of STATE_KEYS) {
    const data = readJson(path.join(CONTENT, `${key}.json`))
    if (data === undefined) continue
    plan.push(`  state:${key.padEnd(8)} kept`)
    if (!WRITE) continue
    await rest('documents', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        key: `state:${key}`,
        data,
        version: version(),
        updated_at: new Date().toISOString(),
      }),
    })
    moved += 1
  }
}

async function moveRecords() {
  if (NO_LISTS) {
    plan.push('  left behind (--no-lists)')
    return
  }
  for (const list of RECORD_LISTS) {
    const rows = readJson(path.join(CONTENT, `${list}.json`))
    if (!Array.isArray(rows) || rows.length === 0) continue

    const existing = await rest(
      `records?list=eq.${encodeURIComponent(list)}&select=id&limit=1`,
    )
    if (existing.length && !REPLACE_LISTS) {
      plan.push(`  ${list.padEnd(14)} ${rows.length} on disk — ALREADY HAS ROWS, skipped`)
      continue
    }

    plan.push(`  ${list.padEnd(14)} ${rows.length} records`)
    if (!WRITE) continue

    if (existing.length) {
      await rest(`records?list=eq.${encodeURIComponent(list)}`, {
        method: 'DELETE',
        headers: { Prefer: 'return=minimal' },
      })
    }

    // Oldest first, so the newest still comes back first when read by date.
    const body = [...rows].reverse().map((record) => ({
      list,
      at: record?.at && !Number.isNaN(Date.parse(record.at)) ? record.at : new Date().toISOString(),
      data: record,
    }))
    for (let i = 0; i < body.length; i += 200) {
      await rest('records', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(body.slice(i, i + 200)),
      })
    }
    moved += rows.length
  }
}

async function moveUploads() {
  if (!existsSync(UPLOADS)) return
  const names = readdirSync(UPLOADS).filter((name) => !name.startsWith('.'))

  for (const name of names) {
    const file = path.join(UPLOADS, name)
    const type = CONTENT_TYPES[path.extname(name).toLowerCase()]
    if (!type) {
      plan.push(`  ${name} — not a kind the site serves, skipped`)
      continue
    }
    plan.push(`  ${name.slice(0, 46).padEnd(48)} ${kb(statSync(file).size)}`)
    if (!WRITE) continue

    const res = await fetch(`${URL_BASE}/storage/v1/object/uploads/${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: {
        apikey: KEY,
        Authorization: `Bearer ${KEY}`,
        'Content-Type': type,
        'cache-control': 'public, max-age=31536000, immutable',
        'x-upsert': 'true',
      },
      body: new Uint8Array(readFileSync(file)),
    })
    if (!res.ok && res.status !== 409) {
      throw new Error(`upload ${name}: ${res.status} ${(await res.text()).slice(0, 200)}`)
    }
    moved += 1
  }
}

// ----------------------------------------------------------------------- run
console.log(WRITE ? 'Moving the parish onto Supabase.' : 'Dry run — nothing will be written.')
console.log(`  ${URL_BASE}\n`)

console.log('Content sections')
await moveDocuments()
console.log(plan.splice(0).join('\n'))

console.log('\nRecord lists')
await moveRecords()
console.log(plan.splice(0).join('\n') || '  (all empty)')

console.log('\nUploaded files')
await moveUploads()
console.log(plan.splice(0).join('\n') || '  (none)')

console.log(
  WRITE
    ? `\nDone — ${moved} things moved. The files on disk were left alone.`
    : '\nNothing was written. Run again with --write to move it.',
)
