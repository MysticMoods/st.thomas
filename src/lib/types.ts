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

export type MinistriesContent = {
  title: L
  subtitle: L
  items: {
    id: string
    icon: string
    name: L
    description: L
    lead: L
    members: number
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

export type FeastContent = {
  eyebrow: L
  name: L
  localName: L
  date: string
  displayDate: L
  image: string
  description: L
  schedule: { time: L; item: L }[]
  cta: { label: L; href: string }
  countdownLabels: {
    days: L
    hours: L
    minutes: L
    seconds: L
    arrived: L
  }
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
  feast: FeastContent
  media: MediaContent
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
  'feast',
  'media',
] as const

export type ContentKey = (typeof CONTENT_KEYS)[number]
