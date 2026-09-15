import { store } from './store'
import type { Content, ContentKey } from './types'

/**
 * Reading and writing what the parish publishes.
 *
 * Every one of these used to open a file. They now ask the store, which is the
 * parish's own disk in development and on a box the parish owns, and Supabase
 * where there is no disk to write to. Nothing above this file knows or cares:
 * the twenty-eight modules that import from here call the same functions with
 * the same arguments they always did.
 */

export type { RecordList } from './store'

/** Reads one content section. Throws if the key is not part of the schema. */
export async function readContent<T = unknown>(key: ContentKey): Promise<T> {
  return store.readContent<T>(key)
}

/**
 * A cheap fingerprint of the section as it stands right now. The dashboard
 * sends back the version it loaded, so a save made from a stale editor — a
 * second tab, or another member of staff who saved first — is rejected instead
 * of silently overwriting the newer copy.
 */
export async function contentVersion(key: ContentKey): Promise<string> {
  return store.contentVersion(key)
}

/** Writes one content section, keeping a copy of what it replaced. */
export async function writeContent(key: ContentKey, data: unknown): Promise<void> {
  return store.writeContent(key, data)
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
    chapels,
    ads,
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
    readContent('chapels'),
    readContent('ads'),
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
    chapels,
    ads,
  } as Content
}

/* ------------------------------------------------- lists written at runtime */

import type { RecordList } from './store'

/** Everything a list holds, newest first. */
export async function readRecords(name: RecordList) {
  return store.readRecords<unknown>(name)
}

/**
 * Adds one record to a list.
 *
 * On disk this is read, change, write, with a queue behind it so two records
 * written in the same moment cannot lose one another. On Supabase it is a row
 * insert, where the problem cannot arise at all.
 */
export async function appendRecord(name: RecordList, record: unknown) {
  return store.appendRecord(name, record)
}

/**
 * Changes records already written — marking a message answered, a booking
 * confirmed. The whole list is handed to the updater and what it returns is
 * kept, as one operation that nothing else interleaves with.
 */
export async function updateRecords<T>(name: RecordList, update: (list: T[]) => T[]) {
  return store.updateRecords<T>(name, update)
}

/* -------------------------------------------------------------- the backups */

/** The saved copies of one content section, newest first. */
export async function listBackups(key: ContentKey) {
  return store.listBackups(key)
}

/** Reads one saved copy back. The name is checked, never trusted. */
export async function readBackup(name: string) {
  return store.readBackup(name)
}
