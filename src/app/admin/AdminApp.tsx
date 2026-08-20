'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { ParishEmblem } from '@/components/ui/ParishEmblem'
import { useTheme } from '@/lib/theme'
import type { ContentKey } from '@/lib/types'
import { cn } from '@/lib/utils'

import { AutoTranslateToggle, useAutoTranslate } from './AutoTranslate'
import { HallBookings } from './HallBookings'
import { HallReviews } from './HallReviews'
import { JsonEditor } from './JsonEditor'
import { OfficeRequests } from './OfficeRequests'
import { Activity } from './ops/Activity'
import { Backups } from './ops/Backups'
import { Letters } from './ops/Letters'
import { NewsletterPanel } from './ops/NewsletterPanel'
import { People } from './ops/People'
import { Problems } from './ops/Problems'
import { System } from './ops/System'
import { Visits } from './ops/Visits'

/** Everything the main pane can show. */
type PanelKey =
  | ContentKey
  | 'inbox'
  | 'hall-bookings'
  | 'hall-reviews'
  | 'office-requests'
  | 'people'
  | 'newsletter'
  | 'letters'
  | 'activity'
  | 'backups'
  | 'visits'
  | 'problems'
  | 'system'

/** Running the site rather than writing it — accounts, history, health. */
const OPERATIONS: { key: PanelKey; name: string; icon: string; blurb: string }[] = [
  { key: 'people', name: 'People & access', icon: 'users', blurb: 'Staff accounts and what each may do' },
  { key: 'newsletter', name: 'Newsletter', icon: 'mail', blurb: 'Write to everybody who asked for news' },
  { key: 'letters', name: 'Letters sent', icon: 'file', blurb: 'What the site posted, and whether it arrived' },
  { key: 'activity', name: 'Activity log', icon: 'scroll', blurb: 'Who changed what, and when' },
  { key: 'backups', name: 'Backups & restore', icon: 'copy', blurb: 'Read or put back an earlier copy' },
  { key: 'visits', name: 'Visits', icon: 'globe', blurb: 'How much the site is being read' },
  { key: 'problems', name: 'Problems', icon: 'bell', blurb: 'Faults the site has hit' },
  { key: 'system', name: 'System health', icon: 'shield', blurb: 'Disk, settings and what is stored' },
]

/** True for the panels that are an editable content file. */
function isContent(key: PanelKey): key is ContentKey {
  return SECTIONS.some((section) => section.key === key)
}

type SectionDef = {
  key: ContentKey
  name: string
  icon: string
  blurb: string
  /** Where this section shows up on the site, for the preview link. */
  anchor: string
}

const SECTIONS: SectionDef[] = [
  { key: 'site', name: 'Homepage & Banners', icon: 'home', blurb: 'Hero images, welcome text, contact details, social links', anchor: '/' },
  { key: 'notices', name: 'Notice Board', icon: 'bell', blurb: 'Parish news, banns, funeral notices, prayer requests', anchor: '/#notices' },
  { key: 'obituaries', name: 'Obituary Column', icon: 'candle', blurb: 'Deaths, funeral details and the memorial for each', anchor: '/obituary' },
  { key: 'events', name: 'Weekly Events', icon: 'calendar', blurb: 'The seven day parish calendar', anchor: '/#weekly-events' },
  { key: 'mass', name: 'Mass Timings', icon: 'clock', blurb: 'Sunday, weekday, holy day, confession, adoration', anchor: '/#mass-timings' },
  { key: 'leadership', name: 'Pope, Archbishop & Bishop', icon: 'cross', blurb: 'The three portraits shown above the parish priest', anchor: '/#leadership' },
  { key: 'clergy', name: 'Parish Priest', icon: 'users', blurb: 'Photo, message, quote and contact details', anchor: '/#priests' },
  { key: 'committee', name: 'Parish Committee', icon: 'shield', blurb: 'Office bearers, ward members and their term', anchor: '/#committee' },
  { key: 'past-priests', name: 'Past Priests', icon: 'scroll', blurb: 'The timeline of former vicars', anchor: '/#past-priests' },
  { key: 'gallery', name: 'Gallery', icon: 'plus', blurb: 'Upload photographs and set their category', anchor: '/#gallery' },
  { key: 'media', name: 'Videos & Bulletins', icon: 'youtube', blurb: 'YouTube videos and downloadable PDF bulletins', anchor: '/#media' },
  { key: 'stats', name: 'Parish Statistics', icon: 'users', blurb: 'Summary counts shown on the homepage', anchor: '/#members' },
  { key: 'ministries', name: 'Ministries', icon: 'flame', blurb: 'Each ministry, its leader, team, events and history', anchor: '/#ministries' },
  { key: 'hall', name: 'Parish Hall', icon: 'home', blurb: 'Tariff, amenities, rules and the days kept for the parish', anchor: '/hall' },
  { key: 'office', name: 'Parish Office', icon: 'scroll', blurb: 'Mass intentions, certificates and prayer requests', anchor: '/office' },
  { key: 'donation', name: 'Donations', icon: 'heart', blurb: 'Funds, suggested amounts, bank and UPI details', anchor: '/#donate' },
  { key: 'about', name: 'About the Church', icon: 'book', blurb: 'History, mission, vision, patron, architecture', anchor: '/#about' },
]

