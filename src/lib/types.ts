/** A single string in both parish languages. */
export type L = { en: string; ml: string }

export type Lang = 'en' | 'ml'

export type LinkAction = {
  label: L
  href: string
  variant?: 'primary' | 'ghost'
}

export type SiteContent = {
  parish: {
    name: L
    place: L
    established: string
    forane: L
    diocese: L
    tagline: L
  }
  hero: {
    images: string[]
    eyebrow: L
    verse: L
    verseRef: L
    welcome: L
    actions: LinkAction[]
  }
  contact: {
    address: L
    phone: string
    office: string
    emergency: string
    email: string
    whatsapp: string
    mapEmbed: string
    mapLink: string
    coordinates: { lat: number; lng: number }
    officeHours: { days: L; hours: L }[]
  }
  social: { network: string; label: string; url: string; handle: string }[]
  newsletter: { title: L; description: L; image: string }
  seo: {
    title: string
    description: string
    keywords: string[]
    url: string
    ogImage: string
  }
}

export type AboutContent = {
  intro: { eyebrow: L; title: L; lede: L }
  cards: { id: string; kicker: L; title: L; image: string; body: L }[]
  parishInfo: { label: L; value: L }[]
  logo: { title: L; description: L }
}

export type MassContent = {
  note: L
  groups: {
    id: string
    icon: string
    accent: 'gold' | 'navy' | 'burgundy' | 'stone'
    title: L
    subtitle: L
    image: string
    entries: { time: string; label: L; note: L }[]
  }[]
}

export type WeeklyEvent = {
  time: string
  title: L
  place: L
  tag: string
}

export type EventsContent = {
  title: L
  subtitle: L
  days: { key: string; name: L; short: L; events: WeeklyEvent[] }[]
}

export type ClergyContent = {
  parishPriest: {
    name: L
    designation: L
    since: L
    image: string
    phone: string
    email: string
    whatsapp: string
    quote: L
    message: L
    signature: L
  }
}

export type PastPriestsContent = {
  title: L
  subtitle: L
  priests: { name: L; years: string; image: string; bio: L }[]
}

export type StatsContent = {
  title: L
  subtitle: L
  image: string
  items: { id: string; value: number; suffix: string; label: L }[]
}

export type MinistryMember = {
  name: L
  role: L
}

export type MinistryEvent = {
  date: string
  title: L
  place: L
}

export type MinistriesContent = {
  title: L
  subtitle: L
  /** Shown on the detail panel above the tabs. */
  labels?: {
    about: L
    team: L
    events: L
    history: L
  }
  items: {
    id: string
    icon: string
    name: L
    description: L
    lead: L
    members: number
    /** Everything below is shown only inside the detail panel. */
    image?: string
    since?: string
    meets?: L
    place?: L
    leadRole?: L
    leadPhone?: string
    leadImage?: string
    history?: L
    activities?: L[]
    team?: MinistryMember[]
    events?: MinistryEvent[]
    joinNote?: L
  }[]
}

export type GalleryContent = {
  title: L
  subtitle: L
  categories: { id: string; label: L }[]
  items: {
    id: string
    category: string
    src: string
    span: 'normal' | 'wide' | 'tall'
    caption: L
  }[]
}

export type NoticesContent = {
  title: L
  subtitle: L
  categories: { id: string; label: L }[]
  items: {
    id: string
    category: string
    date: string
    pinned?: boolean
    title: L
    excerpt: L
    body: L
  }[]
}

export type MediaContent = {
  title: L
  subtitle: L
  channel: { name: string; url: string; note: L }
  videos: {
    id: string
    title: L
    description: L
    published: string
    duration: string
    featured?: boolean
  }[]
  bulletins: { id: string; title: L; date: string; size: string; file: string }[]
}

export type UpcomingEvent = {
  id: string
  /** ISO date (or date-time) the event starts. Past events drop out on their own. */
  date: string
  /** Optional last day for something that runs over several days. */
  endDate?: string
  time: L
  title: L
  place: L
  category: string
  image: string
  highlight?: boolean
  description: L
  cta?: { label: L; href: string }
}

export type UpcomingContent = {
  popup: {
    enabled: boolean
    eyebrow: L
    title: L
    subtitle: L
    /** Seconds to wait after the page settles before the card appears. */
    delaySeconds: number
    /** How long a dismissal is remembered, in hours. */
    remindAfterHours: number
    cta: { label: L; href: string }
    dismiss: L
  }
  title: L
  subtitle: L
  events: UpcomingEvent[]
}

export type Obituary = {
  id: string
  name: L
  image: string
  age: number
  born: string
  died: string
  house: L
  unit: L
  funeral: { date: string; time: L; place: L }
  survivedBy: L
  tribute: L
}

export type ObituariesContent = {
  title: L
  subtitle: L
  /** Printed under every memorial card. */
  prayer: L
  note: L
  items: Obituary[]
}

export type CommitteeMember = {
  id: string
  name: L
  role: L
  unit: L
  image: string
  phone: string
  since: string
  /** Office bearers are shown first, in a larger card. */
  office?: boolean
}

export type CommitteeContent = {
  title: L
  subtitle: L
  term: L
  note: L
  members: CommitteeMember[]
}

export type DonationFund = {
  id: string
  icon: string
  title: L
  description: L
  /** Optional progress figures, both in rupees. Omit to hide the bar. */
  goal?: number
  raised?: number
}

export type DonationContent = {
  eyebrow: L
  title: L
  subtitle: L
  image: string
  note: L
  /** Rupee amounts offered as one-tap buttons. */
  presets: number[]
  minAmount: number
  maxAmount: number
  funds: DonationFund[]
  bank: {
    accountName: string
    accountNumber: string
    ifsc: string
    bankName: string
    branch: string
    upiId: string
  }
  assurance: L[]
  receiptNote: L
}

export type Content = {
  site: SiteContent
  about: AboutContent
  mass: MassContent
  events: EventsContent
  clergy: ClergyContent
  pastPriests: PastPriestsContent
  stats: StatsContent
  ministries: MinistriesContent
  gallery: GalleryContent
  notices: NoticesContent
  media: MediaContent
  upcoming: UpcomingContent
  obituaries: ObituariesContent
  committee: CommitteeContent
  donation: DonationContent
}

/** Keys the admin dashboard may read and write. */
export const CONTENT_KEYS = [
  'site',
  'about',
  'mass',
  'events',
  'clergy',
  'past-priests',
  'stats',
  'ministries',
  'gallery',
  'notices',
  'media',
  'upcoming',
  'obituaries',
  'committee',
  'donation',
] as const

export type ContentKey = (typeof CONTENT_KEYS)[number]
