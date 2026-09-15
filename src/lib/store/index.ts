import { diskStore } from './disk'
import type { Store } from './types'

export type { BackupEntry, RecordList, StateKey, Store, StoredFile } from './types'

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

  // STORAGE=disk keeps the settings in place but ignores them, which is what
  // you want while working on the site: the test suite writes hundreds of
  // messages and bookings, and none of that belongs in the parish's real
  // database, or on its bandwidth. STORAGE=supabase insists on the opposite,
  // so a deployment that has lost its settings fails loudly instead of quietly
  // writing to a disk that will not be there next time.
  const forced = process.env.STORAGE?.trim().toLowerCase()
  if (forced === 'disk') return diskStore
  if (forced && forced !== 'supabase' && forced !== 'auto') {
    throw new Error(`Unknown STORAGE setting: ${forced}. Use disk, supabase, or leave it unset.`)
  }

  if (!url && !key) {
    if (forced === 'supabase') {
      throw new Error('STORAGE=supabase, but SUPABASE_URL and SUPABASE_SERVICE_KEY are not set.')
    }
    return diskStore
  }

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
