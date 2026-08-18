'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useCallback, useEffect, useId, useRef } from 'react'

import { ui, useLang } from '@/lib/i18n'
import { cn } from '@/lib/utils'

import { Icon } from './Icon'

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * The one dialog used by the ministry panel, the memorial card and the events
 * popup. It locks the page behind it, keeps the keyboard inside, closes on
 * Escape or a click on the backdrop, and returns focus where it came from.
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  children,
  className,
  align = 'center',
}: {
  open: boolean
  onClose: () => void
  /** Id of the heading that names this dialog. */
  labelledBy?: string
  children: React.ReactNode
  className?: string
  /** `end` slides up from the bottom edge on small screens. */
  align?: 'center' | 'end'
}) {
  const { t } = useLang()
  const reduce = useReducedMotion()
  const panel = useRef<HTMLDivElement>(null)
  const restoreTo = useRef<HTMLElement | null>(null)

  const close = useCallback(() => onClose(), [onClose])

  // Remember the trigger, move focus into the panel, put it back on close.
  useEffect(() => {
    if (!open) return
    restoreTo.current = document.activeElement as HTMLElement | null
    const frame = requestAnimationFrame(() => {
      const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? panel.current)?.focus()
    })
    return () => {
      cancelAnimationFrame(frame)
      restoreTo.current?.focus?.()
    }
  }, [open])

  // Scroll lock. The scrollbar is replaced by padding so the page does not jump.
  useEffect(() => {
    if (!open) return
    const { body } = document
    const gap = window.innerWidth - document.documentElement.clientWidth
    const overflow = body.style.overflow
    const padding = body.style.paddingRight
    body.style.overflow = 'hidden'
    if (gap > 0) body.style.paddingRight = `${gap}px`
    return () => {
      body.style.overflow = overflow
      body.style.paddingRight = padding
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
        return
      }
      if (event.key !== 'Tab' || !panel.current) return

      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      )
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open, close])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="no-print fixed inset-0 z-[90] flex justify-center overflow-y-auto overscroll-contain p-0 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.3 }}
        >
          <div
            className="fixed inset-0 bg-navy-950/70 backdrop-blur-md"
            onClick={close}
            aria-hidden="true"
          />

          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 34, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.99 }}
            transition={{ duration: reduce ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative z-10 w-full max-w-3xl border border-gold-400/25 bg-[rgb(var(--page))] shadow-[0_40px_120px_-30px_rgba(11,21,38,0.7)] outline-none',
              align === 'end'
                ? 'mt-auto rounded-t-lg sm:my-auto sm:rounded-sm'
                : 'my-auto rounded-sm',
              className,
            )}
          >
            <button
              type="button"
              onClick={close}
              aria-label={t(ui.common.close)}
              className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-sm border border-[rgb(var(--line))] bg-[rgb(var(--page))]/85 text-[rgb(var(--ink))] backdrop-blur transition-colors hover:border-gold-400 hover:text-gold-500"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

/** Ids for a dialog heading, so `aria-labelledby` always points somewhere. */
export function useDialogId(prefix: string) {
  const id = useId()
  return `${prefix}-${id.replace(/[:]/g, '')}`
}
