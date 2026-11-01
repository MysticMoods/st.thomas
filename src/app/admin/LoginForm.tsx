'use client'

import { useEffect, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { ParishEmblem } from '@/components/ui/ParishEmblem'
import { isFirebaseConfigured, signInWithFirebaseEmail } from '@/lib/firebase/client'

export function LoginForm({ demo }: { demo?: boolean }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [firebaseReady, setFirebaseReady] = useState(false)

  useEffect(() => {
    setFirebaseReady(isFirebaseConfigured())
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')

    try {
      let res: Response

      if (firebaseReady) {
        // Sign in with Firebase Authentication
        let idToken: string
        try {
          idToken = await signInWithFirebaseEmail(email, password)
        } catch (firebaseErr: unknown) {
          const code = (firebaseErr as { code?: string })?.code || ''
          if (
            code === 'auth/invalid-credential' ||
            code === 'auth/user-not-found' ||
            code === 'auth/wrong-password' ||
            code === 'auth/invalid-email'
          ) {
            throw new Error('Incorrect email or password')
          } else if (code === 'auth/too-many-requests') {
            throw new Error('Too many failed attempts. Please try again later.')
          } else if (code === 'auth/user-disabled') {
            throw new Error('This account has been disabled.')
          } else {
            const msg = (firebaseErr as { message?: string })?.message
            throw new Error(msg ?? 'Firebase sign in failed')
          }
        }

        res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        })
      } else {
        // Fallback for when Firebase configuration keys are still being added
        res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: email, password }),
        })
      }

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Sign in failed')

      // Signing in puts the parish into administrative mode on the site itself.
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
          {firebaseReady ? (
            <div className="mb-6 flex items-center gap-2 rounded-sm border border-gold-400/20 bg-gold-400/5 px-3.5 py-2 text-2xs text-gold-300">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-400 animate-pulse" />
              Firebase Authentication Active
            </div>
          ) : (
            <div className="mb-6 rounded-sm border border-amber-500/30 bg-amber-500/10 p-3 text-2xs leading-relaxed text-amber-200">
              <p className="font-semibold text-amber-100">Firebase Setup</p>
              <p className="mt-1 text-amber-200/80">
                Add your Firebase project keys to <code className="text-amber-100">.env.local</code> to enable Firebase Auth.
              </p>
            </div>
          )}

          <label
            htmlFor="admin-email"
            className="font-sans text-2xs uppercase tracking-[0.18em] text-stone-400"
          >
            {firebaseReady ? 'Email Address' : 'Email or User ID'}
          </label>
          <div className="mt-3 flex items-center gap-2 rounded-sm border border-white/15 bg-navy-950/60 px-4 focus-within:border-gold-400">
            <Icon name={firebaseReady ? 'mail' : 'users'} className="h-4 w-4 text-gold-400/70" />
            <input
              id="admin-email"
              name="email"
              type={firebaseReady ? 'email' : 'text'}
              required
              autoFocus
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={firebaseReady ? 'office@stthomasmangalassery.org' : 'vicar'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent py-3.5 font-sans text-[0.95rem] text-white outline-none placeholder:text-stone-600"
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

          {demo && !firebaseReady ? (
            <p className="mt-6 border-t border-white/10 pt-5 font-sans text-2xs leading-relaxed text-stone-500">
              Bootstrap login: <code className="text-gold-400">vicar</code> /{' '}
              <code className="text-gold-400">mangalassery1893</code>. Set your{' '}
              <code className="text-gold-400">NEXT_PUBLIC_FIREBASE_*</code> values in{' '}
              <code>.env.local</code> for production authentication.
            </p>
          ) : (
            <p className="mt-6 border-t border-white/10 pt-5 font-sans text-2xs leading-relaxed text-stone-500">
              Staff accounts are authenticated through Firebase. An administrator assigns roles under People &amp; access.
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
