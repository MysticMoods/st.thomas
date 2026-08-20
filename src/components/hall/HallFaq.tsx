'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useId, useState } from 'react'

import { useLang } from '@/lib/i18n'
import type { HallContent } from '@/lib/types'
import { cn } from '@/lib/utils'

import { Icon } from '../ui/Icon'
import { Reveal } from '../ui/Reveal'
import { SectionHeading } from '../ui/SectionHeading'

/**
 * Section 07 — the questions the office answers on the telephone every week,
 * and the house rules beside them. Everything a family needs before they ring.
 */
export function HallFaq({ hall }: { hall: HallContent }) {
  const { t } = useLang()
  const base = useId()
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="hall-anchor section-tight bg-[rgb(var(--page))]">
      <div className="container">
        <SectionHeading
          eyebrow={{ en: '07 · Good to know', ml: '07 · അറിഞ്ഞിരിക്കാൻ' }}
          title={{ en: 'Before you ring', ml: 'വിളിക്കുന്നതിന് മുൻപ്' }}
        />

        <div className="mt-14 grid gap-12 lg:mt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
          {/* the questions */}
          <div className="divide-y divide-[rgb(var(--line))] border-y border-[rgb(var(--line))]">
            {hall.faq.map((item, i) => {
              const isOpen = open === i
              const panelId = `${base}-panel-${i}`
              const buttonId = `${base}-button-${i}`

              return (
                <div key={item.q.en}>
                  <h3>
                    <button
                      id={buttonId}
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="flex w-full items-start justify-between gap-6 py-5 text-left transition-colors duration-300 hover:text-gold-600 dark:hover:text-gold-300"
                    >
                      <span className="font-serif text-lg leading-snug text-[rgb(var(--ink))] sm:text-xl">
                        {t(item.q)}
                      </span>
                      <Icon
                        name="chevronDown"
                        className={cn(
                          'mt-1.5 h-4 w-4 shrink-0 text-gold-500 transition-transform duration-300',
                          isOpen && 'rotate-180',
                        )}
                      />
                    </button>
                  </h3>

                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        key="panel"
                        id={panelId}
                        role="region"
                        aria-labelledby={buttonId}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="body-text pb-6 pr-10">{t(item.a)}</p>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              )
            })}
          </div>

          {/* the rules */}
          <Reveal delay={0.08}>
            <div className="card p-7 sm:p-9">
              <h3 className="heading-md">{t({ en: 'House rules', ml: 'നിബന്ധനകൾ' })}</h3>
              <span className="mt-5 block gold-rule" aria-hidden="true" />
              <ul className="mt-7 flex flex-col gap-4">
                {hall.rules.map((rule) => (
                  <li key={rule.en} className="flex gap-3">
                    <Icon name="check" className="mt-1 h-3.5 w-3.5 shrink-0 text-gold-500" />
                    <span className="font-sans text-[0.95rem] leading-relaxed text-[rgb(var(--muted))]">
                      {t(rule)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
