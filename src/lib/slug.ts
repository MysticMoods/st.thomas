/**
 * Readable, stable web addresses for one memorial.
 *
 * A family wants to send a link to their mother, not to a page of forty
 * strangers. The name makes the link mean something; the id on the end is what
 * actually finds the person, so correcting a spelling never breaks a link
 * somebody has already sent.
 */

import type { L } from './types'

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    // Malayalam has no useful latin slug, so a name written only in Malayalam
    // falls back to the id alone rather than to a row of dashes.
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** `thresiamma-devassy-ob01`, or just `ob01` when the name is not in latin. */
export function memorialSlug(person: { id: string; name: L }) {
  const name = slugify(person.name.en || '')
  return name ? `${name}-${person.id}` : person.id
}

/** The id at the end of a slug — everything after the last dash, or the whole. */
export function idFromSlug(slug: string) {
  const parts = slug.split('-')
  return parts[parts.length - 1] || slug
}
