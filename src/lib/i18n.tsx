'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import type { L, Lang } from './types'

const STORAGE_KEY = 'stc-lang'

type LanguageValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  toggle: () => void
  /** Resolve a bilingual field for the active language. */
  t: (value: L | string | undefined) => string
  isMalayalam: boolean
}

const LanguageContext = createContext<LanguageValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'ml') setLangState(stored)
    else if (navigator.language?.toLowerCase().startsWith('ml')) setLangState('ml')
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dataset.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const value = useMemo<LanguageValue>(
    () => ({
      lang,
      setLang,
      toggle: () => setLang(lang === 'en' ? 'ml' : 'en'),
      t: (value) => {
        if (value == null) return ''
        if (typeof value === 'string') return value
        return value[lang] || value.en || ''
      },
      isMalayalam: lang === 'ml',
    }),
    [lang, setLang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLang(): LanguageValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>')
  return ctx
}

/** Interface strings that do not live in the editable content files. */
export const ui = {
  nav: {
    home: { en: 'Home', ml: 'ഹോം' },
    about: { en: 'About', ml: 'ഞങ്ങളെക്കുറിച്ച്' },
    mass: { en: 'Mass Timings', ml: 'കുർബാന സമയം' },
    upcoming: { en: 'Upcoming', ml: 'വരാനുള്ളവ' },
    events: { en: 'Weekly Events', ml: 'പ്രതിവാര പരിപാടികൾ' },
    priests: { en: 'Priests', ml: 'വൈദികർ' },
    committee: { en: 'Committee', ml: 'കമ്മിറ്റി' },
    ministries: { en: 'Ministries', ml: 'ശുശ്രൂഷകൾ' },
    gallery: { en: 'Gallery', ml: 'ചിത്രശാല' },
    media: { en: 'Media', ml: 'മീഡിയ' },
    notices: { en: 'Notices', ml: 'അറിയിപ്പുകൾ' },
    obituary: { en: 'Obituary', ml: 'ചരമം' },
    donate: { en: 'Donate', ml: 'സംഭാവന' },
    members: { en: 'Members', ml: 'അംഗങ്ങൾ' },
    contact: { en: 'Contact', ml: 'ബന്ധപ്പെടുക' },
  },
  common: {
    menu: { en: 'Menu', ml: 'മെനു' },
    close: { en: 'Close', ml: 'അടയ്ക്കുക' },
    readMore: { en: 'Read more', ml: 'കൂടുതൽ വായിക്കുക' },
    readLess: { en: 'Show less', ml: 'ചുരുക്കുക' },
    viewAll: { en: 'View all', ml: 'എല്ലാം കാണുക' },
    today: { en: 'Today', ml: 'ഇന്ന്' },
    call: { en: 'Call', ml: 'വിളിക്കുക' },
    email: { en: 'Email', ml: 'ഇമെയിൽ' },
    whatsapp: { en: 'WhatsApp', ml: 'വാട്ട്സ്ആപ്പ്' },
    directions: { en: 'Get directions', ml: 'വഴി കാണിക്കുക' },
    watchOnYoutube: { en: 'Watch on YouTube', ml: 'യൂട്യൂബിൽ കാണുക' },
    playVideo: { en: 'Play video', ml: 'വീഡിയോ പ്ലേ ചെയ്യുക' },
    download: { en: 'Download', ml: 'ഡൗൺലോഡ്' },
    previous: { en: 'Previous', ml: 'മുൻപത്തേത്' },
    next: { en: 'Next', ml: 'അടുത്തത്' },
    of: { en: 'of', ml: '/' },
    darkMode: { en: 'Dark mode', ml: 'ഡാർക്ക് മോഡ്' },
    lightMode: { en: 'Light mode', ml: 'ലൈറ്റ് മോഡ്' },
    scroll: { en: 'Scroll', ml: 'സ്ക്രോൾ' },
    backToTop: { en: 'Back to top', ml: 'മുകളിലേക്ക്' },
    loading: { en: 'Loading', ml: 'ലോഡ് ചെയ്യുന്നു' },
  },
  newsletter: {
    placeholder: { en: 'your@email.com', ml: 'your@email.com' },
    subscribe: { en: 'Subscribe', ml: 'സബ്സ്ക്രൈബ് ചെയ്യുക' },
    success: { en: 'Thank you — you are on the list.', ml: 'നന്ദി — നിങ്ങൾ പട്ടികയിൽ ചേർന്നിരിക്കുന്നു.' },
    error: { en: 'Please enter a valid email address.', ml: 'സാധുവായ ഒരു ഇമെയിൽ വിലാസം നൽകുക.' },
    privacy: {
      en: 'One letter a week. No sharing of your address, ever.',
      ml: 'ആഴ്ചയിൽ ഒരു കത്ത്. നിങ്ങളുടെ വിലാസം ഒരിക്കലും പങ്കുവയ്ക്കില്ല.',
    },
  },
  contact: {
    heading: { en: 'Write to the parish office', ml: 'ഇടവക ഓഫീസിലേക്ക് എഴുതുക' },
    name: { en: 'Your name', ml: 'നിങ്ങളുടെ പേര്' },
    email: { en: 'Email address', ml: 'ഇമെയിൽ വിലാസം' },
    phone: { en: 'Phone (optional)', ml: 'ഫോൺ (നിർബന്ധമല്ല)' },
    subject: { en: 'Subject', ml: 'വിഷയം' },
    message: { en: 'Your message', ml: 'നിങ്ങളുടെ സന്ദേശം' },
    send: { en: 'Send message', ml: 'സന്ദേശം അയയ്ക്കുക' },
    sending: { en: 'Sending…', ml: 'അയയ്ക്കുന്നു…' },
    sent: {
      en: 'Your message has reached the parish office. We usually reply within two working days.',
      ml: 'നിങ്ങളുടെ സന്ദേശം ഇടവക ഓഫീസിൽ എത്തി. സാധാരണയായി രണ്ട് പ്രവൃത്തി ദിവസത്തിനുള്ളിൽ മറുപടി നൽകും.',
    },
    failed: { en: 'Something went wrong. Please call the office.', ml: 'എന്തോ പിഴവ് സംഭവിച്ചു. ദയവായി ഓഫീസിലേക്ക് വിളിക്കുക.' },
    officeHours: { en: 'Office hours', ml: 'ഓഫീസ് സമയം' },
    emergency: { en: 'Emergency (anointing, funerals)', ml: 'അടിയന്തിരം (രോഗീലേപനം, മരണം)' },
    address: { en: 'Address', ml: 'വിലാസം' },
  },
  members: {
    title: { en: 'Members', ml: 'അംഗങ്ങൾ' },
    subtitle: {
      en: 'Household records are kept in the parish register and are never published online.',
      ml: 'കുടുംബ വിവരങ്ങൾ ഇടവക രജിസ്റ്ററിൽ സൂക്ഷിക്കുന്നു; ഒരിക്കലും ഓൺലൈനിൽ പ്രസിദ്ധീകരിക്കുന്നില്ല.',
    },
    note: {
      en: 'To register a new household, update an address, or request a certificate, please visit the parish office during working hours or write to us using the form below.',
      ml: 'പുതിയ കുടുംബം രജിസ്റ്റർ ചെയ്യാനോ വിലാസം പുതുക്കാനോ സർട്ടിഫിക്കറ്റ് ആവശ്യപ്പെടാനോ പ്രവൃത്തി സമയത്ത് ഇടവക ഓഫീസ് സന്ദർശിക്കുക, അല്ലെങ്കിൽ താഴെയുള്ള ഫോം ഉപയോഗിക്കുക.',
    },
  },
  footer: {
    quickLinks: { en: 'Quick Links', ml: 'പെട്ടെന്നുള്ള ലിങ്കുകൾ' },
    massTimings: { en: 'Mass Timings', ml: 'കുർബാന സമയം' },
    latestNotices: { en: 'Latest Notices', ml: 'പുതിയ അറിയിപ്പുകൾ' },
    followUs: { en: 'Follow the parish', ml: 'ഇടവകയെ പിന്തുടരുക' },
    findUs: { en: 'Find us', ml: 'ഞങ്ങളെ കണ്ടെത്തുക' },
    rights: { en: 'All rights reserved.', ml: 'എല്ലാ അവകാശങ്ങളും നിക്ഷിപ്തം.' },
    privacy: { en: 'Privacy Policy', ml: 'സ്വകാര്യതാ നയം' },
    credits: { en: 'Photo credits', ml: 'ഫോട്ടോ കടപ്പാട്' },
    admin: { en: 'Parish staff login', ml: 'ഇടവക സ്റ്റാഫ് ലോഗിൻ' },
  },
} as const
