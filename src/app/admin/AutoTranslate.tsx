'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils'

type Lang = 'en' | 'ml'

type AutoTranslateValue = {
  /**
   * The one language the editor is showing. English unless somebody asks for
   * Malayalam: two boxes per field made every section twice as long to read.
   */
  lang: Lang
  setLang: (next: Lang) => void
  /** When on, editing one language rewrites the other on blur. */
  enabled: boolean
  setEnabled: (next: boolean) => void
  /** How many translations are in flight right now. */
  pending: number
  translate: (text: string, from: Lang, to: Lang) => Promise<string>
  /** Resolves once every in-flight translation has landed in the editor. */
  waitForIdle: () => Promise<void>
}

const STORAGE_KEY = 'parish.autoTranslate'

const AutoTranslateContext = createContext<AutoTranslateValue | null>(null)

export function AutoTranslateProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(true)
  const [lang, setLang] = useState<Lang>('en')
  const [pending, setPending] = useState(0)
  // Mirrors `pending` for waitForIdle, which polls outside of React's render.
  const pendingRef = useRef(0)

  useEffect(() => {
    setEnabledState(window.localStorage.getItem(STORAGE_KEY) !== 'off')
  }, [])

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next)
    window.localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
  }, [])

  const translate = useCallback(async (text: string, from: Lang, to: Lang) => {
    pendingRef.current += 1
    setPending(pendingRef.current)
    try {
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, from, to }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Translation failed')
      return String(json.text ?? '')
    } finally {
      pendingRef.current -= 1
      setPending(pendingRef.current)
    }
  }, [])

  const waitForIdle = useCallback(async () => {
    // Clicking Save blurs the field being edited, which starts a translation.
    // Waiting here means the save carries the freshly filled language rather
    // than the text as it stood a moment earlier.
    const deadline = 6000
    const step = 60
    for (let waited = 0; pendingRef.current > 0 && waited < deadline; waited += step) {
      await new Promise((resolve) => setTimeout(resolve, step))
    }
    // One more tick so the last onChange has been committed to React state.
    await new Promise((resolve) => setTimeout(resolve, 0))
  }, [])

  return (
    <AutoTranslateContext.Provider
      value={{ lang, setLang, enabled, setEnabled, pending, translate, waitForIdle }}
    >
      {children}
    </AutoTranslateContext.Provider>
  )
}

export function useAutoTranslate() {
  const value = useContext(AutoTranslateContext)
  if (!value) throw new Error('useAutoTranslate must be used inside AutoTranslateProvider')
  return value
}

/** English or Malayalam — which one the fields below show. */
export function LanguageSwitch() {
  const { lang, setLang } = useAutoTranslate()

  return (
    <div
      role="group"
      aria-label="Language being edited"
      className="flex rounded-sm border border-[rgb(var(--line))] p-0.5"
    >
      {(['en', 'ml'] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={cn(
            'rounded-sm px-3 py-1.5 font-sans text-2xs tracking-[0.06em] transition-colors',
            lang === code
              ? 'bg-navy-950 text-gold-200 dark:bg-gold-400 dark:text-navy-950'
              : 'text-[rgb(var(--muted))] hover:text-[rgb(var(--ink))]',
            code === 'ml' && 'font-malayalam',
          )}
        >
          {code === 'en' ? 'English' : 'മലയാളം'}
        </button>
      ))}
    </div>
  )
}

/** Header switch, so a proofreader can stop the machine overwriting their wording. */
export function AutoTranslateToggle() {
  const { enabled, setEnabled, pending } = useAutoTranslate()

  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      title={
        enabled
          ? 'Finishing an English field fills in its Malayalam automatically. Click to turn off.'
          : 'Automatic translation is off — switch to Malayalam to write it yourself.'
      }
      aria-pressed={enabled}
      className={cn(
        'hidden items-center gap-2 rounded-sm border px-3 py-2 font-sans text-2xs uppercase tracking-[0.14em] transition-colors sm:flex',
        enabled
          ? 'border-gold-400/70 text-gold-600 dark:text-gold-300'
          : 'border-[rgb(var(--line))] text-[rgb(var(--muted))] hover:border-gold-400',
      )}
    >
      <Icon
        name="translate"
        className={cn('h-3.5 w-3.5', pending > 0 && 'animate-pulse text-gold-500')}
      />
      {pending > 0 ? 'Translating…' : enabled ? 'Auto-translate on' : 'Auto-translate off'}
    </button>
  )
}
