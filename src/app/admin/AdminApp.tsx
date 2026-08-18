'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { ParishEmblem } from '@/components/ui/ParishEmblem'
import { useTheme } from '@/lib/theme'
import type { ContentKey } from '@/lib/types'
import { cn } from '@/lib/utils'

import { AutoTranslateToggle, useAutoTranslate } from './AutoTranslate'
import { JsonEditor } from './JsonEditor'

type SectionDef = {
  key: ContentKey
  name: string
  icon: string
  blurb: string
}

const SECTIONS: SectionDef[] = [
  { key: 'site', name: 'Homepage & Banners', icon: 'home', blurb: 'Hero images, welcome text, contact details, social links' },
  { key: 'upcoming', name: 'Upcoming Events', icon: 'sparkle', blurb: 'Dated events, and the welcome popup that announces them' },
  { key: 'notices', name: 'Notice Board', icon: 'bell', blurb: 'Parish news, banns, funeral notices, prayer requests' },
  { key: 'obituaries', name: 'Obituary Column', icon: 'candle', blurb: 'Deaths, funeral details and the memorial for each' },
  { key: 'events', name: 'Weekly Events', icon: 'calendar', blurb: 'The seven day parish calendar' },
  { key: 'mass', name: 'Mass Timings', icon: 'clock', blurb: 'Sunday, weekday, holy day, confession, adoration' },
  { key: 'clergy', name: 'Parish Priest', icon: 'users', blurb: 'Photo, message, quote and contact details' },
  { key: 'committee', name: 'Parish Committee', icon: 'shield', blurb: 'Office bearers, ward members and their term' },
  { key: 'past-priests', name: 'Past Priests', icon: 'scroll', blurb: 'The timeline of former vicars' },
  { key: 'gallery', name: 'Gallery', icon: 'plus', blurb: 'Upload photographs and set their category' },
  { key: 'media', name: 'Videos & Bulletins', icon: 'youtube', blurb: 'YouTube videos and downloadable PDF bulletins' },
  { key: 'stats', name: 'Parish Statistics', icon: 'users', blurb: 'Summary counts shown on the homepage' },
  { key: 'ministries', name: 'Ministries', icon: 'flame', blurb: 'Each ministry, its leader, team, events and history' },
  { key: 'donation', name: 'Donations', icon: 'heart', blurb: 'Funds, suggested amounts, bank and UPI details' },
  { key: 'about', name: 'About the Church', icon: 'book', blurb: 'History, mission, vision, patron, architecture' },
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
  const [active, setActive] = useState<ContentKey | 'inbox'>('site')
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
  const { waitForIdle } = useAutoTranslate()

  // Always holds the newest editor state, so a save that waited for a
  // translation writes the translated text rather than the older snapshot.
  const dataRef = useRef<unknown>(null)
  dataRef.current = data

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
    load(active)
  }, [active, load])

  const dirty = active !== 'inbox' && data !== null && JSON.stringify(data) !== original

  async function save() {
    if (active === 'inbox') return
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

  const current = SECTIONS.find((s) => s.key === active)

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
            'w-72 shrink-0 lg:block',
            menuOpen
              ? 'fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto border-r border-[rgb(var(--line))] bg-[rgb(var(--page))] p-5 lg:static lg:z-auto lg:border-0 lg:bg-transparent lg:p-0'
              : 'hidden',
          )}
        >
          <nav className="flex flex-col gap-1">
            {SECTIONS.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => {
                  setActive(section.key)
                  setMenuOpen(false)
                  setRaw(false)
                }}
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

            <div className="my-3 h-px bg-[rgb(var(--line))]" />

            <button
              type="button"
              onClick={() => {
                setActive('inbox')
                setMenuOpen(false)
              }}
              className={cn(
                'flex items-start gap-3 rounded-sm border px-4 py-3 text-left transition-all duration-300',
                active === 'inbox'
                  ? 'border-gold-400/60 bg-gold-400/10'
                  : 'border-transparent hover:border-[rgb(var(--line))] hover:bg-[rgb(var(--card))]',
              )}
            >
              <Icon name="mail" className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--muted))]" />
              <span>
                <span className="block font-sans text-sm font-medium text-[rgb(var(--ink))]">
                  Inbox, Gifts & Subscribers
                </span>
                <span className="mt-0.5 block font-sans text-2xs leading-snug text-[rgb(var(--muted))]">
                  Contact form messages and every donation received
                </span>
              </span>
            </button>
          </nav>
        </aside>

        {menuOpen ? (
          <div
            className="fixed inset-0 z-30 bg-navy-950/50 lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
        ) : null}

        <main className="min-w-0 flex-1">
          {active === 'inbox' ? (
            <Inbox submissions={submissions} />
          ) : (
            <div className="rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--card))]">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgb(var(--line))] px-6 py-5">
                <div>
                  <h1 className="font-display text-2xl text-[rgb(var(--ink))]">{current?.name}</h1>
                  <p className="mt-1 font-sans text-2xs text-[rgb(var(--muted))]">
                    content/{active}.json
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
                    onClick={() => load(active)}
                    className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400"
                  >
                    Revert
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={status === 'saving'}
                    className="rounded-sm bg-gold-400 px-5 py-2 font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-navy-950 transition-colors hover:bg-gold-300 disabled:opacity-60"
                  >
                    {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : 'Save changes'}
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
