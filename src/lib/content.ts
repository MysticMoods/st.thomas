import { promises as fs } from 'fs'
import path from 'path'

import type { Content, ContentKey } from './types'
import { CONTENT_KEYS } from './types'

const DIR = path.join(process.cwd(), 'content')

function file(key: ContentKey) {
  return path.join(DIR, `${key}.json`)
}

/** Reads one content file. Throws if the key is not part of the schema. */
export async function readContent<T = unknown>(key: ContentKey): Promise<T> {
  if (!CONTENT_KEYS.includes(key)) throw new Error(`Unknown content key: ${key}`)
  const raw = await fs.readFile(file(key), 'utf-8')
  return JSON.parse(raw) as T
}

/**
 * A cheap fingerprint of the file as it stands right now. The dashboard sends
 * back the version it loaded, so a save made from a stale editor — a second tab,
 * or another member of staff who saved first — is rejected instead of silently
 * overwriting the newer copy.
 */
export async function contentVersion(key: ContentKey): Promise<string> {
  if (!CONTENT_KEYS.includes(key)) throw new Error(`Unknown content key: ${key}`)
  const stat = await fs.stat(file(key))
  return `${stat.mtimeMs.toFixed(0)}-${stat.size}`
}

const BACKUPS = path.join(DIR, '.backups')
const KEEP_BACKUPS = 20

/** Copies the current file aside before it is overwritten. Never fatal. */
async function backup(key: ContentKey) {
  try {
    const current = await fs.readFile(file(key), 'utf-8')
    await fs.mkdir(BACKUPS, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    await fs.writeFile(path.join(BACKUPS, `${key}.${stamp}.json`), current, 'utf-8')

    // keep only the most recent copies of this key
    const all = (await fs.readdir(BACKUPS))
      .filter((name) => name.startsWith(`${key}.`))
      .sort()
    await Promise.all(
      all.slice(0, Math.max(0, all.length - KEEP_BACKUPS)).map((name) =>
        fs.rm(path.join(BACKUPS, name), { force: true }),
      ),
    )
  } catch {
    /* a missing or unreadable original must not block the save */
  }
}

/**
 * Writes one content file, pretty printed so it stays reviewable in git.
 *
 * The previous version is copied to `content/.backups/` first, and the new one
 * is written to a temporary file and renamed into place — a crash mid-write can
 * never leave a half-written, unparseable content file behind.
 */
/**
 * Writes JSON where a half-written file would be worse than a slow one.
 *
 * The write goes to a temporary file and is renamed into place, which is atomic
 * on a normal filesystem. On Windows the rename can fail with EPERM while
 * something else holds the file open for a moment — OneDrive syncing this
 * folder, a virus scanner, a concurrent reader — so it is retried, and only
 * then does it fall back to writing in place.
 */
export async function writeJson(target: string, data: unknown): Promise<void> {
  const body = `${JSON.stringify(data, null, 2)}
`
  const temp = `${target}.${process.pid}.${Math.random().toString(36).slice(2, 8)}.tmp`
  await fs.writeFile(temp, body, 'utf-8')

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await fs.rename(temp, target)
      return
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 40 * (attempt + 1)))
    }
  }

  // The rename never got through. Write straight to the file — the rolling
  // backup taken beforehand is the safety net if this one is interrupted.
  await fs.writeFile(target, body, 'utf-8')
  await fs.rm(temp, { force: true })
}

export async function writeContent(key: ContentKey, data: unknown): Promise<void> {
  if (!CONTENT_KEYS.includes(key)) throw new Error(`Unknown content key: ${key}`)

  await backup(key)
  await writeJson(file(key), data)
}

/** Loads every content file for the public site. */
export async function getContent(): Promise<Content> {
  const [
    site,
    about,
    mass,
    events,
    clergy,
    pastPriests,
    stats,
    ministries,
    gallery,
    notices,
    media,
    leadership,
    hall,
    obituaries,
    committee,
    donation,
    office,
  ] = await Promise.all([
    readContent('site'),
    readContent('about'),
    readContent('mass'),
    readContent('events'),
    readContent('clergy'),
    readContent('past-priests'),
    readContent('stats'),
    readContent('ministries'),
    readContent('gallery'),
    readContent('notices'),
    readContent('media'),
    readContent('leadership'),
    readContent('hall'),
    readContent('obituaries'),
    readContent('committee'),
    readContent('donation'),
    readContent('office'),
  ])

  return {
    site,
    about,
    mass,
    events,
    clergy,
    pastPriests,
    stats,
    ministries,
    gallery,
    notices,
    media,
    leadership,
    hall,
    obituaries,
    committee,
    donation,
    office,
  } as Content
}

/** Runtime lists written by the public forms, not by the dashboard editor. */
export type RecordList =
  | 'subscribers'
  | 'messages'
  | 'donations'
  | 'hall-bookings'
  | 'hall-reviews'
  /** Who did what in the dashboard — see lib/audit.ts. */
  | 'audit'
  /** Faults reported by the server and by browsers — see lib/report.ts. */
  | 'errors'
  /** Every letter the site has tried to post — see lib/mail.ts. */
  | 'outbox'
  /** Asked for at the parish office — see app/api/office. */
  | 'intentions'
  | 'certificates'
  | 'prayers'

/**
 * One queue per file, so two appends at the same moment cannot lose one.
 *
 * Appending is read, change, write. Two requests arriving together — the letter
 * to the office and the letter to the family, or two families sending a hall
 * request in the same second — would both read the same list and the second
 * write would silently drop the first record. Each file's writes are therefore
 * put in a line.
 */
const queues = new Map<string, Promise<void>>()

/** Appends a record to a small JSON list under content/. */
export async function appendRecord(name: RecordList, record: unknown) {
  const target = path.join(DIR, `${name}.json`)

  const next = (queues.get(target) ?? Promise.resolve()).then(async () => {
    let list: unknown[] = []
    try {
      list = JSON.parse(await fs.readFile(target, 'utf-8'))
      if (!Array.isArray(list)) list = []
    } catch {
      list = []
    }
    list.unshift(record)
    await writeJson(target, list.slice(0, 2000))
  })

  // A failed write must not wedge everything queued behind it.
  queues.set(
    target,
    next.catch(() => {}),
  )
  return next
}

/**
 * The saved copies of one content file, newest first. Backups are named
 * `<key>.<iso timestamp with punctuation replaced>.json`.
 */
export async function listBackups(key: ContentKey) {
  if (!CONTENT_KEYS.includes(key)) throw new Error(`Unknown content key: ${key}`)
  try {
    const names = (await fs.readdir(BACKUPS)).filter((name) => name.startsWith(`${key}.`))
    const entries = await Promise.all(
      names.map(async (name) => {
        const stat = await fs.stat(path.join(BACKUPS, name))
        return { name, at: stat.mtime.toISOString(), size: stat.size }
      }),
    )
    return entries.sort((a, b) => b.name.localeCompare(a.name))
  } catch {
    return []
  }
}

/** Reads one saved copy back. The name is checked, never trusted. */
export async function readBackup(name: string) {
  const key = name.split('.')[0] as ContentKey
  if (!/^[a-z-]+\.[0-9A-Za-z-]+\.json$/.test(name) || !CONTENT_KEYS.includes(key)) {
    throw new Error('Not a backup of this site')
  }
  const raw = await fs.readFile(path.join(BACKUPS, name), 'utf-8')
  return { key, data: JSON.parse(raw) as unknown }
}

export async function readRecords(name: RecordList) {
  try {
    const raw = await fs.readFile(path.join(DIR, `${name}.json`), 'utf-8')
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}
