import type { Letter } from './mail'
import { officeAddress, siteUrl } from './mail'

/**
 * The letters this site sends, written out in full.
 *
 * They are bilingual, English first, because the office cannot know which the
 * reader wants and both are read here. They are plain: a parish writing to a
 * family, not a company writing to a customer. Nothing in them asks for a
 * password or a payment, so nothing in them can be imitated to ask for one.
 */

const SIGN_OFF = {
  en: 'St. Thomas Church, Mangalassery',
  ml: 'സെന്റ് തോമസ് ദേവാലയം, മംഗലശ്ശേരി',
}

/** A typed newline, written without an escape so it survives every editor. */
const BREAK = String.fromCharCode(10)

/**
 * Angle brackets and ampersands written by a visitor are characters they typed,
 * not markup they may add to a letter the parish office opens. Written with
 * split and join rather than a regular expression so no escape can be mangled.
 */
function esc(value: string) {
  return String(value ?? '')
    .split('&')
    .join('&amp;')
    .split('<')
    .join('&lt;')
    .split('>')
    .join('&gt;')
    .split('"')
    .join('&quot;')
}

/** What somebody typed, as HTML: their line breaks kept, nothing else added. */
function nl2br(value: string) {
  return esc(value).split(BREAK).join('<br>')
}

