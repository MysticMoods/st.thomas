import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { ContentKey } from '../types'
import { CONTENT_KEYS } from '../types'
import type { BackupEntry, RecordList, StateKey, Store, StoredFile } from './types'

/**
 * The parish's own disk — what this site has always done, and what a fresh
 * clone still does with no account and nothing to configure.
 *
 * Everything here was lifted out of lib/content.ts unchanged, including the
 * awkward parts that were learned the hard way: the rename retries for OneDrive
 * and virus scanners holding a file open on Windows, and the queue that stops
 * two writes to one file losing each other.
 */

const DIR = path.join(process.cwd(), 'content')
const BACKUPS = path.join(DIR, '.backups')
const UPLOADS = path.join(process.cwd(), 'public', 'uploads')
const KEEP_BACKUPS = 20

function file(key: ContentKey) {
  return path.join(DIR, `${key}.json`)
}

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

/** Copies the current file aside before it is overwritten. Never fatal. */
async function backup(key: ContentKey) {
  try {
    const current = await fs.readFile(file(key), 'utf-8')
    await fs.mkdir(BACKUPS, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    await fs.writeFile(path.join(BACKUPS, `${key}.${stamp}.json`), current, 'utf-8')

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
 * One queue per file, so two writes to the same list cannot lose one another.
 * Appending is read, change, write; two requests arriving together would both
 * read the same list and the second write would silently drop the first record.
 */
const queues = new Map<string, Promise<void>>()

function queued(target: string, work: () => Promise<void>) {
  const next = (queues.get(target) ?? Promise.resolve()).then(work)
  // A failed write must not wedge everything queued behind it.
  queues.set(
    target,
    next.catch(() => {}),
  )
  return next
}

async function readJsonFile<T>(target: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(target, 'utf-8')) as T
  } catch {
    return fallback
  }
}

export const diskStore: Store = {
  name: 'disk',

  async readContent<T>(key: ContentKey): Promise<T> {
    if (!CONTENT_KEYS.includes(key)) throw new Error(`Unknown content key: ${key}`)
    return JSON.parse(await fs.readFile(file(key), 'utf-8')) as T
  },

  async writeContent(key: ContentKey, data: unknown) {
    if (!CONTENT_KEYS.includes(key)) throw new Error(`Unknown content key: ${key}`)
    await backup(key)
    await writeJson(file(key), data)
  },

  async contentVersion(key: ContentKey) {
    if (!CONTENT_KEYS.includes(key)) throw new Error(`Unknown content key: ${key}`)
    const stat = await fs.stat(file(key))
    return `${stat.mtimeMs.toFixed(0)}-${stat.size}`
  },

  async readState<T>(key: StateKey, fallback: T): Promise<T> {
    return readJsonFile(path.join(DIR, `${key}.json`), fallback)
  },

  async writeState(key: StateKey, data: unknown) {
    await writeJson(path.join(DIR, `${key}.json`), data)
  },

  async readRecords<T>(name: RecordList): Promise<T[]> {
    const list = await readJsonFile<unknown>(path.join(DIR, `${name}.json`), [])
    return Array.isArray(list) ? (list as T[]) : []
  },

  async appendRecord(name: RecordList, record: unknown) {
    const target = path.join(DIR, `${name}.json`)
    return queued(target, async () => {
      const list = await readJsonFile<unknown[]>(target, [])
      const all = Array.isArray(list) ? list : []
      all.unshift(record)
      await writeJson(target, all.slice(0, 2000))
    })
  },

  async updateRecords<T>(name: RecordList, update: (list: T[]) => T[]) {
    const target = path.join(DIR, `${name}.json`)
    return queued(target, async () => {
      const list = await readJsonFile<unknown[]>(target, [])
      await writeJson(target, update((Array.isArray(list) ? list : []) as T[]))
    })
  },

  async listBackups(key: ContentKey): Promise<BackupEntry[]> {
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
  },

  async readBackup(name: string) {
    const key = name.split('.')[0] as ContentKey
    if (!/^[a-z-]+\.[0-9A-Za-z-]+\.json$/.test(name) || !CONTENT_KEYS.includes(key)) {
      throw new Error('Not a backup of this site')
    }
    const raw = await fs.readFile(path.join(BACKUPS, name), 'utf-8')
    return { key, data: JSON.parse(raw) as unknown }
  },

  async putFile(name: string, body: Buffer): Promise<StoredFile> {
    await fs.mkdir(UPLOADS, { recursive: true })
    await fs.writeFile(path.join(UPLOADS, name), body)
    return { url: `/uploads/${name}`, bytes: body.byteLength }
  },

  async deleteFile(name: string) {
    // One flat folder of names the upload route made; nothing else is ours.
    if (name !== path.basename(name) || name.startsWith('.')) throw new Error('Not an upload')
    await fs.rm(path.join(UPLOADS, name), { force: true })
  },

  async writable() {
    try {
      const probe = path.join(DIR, `.writable-${process.pid}.tmp`)
      await fs.writeFile(probe, 'ok', 'utf-8')
      await fs.rm(probe, { force: true })
      return true
    } catch {
      return false
    }
  },
}
