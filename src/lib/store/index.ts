import { diskStore } from './disk'
import type { Store } from './types'

export type { BackupEntry, RecordList, StateKey, Store, StoredFile } from './types'
export { writeJson } from './disk'

/**
 * Which store this deployment uses.
 *
 * Supabase when it has been given somewhere to write, and the parish's own disk
 * otherwise. Nothing has to be set for a fresh clone or the test suite: they get
 * the disk, which needs no account and no network, and behaves exactly as this
 * site always has.
 *
 * The choice is made once, at boot, so a half-configured deployment fails
 * loudly at the first read rather than writing half its records to one place
 * and half to the other.
 */
function chooseStore(): Store {
  const url = process.env.SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_KEY?.trim()

  if (!url && !key) return diskStore

  if (!url || !key) {
    throw new Error(
      'Supabase is half configured: set both SUPABASE_URL and SUPABASE_SERVICE_KEY, or neither.',
    )
  }

  // Loaded only when it is actually wanted, so a disk deployment never pays for
  // the client or needs the dependency present.

  const { makeSupabaseStore } = require('./supabase') as typeof import('./supabase')
  return makeSupabaseStore(url, key)
}

export const store: Store = chooseStore()

/** Named for the health panel, so the dashboard can say where things are kept. */
export const storeName = store.name
