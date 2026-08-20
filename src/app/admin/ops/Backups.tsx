'use client'

import { useCallback, useEffect, useState } from 'react'

import { Empty, Loading, Panel, Problem, sizeOf, when } from './Panel'

type Section = { key: string; backups: number; latest: string | null }
type Copy = { name: string; at: string; size: number }

/**
 * The copies kept before every save.
 *
 * Twenty per section, written automatically. Restoring one is itself a save, so
 * the version being replaced is backed up first and the step can be undone.
 */
export function Backups({ canRestore }: { canRestore: boolean }) {
  const [sections, setSections] = useState<Section[] | null>(null)
  const [open, setOpen] = useState('')
  const [copies, setCopies] = useState<Copy[] | null>(null)
  const [preview, setPreview] = useState<{ name: string; text: string } | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/backups', { cache: 'no-store' })
      const json = await res.json()
      setSections(Array.isArray(json.sections) ? json.sections : [])
    } catch {
      setSections([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function openSection(key: string) {
    if (open === key) {
      setOpen('')
      setCopies(null)
      return
    }
    setOpen(key)
    setCopies(null)
    setPreview(null)
    try {
      const res = await fetch(`/api/admin/backups?key=${key}`, { cache: 'no-store' })
      const json = await res.json()
      setCopies(Array.isArray(json.backups) ? json.backups : [])
    } catch {
      setCopies([])
    }
  }

  async function show(name: string) {
    setError('')
    try {
      const res = await fetch(`/api/admin/backups?file=${encodeURIComponent(name)}`, {
        cache: 'no-store',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not read that copy')
      setPreview({ name, text: JSON.stringify(json.data, null, 2) })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that copy')
    }
  }

  async function restore(name: string) {
    if (
      !window.confirm(
        `Put this copy back over the live site?\n\n${name}\n\nWhat is there now is saved first, so this can be undone.`,
      )
    ) {
      return
    }
    setBusy(name)
    setError('')
    try {
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: name }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not restore that copy')
      setPreview(null)
      await load()
      if (open) await openSection(open)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not restore that copy')
    } finally {
      setBusy('')
    }
  }

  return (
    <Panel
      title="Backups & restore"
      blurb="A copy of every section is kept before each save. The last twenty are held."
    >
      <Problem>{error}</Problem>

      {!canRestore ? (
        <p className="mb-5 rounded-sm border border-[rgb(var(--line))] px-4 py-3 font-sans text-2xs text-[rgb(var(--muted))]">
          You can read any saved copy here. Putting one back over the live site is an owner&apos;s
          decision.
        </p>
      ) : null}

      {sections === null ? (
        <Loading />
      ) : (
        <ul className="flex flex-col gap-2">
          {sections.map((section) => (
            <li key={section.key} className="rounded-sm border border-[rgb(var(--line))]">
              <button
                type="button"
                onClick={() => openSection(section.key)}
                aria-expanded={open === section.key}
                className="flex w-full flex-wrap items-baseline justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-gold-400/5"
              >
                <span className="font-sans text-sm text-[rgb(var(--ink))]">
                  content/{section.key}.json
                </span>
                <span className="font-sans text-2xs text-[rgb(var(--muted))]">
                  {section.backups} saved {section.backups === 1 ? 'copy' : 'copies'}
                  {section.latest ? ` · newest ${when(section.latest)}` : ''}
                </span>
              </button>

              {open === section.key ? (
                <div className="border-t border-[rgb(var(--line))] px-5 py-4">
                  {copies === null ? (
                    <Loading rows={2} />
                  ) : copies.length === 0 ? (
                    <Empty>This section has never been saved from the dashboard.</Empty>
                  ) : (
                    <ul className="divide-y divide-[rgb(var(--line))]">
                      {copies.map((copy) => (
                        <li
                          key={copy.name}
                          className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                        >
                          <span className="font-sans text-2xs tabular-nums text-[rgb(var(--muted))]">
                            {when(copy.at)} · {sizeOf(copy.size)}
                          </span>
                          <span className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => show(copy.name)}
                              className="rounded-sm border border-[rgb(var(--line))] px-3 py-1.5 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400"
                            >
                              Read
                            </button>
                            {canRestore ? (
                              <button
                                type="button"
                                disabled={busy === copy.name}
                                onClick={() => restore(copy.name)}
                                className="rounded-sm border border-gold-400 px-3 py-1.5 font-sans text-2xs uppercase tracking-[0.14em] text-gold-700 transition-colors hover:bg-gold-400/10 disabled:opacity-50 dark:text-gold-300"
                              >
                                {busy === copy.name ? 'Restoring…' : 'Put back'}
                              </button>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {preview ? (
        <div className="mt-6 rounded-sm border border-[rgb(var(--line))]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--line))] px-5 py-3">
            <span className="font-sans text-2xs text-[rgb(var(--muted))]">{preview.name}</span>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] hover:text-gold-500"
            >
              Close
            </button>
          </div>
          <pre className="max-h-96 overflow-auto p-5 font-mono text-2xs leading-relaxed text-[rgb(var(--muted))]">
            {preview.text}
          </pre>
        </div>
      ) : null}
    </Panel>
  )
}
