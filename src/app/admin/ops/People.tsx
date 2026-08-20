'use client'

import { useCallback, useEffect, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'

import { Empty, Loading, Panel, Pill, Problem, when } from './Panel'

type Person = {
  id: string
  username: string
  name: string
  role: 'owner' | 'editor'
  createdAt: string
  lastSeen?: string
  disabled?: boolean
}

type Payload = {
  users: Person[]
  you: { username: string; role: 'owner' | 'editor' }
  bootstrap: boolean
  minPassword: number
}

/**
 * Who may sign in.
 *
 * An owner may do everything, including making accounts and restoring backups.
 * An editor may edit the site. Everyone may change their own password. Until
 * the first account is made the site still uses the single login from
 * `.env.local`, and this panel says so plainly.
 */
export function People() {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ username: '', name: '', password: '', role: 'editor' })
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
      setData({ users: [], you: { username: '', role: 'editor' }, bootstrap: true, minPassword: 10 })
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
              setForm({ username: '', name: '', password: '', role: 'editor' })
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
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="field"
            >
              <option value="editor">Editor — may edit the site</option>
              <option value="owner">Owner — may also manage accounts and restore backups</option>
            </select>
          </label>

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
                    <Pill tone={person.role === 'owner' ? 'good' : 'quiet'}>{person.role}</Pill>
                    {person.disabled ? <Pill tone="bad">suspended</Pill> : null}
                  </span>
                </div>

                <p className="mt-2 font-sans text-2xs text-[rgb(var(--muted))]">
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
                      <button
                        type="button"
                        disabled={busy === person.id}
                        onClick={() =>
                          call(
                            'PATCH',
                            { id: person.id, role: person.role === 'owner' ? 'editor' : 'owner' },
                            person.id,
                          )
                        }
                        className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400 disabled:opacity-50"
                      >
                        Make {person.role === 'owner' ? 'an editor' : 'an owner'}
                      </button>
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
