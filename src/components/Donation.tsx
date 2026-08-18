'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

import { useLang } from '@/lib/i18n'
import type { DonationContent, DonationFund, L } from '@/lib/types'
import { cn, formatNumber, isEmail } from '@/lib/utils'

import Image from 'next/image'

import { Icon } from './ui/Icon'
import { Reveal } from './ui/Reveal'

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js'

type CheckoutResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type RazorpayOptions = {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description: string
  image?: string
  prefill?: { name?: string; email?: string; contact?: string }
  notes?: Record<string, string>
  theme?: { color?: string }
  handler: (response: CheckoutResponse) => void
  modal?: { ondismiss?: () => void }
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void }
  }
}

/** Loads Razorpay's checkout once, and only when somebody actually gives. */
function loadCheckout(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.Razorpay) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SCRIPT}"]`)
    const script = existing ?? document.createElement('script')
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Could not reach Razorpay')), {
      once: true,
    })
    if (!existing) {
      script.src = CHECKOUT_SCRIPT
      script.async = true
      document.body.appendChild(script)
    }
  })
}

type Status = 'idle' | 'starting' | 'verifying' | 'done' | 'error'

/**
 * The giving section. Choosing what the gift is for comes first, the amount
 * second and the details last — the same order the parish office asks in.
 *
 * Card and UPI details are typed into Razorpay's own hosted checkout; this site
 * never sees them. When no keys are configured the bank and UPI panel carries
 * the whole section on its own, so the page is never a dead end.
 */
