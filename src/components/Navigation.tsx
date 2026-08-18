'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

import { ui, useLang } from '@/lib/i18n'
import { useTheme } from '@/lib/theme'
import type { SiteContent } from '@/lib/types'
import { cn } from '@/lib/utils'

import { Icon } from './ui/Icon'
import { ParishEmblem } from './ui/ParishEmblem'

const LINKS = [
  { id: 'top', label: ui.nav.home },
  { id: 'about', label: ui.nav.about },
  { id: 'mass-timings', label: ui.nav.mass },
  { id: 'weekly-events', label: ui.nav.events },
  { id: 'priests', label: ui.nav.priests },
  { id: 'gallery', label: ui.nav.gallery },
  { id: 'media', label: ui.nav.media },
  { id: 'notices', label: ui.nav.notices },
  { id: 'members', label: ui.nav.members },
  { id: 'contact', label: ui.nav.contact },
]

export function Navigation({ site }: { site: SiteContent }) {
  const { t, lang, setLang } = useLang()
  const { theme, toggle } = useTheme()
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('top')

  // Malayalam labels run roughly half as wide again as their English
  // equivalents, so the horizontal nav needs tighter spacing and more room
  // before it fits. Below its threshold the header falls back to the drawer.
  const wide = lang === 'ml'

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 80)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Highlight the section currently filling the viewport.
  useEffect(() => {
    const targets = LINKS.map((l) => document.getElementById(l.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    )
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.25, 0.5] },
    )
    targets.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const onNavigate = (id: string) => {
    setOpen(false)
    const el = document.getElementById(id)
    if (!el) return
    const top = id === 'top' ? 0 : el.getBoundingClientRect().top + window.scrollY - 78
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <>
      <a
        href="#about"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-sm focus:bg-gold-400 focus:px-4 focus:py-2 focus:font-sans focus:text-sm focus:text-navy-950"
      >
        Skip to content
      </a>

      <header
        className={cn(
          'no-print fixed inset-x-0 top-0 z-50 transition-all duration-700 ease-sacred',
          solid
            ? 'border-b border-[rgb(var(--line))] bg-[rgb(var(--page))]/92 py-2.5 shadow-[0_1px_30px_-12px_rgba(11,21,38,0.35)] backdrop-blur-xl'
            : 'border-b border-transparent py-5',
        )}
      >
        <nav className="container flex items-center justify-between gap-6" aria-label="Primary">
          <button
            type="button"
            onClick={() => onNavigate('top')}
            className="group flex shrink-0 items-center gap-3 text-left"
          >
            <ParishEmblem
              variant="gold"
              className={cn(
                'transition-all duration-700 ease-sacred',
                solid ? 'h-9 w-9' : 'h-11 w-11',
              )}
            />
            <span className="hidden shrink-0 whitespace-nowrap sm:block">
              <span
                className={cn(
                  'block font-display text-[0.95rem] leading-tight tracking-wide transition-colors duration-500 lg:text-base',
                  solid ? 'text-[rgb(var(--ink))]' : 'text-white text-shadow-sacred',
                )}
              >
                {t(site.parish.name)}
              </span>
              <span
                className={cn(
                  'block font-sans text-[0.6rem] uppercase tracking-[0.3em] transition-colors duration-500',
                  solid ? 'text-gold-600 dark:text-gold-400' : 'text-gold-200/90',
                )}
              >
                {t(site.parish.place)}
              </span>
            </span>
          </button>

          <ul className={cn('hidden items-center gap-0.5', wide ? 'nav-ml:flex' : 'nav:flex')}>
            {LINKS.map((link) => (
              <li key={link.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(link.id)}
                  aria-current={active === link.id ? 'true' : undefined}
                  className={cn(
                    'relative whitespace-nowrap rounded-sm py-2 font-sans font-medium uppercase transition-colors duration-300',
                    wide
                      ? 'px-2 text-[0.66rem] tracking-[0.08em]'
                      : 'px-3 text-[0.72rem] tracking-[0.16em]',
                    solid
                      ? 'text-[rgb(var(--muted))] hover:text-gold-600 dark:hover:text-gold-300'
                      : 'text-white/85 hover:text-gold-200',
                    active === link.id && (solid ? 'text-gold-600 dark:text-gold-300' : 'text-gold-200'),
                  )}
                >
                  {t(link.label)}
                  {active === link.id ? (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-3 -bottom-0.5 h-px bg-gold-400"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>

          {/* never allow the controls to be pushed past the viewport edge */}
          <div className="flex shrink-0 items-center gap-2">
            <div
              className={cn(
                'hidden items-center rounded-sm border p-0.5 sm:flex',
                solid ? 'border-[rgb(var(--line))]' : 'border-white/25',
              )}
            >
              {(['en', 'ml'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  aria-pressed={lang === code}
                  className={cn(
                    'rounded-[7px] px-2.5 py-1.5 font-sans text-[0.68rem] font-semibold uppercase tracking-[0.12em] transition-all duration-300',
                    lang === code
                      ? 'bg-gold-400 text-navy-950'
                      : solid
                        ? 'text-[rgb(var(--muted))] hover:text-gold-600'
                        : 'text-white/80 hover:text-white',
                    code === 'ml' && 'font-malayalam tracking-normal',
                  )}
                >
                  {code === 'en' ? 'EN' : 'മലയാളം'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggle}
              aria-label={t(theme === 'dark' ? ui.common.lightMode : ui.common.darkMode)}
              className={cn(
                'grid h-9 w-9 place-items-center rounded-sm border transition-all duration-300',
                solid
                  ? 'border-[rgb(var(--line))] text-[rgb(var(--muted))] hover:border-gold-400 hover:text-gold-500'
                  : 'border-white/25 text-white/85 hover:border-gold-300 hover:text-gold-200',
              )}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={t(ui.common.menu)}
              aria-expanded={open}
              className={cn(
                'grid h-9 w-9 place-items-center rounded-sm border transition-all duration-300',
                wide ? 'nav-ml:hidden' : 'nav:hidden',
                solid
                  ? 'border-[rgb(var(--line))] text-[rgb(var(--ink))] hover:border-gold-400'
                  : 'border-white/25 text-white hover:border-gold-300',
              )}
            >
              <Icon name="menu" className="h-4 w-4" />
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className={cn('fixed inset-0 z-[70]', wide ? 'nav-ml:hidden' : 'nav:hidden')}
          >
            <div
              className="absolute inset-0 bg-navy-950/85 backdrop-blur-md"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col border-l border-gold-500/25 bg-[rgb(var(--page))] px-7 pb-10 pt-6"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-center justify-between">
                <ParishEmblem variant="gold" className="h-10 w-10" />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t(ui.common.close)}
                  className="grid h-10 w-10 place-items-center rounded-sm border border-[rgb(var(--line))] text-[rgb(var(--ink))] hover:border-gold-400"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>

              <ul className="mt-10 flex flex-1 flex-col gap-1 overflow-y-auto">
                {LINKS.map((link, i) => (
                  <motion.li
                    key={link.id}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.045, duration: 0.5 }}
                  >
                    <button
                      type="button"
                      onClick={() => onNavigate(link.id)}
                      className="w-full border-b border-[rgb(var(--line))] py-4 text-left font-display text-xl text-[rgb(var(--ink))] transition-colors hover:text-gold-500"
                    >
                      {t(link.label)}
                    </button>
                  </motion.li>
                ))}
              </ul>

              <div className="mt-8 flex items-center gap-2">
                {(['en', 'ml'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLang(code)}
                    className={cn(
                      'flex-1 rounded-sm border px-4 py-3 font-sans text-xs font-semibold uppercase tracking-[0.14em] transition-colors',
                      lang === code
                        ? 'border-gold-400 bg-gold-400 text-navy-950'
                        : 'border-[rgb(var(--line))] text-[rgb(var(--muted))]',
                      code === 'ml' && 'font-malayalam tracking-normal',
                    )}
                  >
                    {code === 'en' ? 'English' : 'മലയാളം'}
                  </button>
                ))}
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
