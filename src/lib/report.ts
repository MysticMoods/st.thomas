import path from 'node:path'

import { readRecords, writeJson } from './content'

/**
 * Faults, kept where the parish can see them.
 *
 * Without this the first anyone knows of a broken page is a telephone call.
 * Both halves are recorded: an error thrown while rendering on the server, and
 * one a visitor's browser hit. The same fault repeating is counted rather than
 * listed again, so one bad afternoon does not bury everything before it.
 */

const FILE = path.join(process.cwd(), 'content', 'errors.json')
const KEEP = 300
/** Inside this window the same message is counted, not listed twice. */
const FOLD_WINDOW = 60 * 60 * 1000

export type Fault = {
  id: string
  at: string
  lastAt: string
  scope: 'server' | 'browser'
  message: string
  where: string
  detail?: string
  count: number
  cleared?: boolean
}

let writing: Promise<void> = Promise.resolve()

function tidy(value: unknown, max: number) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

/**
 * Records one fault. Never throws — anything that goes wrong in here would be a
 * fault about a fault, and the page the reader wanted matters more.
 */
export function recordFault(entry: {
  scope: 'server' | 'browser'
  message: unknown
  where?: string
  detail?: unknown
}): Promise<void> {
  writing = writing.then(async () => {
    try {
      const message = tidy(entry.message, 300)
      if (!message) return
      const where = tidy(entry.where, 160)

      const list = (await readRecords('errors')) as Fault[]
      const now = Date.now()
      const same = list.find(
        (fault) =>
          fault.scope === entry.scope &&
          fault.message === message &&
          fault.where === where &&
          now - Date.parse(fault.lastAt) < FOLD_WINDOW,
      )

      if (same) {
        same.count += 1
        same.lastAt = new Date(now).toISOString()
        same.cleared = false
      } else {
        list.unshift({
          id: `e${now.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
          at: new Date(now).toISOString(),
          lastAt: new Date(now).toISOString(),
          scope: entry.scope,
          message,
          where,
          detail: tidy(entry.detail, 600) || undefined,
          count: 1,
        })
      }

      await writeJson(FILE, list.slice(0, KEEP))
    } catch {
      /* a fault about a fault is not worth having */
    }
  })
  return writing
}

export async function readFaults(): Promise<Fault[]> {
  return (await readRecords('errors')) as Fault[]
}

export async function clearFaults() {
  await writeJson(FILE, [])
}

/**
 * Wraps a server handler so anything it throws is written down before it is
 * rethrown. Used where a silent 500 would otherwise be the only trace.
 */
export async function watched<T>(where: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    await recordFault({
      scope: 'server',
      message: error instanceof Error ? error.message : String(error),
      where,
      detail: error instanceof Error ? error.stack : undefined,
    })
    throw error
  }
}
