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

export type MinistryGroup = {
  /** The unit or the class: "St. Peter's Unit", "Class 5". */
  name: L
  /** Kept apart from the name so "Class 5 A" and "Class 5 B" sit together. */
  division?: string
  /** Where it meets, when — anything worth saying under the name. */
  note?: L
  /**
   * Everyone worth ringing about this group. A phone number is the point.
   *
   * `office` separates the five posts every family unit elects — president,
   * vice president, secretary, joint secretary, treasurer — from the group
   * leaders who look after a few houses each. The detail panel shows the two
   * apart, because they are asked for in different situations.
   */
  people?: { name: L; role?: L; phone?: string; office?: boolean }[]
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
    /** Only used when a ministry has no groupsLabel of its own. */
    groups?: L
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
    /**
     * The units a family-unit ministry is divided into, or the classes of the
     * Sunday school — a named group and the people to ring about it. One shape
     * for both, because they differ only in what they are called.
     */
    groups?: MinistryGroup[]
    /** What to call them on the tab: Units, Classes, Wards. */
    groupsLabel?: L
    /**
     * List the groups on their own and open one at a time. Worth it for the
     * family units, where each one carries fifteen names; not for the Sunday
     * school, where a class has a teacher and reads better in place.
     */
    groupsDrilldown?: boolean
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
    /** Optional photograph or poster. Empty string means the notice is text only. */
    image?: string
  }[]
}

export type LeadershipContent = {
  title: L
  subtitle: L
  people: {
    id: string
    /** Empty until the parish uploads the official portrait. */
    image: string
    name: L
    role: L
    see: L
    note: L
    since?: string
  }[]
}

export type HallRoom = {
  id: string
  name: L
  blurb: L
  /** Set on a room that is really two rooms with the partition folded back. */
  combines?: string[]
  seated: number
  standing: number
  features: { ac: boolean; generator: boolean; stage: boolean }
  image: string
  gallery: string[]
  /** Rent per session id. */
  rates: Record<string, number>
  /** Ids from `amenities` that this room can actually offer. */
  amenities: string[]
}

export type HallContent = {
  title: L
  subtitle: L
  image: string
  /** The opening of the hall page: photographs and the strip of facilities. */
  hero: { eyebrow: L; images: string[]; marquee: L[] }
  /** The band of figures under the hero — halls, seats, parking, notice. */
  stats: { id: string; value: number; suffix: string; label: L }[]
  halls: HallRoom[]
  /** How a day in the hall runs, told in order. */
  story: { title: L; body: L; image: string }[]
  facts: { label: L; value: L }[]
  /** A booking takes one of these. `full-day` covers the others. */
  sessions: { id: string; label: L; hours: L }[]
  amenities: { id: string; label: L; note: L; rate: number }[]
  /** What comes with the hall at no extra charge. */
  included: { label: L; note: L }[]
  rules: L[]
  /** The questions the office is asked on the telephone every week. */
  faq: { q: L; a: L }[]
  booking: {
    note: L
    /** Days of notice the office needs before an event. */
    minNoticeDays: number
    /** How far ahead the calendar runs. */
    monthsAhead: number
    advance: number
    contact: { phone: string; hours: L }
  }
  /** Days the parish keeps for itself — feasts, Holy Week, funerals. */
  blocked: { date: string; reason: L }[]
}

