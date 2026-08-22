import crypto from 'node:crypto'

import type { ContentKey } from '../types'
import { CONTENT_KEYS } from '../types'
import type { BackupEntry, RecordList, StateKey, Store, StoredFile } from './types'

/**
 * Supabase, spoken to over its REST interface rather than through the SDK.
 *
 * The same reasoning as the payment gateway: this site needs a handful of calls,
 * none of them exotic, and a dependency the parish has to keep updated is worth
 * more trouble than the code it saves. Everything below is fetch and JSON.
 *
 * Three tables and a bucket, created by `scripts/supabase-schema.sql`:
 *
 *   documents  the seventeen content sections, and the small singleton files
 *              (staff accounts, visit counts, throttle counters) kept as
 *              `state:users` and so on
 *   records    the eleven append-only lists — one row per record, so adding one
 *              is an insert and two arriving together cannot lose each other
 *   backups    the rolling copies the dashboard restores from
 *   uploads    the bucket holding photographs and bulletins
 */

const KEEP_BACKUPS = 20
const MAX_RECORDS = 2000

type Row = Record<string, unknown>

export function makeSupabaseStore(url: string, serviceKey: string): Store {
  const base = url.replace(/\/$/, '')
  const rest = `${base}/rest/v1`

  const headers: Record<string, string> = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }

  async function call(path: string, init: RequestInit = {}): Promise<Row[]> {
    const res = await fetch(`${rest}/${path}`, {
      ...init,
      headers: { ...headers, ...(init.headers as Record<string, string>) },
      cache: 'no-store',
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Supabase ${res.status} on ${path}: ${detail.slice(0, 300)}`)
    }
    if (res.status === 204) return []
    const body = await res.text()
    if (!body) return []
    const parsed = JSON.parse(body)
    return Array.isArray(parsed) ? (parsed as Row[]) : [parsed as Row]
  }

  /** Upserts one row into a table keyed by its primary key. */
  async function upsert(table: string, row: Row) {
    await call(table, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(row),
    })
  }

  /**
   * What has been read already, and how to know whether it is still true.
   *
   * Every page the site renders reads all seventeen content sections — the
   * homepage alone is six hundred kilobytes of them. Fetching that on every
   * visit would spend a free month's bandwidth in a few thousand page views,
   * which a parish reaches the first time a funeral notice goes round.
   *
   * So the sections are kept in memory, and what gets fetched on each render is
   * the list of version strings — a page or so — which says whether anything
   * has actually changed. In the ordinary case, where nobody has edited
   * anything since the last visitor, nothing else is asked for at all. The
   * version list itself is held for a few seconds so a burst of visitors in the
   * same moment asks once.
   */
  const documents = new Map<string, { version: string; data: unknown }>()
  const VERSIONS_HELD_FOR = 5000
  let versions: { at: number; map: Map<string, string> } | null = null

  async function currentVersions(): Promise<Map<string, string>> {
    if (versions && Date.now() - versions.at < VERSIONS_HELD_FOR) return versions.map
    const rows = await call('documents?select=key,version')
    const map = new Map<string, string>()
    for (const row of rows) map.set(String(row.key), String(row.version ?? ''))
    versions = { at: Date.now(), map }
    return map
  }

  /** Forgets what was read, so the next read sees a change this copy just made. */
  function forget(key: string) {
    documents.delete(key)
    versions = null
  }

  async function readDocument<T>(key: string): Promise<T | undefined> {
    const version = (await currentVersions()).get(key)
    if (version === undefined) return undefined

    const held = documents.get(key)
    if (held && held.version === version) return held.data as T

    const rows = await call(`documents?key=eq.${encodeURIComponent(key)}&select=data&limit=1`)
    if (!rows.length) return undefined
    documents.set(key, { version, data: rows[0].data })
    return rows[0].data as T
  }

  /** Opaque, and changes on every write — which is all the dashboard needs. */
  function newVersion() {
    return `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`
  }

  async function keepBackup(key: ContentKey, data: unknown) {
    try {
      const stamp = new Date().toISOString()
      await call('backups', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          key,
          name: `${key}.${stamp.replace(/[:.]/g, '-')}.json`,
          data,
          at: stamp,
        }),
      })

      // Keep only the most recent copies of this section.
      const old = await call(
        `backups?key=eq.${encodeURIComponent(key)}&select=name&order=at.desc&offset=${KEEP_BACKUPS}`,
      )
      await Promise.all(
        old.map((row) =>
          call(`backups?name=eq.${encodeURIComponent(String(row.name))}`, {
            method: 'DELETE',
            headers: { Prefer: 'return=minimal' },
          }),
        ),
      )
    } catch {
      /* a backup that cannot be taken must never block the save itself */
    }
  }

  return {
    name: 'supabase',

    // -------------------------------------------------------------- content
    async readContent<T>(key: ContentKey): Promise<T> {
      if (!CONTENT_KEYS.includes(key)) throw new Error(`Unknown content key: ${key}`)
      const data = await readDocument<T>(key)
      if (data === undefined) throw new Error(`No content stored for ${key}`)
      return data
    },

    async writeContent(key: ContentKey, data: unknown) {
      if (!CONTENT_KEYS.includes(key)) throw new Error(`Unknown content key: ${key}`)
      const current = await readDocument<unknown>(key)
      if (current !== undefined) await keepBackup(key, current)
      await upsert('documents', {
        key,
        data,
        version: newVersion(),
        updated_at: new Date().toISOString(),
      })
      forget(key)
    },

    async contentVersion(key: ContentKey) {
      if (!CONTENT_KEYS.includes(key)) throw new Error(`Unknown content key: ${key}`)
      // Asked straight, never from memory: this is what a save is checked
      // against, and a stale answer here would let one member of staff quietly
      // overwrite another.
      const rows = await call(
        `documents?key=eq.${encodeURIComponent(key)}&select=version&limit=1`,
      )
      return rows.length ? String(rows[0].version ?? '') : ''
    },

    // ---------------------------------------------------------------- state
    async readState<T>(key: StateKey, fallback: T): Promise<T> {
      const data = await readDocument<T>(`state:${key}`)
      return data === undefined ? fallback : data
    },

    async writeState(key: StateKey, data: unknown) {
      await upsert('documents', {
        key: `state:${key}`,
        data,
        version: newVersion(),
        updated_at: new Date().toISOString(),
      })
      forget(`state:${key}`)
    },

    // -------------------------------------------------------- record lists
    async readRecords<T>(name: RecordList): Promise<T[]> {
      const rows = await call(
        `records?list=eq.${encodeURIComponent(name)}&select=data&order=at.desc&limit=${MAX_RECORDS}`,
      )
      return rows.map((row) => row.data as T)
    },

    async appendRecord(name: RecordList, record: unknown) {
      const at =
        (record as { at?: string })?.at && !Number.isNaN(Date.parse((record as { at: string }).at))
          ? (record as { at: string }).at
          : new Date().toISOString()

      // An insert, so two records written in the same moment cannot lose one
      // another — the thing the disk store needs a queue to prevent.
      await call('records', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ list: name, at, data: record }),
      })
    },

    async updateRecords<T>(name: RecordList, update: (list: T[]) => T[]) {
      const rows = await call(
        `records?list=eq.${encodeURIComponent(name)}&select=data&order=at.desc&limit=${MAX_RECORDS}`,
      )
      const next = update(rows.map((row) => row.data as T))

      // Replacing a list is a delete and an insert, which must not be seen half
      // done by anybody reading. `replace_list` does both inside one
      // transaction — see scripts/supabase-schema.sql.
      await call('rpc/replace_list', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ target_list: name, rows: next }),
      })
    },

    // -------------------------------------------------------------- backups
    async listBackups(key: ContentKey): Promise<BackupEntry[]> {
      if (!CONTENT_KEYS.includes(key)) throw new Error(`Unknown content key: ${key}`)
      const rows = await call(
        `backups?key=eq.${encodeURIComponent(key)}&select=name,at,data&order=at.desc`,
      )
      return rows.map((row) => ({
        name: String(row.name),
        at: String(row.at),
        size: JSON.stringify(row.data ?? '').length,
      }))
    },

    async readBackup(name: string) {
      const key = name.split('.')[0] as ContentKey
      if (!/^[a-z-]+\.[0-9A-Za-z-]+\.json$/.test(name) || !CONTENT_KEYS.includes(key)) {
        throw new Error('Not a backup of this site')
      }
      const rows = await call(
        `backups?name=eq.${encodeURIComponent(name)}&select=data&limit=1`,
      )
      if (!rows.length) throw new Error('No such backup')
      return { key, data: rows[0].data as unknown }
    },

    // ---------------------------------------------------------------- files
    async putFile(name: string, body: Buffer, contentType: string): Promise<StoredFile> {
      const res = await fetch(
        `${base}/storage/v1/object/uploads/${encodeURIComponent(name)}`,
        {
          method: 'POST',
          headers: {
            apikey: serviceKey,
            Authorization: `Bearer ${serviceKey}`,
            'Content-Type': contentType,
            'cache-control': 'public, max-age=31536000, immutable',
          },
          body: new Uint8Array(body),
        },
      )
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new Error(`Supabase storage ${res.status}: ${detail.slice(0, 300)}`)
      }
      // The same path the disk store gives back. next.config.mjs sends
      // /uploads/... on to the bucket, so a photograph is referred to the same
      // way wherever it happens to be kept — and moving between the two means
      // copying files, not rewriting seventeen content files.
      return { url: `/uploads/${name}`, bytes: body.byteLength }
    },

    async writable() {
      try {
        await upsert('documents', {
          key: 'state:probe',
          data: { at: new Date().toISOString() },
          version: newVersion(),
          updated_at: new Date().toISOString(),
        })
        return true
      } catch {
        return false
      }
    },
  }
}
