import { appendRecord, readRecords } from './content'

/**
 * Who did what, and when.
 *
 * Every change the dashboard can make passes through here: content saves,
 * uploads, hall bookings confirmed or freed, reviews published, accounts
 * created, backups restored, and every sign-in — including the ones that
 * failed. It is written even when nobody is watching, because the moment it
 * matters is always after the fact.
 */

export type AuditAction =
  | 'sign-in'
  | 'sign-in-refused'
  | 'sign-out'
  | 'content-save'
  | 'content-restore'
  | 'upload'
  | 'hall-decide'
  | 'hall-book'
  | 'hall-free'
  | 'review-decide'
  | 'review-delete'
  | 'user-create'
  | 'user-update'
  | 'user-delete'
  | 'problems-clear'
  | 'newsletter-send'
  | 'outbox-clear'
  | 'office-decide'
  | 'office-delete'
  | 'hall-advance'

export type AuditEntry = {
  id: string
  at: string
  /** Username, or the id that was typed at a refused sign-in. */
  actor: string
  role: string
  action: AuditAction
  /** What it was done to — a content key, a booking id, a filename. */
  target?: string
  detail?: string
  ip?: string
}

/** The address a request came from, as far as the proxy in front of us says. */
export function callerIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'local'
  )
}

/**
 * Writes one line of history. Deliberately swallows its own errors — a full
 * disk should not stop the vicar publishing a funeral notice.
 */
export async function audit(entry: {
  request?: Request
  actor: string
  role?: string
  action: AuditAction
  target?: string
  detail?: string
}) {
  try {
    const line: AuditEntry = {
      id: `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      at: new Date().toISOString(),
      actor: entry.actor.slice(0, 80),
      role: (entry.role ?? 'unknown').slice(0, 20),
      action: entry.action,
      target: entry.target?.slice(0, 160),
      detail: entry.detail?.slice(0, 300),
      ip: entry.request ? callerIp(entry.request).slice(0, 60) : undefined,
    }
    await appendRecord('audit', line)
  } catch {
    /* history is worth having, never worth failing a save for */
  }
}

export async function readAudit(): Promise<AuditEntry[]> {
  return (await readRecords('audit')) as AuditEntry[]
}
