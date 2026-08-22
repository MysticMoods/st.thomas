'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { AutoTranslateProvider, AutoTranslateToggle, useAutoTranslate } from '@/app/admin/AutoTranslate'
import { JsonEditor } from '@/app/admin/JsonEditor'
import { Icon } from '@/components/ui/Icon'
import { Modal, useDialogId } from '@/components/ui/Modal'
import type { ContentKey } from '@/lib/types'
import { cn } from '@/lib/utils'

import { useAdminMode } from './AdminMode'

/**
 * Wraps a section of the public page. To a visitor it renders nothing at all;
 * to signed-in staff with editing switched on it adds an Edit button that opens
 * that section's content in place.
 */
export function EditableSection({
  section,
  label,
  children,
}: {
  section: ContentKey
  label: string
  children: React.ReactNode
}) {
  const { isAdmin, editing } = useAdminMode()
  const [open, setOpen] = useState(false)

  if (!isAdmin) return <>{children}</>

  return (
    <div className={cn('relative', editing && 'outline-dashed outline-2 -outline-offset-2 outline-gold-400/50')}>
      {editing ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute right-4 top-[10.5rem] z-30 flex scroll-mt-[12rem] items-center gap-2 rounded-sm bg-gold-400 px-4 py-2 font-sans text-2xs font-semibold uppercase tracking-[0.14em] text-navy-950 shadow-lift transition-colors hover:bg-gold-300"
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          Edit {label}
        </button>
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
    <Modal open onClose={close} labelledBy={titleId} className="max-w-5xl">
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgb(var(--line))] px-6 py-5">
          <div>
            <h2 id={titleId} className="font-display text-2xl text-[rgb(var(--ink))]">
              {label}
            </h2>
            <p className="mt-1 font-sans text-2xs text-[rgb(var(--muted))]">
              content/{section}.json · saves straight to the live site
            </p>
          </div>
          <div className="flex items-center gap-2">
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
