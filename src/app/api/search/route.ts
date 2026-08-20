import { NextResponse } from 'next/server'

import { getContent } from '@/lib/content'
import { throttled } from '@/lib/limit'
import { memorialSlug } from '@/lib/slug'
import type { L } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Search across everything the parish has published.
 *
 * The site holds ministries, notices, obituaries, past priests, mass timings,
 * the hall and its questions — all of it readable, none of it findable except
 * by scrolling. This walks the content files and answers in both languages, so
 * a Malayalam word finds an English entry when only one side was written.
 */

export type Hit = {
  kind: string
  /** Both sides are returned; the page shows the one the reader is reading. */
  title: L
  detail: L
  href: string
  /** Lower is better. */
  rank: number
}

/** Everything an entry says, in both languages, for matching against. */
const both = (value: L | undefined) => `${value?.en ?? ''} ${value?.ml ?? ''}`

const asL = (value: L | string | undefined): L =>
  typeof value === 'string' ? { en: value, ml: value } : (value ?? { en: '', ml: '' })

/** Joins several fields into one line, per language, skipping the empty ones. */
const join = (...parts: (L | string | undefined)[]): L => ({
  en: parts.map((part) => asL(part).en).filter(Boolean).join(' · '),
  ml: parts.map((part) => asL(part).ml || asL(part).en).filter(Boolean).join(' · '),
})

/** Where the needle sits decides how good the answer is. */
function score(needle: string, title: string, body: string) {
  const t = title.toLowerCase()
  const b = body.toLowerCase()
  if (t === needle) return 0
  if (t.startsWith(needle)) return 1
  if (t.includes(needle)) return 2
  if (b.includes(needle)) return 3
  return -1
}

export async function GET(request: Request) {
  if (throttled(request, 'search', 120)) {
    return NextResponse.json({ results: [], throttled: true }, { status: 429 })
  }

  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().toLowerCase()
  if (q.length < 2) return NextResponse.json({ results: [], query: q })

  const content = await getContent()
  const hits: Hit[] = []

  const add = (kind: string, title: L | string, detail: L | string, href: string) => {
    const t = asL(title)
    const d = asL(detail)
    // Matched against both languages, so a Malayalam word finds an entry whose
    // English side is the one that carries the word, and the other way round.
    const rank = score(q, both(t), `${both(t)} ${both(d)}`)
    if (rank < 0) return
    hits.push({
      kind,
      title: { en: t.en.trim(), ml: t.ml.trim() },
      detail: { en: d.en.trim().slice(0, 160), ml: d.ml.trim().slice(0, 160) },
      href,
      rank,
    })
  }

  for (const notice of content.notices.items ?? []) {
    add('Notice', notice.title, notice.excerpt, '/#notices')
  }

  for (const person of content.obituaries.items ?? []) {
    add(
      'Obituary',
      person.name,
      join(person.house, person.unit, person.survivedBy),
      `/obituary/${memorialSlug(person)}`,
    )
  }

  for (const ministry of content.ministries.items ?? []) {
    add(
      'Ministry',
      ministry.name,
      join(ministry.description, ministry.lead),
      '/#ministries',
    )
  }

  for (const priest of content.pastPriests.priests ?? []) {
    add('Past priest', priest.name, join(priest.years, priest.bio), '/#past-priests')
  }

  for (const group of content.mass.groups ?? []) {
    for (const entry of group.entries ?? []) {
      add(
        'Mass timing',
        entry.label,
        join(group.title, entry.time, entry.note),
        '/#mass-timings',
      )
    }
  }

  for (const day of content.events.days ?? []) {
    for (const entry of day.events ?? []) {
      add('Weekly event', entry.title, join(day.name, entry.time, entry.place), '/#weekly-events')
    }
  }

  for (const member of content.committee.members ?? []) {
    add('Committee', member.name, join(member.role, member.unit), '/#committee')
  }

  for (const room of content.hall.halls ?? []) {
    add('Parish hall', room.name, room.blurb, `/hall#book-${room.id}`)
  }

  for (const question of content.hall.faq ?? []) {
    add('Hall question', question.q, question.a, '/hall#faq')
  }

  for (const photo of content.gallery.items ?? []) {
    add('Photograph', photo.caption, photo.category, '/#gallery')
  }

  for (const fund of content.donation.funds ?? []) {
    add('Giving', fund.title, fund.description, '/#donate')
  }

  const results = hits
    .sort((a, b) => a.rank - b.rank || a.title.en.length - b.title.en.length)
    .slice(0, 30)

  return NextResponse.json({ query: q, results }, { headers: { 'Cache-Control': 'no-store' } })
}
