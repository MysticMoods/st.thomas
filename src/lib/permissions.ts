import type { ContentKey } from './types'

/**
 * Who may do what.
 *
 * Until now the dashboard had two kinds of people: an owner, and everybody
 * else. Everybody else could do everything except make accounts and restore a
 * backup — which is fine in a parish of two, and wrong in a parish where the
 * hall is let by one person, the certificates are written by another, and the
 * accounts are kept by a third. None of them should be able to wipe the letters
 * the office has sent, and only one of them has any business reading what
 * people have given.
 *
 * Roles are a closed list on purpose. A parish office is not a place to be
 * assembling permissions out of checkboxes, and a role somebody can describe in
 * a sentence — "she looks after the hall" — is a role that stays correct. The
 * one thing set per person is which pages they may edit, because that genuinely
 * differs: the hall manager edits the hall page, the youth coordinator edits
 * three others, and neither should be able to change the Mass timings.
 */

export type Role = 'owner' | 'editor' | 'sacristan' | 'administration' | 'hall' | 'treasurer'

/**
 * The kinds of work the dashboard holds. Each maps to a group of routes and to
 * a panel somebody sees when they sign in.
 */
export type Area =
  /** Edit the site's own pages — narrowed further by `sections`. */
  | 'pages'
  /** Hall bookings and the reviews people leave. */
  | 'hall'
  /** Parish office requests: Mass intentions, certificates, prayers. */
  | 'office'
  /** Messages sent through the website, and the people who wrote them. */
  | 'messages'
  /** What people have given. */
  | 'giving'
  /** Staff accounts. */
  | 'people'
  /** Backups, the activity log, faults, the outbox, the health panel. */
  | 'system'

export const AREAS: Area[] = [
  'pages',
  'hall',
  'office',
  'messages',
  'giving',
  'people',
  'system',
]

/**
 * What each role may touch.
 *
 * `editor` is deliberately wide: it is what every non-owner account already
 * meant, and narrowing it would have quietly taken work away from people who
 * had it the day before. The narrow roles below are the new ones. Somebody is
 * moved into one on purpose, never by an upgrade happening underneath them.
 */
const ROLE_AREAS: Record<Role, Area[]> = {
  owner: AREAS,
  editor: ['pages', 'hall', 'office', 'messages'],
  // Everything the parish does day to day, except letting the hall.
  sacristan: ['pages', 'office', 'messages', 'giving'],
  // Everything day to day, the hall included. What they may not do is not an
  // area at all — it is four pages, listed below.
  administration: ['pages', 'hall', 'office', 'messages', 'giving'],
  hall: ['pages', 'hall'],
  treasurer: ['giving'],
}

/**
 * Pages a role may never edit, whatever else it holds.
 *
 * This is a list of what is refused rather than what is allowed, and that is
 * the whole point. "The administration may edit everything except the priest's
 * own details, the parish history and the bank account" is what was actually
 * asked for, and writing it as the fifteen pages they *may* edit would mean
 * that the sixteenth page, added next year by somebody who never heard this
 * conversation, quietly falls to them. Written as a refusal, a new page is
 * theirs — which is right — and these four never are.
 *
 * The per-person section list narrows further on top of this. It cannot widen
 * it: nothing grants a page that the role itself refuses.
 */
const ROLE_DENIES: Partial<Record<Role, ContentKey[]>> = {
  /** The advertisements are the priest's to sell and to refuse. */
  sacristan: ['ads'],
  administration: [
    /** The parish priest's own name, photograph, message and telephone. */
    'clergy',
    /** The parish's account of itself, its history among it. */
    'about',
    /** The priests who came before, which is the same history. */
    'past-priests',
    /** The bank account, the UPI handle, and what giving is asked for. */
    'donation',
  ],
}

/** The pages this role may never edit. */
export function deniedSections(role: Role): readonly ContentKey[] {
  return ROLE_DENIES[role] ?? []
}

/** How each role is described where somebody is choosing one. */
export const ROLE_LABELS: Record<Role, { name: string; blurb: string }> = {
  owner: {
    name: 'Parish Priest',
    blurb: 'Everything — every page, every queue, the accounts and the running of the site.',
  },
  sacristan: {
    name: 'Sacristan',
    blurb:
      'Everything the parish does day to day, except letting the hall and except the advertisements.',
  },
  administration: {
    name: 'Parish Administration',
    blurb:
      'Everything day to day, the hall included — but not the priest\u2019s own details, the parish history, the former priests, or the bank account.',
  },
  editor: {
    name: 'Editor',
    blurb:
      'The pages, the hall, the office requests and the messages — everything except accounts, giving and the running of the site.',
  },
  hall: {
    name: 'Hall Manager',
    blurb: 'Hall bookings and reviews, and the pages they are allowed.',
  },
  treasurer: {
    name: 'Treasurer',
    blurb: 'What people have given. Nothing else, and nothing can be changed.',
  },
}

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && value in ROLE_LABELS
}

/** The role to fall back on for anything unrecognised in a stored account. */
export function asRole(value: unknown): Role {
  return isRole(value) ? value : 'editor'
}

/** What this person may work in. */
export function areasOf(role: Role): Area[] {
  return ROLE_AREAS[role] ?? []
}

/** The one question every guarded route asks. */
export function may(role: Role, area: Area): boolean {
  return areasOf(role).includes(area)
}

/**
 * Whether this person may edit one section of the site.
 *
 * An empty or absent list means every section, which is what an account made
 * before any of this existed has — so nobody woke up unable to do their job.
 * A list means exactly those, and nothing else.
 */
export function mayEditSection(
  role: Role,
  sections: readonly string[] | undefined,
  key: ContentKey,
): boolean {
  if (!may(role, 'pages')) return false
  // What the role refuses is refused, whatever the per-person list says. The
  // list narrows; it never widens.
  if (deniedSections(role).includes(key)) return false
  if (!sections || sections.length === 0) return true
  return sections.includes(key)
}

/** Only an owner may hand out or take away power. */
export function mayManagePeople(role: Role) {
  return may(role, 'people')
}