/** One plain wrapper, so every letter looks like it came from the same place. */
function dress(title: string, lines: string[], footer?: string) {
  const body = lines
    .map((line) =>
      line
        ? `<p style="margin:0 0 14px;font:400 15px/1.6 Georgia,serif;color:#20293a">${line}</p>`
        : '',
    )
    .join('')

  return `<!doctype html><html><body style="margin:0;background:#f6f2ea;padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fffdf9;border:1px solid #e6dfd2">
<tr><td style="padding:26px 30px 0">
<p style="margin:0;font:600 11px/1 Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#8a6d1c">${SIGN_OFF.en}</p>
<h1 style="margin:14px 0 18px;font:400 23px/1.25 Georgia,serif;color:#101a2c">${title}</h1>
<hr style="border:none;border-top:1px solid #e0d6c2;margin:0 0 20px">
</td></tr>
<tr><td style="padding:0 30px 24px">${body}</td></tr>
<tr><td style="padding:0 30px 26px;border-top:1px solid #efe8dc">
<p style="margin:16px 0 0;font:400 12px/1.6 Arial,sans-serif;color:#6c7382">
${footer ?? `${SIGN_OFF.en} · ${SIGN_OFF.ml}<br><a href="${siteUrl()}" style="color:#8a6d1c">${siteUrl().replace(/^https?:\/\//, '')}</a>`}
</p>
</td></tr></table></body></html>`
}

function plain(lines: string[], footer?: string) {
  return `${lines.filter(Boolean).join('\n\n')}\n\n—\n${footer ?? `${SIGN_OFF.en}\n${siteUrl()}`}\n`
}

/* ------------------------------------------------------------------ contact */

export function contactToOffice(m: {
  name: string
  email: string
  phone: string
  subject: string
  message: string
}): Letter {
  const lines = [
    `<strong>${m.name}</strong> has written through the website.`,
    m.subject ? `Subject: ${m.subject}` : '',
    nl2br(m.message),
    `Reply to: ${m.email}${m.phone ? ` · ${m.phone}` : ''}`,
  ]
  return {
    kind: 'contact-office',
    to: officeAddress(),
    replyTo: m.email,
    subject: `Website message from ${m.name}${m.subject ? ` — ${m.subject}` : ''}`,
    text: plain([
      `${m.name} has written through the website.`,
      m.subject ? `Subject: ${m.subject}` : '',
      m.message,
      `Reply to: ${m.email}${m.phone ? ` · ${m.phone}` : ''}`,
    ]),
    html: dress('A message from the website', lines),
  }
}

export function contactToSender(m: { name: string; email: string; message: string }): Letter {
  const lines = [
    `Dear ${m.name},`,
    'Your message has reached the parish office. Somebody will read it and reply — usually within a couple of working days.',
    'If it is urgent, please telephone the office rather than wait for this.',
    '<em>നിങ്ങളുടെ സന്ദേശം ഇടവക ഓഫീസിൽ എത്തി. ആരെങ്കിലും അത് വായിച്ച് മറുപടി നൽകും. അടിയന്തിരമാണെങ്കിൽ ദയവായി ഓഫീസിലേക്ക് വിളിക്കുക.</em>',
    `<span style="color:#6c7382">What you wrote: “${m.message.slice(0, 300)}${m.message.length > 300 ? '…' : ''}”</span>`,
  ]
  return {
    kind: 'contact-ack',
    to: m.email,
    subject: 'We have your message — St. Thomas Church, Mangalassery',
    text: plain([
      `Dear ${m.name},`,
      'Your message has reached the parish office. Somebody will read it and reply — usually within a couple of working days.',
      'If it is urgent, please telephone the office rather than wait for this.',
      'നിങ്ങളുടെ സന്ദേശം ഇടവക ഓഫീസിൽ എത്തി. ആരെങ്കിലും അത് വായിച്ച് മറുപടി നൽകും.',
      `What you wrote: "${m.message.slice(0, 300)}"`,
    ]),
    html: dress('We have your message', lines),
  }
}

/* --------------------------------------------------------------------- hall */

type Booking = {
  id: string
  name: string
  email: string
  phone: string
  hall: string
  date: string
  session: string
  guests: number
  purpose: string
}

function niceDate(iso: string) {
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function hallRequestToOffice(b: Booking, hallName: string, sessionName: string): Letter {
  const lines = [
    `<strong>${b.name}</strong> has asked for the ${hallName}.`,
    `${niceDate(b.date)} · ${sessionName}`,
    b.purpose ? `Occasion: ${b.purpose}` : '',
    b.guests ? `People expected: ${b.guests}` : '',
    `Reply to: ${b.email}${b.phone ? ` · ${b.phone}` : ''}`,
    `Reference <strong>${b.id}</strong> — confirm or decline it in the dashboard under Hall Bookings.`,
  ]
  return {
    kind: 'hall-office',
    to: officeAddress(),
    replyTo: b.email,
    subject: `Hall request — ${hallName}, ${niceDate(b.date)}`,
    text: plain([
      `${b.name} has asked for the ${hallName}.`,
      `${niceDate(b.date)} · ${sessionName}`,
      b.purpose ? `Occasion: ${b.purpose}` : '',
      b.guests ? `People expected: ${b.guests}` : '',
      `Reply to: ${b.email}${b.phone ? ` · ${b.phone}` : ''}`,
      `Reference ${b.id}`,
    ]),
    html: dress('A hall has been asked for', lines),
  }
}

export function hallRequestToFamily(
  b: Booking,
  hallName: string,
  sessionName: string,
  advance: number,
  phone: string,
): Letter {
  const lines = [
    `Dear ${b.name},`,
    `Your request for the <strong>${hallName}</strong> on <strong>${niceDate(b.date)}</strong> (${sessionName}) has reached the parish office.`,
    `Your reference is <strong>${b.id}</strong>. Please quote it if you telephone.`,
    `The day is held for seven days. It becomes a booking once the advance of ₹${advance.toLocaleString('en-IN')} reaches the office. Nothing has been charged.`,
    `Somebody will ring you to confirm. If you need to reach us first: ${phone}`,
    `<em>നിങ്ങളുടെ അപേക്ഷ ഇടവക ഓഫീസിൽ എത്തി. റഫറൻസ്: ${b.id}. ഏഴ് ദിവസത്തേക്ക് ദിവസം മാറ്റിവച്ചിരിക്കുന്നു; അഡ്വാൻസ് ലഭിക്കുമ്പോൾ ബുക്കിംഗ് ഉറപ്പിക്കും.</em>`,
  ]
  return {
    kind: 'hall-ack',
    to: b.email,
    subject: `Your hall request — ${hallName}, ${niceDate(b.date)} (ref ${b.id})`,
    text: plain([
      `Dear ${b.name},`,
      `Your request for the ${hallName} on ${niceDate(b.date)} (${sessionName}) has reached the parish office.`,
      `Your reference is ${b.id}. Please quote it if you telephone.`,
      `The day is held for seven days. It becomes a booking once the advance of ₹${advance} reaches the office. Nothing has been charged.`,
      `Somebody will ring you to confirm. If you need to reach us first: ${phone}`,
    ]),
    html: dress('We have your hall request', lines),
  }
}

export function hallDecided(
  b: Booking,
  hallName: string,
  sessionName: string,
  status: 'confirmed' | 'declined',
  phone: string,
): Letter {
  const confirmed = status === 'confirmed'
  const lines = confirmed
    ? [
        `Dear ${b.name},`,
        `The <strong>${hallName}</strong> is yours for <strong>${niceDate(b.date)}</strong> (${sessionName}).`,
        `Reference ${b.id}. Collect the keys at the parish office on the working day before.`,
        `Anything to change? Telephone the office: ${phone}`,
        '<em>ഹാൾ ഉറപ്പിച്ചു. തലേ പ്രവൃത്തിദിവസം ഓഫീസിൽ നിന്ന് താക്കോൽ വാങ്ങുക.</em>',
      ]
    : [
        `Dear ${b.name},`,
        `We are sorry — the <strong>${hallName}</strong> is not free on <strong>${niceDate(b.date)}</strong> after all, so your request has been set aside.`,
        `Nothing is owed. If another day would suit, the calendar on the website shows what is open, or telephone the office: ${phone}`,
        '<em>ക്ഷമിക്കണം, ആ ദിവസം ഹാൾ ലഭ്യമല്ല. മറ്റൊരു ദിവസം നോക്കാൻ വെബ്സൈറ്റിലെ കലണ്ടർ കാണുക.</em>',
      ]

  return {
    kind: confirmed ? 'hall-confirmed' : 'hall-declined',
    to: b.email,
    subject: confirmed
      ? `Confirmed — ${hallName}, ${niceDate(b.date)}`
      : `About your hall request — ${niceDate(b.date)}`,
    text: plain(lines.map((line) => line.replace(/<[^>]+>/g, ''))),
    html: dress(confirmed ? 'Your booking is confirmed' : 'Your hall request', lines),
  }
}

/* ------------------------------------------------------------ parish office */

type OfficeAsk = {
  id: string
  kind: 'intentions' | 'certificates' | 'prayers'
  type: string
  date?: string
  subject: string
  detail: string
  name: string
  phone: string
  email: string
  mayPublish?: boolean
}

export function officeRequestToOffice(ask: OfficeAsk, label: string): Letter {
  const what =
    ask.kind === 'intentions'
      ? `${label} on ${niceDate(ask.date ?? '')}`
      : ask.kind === 'certificates'
        ? label
        : 'A prayer request'

  const lines = [
    `<strong>${ask.name}</strong> has asked through the website.`,
    what,
    ask.subject ? `For: ${ask.subject}` : '',
    ask.detail ? nl2br(ask.detail) : '',
    ask.kind === 'prayers'
      ? ask.mayPublish
        ? 'They are content for this to appear in the notices.'
        : '<strong>Not to be published.</strong>'
      : '',
    `Reply to: ${ask.email || '—'}${ask.phone ? ` · ${ask.phone}` : ''}`,
    `Reference <strong>${ask.id}</strong> — it is waiting in the dashboard.`,
  ]

  return {
    kind: `office-${ask.kind}`,
    to: officeAddress(),
    replyTo: ask.email || undefined,
    subject: `${what} — ${ask.name}`,
    text: plain(lines.map((line) => line.replace(/<[^>]+>/g, ''))),
    html: dress('Asked for at the office', lines),
  }
}

export function officeRequestToSender(ask: OfficeAsk, label: string, days: number): Letter {
  const opening =
    ask.kind === 'intentions'
      ? [
          `Your request for a Holy Mass on <strong>${niceDate(ask.date ?? '')}</strong> — ${label.toLowerCase()}, for ${ask.subject} — has reached the parish office.`,
          'The office will telephone to say which Mass it has been written into.',
          '<em>നിങ്ങളുടെ കുർബാന നിയോഗം ഇടവക ഓഫീസിൽ എത്തി. ഏത് കുർബാനയിലാണെന്ന് ഓഫീസ് വിളിച്ചറിയിക്കും.</em>',
        ]
      : ask.kind === 'certificates'
        ? [
            `Your request for a <strong>${label.toLowerCase()}</strong> in the name of ${ask.subject} has reached the parish office.`,
            `It is usually ready within ${days} working days. Bring proof of who you are when you come to collect it.`,
            '<em>നിങ്ങളുടെ അപേക്ഷ ഓഫീസിൽ എത്തി. വാങ്ങാൻ വരുമ്പോൾ തിരിച്ചറിയൽ രേഖ കൊണ്ടുവരിക.</em>',
          ]
        : [
            'Your request has reached the parish. It will be prayed for at Mass and by the parish prayer group.',
            'Nothing you wrote will be published unless you said it may be.',
            '<em>നിങ്ങളുടെ അപേക്ഷ ഇടവകയിൽ എത്തി. കുർബാനയിലും പ്രാർത്ഥനാ സംഘത്തിലും ഇതിനുവേണ്ടി പ്രാർത്ഥിക്കും.</em>',
          ]

  const lines = [`Dear ${ask.name},`, ...opening, `Your reference is <strong>${ask.id}</strong>.`]

  return {
    kind: `office-${ask.kind}-ack`,
    to: ask.email,
    subject:
      ask.kind === 'prayers'
        ? 'The parish will pray for this'
        : `We have your request (ref ${ask.id})`,
    text: plain(lines.map((line) => line.replace(/<[^>]+>/g, ''))),
    html: dress(
      ask.kind === 'prayers' ? 'The parish will pray for this' : 'We have your request',
      lines,
    ),
  }
}

export function officeDecided(ask: OfficeAsk, label: string, note: string): Letter {
  const lines = [
    `Dear ${ask.name},`,
    ask.kind === 'intentions'
      ? `The Holy Mass you asked for on <strong>${niceDate(ask.date ?? '')}</strong> has been written into the register.`
      : ask.kind === 'certificates'
        ? `Your <strong>${label.toLowerCase()}</strong> is ready. Collect it at the parish office, and bring proof of who you are.`
        : 'Your request has been prayed for, and remains in the parish prayers.',
    note ? `<span style="color:#6c7382">${note}</span>` : '',
  ]

  return {
    kind: `office-${ask.kind}-done`,
    to: ask.email,
    subject:
      ask.kind === 'certificates' ? 'Your certificate is ready' : 'About your request to the parish',
    text: plain(lines.map((line) => line.replace(/<[^>]+>/g, ''))),
    html: dress(
      ask.kind === 'certificates' ? 'Ready to collect' : 'About your request',
      lines,
    ),
  }
}

/* ---------------------------------------------------------------- donations */

export function donationReceipt(d: {
  name: string
  email: string
  amount: number
  fund: string
  paymentId: string
  at: string
}): Letter {
  const rupees = (d.amount / 100).toLocaleString('en-IN')
  const lines = [
    `Dear ${d.name || 'friend'},`,
    `The parish has received your gift of <strong>₹${rupees}</strong> towards ${d.fund}.`,
    `Payment reference ${d.paymentId}, ${new Date(d.at).toLocaleString('en-IN')}.`,
    'Thank you. It is written into the parish account and will be used for what you gave it for.',
    '<em>നിങ്ങളുടെ സംഭാവനയ്ക്ക് നന്ദി. ഇത് ഇടവക കണക്കിൽ രേഖപ്പെടുത്തിയിട്ടുണ്ട്.</em>',
  ]
  return {
    kind: 'donation-receipt',
    to: d.email,
    subject: `Thank you — ₹${rupees} received`,
    text: plain(lines.map((line) => line.replace(/<[^>]+>/g, ''))),
    html: dress('Your gift has been received', lines),
  }
}

/* --------------------------------------------------------------- newsletter */

export function newsletter(to: string, subject: string, body: string, token: string): Letter {
  const paragraphs = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => block.replace(/\n/g, '<br>'))

  const stop = `${siteUrl()}/unsubscribe?token=${encodeURIComponent(token)}`
  const footer = `${SIGN_OFF.en} · ${SIGN_OFF.ml}<br>
You are receiving this because you asked for parish news at ${siteUrl().replace(/^https?:\/\//, '')}.<br>
<a href="${stop}" style="color:#8a6d1c">Stop receiving these</a> · <span style="color:#8a6d1c">വരിസംഖ്യ അവസാനിപ്പിക്കുക</span>`

  return {
    kind: 'newsletter',
    to,
    subject,
    text: plain(paragraphs.map((block) => block.replace(/<br>/g, '\n')), `${SIGN_OFF.en}\nStop receiving these: ${stop}`),
    html: dress(subject, paragraphs, footer),
  }
}

export function subscribeWelcome(to: string, token: string): Letter {
  const stop = `${siteUrl()}/unsubscribe?token=${encodeURIComponent(token)}`
  const lines = [
    'You will now get the parish newsletter — notices, feast days and what is coming up.',
    'It is sent rarely and never passed to anybody else.',
    '<em>ഇടവക വാർത്താക്കുറിപ്പ് ഇനി നിങ്ങൾക്ക് ലഭിക്കും.</em>',
  ]
  return {
    kind: 'subscribe-welcome',
    to,
    subject: 'You are on the parish newsletter',
    text: plain(
      lines.map((line) => line.replace(/<[^>]+>/g, '')),
      `${SIGN_OFF.en}\nStop receiving these: ${stop}`,
    ),
    html: dress(
      'Welcome',
      lines,
      `${SIGN_OFF.en}<br><a href="${stop}" style="color:#8a6d1c">Stop receiving these</a>`,
    ),
  }
}

/* -------------------------------------------------------------------- reply */

/**
 * The parish office answering somebody who wrote in.
 *
 * The office writes the words; this only puts them in the same envelope as
 * every other letter and quotes the original underneath, so the reader knows
 * which of their messages is being answered without having to guess.
 */
export function replyToPerson(input: {
  to: string
  name: string
  subject: string
  reply: string
  original: string
}): Letter {
  const greeting = input.name ? `Dear ${esc(input.name)},` : 'Dear friend,'
  const quoted = input.original.slice(0, 600)

  return {
    kind: 'reply',
    to: input.to,
    replyTo: officeAddress() || undefined,
    subject: input.subject,
    text: plain([
      input.name ? `Dear ${input.name},` : 'Dear friend,',
      input.reply,
      quoted ? `You wrote to us:${BREAK}${quoted}` : '',
    ]),
    html: dress('A word from the parish office', [
      greeting,
      nl2br(input.reply),
      quoted
        ? `<span style="color:#6c7382">You wrote to us:<br>${nl2br(quoted)}</span>`
        : '',
    ]),
  }
}
