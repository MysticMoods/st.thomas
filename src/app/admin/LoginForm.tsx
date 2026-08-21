'use client'

import { useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { ParishEmblem } from '@/components/ui/ParishEmblem'

export function LoginForm({ demo }: { demo?: boolean }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Sign in failed')

      // Signing in puts the parish into administrative mode on the site itself.
      // The dashboard is still one click away, from the strip along the top.
      window.sessionStorage.setItem('stc-editing', 'on')
      const next = new URLSearchParams(window.location.search).get('next')
      window.location.href = next && next.startsWith('/') ? next : '/'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed')
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-navy-950 px-5 py-16">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <ParishEmblem variant="gold" className="h-20 w-20" />
          <h1 className="mt-7 font-display text-3xl text-white">Parish Dashboard</h1>
          <p className="mt-2 font-sans text-2xs uppercase tracking-[0.28em] text-gold-400">
            St. Thomas Church · Mangalassery
          </p>
        </div>

        <form
          onSubmit={submit}
          className="mt-10 rounded-sm border border-white/10 bg-white/[0.04] p-8 backdrop-blur-sm"
        >
          <label
            htmlFor="admin-username"
            className="font-sans text-2xs uppercase tracking-[0.18em] text-stone-400"
          >
            User ID
          </label>
          <div className="mt-3 flex items-center gap-2 rounded-sm border border-white/15 bg-navy-950/60 px-4 focus-within:border-gold-400">
            <Icon name="users" className="h-4 w-4 text-gold-400/70" />
            <input
              id="admin-username"
              name="username"
              type="text"
              required
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-transparent py-3.5 font-sans text-[0.95rem] text-white outline-none"
            />
          </div>

          <label
            htmlFor="admin-password"
            className="mt-6 block font-sans text-2xs uppercase tracking-[0.18em] text-stone-400"
          >
            Password
          </label>
          <div className="mt-3 flex items-center gap-2 rounded-sm border border-white/15 bg-navy-950/60 px-4 focus-within:border-gold-400">
            <Icon name="lock" className="h-4 w-4 text-gold-400/70" />
            <input
              id="admin-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent py-3.5 font-sans text-[0.95rem] text-white outline-none"
            />
          </div>

          {error ? (
            <p className="mt-4 font-sans text-2xs text-burgundy-300" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={busy} className="btn-primary mt-7 w-full">
            {busy ? 'Signing in…' : 'Sign in'}
            <Icon name="arrowRight" className="h-4 w-4" />
          </button>

          {demo ? (
            <p className="mt-6 border-t border-white/10 pt-5 font-sans text-2xs leading-relaxed text-stone-500">
              Demo account: <code className="text-gold-400">vicar</code> /{' '}
              <code className="text-gold-400">mangalassery1893</code>. Set{' '}
              <code className="text-gold-400">ADMIN_USERNAME</code>,{' '}
              <code className="text-gold-400">ADMIN_PASSWORD</code> and{' '}
              <code className="text-gold-400">ADMIN_SESSION_SECRET</code> in{' '}
              <code>.env.local</code> before anybody else can reach this page.
            </p>
          ) : (
            <p className="mt-6 border-t border-white/10 pt-5 font-sans text-2xs leading-relaxed text-stone-500">
              The parish office keeps the sign-in details. A forgotten password is
              reset by an owner under People &amp; access.
            </p>
          )}
        </form>

        <a
          href="/"
          className="mt-8 flex items-center justify-center gap-2 font-sans text-2xs uppercase tracking-[0.18em] text-stone-500 transition-colors hover:text-gold-300"
        >
          <Icon name="chevronLeft" className="h-3.5 w-3.5" />
          Back to the parish site
        </a>
      </div>
    </main>
  )
}
