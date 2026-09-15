'use client'

import { useCallback, useEffect, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { type Role, may } from '@/lib/permissions'
import type { ContentKey } from '@/lib/types'
import { cn } from '@/lib/utils'

import { Empty, Loading, Panel, Pill, Problem, when } from './Panel'

type Person = {
  id: string
  username: string
  name: string
  role: Role
  /** Pages this person may edit. Absent or empty means every page. */
  sections?: ContentKey[]
  createdAt: string
  lastSeen?: string
  disabled?: boolean
}

type Payload = {
  users: Person[]
  you: { username: string; role: Role }
  bootstrap: boolean
  minPassword: number
  /** The roles the server will accept, so the two can never disagree. */
  roles: { id: Role; name: string; blurb: string }[]
  sections: ContentKey[]
}

/**
 * Who may sign in, and what each of them may touch.
 *
 * This is the only place a user ID and a password are set. The parish priest
 * makes an account here, types the first password into it, and hands it over;
 * the person changes it themselves afterwards. Nothing is emailed, because a
 * password in an inbox is a password on a screen in a room somebody else walks
 * through.
 *
 * The roles come from the server rather than being written out again here, so
 * the list somebody picks from is exactly the list the server will accept.
 * Until the first account is made the site still uses the single login from
 * `.env.local`, and this panel says so plainly.
 */
export function People() {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<{
    username: string
    name: string
    password: string
    role: Role
    sections: ContentKey[]
  }>({ username: '', name: '', password: '', role: 'editor', sections: [] })
  const [changing, setChanging] = useState('')
  const [password, setPassword] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not read the accounts')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read the accounts')
      setData({
        users: [],
        you: { username: '', role: 'editor' },
        bootstrap: true,
        minPassword: 10,
        roles: [],
        sections: [],
      })
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function call(method: string, body: unknown, what: string) {
    setBusy(what)
    setError('')
    try {
      const res = await fetch('/api/admin/users', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'That did not work')
      await load()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not work')
      return false
    } finally {
      setBusy('')
    }
  }

  if (!data) {
    return (
      <Panel title="People & access" blurb="Who may sign in, and what each of them may do.">
        <Loading />
      </Panel>
    )
  }

  const isOwner = data.you.role === 'owner'

  return (
    <Panel
      title="People & access"
      blurb="Who may sign in, and what each of them may do."
      actions={
        isOwner ? (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className="rounded-sm bg-gold-400 px-4 py-2 font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-navy-950 transition-colors hover:bg-gold-300"
          >
            {adding ? 'Cancel' : 'Add someone'}
          </button>
        ) : null
      }
    >
      <Problem>{error}</Problem>

      {data.bootstrap ? (
        <div className="mb-6 rounded-sm border border-gold-400/50 bg-gold-400/10 px-5 py-4">
          <p className="font-sans text-sm text-[rgb(var(--ink))]">
            This site still uses the single login from <code>.env.local</code>. Everyone shares it,
            so the activity log cannot say who did what.
          </p>
          <p className="mt-2 font-sans text-2xs text-[rgb(var(--muted))]">
            Make the first account below — it becomes the owner, and the shared login stops working
            the moment it exists.
          </p>
        </div>
      ) : null}

      {adding ? (
        <form
          className="mb-6 grid gap-3 rounded-sm border border-[rgb(var(--line))] p-5 sm:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault()
            const ok = await call('POST', form, 'add')
            if (ok) {
              setForm({ username: '', name: '', password: '', role: 'editor', sections: [] })
              setAdding(false)
            }
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
              Their name
            </span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Sr. Ancy"
              className="field"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
              User ID they will type
            </span>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="ancy"
              className="field"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
              Password — at least {data.minPassword} characters
            </span>
            <input
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="field"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
              What they may do
            </span>
            <select
              value={data.users.length === 0 ? 'owner' : form.role}
              disabled={data.users.length === 0}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              className="field"
            >
              {data.roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <span className="font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
              {data.roles.find((r) => r.id === (data.users.length === 0 ? 'owner' : form.role))
                ?.blurb ?? ''}
            </span>
          </label>

          {/* Which pages, for a role that edits pages at all. Left as every
              page unless somebody deliberately narrows it. */}
          {may(data.users.length === 0 ? 'owner' : form.role, 'pages') ? (
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                Which pages they may edit
              </span>
              <SectionPicker
                all={data.sections}
                chosen={form.sections}
                onChange={(sections) => setForm({ ...form, sections })}
              />
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <button type="submit" disabled={busy === 'add'} className="btn-primary">
              {busy === 'add' ? 'Adding…' : 'Add this account'}
              <Icon name="check" className="h-4 w-4" />
            </button>
            {data.users.length === 0 ? (
              <p className="mt-3 font-sans text-2xs text-[rgb(var(--muted))]">
                The first account is always an owner, so the parish keeps a way in.
              </p>
            ) : null}
          </div>
        </form>
      ) : null}

      {data.users.length === 0 ? (
        <Empty>No accounts yet.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.users.map((person) => {
            const isYou = person.username === data.you.username
            return (
              <li
                key={person.id}
                className={cn(
                  'rounded-sm border p-5',
                  person.disabled
                    ? 'border-[rgb(var(--line))] opacity-60'
                    : 'border-[rgb(var(--line))]',
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <span className="min-w-0">
                    <span className="font-serif text-lg text-[rgb(var(--ink))]">{person.name}</span>
                    <span className="ml-3 font-sans text-2xs text-[rgb(var(--muted))]">
                      {person.username}
                      {isYou ? ' · you' : ''}
                    </span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <Pill tone={person.role === 'owner' ? 'good' : 'quiet'}>
                      {data.roles.find((r) => r.id === person.role)?.name ?? person.role}
                    </Pill>
                    {person.disabled ? <Pill tone="bad">suspended</Pill> : null}
                  </span>
                </div>

                <p className="mt-2 font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
                  {data.roles.find((r) => r.id === person.role)?.blurb ?? ''}
                </p>
                <p className="mt-1 font-sans text-2xs text-[rgb(var(--muted))]">
                  {may(person.role, 'pages')
                    ? person.sections?.length
                      ? `Pages: ${person.sections.join(', ')}`
                      : 'Pages: every page they are allowed'
                    : 'Edits no pages'}
                </p>
                <p className="mt-1 font-sans text-2xs text-[rgb(var(--muted))]">
                  Added {when(person.createdAt)} · last seen {when(person.lastSeen)}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(isOwner || isYou) && (
                    <button
                      type="button"
                      onClick={() => {
                        setChanging(changing === person.id ? '' : person.id)
                        setPassword('')
                      }}
                      className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400"
                    >
                      {changing === person.id ? 'Cancel' : 'Change password'}
                    </button>
                  )}

                  {isOwner && !isYou ? (
                    <>
                      <select
                        value={person.role}
                        disabled={busy === person.id}
                        onChange={(e) => call('PATCH', { id: person.id, role: e.target.value }, person.id)}
                        aria-label={`What ${person.name} may do`}
                        className="rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--page))] px-3 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400 disabled:opacity-50"
                      >
                        {data.roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={busy === person.id}
                        onClick={() =>
                          call('PATCH', { id: person.id, disabled: !person.disabled }, person.id)
                        }
                        className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400 disabled:opacity-50"
                      >
                        {person.disabled ? 'Restore' : 'Suspend'}
                      </button>
                      <button
                        type="button"
                        disabled={busy === person.id}
                        onClick={() => {
                          if (!window.confirm(`Remove the account for ${person.name}?`)) return
                          call('DELETE', { id: person.id }, person.id)
                        }}
                        className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-burgundy-400 hover:text-burgundy-500 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </>
                  ) : null}
                </div>

                {changing === person.id ? (
                  <form
                    className="mt-4 flex flex-wrap items-end gap-3"
                    onSubmit={async (event) => {
                      event.preventDefault()
                      const ok = await call('PATCH', { id: person.id, password }, person.id)
                      if (ok) {
                        setChanging('')
                        setPassword('')
                      }
                    }}
                  >
                    <label className="flex min-w-[16rem] flex-1 flex-col gap-1.5">
                      <span className="font-sans text-2xs uppercase tracking-[0.16em] text-[rgb(var(--muted))]">
                        New password — at least {data.minPassword} characters
                      </span>
                      <input
                        type="text"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="field"
                        required
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={busy === person.id}
                      className="rounded-sm bg-gold-400 px-5 py-3 font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-navy-950 hover:bg-gold-300 disabled:opacity-50"
                    >
                      Set it
                    </button>
                  </form>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {!isOwner ? (
        <p className="mt-6 font-sans text-2xs text-[rgb(var(--muted))]">
          You are an editor, so you may change your own password here. Ask an owner for anything
          else.
        </p>
      ) : null}
    </Panel>
  )
}

/**
 * Which pages an account may edit.
 *
 * Nothing ticked means every page, which is what an account made before any of
 * this existed has — so the ordinary case needs no thought at all, and
 * narrowing somebody is a deliberate act. What a role refuses outright is
 * refused whatever is ticked here; this narrows, it never widens.
 */
function SectionPicker({
  all,
  chosen,
  onChange,
}: {
  all: ContentKey[]
  chosen: ContentKey[]
  onChange: (next: ContentKey[]) => void
}) {
  const everything = chosen.length === 0

  return (
    <div className="rounded-sm border border-[rgb(var(--line))] p-3">
      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={everything}
          onChange={() => onChange(everything ? [...all] : [])}
          className="h-4 w-4 accent-gold-500"
        />
        <span className="font-sans text-sm text-[rgb(var(--ink))]">
          Every page {everything ? '' : `— currently ${chosen.length} of ${all.length}`}
        </span>
      </label>

      {everything ? null : (
        <div className="mt-3 grid gap-1.5 border-t border-dashed border-[rgb(var(--line))] pt-3 sm:grid-cols-3">
          {all.map((key) => (
            <label key={key} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={chosen.includes(key)}
                onChange={() =>
                  onChange(
                    chosen.includes(key)
                      ? chosen.filter((entry) => entry !== key)
                      : [...chosen, key],
                  )
                }
                className="h-3.5 w-3.5 accent-gold-500"
              />
              <span className="font-sans text-2xs text-[rgb(var(--muted))]">{key}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
