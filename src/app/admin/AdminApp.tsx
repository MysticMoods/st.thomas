'use client'

import { useCallback, useEffect, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { ParishEmblem } from '@/components/ui/ParishEmblem'
import type { Reply } from '@/lib/reply'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

import { HallBookings } from './HallBookings'
import { HallReviews } from './HallReviews'
import { OfficeRequests } from './OfficeRequests'
import { Activity } from './ops/Activity'
import { ReplyBox } from './ops/ReplyBox'
import { Backups } from './ops/Backups'
import { Letters } from './ops/Letters'
import { NewsletterPanel } from './ops/NewsletterPanel'
import { type Area, type Role, may } from '@/lib/permissions'
import { People } from './ops/People'
import { Problems } from './ops/Problems'
import { System } from './ops/System'
import { Visits } from './ops/Visits'

/**
 * Everything the main pane can show. Writing the site is not among them: that
 * happens on the pages themselves, where you can see what you are changing.
 */
type PanelKey =
  | 'inbox'
  | 'donations'
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

type PanelEntry = { key: PanelKey; name: string; icon: string; blurb: string; area: Area }

/**
 * Running the site rather than writing it — accounts, history, health.
 *
 * Each panel names the jurisdiction it belongs to. Somebody who does not hold
 * it never sees the panel; the routes behind it refuse them as well, so this is
 * tidiness rather than the lock itself.
 */
const OPERATIONS: PanelEntry[] = [
  { key: 'people', name: 'People & access', icon: 'users', blurb: 'Staff accounts and what each may do', area: 'people' },
  { key: 'newsletter', name: 'Newsletter', icon: 'mail', blurb: 'Write to everybody who asked for news', area: 'newsletter' },
  { key: 'letters', name: 'Letters sent', icon: 'file', blurb: 'What the site posted, and whether it arrived', area: 'system' },
  { key: 'activity', name: 'Activity log', icon: 'scroll', blurb: 'Who changed what, and when', area: 'system' },
  { key: 'backups', name: 'Backups & restore', icon: 'copy', blurb: 'Read or put back an earlier copy', area: 'system' },
  { key: 'visits', name: 'Visits', icon: 'globe', blurb: 'How much the site is being read', area: 'system' },
  { key: 'problems', name: 'Problems', icon: 'bell', blurb: 'Faults the site has hit', area: 'system' },
  { key: 'system', name: 'System health', icon: 'shield', blurb: 'Disk, settings and what is stored', area: 'system' },
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
  messages: {
    id?: string
    name: string
    email: string
    phone?: string
    subject?: string
    message: string
    at: string
    replies?: Reply[]
  }[]
  donations: Donation[]
}

export function AdminApp() {
  const { theme, toggle } = useTheme()
  // The first thing anybody opening this wants is what has come in since they
  // last looked.
  const [active, setActive] = useState<PanelKey>('office-requests')
  /** Who is signed in, so the panels know what to offer them. */
  const [you, setYou] = useState<{ username: string; role: Role } | null>(null)
  const [submissions, setSubmissions] = useState<Submissions | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [search, setSearch] = useState('')

  /** Read again after an answer is written, so it appears under the message. */
  const loadSubmissions = useCallback(() => {
    fetch('/api/admin/submissions', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setSubmissions)
      .catch(() => setSubmissions({ subscribers: [], messages: [], donations: [] }))
  }, [])

  useEffect(() => {
    if (active === 'inbox' || active === 'donations') loadSubmissions()
  }, [active, loadSubmissions])

  // Which account is signed in decides what the operations panels offer.
  useEffect(() => {
    fetch('/api/admin/users', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => setYou(json?.you ?? null))
      .catch(() => setYou(null))
  }, [])

  function open(next: PanelKey) {
    if (next === active) return
    setActive(next)
    setMenuOpen(false)
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    window.location.href = '/'
  }

  /** Panels that hold what people have sent in. */
  const INBOXES: PanelEntry[] = [
    { key: 'office-requests', name: 'Office Requests', icon: 'scroll', blurb: 'Mass intentions, certificates and prayers', area: 'office' },
    { key: 'hall-bookings', name: 'Hall Bookings', icon: 'calendar', blurb: 'Requests to confirm or decline', area: 'hall' },
    { key: 'hall-reviews', name: 'Hall Reviews', icon: 'quote', blurb: 'Publish or hold what families wrote', area: 'hall' },
    { key: 'inbox', name: 'Messages & Subscribers', icon: 'mail', blurb: 'What people wrote in, and who asked for news', area: 'messages' },
    { key: 'donations', name: 'Donations', icon: 'heart', blurb: 'Every gift received, the totals, and a copy for the accounts', area: 'giving' },
  ]

  /** Only what this person's role lets them work in. */
  const mine = (entry: PanelEntry) => (you ? may(you.role, entry.area) : false)
  const matches = (text: string) => {
    const needle = search.trim().toLowerCase()
    return !needle || text.toLowerCase().includes(needle)
  }
  // Somebody whose role does not include the panel the dashboard opens on —
  // a treasurer, who sees only the giving — is moved to the first one that is
  // theirs, rather than shown an empty frame and left to guess.
  const allowed = [...INBOXES, ...OPERATIONS].filter(mine)
  useEffect(() => {
    if (!you) return
    if (allowed.length === 0) return
    if (!allowed.some((entry) => entry.key === active)) setActive(allowed[0].key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [you, active])

  const utilities = INBOXES.filter(
    (entry) => mine(entry) && matches(`${entry.name} ${entry.blurb} ${entry.key}`),
  )
  const operations = OPERATIONS.filter(
    (entry) => mine(entry) && matches(`${entry.name} ${entry.blurb} ${entry.key}`),
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

            <a
              href="/"
              className="mb-2 flex items-start gap-3 rounded-sm border border-gold-400/50 bg-gold-400/10 px-4 py-3 text-left transition-colors hover:border-gold-400"
            >
              <Icon name="sparkle" className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
              <span className="min-w-0">
                <span className="block font-sans text-sm font-medium text-[rgb(var(--ink))]">
                  Edit the pages
                </span>
                <span className="mt-0.5 block font-sans text-2xs leading-snug text-[rgb(var(--muted))]">
                  On the site itself — open a page and press Edit this page
                </span>
              </span>
            </a>

            {utilities.length === 0 && operations.length === 0 ? (
              <p className="px-4 py-3 font-sans text-2xs text-[rgb(var(--muted))]">
                Nothing matches “{search}”.
              </p>
            ) : null}

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
            <Inbox submissions={submissions} onChanged={loadSubmissions} />
          ) : active === 'donations' ? (
            submissions ? (
              <Donations donations={submissions.donations ?? []} />
            ) : (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton h-24 rounded-sm" />
                ))}
              </div>
            )
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
          ) : null}
        </main>
      </div>
    </div>
  )
}

function Inbox({
  submissions,
  onChanged,
}: {
  submissions: Submissions | null
  onChanged?: () => void
}) {
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
                <ReplyBox list="messages" target={m} onDone={onChanged} />
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
