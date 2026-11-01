'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  AutoTranslateProvider,
  AutoTranslateToggle,
  LanguageSwitch,
  useAutoTranslate,
} from '@/app/admin/AutoTranslate'
import { JsonEditor } from '@/app/admin/JsonEditor'
import { Icon } from '@/components/ui/Icon'
import { Modal, useDialogId } from '@/components/ui/Modal'
import type { ContentKey } from '@/lib/types'
import { cn } from '@/lib/utils'

import { useAdminMode } from './AdminMode'

/**
 * Wraps a section of the public page. To a visitor it renders nothing at all;
 * to signed-in staff with editing switched on it adds a strip above the section
 * — its name and an Edit button — that opens that section's content in place.
 *
 * The strip takes its own room rather than floating over the section, so it can
 * never sit on a heading, a button or a photograph, at any width.
 */
export function EditableSection({
  section,
  label,
  underHeader = false,
  children,
}: {
  section: ContentKey
  label: string
  /**
   * The section starts at the very top of the window, beneath the fixed header
   * (the homepage banner). The strip then drops below the header so it is not
   * hidden behind it.
   */
  underHeader?: boolean
  children: React.ReactNode
}) {
  const { isAdmin, editing, canEdit } = useAdminMode()
  const [open, setOpen] = useState(false)

  if (!isAdmin) return <>{children}</>

  // A section outside this person's jurisdiction is simply the page as a
  // visitor sees it: no outline, no button, nothing to press and be refused.
  // The server refuses it too — this only keeps it out of their way.
  const mine = canEdit(section)
  if (!mine) return <>{children}</>

  return (
    <div className={cn('relative', editing && 'outline-dashed outline-2 -outline-offset-2 outline-gold-400/50')}>
      {editing ? (
        <div
          className={cn(
            'no-print relative z-30 border-y border-dashed border-gold-400/60 bg-[rgb(var(--page))]',
            // Beneath the fixed header: the band behind it is the header's own colour.
            underHeader && 'mt-0 border-t-0 bg-navy-950 pt-[7.25rem] text-stone-200 lg:pt-[9.75rem]',
          )}
        >
          <div className="container flex min-h-[3rem] items-center justify-between gap-3 py-2">
            <span
              className={cn(
                'flex min-w-0 items-center gap-2 font-sans text-2xs uppercase tracking-[0.14em]',
                underHeader ? 'text-gold-300' : 'text-gold-700 dark:text-gold-300',
              )}
            >
              <Icon name="sparkle" className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={`Edit ${label}`}
              className="flex shrink-0 items-center gap-2 rounded-sm bg-gold-400 px-4 py-2 font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-navy-950 shadow-lift transition-colors hover:bg-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
            >
              <Icon name="plus" className="h-3.5 w-3.5" />
              Edit
            </button>
          </div>
        </div>
      ) : null}

      {children}

      {open ? (
        <AutoTranslateProvider>
          <SectionDialog section={section} label={label} onClose={() => setOpen(false)} />
        </AutoTranslateProvider>
      ) : null}
    </div>
  )
}

function SectionDialog({
  section,
  label,
  onClose,
}: {
  section: ContentKey
  label: string
  onClose: () => void
}) {
  const titleId = useDialogId('section-editor')
  const { waitForIdle } = useAutoTranslate()

  const [data, setData] = useState<unknown>(null)
  const [original, setOriginal] = useState('')
  const [version, setVersion] = useState<string | undefined>()
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading')
  const [error, setError] = useState('')

  const dataRef = useRef<unknown>(null)
  dataRef.current = data

  const load = useCallback(async () => {
    setStatus('loading')
    try {
      const res = await fetch(`/api/admin/content/${section}`, { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Could not load this section')
      setData(json.data)
      setOriginal(JSON.stringify(json.data))
      setVersion(json.version)
      setStatus('idle')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed')
      setStatus('error')
    }
  }, [section])

  useEffect(() => {
    load()
  }, [load])

  const dirty = data !== null && JSON.stringify(data) !== original

  async function save() {
    setStatus('saving')
    await waitForIdle()
    setError('')
    try {
      const res = await fetch(`/api/admin/content/${section}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataRef.current, version }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Save failed')
      setStatus('saved')
      // The page is server rendered, so reload to show the saved words in place.
      setTimeout(() => window.location.reload(), 600)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setStatus('error')
    }
  }

  function close() {
    if (dirty && !window.confirm('Close without saving? Your changes here will be lost.')) return
    onClose()
  }

  return (
    <Modal open onClose={close} labelledBy={titleId} className="max-w-5xl" closeButton={false}>
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-[rgb(var(--line))] px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-2xl text-[rgb(var(--ink))]">
              {label}
            </h2>
            <p className="mt-1 font-sans text-2xs text-[rgb(var(--muted))]">
              Changes go live as soon as you save.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitch />
            {/* The switch that turns auto-translation off, beside the words it acts on. */}
            <AutoTranslateToggle />
            <button
              type="button"
              onClick={close}
              className="rounded-sm border border-[rgb(var(--line))] px-4 py-2 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400"
            >
              Close
            </button>
            <button
              type="button"
              onClick={save}
              disabled={status === 'saving' || (!dirty && status !== 'error')}
              className="rounded-sm bg-gold-400 px-5 py-2 font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-navy-950 transition-colors hover:bg-gold-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        </div>

        {error ? (
          <p className="border-b border-burgundy-400/40 bg-burgundy-500/10 px-6 py-3 font-sans text-sm text-burgundy-600 dark:text-burgundy-300">
            {error}
          </p>
        ) : null}

        <div className="flex-1 overflow-y-auto p-6">
          {status === 'loading' || data === null ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-12 rounded-sm" />
              ))}
            </div>
          ) : (
            <JsonEditor value={data} onChange={setData} />
          )}
        </div>
      </div>
    </Modal>
  )
}
