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
export async function writeContent(key: ContentKey, data: unknown): Promise<void> {
  if (!CONTENT_KEYS.includes(key)) throw new Error(`Unknown content key: ${key}`)

  await backup(key)

  const target = file(key)
  const temp = `${target}.${process.pid}.tmp`
  await fs.writeFile(temp, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  await fs.rename(temp, target)
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
    upcoming,
    obituaries,
    committee,
    donation,
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
    readContent('upcoming'),
    readContent('obituaries'),
    readContent('committee'),
    readContent('donation'),
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
    upcoming,
    obituaries,
    committee,
    donation,
  } as Content
}

/** Runtime lists written by the public forms, not by the dashboard editor. */
export type RecordList = 'subscribers' | 'messages' | 'donations'

/** Appends a record to a small JSON list under content/. */
export async function appendRecord(name: RecordList, record: unknown) {
  const target = path.join(DIR, `${name}.json`)
  let list: unknown[] = []
  try {
    list = JSON.parse(await fs.readFile(target, 'utf-8'))
    if (!Array.isArray(list)) list = []
  } catch {
    list = []
  }
  list.unshift(record)
  await fs.writeFile(target, JSON.stringify(list.slice(0, 2000), null, 2) + '\n', 'utf-8')
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