type Donation = {
  paymentId: string
  amount: number
  currency?: string
  status?: string
  method?: string
  fundName?: string
  donor?: string
  intention?: string
  email?: string
  phone?: string
  at: string
}

type Submissions = {
  subscribers: { email: string; at: string }[]
  messages: { name: string; email: string; phone?: string; subject?: string; message: string; at: string }[]
  donations: Donation[]
}

export function AdminApp() {
  const { theme, toggle } = useTheme()
  const [active, setActive] = useState<PanelKey>('site')
  /** Who is signed in, so the panels know what to offer them. */
  const [you, setYou] = useState<{ username: string; role: 'owner' | 'editor' } | null>(null)
  const [data, setData] = useState<unknown>(null)
  const [original, setOriginal] = useState<string>('')
  // Fingerprint of the file as loaded — sent back on save so a stale editor
  // cannot overwrite someone else's newer edit.
  const [version, setVersion] = useState<string | undefined>()
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')
  const [raw, setRaw] = useState(false)
  const [rawText, setRawText] = useState('')
  const [submissions, setSubmissions] = useState<Submissions | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState('')
  const { waitForIdle } = useAutoTranslate()

  // Always holds the newest editor state, so a save that waited for a
  // translation writes the translated text rather than the older snapshot.
  const dataRef = useRef<unknown>(null)
  dataRef.current = data
  // Window listeners are bound once; these keep them looking at current state.
  const dirtyRef = useRef(false)
  const saveRef = useRef(() => {})

  const load = useCallback(async (key: ContentKey) => {
    setStatus('loading')
    setError('')
    try {
      const res = await fetch(`/api/admin/content/${key}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not load this section')
      setData(json.data)
      setOriginal(JSON.stringify(json.data))
      setRawText(JSON.stringify(json.data, null, 2))
      setVersion(json.version)
      setStatus('idle')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (active === 'inbox') {
      fetch('/api/admin/submissions', { cache: 'no-store' })
        .then((r) => r.json())
        .then(setSubmissions)
        .catch(() => setSubmissions({ subscribers: [], messages: [], donations: [] }))
      return
    }
    if (!isContent(active)) return
    load(active)
  }, [active, load])

  // Which account is signed in decides what the operations panels offer.
  useEffect(() => {
    fetch('/api/admin/users', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => setYou(json?.you ?? null))
      .catch(() => setYou(null))
  }, [])

  const dirty = isContent(active) && data !== null && JSON.stringify(data) !== original

  // Ctrl/Cmd+S saves, the way every other editor behaves.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        if (dirtyRef.current) saveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Closing the tab mid-edit should not silently throw the work away.
  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [])

  /** Switching section throws away unsaved edits, so confirm first. */
  function open(next: PanelKey) {
    if (next === active) return
    if (dirty && !window.confirm('You have unsaved changes here. Leave them behind?')) return
    setActive(next)
    setMenuOpen(false)
    setRaw(false)
  }

  async function save() {
    if (!isContent(active)) return
    // Clicking Save blurs the field, which may start a translation. Let it finish.
    setStatus('saving')
    await waitForIdle()

    let payload = dataRef.current
    if (raw) {
      try {
        payload = JSON.parse(rawText)
      } catch {
        setError('That is not valid JSON — check for a missing comma or quote.')
        setStatus('error')
        return
      }
    }
    setStatus('saving')
    setError('')
    try {
      const res = await fetch(`/api/admin/content/${active}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload, version }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      setData(payload)
      setOriginal(JSON.stringify(payload))
      setVersion(json.version)
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2600)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setStatus('error')
    }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/'
  }

  dirtyRef.current = dirty
  saveRef.current = save

  const current = SECTIONS.find((s) => s.key === active)
  /** Panels that hold submissions rather than editable content. */
  const INBOXES = [
    { key: 'office-requests' as const, name: 'Office Requests', icon: 'scroll', blurb: 'Mass intentions, certificates and prayers' },
    { key: 'hall-bookings' as const, name: 'Hall Bookings', icon: 'calendar', blurb: 'Requests to confirm or decline' },
    { key: 'hall-reviews' as const, name: 'Hall Reviews', icon: 'quote', blurb: 'Publish or hold what families wrote' },
    { key: 'inbox' as const, name: 'Inbox, Gifts & Subscribers', icon: 'mail', blurb: 'Contact form messages and every donation received' },
  ]
  const matches = (text: string) => {
    const needle = search.trim().toLowerCase()
    return !needle || text.toLowerCase().includes(needle)
  }
  const utilities = INBOXES.filter((entry) => matches(`${entry.name} ${entry.blurb} ${entry.key}`))
  const operations = OPERATIONS.filter((entry) =>
    matches(`${entry.name} ${entry.blurb} ${entry.key}`),
  )
  const visible = SECTIONS.filter((section) =>
    matches(`${section.name} ${section.blurb} ${section.key}`),
  )

  return (
    <div className="min-h-screen bg-[rgb(var(--page-alt))]">
      <header className="sticky top-0 z-30 border-b border-[rgb(var(--line))] bg-[rgb(var(--page))]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[100rem] items-center gap-4 px-5 py-3.5 sm:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-sm border border-[rgb(var(--line))] lg:hidden"
            aria-label="Sections"
          >
            <Icon name="menu" className="h-4 w-4" />
          </button>

          <ParishEmblem variant="gold" className="hidden h-9 w-9 sm:block" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-base leading-tight text-[rgb(var(--ink))]">
              Parish Dashboard
            </p>
            <p className="truncate font-sans text-2xs uppercase tracking-[0.18em] text-gold-600 dark:text-gold-400">
              St. Thomas Church, Mangalassery
            </p>
          </div>

          {dirty ? (
            <span className="hidden items-center gap-2 font-sans text-2xs text-burgundy-500 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-burgundy-500" />
              Unsaved changes
            </span>
          ) : null}

          {you ? (
            <span className="hidden flex-col items-end leading-tight md:flex">
              <span className="font-sans text-2xs font-medium text-[rgb(var(--ink))]">
                {you.username}
              </span>
              <span className="font-sans text-[0.6rem] uppercase tracking-[0.14em] text-gold-600 dark:text-gold-400">
                {you.role}
              </span>
            </span>
          ) : null}

          <AutoTranslateToggle />

          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle theme"
            className="grid h-9 w-9 place-items-center rounded-sm border border-[rgb(var(--line))] text-[rgb(var(--muted))] transition-colors hover:border-gold-400 hover:text-gold-500"
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-4 w-4" />
          </button>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400 hover:text-gold-500 sm:block"
          >
            View site
          </a>

          <button
            type="button"
            onClick={logout}
            className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-burgundy-400 hover:text-burgundy-500"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[100rem] gap-8 px-5 py-8 sm:px-8">
        <aside
          className={cn(
            'w-72 shrink-0 lg:sticky lg:top-[4.25rem] lg:self-start lg:block lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1',
            menuOpen
              ? 'fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto border-r border-[rgb(var(--line))] bg-[rgb(var(--page))] p-5 lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0'
              : 'hidden',
          )}
        >
          <nav className="flex flex-col gap-1">
            <label className="relative mb-3 block">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgb(var(--muted))]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find a section…"
                className="field !py-2.5 !pl-9 !text-sm"
              />
            </label>

            {visible.length === 0 && utilities.length === 0 && operations.length === 0 ? (
              <p className="px-4 py-3 font-sans text-2xs text-[rgb(var(--muted))]">
                Nothing matches “{search}”.
              </p>
            ) : null}

            {visible.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => open(section.key)}
                className={cn(
                  'flex items-start gap-3 rounded-sm border px-4 py-3 text-left transition-all duration-300',
                  active === section.key
                    ? 'border-gold-400/60 bg-gold-400/10'
                    : 'border-transparent hover:border-[rgb(var(--line))] hover:bg-[rgb(var(--card))]',
                )}
              >
                <Icon
                  name={section.icon}
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    active === section.key ? 'text-gold-500' : 'text-[rgb(var(--muted))]',
                  )}
                />
                <span className="min-w-0">
                  <span className="block font-sans text-sm font-medium text-[rgb(var(--ink))]">
                    {section.name}
                  </span>
                  <span className="mt-0.5 block font-sans text-2xs leading-snug text-[rgb(var(--muted))]">
                    {section.blurb}
                  </span>
                </span>
              </button>
            ))}

            {utilities.length ? <div className="my-3 h-px bg-[rgb(var(--line))]" /> : null}

            {utilities.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => open(entry.key)}
                className={cn(
                  'flex items-start gap-3 rounded-sm border px-4 py-3 text-left transition-all duration-300',
                  active === entry.key
                    ? 'border-gold-400/60 bg-gold-400/10'
                    : 'border-transparent hover:border-[rgb(var(--line))] hover:bg-[rgb(var(--card))]',
                )}
              >
                <Icon
                  name={entry.icon}
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    active === entry.key ? 'text-gold-500' : 'text-[rgb(var(--muted))]',
                  )}
                />
                <span className="min-w-0">
                  <span className="block font-sans text-sm font-medium text-[rgb(var(--ink))]">
                    {entry.name}
                  </span>
                  <span className="mt-0.5 block font-sans text-2xs leading-snug text-[rgb(var(--muted))]">
                    {entry.blurb}
                  </span>
                </span>
              </button>
            ))}

            {operations.length ? (
              <>
                <div className="my-3 h-px bg-[rgb(var(--line))]" />
                <p className="px-4 pb-1 font-sans text-2xs uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
                  Running the site
                </p>
              </>
            ) : null}

            {operations.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => open(entry.key)}
                className={cn(
                  'flex items-start gap-3 rounded-sm border px-4 py-3 text-left transition-all duration-300',
                  active === entry.key
                    ? 'border-gold-400/60 bg-gold-400/10'
                    : 'border-transparent hover:border-[rgb(var(--line))] hover:bg-[rgb(var(--card))]',
                )}
              >
                <Icon
                  name={entry.icon}
                  className={cn(
                    'mt-0.5 h-4 w-4 shrink-0',
                    active === entry.key ? 'text-gold-500' : 'text-[rgb(var(--muted))]',
                  )}
                />
                <span className="min-w-0">
                  <span className="block font-sans text-sm font-medium text-[rgb(var(--ink))]">
                    {entry.name}
                  </span>
                  <span className="mt-0.5 block font-sans text-2xs leading-snug text-[rgb(var(--muted))]">
                    {entry.blurb}
                  </span>
                </span>
              </button>
            ))}
          </nav>
        </aside>

        {menuOpen ? (
          <div
            className="fixed inset-0 z-30 bg-navy-950/50 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
        ) : null}

        <main className="min-w-0 flex-1">
          {active === 'office-requests' ? (
            <OfficeRequests />
          ) : active === 'hall-bookings' ? (
            <HallBookings />
          ) : active === 'hall-reviews' ? (
            <HallReviews />
          ) : active === 'inbox' ? (
            <Inbox submissions={submissions} />
          ) : active === 'people' ? (
            <People />
          ) : active === 'newsletter' ? (
            <NewsletterPanel />
          ) : active === 'letters' ? (
            <Letters />
          ) : active === 'activity' ? (
            <Activity />
          ) : active === 'backups' ? (
            <Backups canRestore={you?.role === 'owner'} />
          ) : active === 'visits' ? (
            <Visits />
          ) : active === 'problems' ? (
            <Problems />
          ) : active === 'system' ? (
            <System />
          ) : (
            <div className="rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))]">
              {/* Stays in reach however far down the form you have scrolled. */}
              <div className="sticky top-[4.25rem] z-20 flex flex-wrap items-center justify-between gap-4 rounded-t-[10px] border-b border-[rgb(var(--line))] bg-[rgb(var(--card))]/95 px-6 py-5 backdrop-blur-xl">
                <div className="min-w-0">
                  <h1 className="font-display text-2xl text-[rgb(var(--ink))]">{current?.name}</h1>
                  <p className="mt-1 flex flex-wrap items-center gap-3 font-sans text-2xs text-[rgb(var(--muted))]">
                    <span>{current?.blurb}</span>
                    {current ? (
                      <a
                        href={current.anchor}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-gold-600 transition-colors hover:text-gold-500 dark:text-gold-400"
                      >
                        See it on the site
                        <Icon name="arrowRight" className="h-3 w-3" />
                      </a>
                    ) : null}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!raw) setRawText(JSON.stringify(data, null, 2))
                      setRaw(!raw)
                    }}
                    className={cn(
                      'rounded-sm border px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] transition-colors',
                      raw
                        ? 'border-gold-400 text-gold-600 dark:text-gold-300'
                        : 'border-[rgb(var(--line))] text-[rgb(var(--muted))] hover:border-gold-400',
                    )}
                  >
                    {raw ? 'Form view' : 'JSON view'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (dirty && !window.confirm('Discard your unsaved changes and reload this section?')) return
                      if (isContent(active)) load(active)
                    }}
                    title="Reload this section from the site, discarding unsaved edits"
                    className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400"
                  >
                    Revert
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={status === 'saving' || (!dirty && status !== 'error')}
                    title="Ctrl+S"
                    className="rounded-sm bg-gold-400 px-5 py-2 font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-navy-950 transition-colors hover:bg-gold-300 disabled:opacity-60"
                  >
                    {status === 'saving'
                      ? 'Saving…'
                      : status === 'saved'
                        ? 'Saved ✓'
                        : dirty
                          ? 'Save changes'
                          : 'Saved'}
                  </button>
                </div>
              </div>

              {error ? (
                <p className="border-b border-burgundy-400/40 bg-burgundy-500/10 px-6 py-3 font-sans text-sm text-burgundy-600 dark:text-burgundy-300">
                  {error}
                </p>
              ) : null}

              <div className="p-6 sm:p-8">
                {status === 'loading' || data === null ? (
                  <div className="flex flex-col gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="skeleton h-12 rounded-sm" />
                    ))}
                  </div>
                ) : raw ? (
                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    spellCheck={false}
                    className="field h-[70vh] w-full resize-y font-mono text-xs leading-relaxed"
                  />
                ) : (
                  <JsonEditor value={data} onChange={setData} />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

function Inbox({ submissions }: { submissions: Submissions | null }) {
  if (!submissions) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-sm" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Donations donations={submissions.donations ?? []} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))]">
        <h2 className="border-b border-[rgb(var(--line))] px-6 py-5 font-display text-xl text-[rgb(var(--ink))]">
          Messages ({submissions.messages.length})
        </h2>
        <ul className="divide-y divide-[rgb(var(--line))]">
          {submissions.messages.length === 0 ? (
            <li className="px-6 py-8 font-sans text-sm text-[rgb(var(--muted))]">
              Nothing yet. Messages sent through the contact form appear here.
            </li>
          ) : (
            submissions.messages.map((m, i) => (
              <li key={i} className="px-6 py-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-sans text-sm font-semibold text-[rgb(var(--ink))]">
                    {m.name}
                  </span>
                  <span className="font-sans text-2xs tabular-nums text-[rgb(var(--muted))]">
                    {new Date(m.at).toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="mt-1 font-sans text-2xs text-gold-600 dark:text-gold-400">
                  {m.email}
                  {m.phone ? ` · ${m.phone}` : ''}
                </p>
                {m.subject ? (
                  <p className="mt-2 font-serif text-base text-[rgb(var(--ink))]">{m.subject}</p>
                ) : null}
                <p className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-[rgb(var(--muted))]">
                  {m.message}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))]">
        <h2 className="border-b border-[rgb(var(--line))] px-6 py-5 font-display text-xl text-[rgb(var(--ink))]">
          Newsletter ({submissions.subscribers.length})
        </h2>
        <ul className="divide-y divide-[rgb(var(--line))]">
          {submissions.subscribers.length === 0 ? (
            <li className="px-6 py-8 font-sans text-sm text-[rgb(var(--muted))]">
              No subscribers yet.
            </li>
          ) : (
            submissions.subscribers.map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-4 px-6 py-3.5">
                <span className="truncate font-sans text-sm text-[rgb(var(--ink))]">{s.email}</span>
                <span className="shrink-0 font-sans text-2xs tabular-nums text-[rgb(var(--muted))]">
                  {new Date(s.at).toLocaleDateString('en-IN')}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
      </div>
    </div>
  )
}

/**
 * Every gift Razorpay has confirmed, newest first, with the running totals the
 * treasurer reads out at the committee meeting and a CSV for the account book.
 */
function Donations({ donations }: { donations: Donation[] }) {
  const received = donations.filter((d) => d.status === 'captured' || d.status === 'authorized')
  const total = received.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)

  const now = new Date()
  const thisMonth = received
    .filter((d) => {
      const at = new Date(d.at)
      return at.getMonth() === now.getMonth() && at.getFullYear() === now.getFullYear()
    })
    .reduce((sum, d) => sum + (Number(d.amount) || 0), 0)

  const rupees = (value: number) => `₹${value.toLocaleString('en-IN')}`

  function exportCsv() {
    const header = [
      'Date',
      'Payment ID',
      'Donor',
      'Fund',
      'Amount',
      'Status',
      'Method',
      'Email',
      'Phone',
      'Intention',
    ]
    const rows = donations.map((d) => [
      new Date(d.at).toLocaleString('en-IN'),
      d.paymentId,
      d.donor ?? '',
      d.fundName ?? '',
      String(d.amount ?? ''),
      d.status ?? '',
      d.method ?? '',
      d.email ?? '',
      d.phone ?? '',
      d.intention ?? '',
    ])
    // Quote every cell — a donor's name or intention may contain a comma.
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => '"' + String(cell).replace(/"/g, '""') + '"').join(','))
      .join('\n')

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `donations-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgb(var(--line))] px-6 py-5">
        <div>
          <h2 className="font-display text-xl text-[rgb(var(--ink))]">
            Donations ({received.length})
          </h2>
          <p className="mt-1 font-sans text-2xs text-[rgb(var(--muted))]">
            content/donations.json · written only after Razorpay confirms the payment
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="text-right">
            <p className="font-display text-2xl tabular-nums text-gold-600 dark:text-gold-300">
              {rupees(total)}
            </p>
            <p className="font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
              received in all
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl tabular-nums text-[rgb(var(--ink))]">
              {rupees(thisMonth)}
            </p>
            <p className="font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))]">
              this month
            </p>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={donations.length === 0}
            className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400 hover:text-gold-500 disabled:opacity-40"
          >
            Export CSV
          </button>
        </div>
      </div>

      {donations.length === 0 ? (
        <p className="px-6 py-8 font-sans text-sm text-[rgb(var(--muted))]">
          Nothing yet. Gifts made through the donation section appear here the moment Razorpay
          confirms them.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse">
            <thead>
              <tr className="border-b border-[rgb(var(--line))] text-left">
                {['Date', 'Donor', 'Fund', 'Amount', 'Status', 'Reference'].map((head) => (
                  <th
                    key={head}
                    className="px-6 py-3 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))]"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--line))]">
              {donations.slice(0, 100).map((d) => (
                <tr key={d.paymentId}>
                  <td className="px-6 py-3 font-sans text-2xs tabular-nums text-[rgb(var(--muted))]">
                    {new Date(d.at).toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-3 font-sans text-sm text-[rgb(var(--ink))]">
                    {d.donor || 'Anonymous'}
                    {d.intention ? (
                      <span className="mt-0.5 block font-sans text-2xs text-[rgb(var(--muted))]">
                        {d.intention}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-6 py-3 font-sans text-2xs text-[rgb(var(--muted))]">
                    {d.fundName || '—'}
                  </td>
                  <td className="px-6 py-3 font-sans text-sm font-semibold tabular-nums text-gold-600 dark:text-gold-300">
                    {rupees(Number(d.amount) || 0)}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={cn(
                        'rounded-full border px-2.5 py-1 font-sans text-[0.58rem] uppercase tracking-[0.12em]',
                        d.status === 'captured' || d.status === 'authorized'
                          ? 'border-gold-400/60 text-gold-600 dark:text-gold-300'
                          : 'border-burgundy-400/50 text-burgundy-500 dark:text-burgundy-300',
                      )}
                    >
                      {d.status ?? 'unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-mono text-2xs text-[rgb(var(--muted))]">
                    {d.paymentId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