export function Donation({
  donation,
  gatewayReady,
  parishName,
}: {
  donation: DonationContent
  gatewayReady: boolean
  parishName: string
}) {
  const { t, lang } = useLang()

  const [fundId, setFundId] = useState(donation.funds[0]?.id ?? 'general')
  const [amount, setAmount] = useState<number>(donation.presets[1] ?? donation.presets[0] ?? 500)
  const [custom, setCustom] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [intention, setIntention] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState<{ id: string; amount: number } | null>(null)

  const fund = useMemo(
    () => donation.funds.find((f) => f.id === fundId) ?? donation.funds[0],
    [donation.funds, fundId],
  )

  const valid = amount >= donation.minAmount && amount <= donation.maxAmount

  async function give() {
    setError('')

    if (!valid) {
      setError(
        t({
          en: `Enter an amount between ₹${donation.minAmount} and ₹${donation.maxAmount}.`,
          ml: `₹${donation.minAmount} നും ₹${donation.maxAmount} നും ഇടയിൽ ഒരു തുക നൽകുക.`,
        }),
      )
      return
    }
    if (email && !isEmail(email)) {
      setError(t({ en: 'That email address does not look right.', ml: 'ആ ഇമെയിൽ വിലാസം ശരിയല്ല.' }))
      return
    }

    setStatus('starting')
    try {
      const res = await fetch('/api/donate/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fund: fundId, amount, name, email, phone, intention }),
      })
      const order = await res.json()
      if (!res.ok) throw new Error(order.error ?? 'Could not start the payment')

      await loadCheckout()
      if (!window.Razorpay) throw new Error('Could not reach Razorpay')

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: parishName,
        description: fund ? fund.title.en : 'Offering',
        prefill: order.prefill,
        theme: { color: '#c9a227' },
        modal: {
          ondismiss: () => setStatus((s) => (s === 'starting' ? 'idle' : s)),
        },
        handler: async (response) => {
          setStatus('verifying')
          try {
            const check = await fetch('/api/donate/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...response, email, phone }),
            })
            const result = await check.json()
            if (!check.ok) throw new Error(result.error ?? 'Verification failed')
            setReceipt({ id: result.paymentId, amount: result.amount })
            setStatus('done')
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Verification failed')
            setStatus('error')
          }
        },
      })
      checkout.open()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the payment')
      setStatus('error')
    }
  }

  return (
    <section id="donate" className="section relative overflow-hidden bg-navy-950 text-stone-100">
      <Image
        src={donation.image}
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-[0.18]"
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-950/95 to-burgundy-900/70"
        aria-hidden="true"
      />
      <div className="grain absolute inset-0" aria-hidden="true" />

      <div className="container relative">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 text-center">
          <Reveal duration={0.7}>
            <span className="eyebrow text-gold-300">{t(donation.eyebrow)}</span>
          </Reveal>
          <Reveal delay={0.06}>
            <h2 className="heading-lg text-white">{t(donation.title)}</h2>
          </Reveal>
          <Reveal delay={0.12}>
            <span className="gold-rule mx-auto" aria-hidden="true" />
          </Reveal>
          <Reveal delay={0.16}>
            <p className="lede text-stone-200/85">{t(donation.subtitle)}</p>
          </Reveal>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:gap-12">
          {/* the form */}
          <Reveal>
            <div className="rounded-sm border border-gold-400/25 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-9">
              <AnimatePresence mode="wait">
                {status === 'done' && receipt ? (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center gap-5 py-10 text-center"
                  >
                    <span className="grid h-16 w-16 place-items-center rounded-full border border-gold-400/50 text-gold-300">
                      <Icon name="check" className="h-7 w-7" />
                    </span>
                    <h3 className="font-display text-3xl text-white">
                      {t({ en: 'Thank you', ml: 'നന്ദി' })}
                    </h3>
                    <p className="font-sans text-[0.98rem] leading-relaxed text-stone-300/85">
                      {t({
                        en: 'Your gift of ₹',
                        ml: 'നിങ്ങളുടെ ₹',
                      })}
                      <span className="tabular-nums text-gold-200">
                        {formatNumber(receipt.amount, lang)}
                      </span>
                      {t({
                        en: ' has reached the parish. It will be read into the accounts under this reference.',
                        ml: ' സംഭാവന ഇടവകയിൽ എത്തി. ഈ റഫറൻസോടെ കണക്കിൽ ചേർക്കും.',
                      })}
                    </p>
                    <code className="rounded-sm border border-white/15 bg-navy-950/50 px-4 py-2 font-mono text-xs text-gold-200">
                      {receipt.id}
                    </code>
                    <p className="max-w-md font-sans text-2xs leading-relaxed text-stone-400/80">
                      {t(donation.receiptNote)}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStatus('idle')
                        setReceipt(null)
                      }}
                      className="btn-ghost mt-2"
                    >
                      {t({ en: 'Give again', ml: 'വീണ്ടും നൽകുക' })}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col gap-8"
                  >
                    {/* what the gift is for */}
                    <fieldset>
                      <legend className="font-sans text-2xs uppercase tracking-[0.18em] text-gold-300">
                        {t({ en: '1 · What it is for', ml: '1 · എന്തിനുവേണ്ടി' })}
                      </legend>
                      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                        {donation.funds.map((option) => (
                          <FundOption
                            key={option.id}
                            fund={option}
                            selected={option.id === fundId}
                            onSelect={() => setFundId(option.id)}
                          />
                        ))}
                      </div>
                      {fund ? (
                        <p className="mt-3 font-sans text-2xs leading-relaxed text-stone-400/85">
                          {t(fund.description)}
                        </p>
                      ) : null}
                    </fieldset>

                    {/* how much */}
                    <fieldset>
                      <legend className="font-sans text-2xs uppercase tracking-[0.18em] text-gold-300">
                        {t({ en: '2 · How much', ml: '2 · എത്ര' })}
                      </legend>
                      <div className="mt-4 flex flex-wrap gap-2.5">
                        {donation.presets.map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              setAmount(value)
                              setCustom('')
                            }}
                            aria-pressed={amount === value && custom === ''}
                            className={cn(
                              'rounded-sm border px-5 py-3 font-sans text-sm font-semibold tabular-nums transition-all duration-300',
                              amount === value && custom === ''
                                ? 'border-gold-400 bg-gold-400 text-navy-950'
                                : 'border-white/20 text-stone-200 hover:border-gold-300 hover:text-gold-200',
                            )}
                          >
                            ₹{formatNumber(value, lang)}
                          </button>
                        ))}
                      </div>

                      <label className="mt-4 flex items-center gap-3 rounded-sm border border-white/15 bg-navy-950/40 px-4 focus-within:border-gold-400">
                        <span className="font-display text-xl text-gold-300">₹</span>
                        <input
                          inputMode="numeric"
                          value={custom}
                          placeholder={t({ en: 'Another amount', ml: 'മറ്റൊരു തുക' })}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/[^\d]/g, '').slice(0, 7)
                            setCustom(digits)
                            setAmount(digits ? Number(digits) : 0)
                          }}
                          className="w-full bg-transparent py-3.5 font-sans text-[0.95rem] tabular-nums text-white outline-none placeholder:text-stone-400/60"
                        />
                      </label>
                    </fieldset>

                    {/* who is giving */}
                    <fieldset>
                      <legend className="font-sans text-2xs uppercase tracking-[0.18em] text-gold-300">
                        {t({ en: '3 · Your details', ml: '3 · നിങ്ങളുടെ വിവരങ്ങൾ' })}
                      </legend>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder={t({ en: 'Name (optional)', ml: 'പേര് (നിർബന്ധമല്ല)' })}
                          className="field !border-white/15 !bg-navy-950/40 !text-white placeholder:!text-stone-400/60"
                        />
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder={t({ en: 'Phone (optional)', ml: 'ഫോൺ (നിർബന്ധമല്ല)' })}
                          className="field !border-white/15 !bg-navy-950/40 !text-white placeholder:!text-stone-400/60"
                        />
                        <input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={t({ en: 'Email for the receipt', ml: 'രസീതിനുള്ള ഇമെയിൽ' })}
                          className="field !border-white/15 !bg-navy-950/40 !text-white placeholder:!text-stone-400/60 sm:col-span-2"
                        />
                        <input
                          value={intention}
                          onChange={(e) => setIntention(e.target.value)}
                          placeholder={t({
                            en: 'Intention, or in whose memory (optional)',
                            ml: 'നിയോഗം, അല്ലെങ്കിൽ ആരുടെ ഓർമ്മയ്ക്ക് (നിർബന്ധമല്ല)',
                          })}
                          className="field !border-white/15 !bg-navy-950/40 !text-white placeholder:!text-stone-400/60 sm:col-span-2"
                        />
                      </div>
                    </fieldset>

                    {error ? (
                      <p className="rounded-sm border border-burgundy-400/40 bg-burgundy-500/15 px-4 py-3 font-sans text-sm text-burgundy-100">
                        {error}
                      </p>
                    ) : null}

                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={give}
                        disabled={!gatewayReady || status === 'starting' || status === 'verifying'}
                        className="btn-primary w-full"
                      >
                        {status === 'starting'
                          ? t({ en: 'Opening checkout…', ml: 'ചെക്കൗട്ട് തുറക്കുന്നു…' })
                          : status === 'verifying'
                            ? t({ en: 'Confirming…', ml: 'സ്ഥിരീകരിക്കുന്നു…' })
                            : `${t({ en: 'Give', ml: 'നൽകുക' })} ₹${formatNumber(
                                valid ? amount : 0,
                                lang,
                              )}`}
                        <Icon name="arrowRight" className="h-4 w-4" />
                      </button>

                      {!gatewayReady ? (
                        <p className="font-sans text-2xs leading-relaxed text-gold-200/80">
                          {t({
                            en: 'Online giving is not switched on yet — use the bank or UPI details beside this form.',
                            ml: 'ഓൺലൈൻ സംഭാവന ഇതുവരെ സജ്ജമാക്കിയിട്ടില്ല — ഈ ഫോമിനോട് ചേർന്നുള്ള ബാങ്ക് അല്ലെങ്കിൽ യുപിഐ വിവരങ്ങൾ ഉപയോഗിക്കുക.',
                          })}
                        </p>
                      ) : (
                        <p className="text-center font-sans text-2xs leading-relaxed text-stone-400/75">
                          {t(donation.note)}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Reveal>

          {/* funds, assurances and the bank counter */}
          <Reveal direction="left" delay={0.1}>
            <div className="flex flex-col gap-6">
              <ProgressPanel funds={donation.funds} />

              <div className="rounded-sm border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm sm:p-7">
                <h3 className="font-display text-xl text-white">
                  {t({ en: 'Or give directly', ml: 'അല്ലെങ്കിൽ നേരിട്ട് നൽകുക' })}
                </h3>
                <dl className="mt-5 flex flex-col divide-y divide-white/10">
                  <BankLine label={{ en: 'UPI', ml: 'യുപിഐ' }} value={donation.bank.upiId} copy />
                  <BankLine
                    label={{ en: 'Account name', ml: 'അക്കൗണ്ട് പേര്' }}
                    value={donation.bank.accountName}
                  />
                  <BankLine
                    label={{ en: 'Account number', ml: 'അക്കൗണ്ട് നമ്പർ' }}
                    value={donation.bank.accountNumber}
                    copy
                  />
                  <BankLine label={{ en: 'IFSC', ml: 'ഐഎഫ്എസ്‌സി' }} value={donation.bank.ifsc} copy />
                  <BankLine
                    label={{ en: 'Bank', ml: 'ബാങ്ക്' }}
                    value={`${donation.bank.bankName}, ${donation.bank.branch}`}
                  />
                </dl>
              </div>

              <ul className="flex flex-col gap-3">
                {donation.assurance.map((line) => (
                  <li key={line.en} className="flex gap-3">
                    <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
                    <span className="font-sans text-2xs leading-relaxed text-stone-300/85">
                      {t(line)}
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

function FundOption({
  fund,
  selected,
  onSelect,
}: {
  fund: DonationFund
  selected: boolean
  onSelect: () => void
}) {
  const { t } = useLang()

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex items-center gap-3 rounded-sm border px-4 py-3.5 text-left transition-all duration-300',
        selected
          ? 'border-gold-400 bg-gold-400/15'
          : 'border-white/15 hover:border-gold-300/60 hover:bg-white/[0.04]',
      )}
    >
      <span
        className={cn(
          'grid h-9 w-9 shrink-0 place-items-center rounded-sm border transition-colors',
          selected ? 'border-gold-400/70 text-gold-200' : 'border-white/20 text-stone-300',
        )}
      >
        <Icon name={fund.icon} className="h-4 w-4" />
      </span>
      <span
        className={cn(
          'font-sans text-sm leading-snug transition-colors',
          selected ? 'text-white' : 'text-stone-300',
        )}
      >
        {t(fund.title)}
      </span>
    </button>
  )
}

/** Progress for the funds that carry a target. */
function ProgressPanel({ funds }: { funds: DonationFund[] }) {
  const { t, lang } = useLang()
  const tracked = funds.filter((fund) => fund.goal && fund.goal > 0)
  if (tracked.length === 0) return null

  return (
    <div className="rounded-sm border border-white/10 bg-white/[0.03] p-6 backdrop-blur-sm sm:p-7">
      <h3 className="font-display text-xl text-white">
        {t({ en: 'Where the parish stands', ml: 'ഇടവക എവിടെ എത്തി' })}
      </h3>

      <div className="mt-6 flex flex-col gap-6">
        {tracked.map((fund) => {
          const goal = fund.goal ?? 0
          const raised = Math.min(fund.raised ?? 0, goal)
          const percent = goal > 0 ? Math.round((raised / goal) * 100) : 0

          return (
            <div key={fund.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-sans text-sm text-stone-200">{t(fund.title)}</span>
                <span className="font-sans text-2xs tabular-nums text-gold-300">
                  ₹{formatNumber(raised, lang)}
                  <span className="text-stone-400/70"> / ₹{formatNumber(goal, lang)}</span>
                </span>
              </div>

              <div
                className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t(fund.title)}
              >
                <motion.span
                  initial={{ width: 0 }}
                  whileInView={{ width: `${percent}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
                  className="block h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BankLine({ label, value, copy }: { label: L; value: string; copy?: boolean }) {
  const { t } = useLang()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timer)
  }, [copied])

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <dt className="font-sans text-[0.58rem] uppercase tracking-[0.16em] text-stone-400/75">
          {t(label)}
        </dt>
        <dd className="mt-0.5 break-words font-sans text-sm text-stone-100">{value}</dd>
      </div>

      {copy ? (
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value)
              setCopied(true)
            } catch {
              /* an older browser — the text is on screen to be read anyway */
            }
          }}
          aria-label={`${t({ en: 'Copy', ml: 'പകർത്തുക' })} ${t(label)}`}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-sm border border-white/15 text-stone-300 transition-colors hover:border-gold-300 hover:text-gold-200"
        >
          <Icon name={copied ? 'check' : 'copy'} className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}
