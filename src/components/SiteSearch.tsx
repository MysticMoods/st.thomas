'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useLang } from '@/lib/i18n'
import type { L } from '@/lib/types'
import { cn } from '@/lib/utils'

import { Icon } from './ui/Icon'

type Hit = { kind: string; title: L; detail: L; href: string }

/**
 * One box for the whole site.
 *
 * Everything the parish publishes is readable and none of it was findable
 * except by scrolling: notices, obituaries, ministries, past priests, mass
 * timings, the hall and its questions. The answers come from the content files
 * themselves, so anything the dashboard changes is searchable the moment it
 * saves.
 */
export function SiteSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLang()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [busy, setBusy] = useState(false)
  const [cursor, setCursor] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setHits([])
    setCursor(0)
    const focus = setTimeout(() => input.current?.focus(), 80)
    return () => clearTimeout(focus)
  }, [open])

  // Typing is not a reason to ask the server on every keystroke.
  const look = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current)
    if (next.trim().length < 2) {
      setHits([])
      setBusy(false)
      return
    }
    setBusy(true)
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(next)}`, { cache: 'no-store' })
        const json = await res.json()
        setHits(Array.isArray(json.results) ? json.results : [])
        setCursor(0)
      } catch {
        setHits([])
      } finally {
        setBusy(false)
      }
    }, 220)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  function onKey(event: React.KeyboardEvent) {
    if (event.key === 'Escape') onClose()
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setCursor((c) => Math.min(c + 1, hits.length - 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    }
    if (event.key === 'Enter' && hits[cursor]) {
      window.location.href = hits[cursor].href
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label={t({ en: 'Search this site', ml: 'ഈ സൈറ്റിൽ തിരയുക' })}
        >
          <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-md" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl overflow-hidden rounded-sm border border-gold-400/40 bg-[rgb(var(--page))] shadow-lift"
          >
            <div className="flex items-center gap-3 border-b border-[rgb(var(--line))] px-5">
              <Icon name="search" className="h-4 w-4 shrink-0 text-gold-500" />
              <input
                ref={input}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  look(event.target.value)
                }}
                onKeyDown={onKey}
                placeholder={t({
                  en: 'Search notices, ministries, timings, obituaries…',
                  ml: 'അറിയിപ്പുകൾ, ശുശ്രൂഷകൾ, സമയങ്ങൾ, ചരമങ്ങൾ തിരയുക…',
                })}
                className="w-full bg-transparent py-5 font-serif text-lg text-[rgb(var(--ink))] outline-none placeholder:text-[rgb(var(--muted))]/70"
              />
              <button
                type="button"
                onClick={onClose}
                aria-label={t({ en: 'Close', ml: 'അടയ്ക്കുക' })}
                className="shrink-0 rounded-sm border border-[rgb(var(--line))] px-2.5 py-1 font-sans text-2xs uppercase tracking-[0.14em] text-[rgb(var(--muted))] transition-colors hover:border-gold-400"
              >
                Esc
              </button>
            </div>

            <div className="max-h-[55vh] overflow-y-auto">
              {query.trim().length < 2 ? (
                <p className="px-5 py-10 text-center font-sans text-sm text-[rgb(var(--muted))]">
                  {t({
                    en: 'Type two letters or more. Either language finds either language.',
                    ml: 'രണ്ടോ അതിലധികമോ അക്ഷരങ്ങൾ ടൈപ്പ് ചെയ്യുക. ഏത് ഭാഷയിലും തിരയാം.',
                  })}
                </p>
              ) : busy && hits.length === 0 ? (
                <p className="px-5 py-10 text-center font-sans text-sm text-[rgb(var(--muted))]">
                  {t({ en: 'Looking…', ml: 'തിരയുന്നു…' })}
                </p>
              ) : hits.length === 0 ? (
                <p className="px-5 py-10 text-center font-sans text-sm text-[rgb(var(--muted))]">
                  {t({ en: 'Nothing found for', ml: 'ഒന്നും കണ്ടെത്തിയില്ല' })} “{query}”
                </p>
              ) : (
                <ul>
                  {hits.map((hit, i) => (
                    <li key={`${hit.href}-${i}`}>
                      <a
                        href={hit.href}
                        onMouseEnter={() => setCursor(i)}
                        className={cn(
                          'flex flex-col gap-1 border-b border-[rgb(var(--line))] px-5 py-4 transition-colors',
                          i === cursor ? 'bg-gold-400/10' : 'hover:bg-gold-400/5',
                        )}
                      >
                        <span className="flex items-baseline gap-3">
                          <span className="font-serif text-base text-[rgb(var(--ink))]">
                            {t(hit.title)}
                          </span>
                          <span className="shrink-0 font-sans text-[0.6rem] uppercase tracking-[0.14em] text-gold-600 dark:text-gold-400">
                            {hit.kind}
                          </span>
                        </span>
                        {t(hit.detail) ? (
                          <span className="line-clamp-2 font-sans text-2xs leading-relaxed text-[rgb(var(--muted))]">
                            {t(hit.detail)}
                          </span>
                        ) : null}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
