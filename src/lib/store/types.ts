import type { ContentKey } from '../types'

/**
 * Where the parish's words and photographs actually live.
 *
 * The site was written against a disk: content files, uploaded images, rolling
 * backups. That is the right shape for a box the parish owns, and the wrong one
 * for a host with no disk to write to. Rather than teach twenty-eight files
 * about two worlds, everything goes through one small interface, and only the
 * driver underneath changes.
 *
 * `disk` is what the site has always done, and remains what a fresh clone and
 * the test suite use — no account, no network, no setup. `supabase` is for
 * production on a host that cannot keep a file.
 */

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
 * The small singleton files that are not part of the public content schema:
 * staff accounts, the visit counts, the throttle's counters. They are read and
 * written whole, exactly like a content section, so they are kept the same way.
 */
export type StateKey = 'users' | 'analytics' | 'limits'

export type BackupEntry = { name: string; at: string; size: number }

export type StoredFile = {
  /** What the page should reference — a path under /uploads, or a full URL. */
  url: string
  bytes: number
}

export interface Store {
  /** Which driver this is, for the health panel to report honestly. */
  readonly name: 'disk' | 'supabase'

  // ---------------------------------------------------------------- content
  readContent<T>(key: ContentKey): Promise<T>
  writeContent(key: ContentKey, data: unknown): Promise<void>
  /**
   * A fingerprint of the section as it stands. The dashboard sends back the one
   * it loaded, so a save from a stale editor is refused rather than silently
   * overwriting somebody who saved first.
   */
  contentVersion(key: ContentKey): Promise<string>

  // ------------------------------------------------------------------ state
  readState<T>(key: StateKey, fallback: T): Promise<T>
  writeState(key: StateKey, data: unknown): Promise<void>

  // ------------------------------------------------------------ record lists
  readRecords<T>(name: RecordList): Promise<T[]>
  appendRecord(name: RecordList, record: unknown): Promise<void>
  /** Reads, changes and writes back as one operation, never interleaved. */
  updateRecords<T>(name: RecordList, update: (list: T[]) => T[]): Promise<void>

  // ---------------------------------------------------------------- backups
  listBackups(key: ContentKey): Promise<BackupEntry[]>
  readBackup(name: string): Promise<{ key: ContentKey; data: unknown }>

  // ------------------------------------------------------------------ files
  putFile(name: string, body: Buffer, contentType: string): Promise<StoredFile>

  /** Whether the store can be written to at all — for the health panel. */
  writable(): Promise<boolean>
}