export type MediaContent = {
  title: L
  subtitle: L
  channel: {
    name: string
    url: string
    /** UC… id of the parish channel. Set it and new uploads appear on their own. */
    id?: string
    note: L
  }
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

/**
 * A block of people shown above the council itself — the sacristan, the parish
 * administrators. They are not elected onto the council and have no term, but
 * they are who a parishioner rings first, so they belong at the top of the
 * page rather than buried in a list of eighteen.
 *
 * They are a list rather than two fixed fields so that a parish with three
 * administrators, or none, needs a content edit and not a code change. The
 * order they appear in the file is the order they appear on the page.
 */
export type CommitteeTier = {
  id: string
  title: L
  subtitle?: L
  people: CommitteeMember[]
}

export type CommitteeContent = {
  title: L
  subtitle: L
  term: L
  note: L
  /** Shown above the council, in file order. */
  tiers?: CommitteeTier[]
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

/**
 * The three things the parish office is asked for most: a Mass offered for
 * somebody, a certificate copied out of the registers, and a prayer.
 */
export type OfficeContent = {
  title: L
  subtitle: L
  image: string
  hours: L
  intentions: {
    title: L
    blurb: L
    /** Days of notice before a Mass can be asked for. */
    noticeDays: number
    monthsAhead: number
    /** The suggested offering, in rupees. Never a condition. */
    offering: number
    types: { id: string; label: L; note: L }[]
    rules: L[]
  }
  certificates: {
    title: L
    blurb: L
    /** Working days the office usually takes. */
    days: number
    types: { id: string; label: L; needs: L; fee: number }[]
    rules: L[]
  }
  prayers: { title: L; blurb: L; note: L }
}

/**
 * The chapels of the parish — the kurishupallis and filial chapels where Mass
 * is said away from the parish church.
 *
 * Their timings are shaped like the parish church's own, because they answer
 * the same question and there is no reason for a reader, or an editor, to meet
 * two different arrangements of it.
 */
export type ChapelsContent = {
  title: L
  subtitle: L
  items: {
    id: string
    name: L
    /** Where it stands, in words somebody could follow. */
    place?: L
    /** When people gather there — free text, so "First Friday, 6:30 PM" fits. */
    time?: L
    image?: string
  }[]
}

/**
 * One advertisement at the foot of the page.
 *
 * A parish sells a few of these to the shops around it, the way the printed
 * bulletin always has. Two kinds cover what anybody actually sends in: a
 * photograph of a shopfront, or a video already on YouTube.
 *
 * `until` is the date the space was paid up to. Past it the advertisement stops
 * showing on its own, so nobody has to remember to take it down — which is the
 * only way a list like this stays honest.
 */
export type Ad = {
  id: string
  kind: 'image' | 'video'
  /** The advertiser. Shown under the panel and used as the image's alt text. */
  title: L
  caption?: L
  /** kind 'image': an uploaded path or a full URL. */
  image?: string
  /** kind 'video': a YouTube link in any of its usual shapes, or the bare id. */
  video?: string
  /** Where clicking it goes. Left empty, the panel is not a link. */
  href?: string
  /** Off without deleting it — next year's advertiser, this year's gap. */
  active?: boolean
  /** ISO date, YYYY-MM-DD. Empty means it runs until somebody says otherwise. */
  until?: string
  /**
   * The pages this advertisement runs on. Missing or empty means both, which is
   * what an advertiser who has simply bought the space expects.
   *
   * They are worth separating because the two pages are read by different
   * people: the homepage by the parish, the hall page by somebody planning a
   * wedding. A caterer belongs on one and not the other, and paying for the
   * hall page should not put a shopfront in front of the whole parish.
   */
  places?: AdPlace[]
}

/** Where an advertisement can appear. */
export type AdPlace = 'home' | 'hall'

/** The wording round the advertisements. */
export type AdsHeading = {
  title: L
  subtitle: L
  /** The line offering the space, shown under the advertisements. */
  note: L
  /** Where to write about advertising. Empty hides the invitation. */
  contactHref?: string
}

export type AdsContent = AdsHeading & {
  /** Wording for the hall page. Anything left out falls back to the above. */
  hall?: Partial<AdsHeading>
  items: Ad[]
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
  leadership: LeadershipContent
  hall: HallContent
  obituaries: ObituariesContent
  committee: CommitteeContent
  donation: DonationContent
  office: OfficeContent
  chapels: ChapelsContent
  ads: AdsContent
}

/** Keys the admin dashboard may read and write. */
export const CONTENT_KEYS = [
  'site',
  'chapels',
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
  'leadership',
  'hall',
  'obituaries',
  'committee',
  'donation',
  'office',
  'ads',
] as const

export type ContentKey = (typeof CONTENT_KEYS)[number]
