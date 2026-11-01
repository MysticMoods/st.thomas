import { store } from '@/lib/store'
import { CONTENT_KEYS, type ContentKey } from '@/lib/types'

/**
 * Photographs and PDFs that a save stopped using.
 *
 * Replacing a photograph shows the new one at once, but the old file is kept for
 * fourteen days so the change can still be undone — by putting the old path back,
 * or by restoring an earlier copy of the section. After that, if nothing on the
 * site uses it any more, the file is deleted.
 *
 * The rule is decided at deletion time, not at save time: a file is only ever
 * removed when no section refers to it *now*. Moving a photograph from one
 * section to another, or putting it back on day thirteen, therefore never loses
 * it. Only files the dashboard uploaded (/uploads/...) are touched; the curated
 * photography under /images is part of the site itself.
 */

const KEEP_DAYS = 14
const DAY = 24 * 60 * 60 * 1000

type Retired = { file: string; since: string }

const UPLOAD = /\/uploads\/([A-Za-z0-9][A-Za-z0-9._-]*)/g

/** Every upload a piece of content refers to, by file name. */
function uploadsIn(data: unknown): Set<string> {
  const found = new Set<string>()
  const text = JSON.stringify(data ?? null)
  for (const match of text.matchAll(UPLOAD)) found.add(match[1])
  return found
}

/**
 * The list is read, changed and written back by saves and by the sweep alike.
 * Run one at a time, or a sweep finishing late would write back a list that
 * never heard of what a save had just added.
 */
let queue: Promise<unknown> = Promise.resolve()
function oneAtATime<T>(work: () => Promise<T>): Promise<T> {
  const run = queue.then(work, work)
  queue = run.catch(() => undefined)
  return run
}

async function everythingInUse(): Promise<Set<string>> {
  const all = await Promise.all(
    CONTENT_KEYS.map((key) => store.readContent(key).catch(() => null)),
  )
  const used = new Set<string>()
  for (const section of all) for (const name of uploadsIn(section)) used.add(name)
  return used
}

/**
 * Called after a section is saved, with what it held before. Notes each upload
 * the save dropped. Never throws — a save has already happened by now.
 */
export function noteDropped(key: ContentKey, before: unknown, after: unknown) {
  return oneAtATime(() => dropped(key, before, after))
}

async function dropped(key: ContentKey, before: unknown, after: unknown) {
  try {
    const kept = uploadsIn(after)
    const gone = [...uploadsIn(before)].filter((name) => !kept.has(name))
    if (gone.length === 0) return

    const list = await store.readState<Retired[]>('retired', [])
    const already = new Set(list.map((entry) => entry.file))
    const since = new Date().toISOString()
    for (const file of gone) if (!already.has(file)) list.push({ file, since })
    await store.writeState('retired', list)
  } catch (error) {
    console.error(`[retire] could not note what ${key} dropped`, error)
  }
}

/**
 * Deletes what has been unused for fourteen days. Anything back in use is
 * simply taken off the list. Safe to call as often as you like.
 */
export function sweepRetired(now = Date.now()): Promise<{ deleted: string[] }> {
  return oneAtATime(() => sweep(now))
}

async function sweep(now: number): Promise<{ deleted: string[] }> {
  const deleted: string[] = []
  try {
    const list = await store.readState<Retired[]>('retired', [])
    if (list.length === 0) return { deleted }

    const used = await everythingInUse()
    const waiting: Retired[] = []
    for (const entry of list) {
      if (used.has(entry.file)) continue // back in use: never delete it
      if (now - Date.parse(entry.since) < KEEP_DAYS * DAY) {
        waiting.push(entry)
        continue
      }
      try {
        await store.deleteFile(entry.file)
        deleted.push(entry.file)
      } catch (error) {
        console.error(`[retire] could not delete ${entry.file}`, error)
        waiting.push(entry) // try again next time
      }
    }
    await store.writeState('retired', waiting)
    return { deleted }
  } catch (error) {
    console.error('[retire] sweep failed', error)
    return { deleted }
  }
}
