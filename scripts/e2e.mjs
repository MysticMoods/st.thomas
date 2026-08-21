/*
 * Smoke test for the parish site. Start the server first:
 *
 *   npm run build && npm start
 *   npm run test:e2e
 *
 * Covers the public page, the language and theme switches, the gallery
 * lightbox, the two public APIs, and a full sign-in → edit → save → sign-out
 * round trip through the dashboard (restoring whatever it changes).
 */
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs'

import { chromium } from 'playwright'

/**
 * The dashboard password lives in .env.local, which plain node does not read.
 * The suite signs in as the bootstrap account, so it reads the file itself and
 * falls back to the demo pair when there is none.
 */
function fromEnvFile(key, fallback) {
  try {
    const row = readFileSync('.env.local', 'utf-8')
      .split(String.fromCharCode(10))
      .find((line) => line.startsWith(key + '='))
    return (row ? row.slice(key.length + 1).trim() : '') || fallback
  } catch {
    return fallback
  }
}
const ADMIN_USER = fromEnvFile('ADMIN_USERNAME', 'vicar')
const ADMIN_PASS = fromEnvFile('ADMIN_PASSWORD', 'mangalassery1893')

const results = []
const ok = (n, c, extra = '') => results.push(`${c ? 'PASS' : 'FAIL'}  ${n}${extra ? ' — ' + extra : ''}`)

const browser = await chromium.launch()
// Booking and review endpoints are rate limited per address. Each run presents
// a fresh one so the suite can be run repeatedly without tripping the limit that
// protects the real site.
const runAddress = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
/** Headers for the rate-limited endpoints, so repeated runs never trip them. */
const fromRunAddress = { 'x-forwarded-for': runAddress }
const page = await ctx.newPage()
// Confirmations ("free this slot?", "delete this entry?") are part of the flows
// under test, so accept them rather than letting Playwright dismiss them.
page.on('dialog', (dialog) => dialog.accept())
const errors = []
page.on('pageerror', (e) => errors.push(`[after ${results.length} checks] ${page.url()} :: ${e}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`[after ${results.length} checks] ${page.url()} :: ${m.text()}`) })

// ---- public site
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)
ok('home renders hero', (await page.locator('h1').first().innerText()).includes('St. Thomas'))

// nothing may greet the visitor before the page itself
ok('no welcome dialog on load', (await page.locator('[role=dialog]').count()) === 0)

// language switch
await page.click('button:has-text("മലയാളം")')
await page.waitForTimeout(600)
ok('language switch to Malayalam', (await page.locator('h1').first().innerText()).includes('ദേവാലയം'))
await page.click('button:has-text("EN")')
await page.waitForTimeout(400)

// theme toggle
const before = await page.evaluate(() => document.documentElement.classList.contains('dark'))
await page.click('header button[aria-label*="mode"]')
await page.waitForTimeout(400)
const after = await page.evaluate(() => document.documentElement.classList.contains('dark'))
ok('dark mode toggle', before !== after)
await page.click('header button[aria-label*="mode"]')

// gallery lightbox
await page.locator('#gallery').scrollIntoViewIfNeeded()
await page.waitForTimeout(1200)
await page.locator('#gallery button.group').first().click()
await page.waitForTimeout(700)
ok('lightbox opens', await page.locator('[role=dialog]').isVisible())
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400)
await page.keyboard.press('Escape'); await page.waitForTimeout(1000)
ok('lightbox closes on Escape', (await page.locator('[role=dialog]').count()) === 0)

// gallery filter
await page.locator('#gallery button:has-text("Christmas")').click()
await page.waitForTimeout(800)
ok('gallery category filter', (await page.locator('#gallery button.group').count()) === 4,
   `${await page.locator('#gallery button.group').count()} items`)

// notice expand
await page.locator('#notices').scrollIntoViewIfNeeded(); await page.waitForTimeout(900)
await page.locator('#notices button:has-text("Read more")').first().click()
await page.waitForTimeout(700)
ok('notice expands', (await page.locator('#notices button:has-text("Show less")').count()) > 0)
ok('a notice can carry a photograph', (await page.locator('#notices img').count()) > 0,
   `${await page.locator('#notices img').count()} illustrated notices`)

ok('the upcoming events section is gone', (await page.locator('#upcoming').count()) === 0)

ok('media section points at the parish channel',
   (await page.locator('#media a[href*="@st.thomaschurchmangalasser2793"]').count()) > 0)
ok('media section plays videos from that channel',
   (await page.locator('#media a[href*="watch?v=fBtzCbruf3g"]').count()) > 0)
const mediaThumbs = await page.locator('#media img[src*="ytimg"]').count()
ok('every video shows its YouTube thumbnail', mediaThumbs >= 8, `${mediaThumbs} thumbnails`)

ok('parish information opens with the address', await page.evaluate(() => {
  const first = document.querySelector('#about dl > div')
  return !!first && /address/i.test(first.innerText)
}))
ok('the address row links to the map',
   (await page.locator('#about dl a[href*="maps"]').count()) > 0)

// pope, archbishop and bishop, between the About section and the parish priest
await page.locator('#leadership').scrollIntoViewIfNeeded(); await page.waitForTimeout(1200)
ok('leadership section shows three shepherds', (await page.locator('#leadership article').count()) === 3,
   `${await page.locator('#leadership article').count()} cards`)
ok('leadership sits between about and the parish priest', await page.evaluate(() => {
  const y = (id) => document.getElementById(id).getBoundingClientRect().top + window.scrollY
  return y('about') < y('leadership') && y('leadership') < y('priests')
}))

// parish committee
await page.locator('#committee').scrollIntoViewIfNeeded(); await page.waitForTimeout(1200)
ok('committee lists at least fifteen members', (await page.locator('#committee article').count()) >= 15,
   `${await page.locator('#committee article').count()} members`)

// ministry detail panel
await page.locator('#ministries').scrollIntoViewIfNeeded(); await page.waitForTimeout(1200)
await page.locator('#ministries button.card').first().click()
await page.waitForTimeout(800)
ok('ministry panel opens', await page.locator('[role=dialog]').isVisible())
ok('ministry panel offers its tabs', (await page.locator('[role=dialog] [role=tab]').count()) >= 3,
   `${await page.locator('[role=dialog] [role=tab]').count()} tabs`)
await page.locator('[role=dialog] [role=tab]').nth(1).click()
await page.waitForTimeout(500)
ok('ministry tab switches', (await page.locator('[role=dialog] [role=tab][aria-selected=true]').count()) === 1)
await page.keyboard.press('Escape'); await page.waitForTimeout(1000)
ok('ministry panel closes on Escape', (await page.locator('[role=dialog]').count()) === 0)

// donation
await page.locator('#donate').scrollIntoViewIfNeeded(); await page.waitForTimeout(1200)
ok('donation section offers preset amounts', (await page.locator('#donate button:has-text("₹")').count()) >= 5)
await page.locator('#donate button:has-text("₹1,000")').first().click()
await page.waitForTimeout(400)
ok('donation amount button selects', (await page.locator('#donate button[aria-pressed=true]').count()) >= 1)

// the order route refuses anything outside the limits in content/donation.json
const tooSmall = await page.request.post('http://localhost:3000/api/donate/order', {
  data: { fund: 'general', amount: 1 },
})
ok('donation order rejects an amount below the minimum', [422, 503].includes(tooSmall.status()),
   `status=${tooSmall.status()}`)
const badFund = await page.request.post('http://localhost:3000/api/donate/order', {
  data: { fund: 'not-a-fund', amount: 500 },
})
ok('donation order rejects an unknown fund', [422, 503].includes(badFund.status()),
   `status=${badFund.status()}`)
const forgedVerify = await page.request.post('http://localhost:3000/api/donate/verify', {
  data: { razorpay_order_id: 'order_x', razorpay_payment_id: 'pay_x', razorpay_signature: 'forged' },
})
ok('donation verify rejects a forged signature', [400, 503].includes(forgedVerify.status()),
   `status=${forgedVerify.status()}`)
const forgedHook = await page.request.post('http://localhost:3000/api/donate/webhook', {
  data: { event: 'payment.captured' },
})
ok('donation webhook rejects an unsigned call', forgedHook.status() === 400)

// obituary — homepage strip, memorial dialog, and the archive page
await page.locator('#obituary').scrollIntoViewIfNeeded(); await page.waitForTimeout(1200)
ok('obituary strip shows recent memorials', (await page.locator('#obituary button.card').count()) === 4,
   `${await page.locator('#obituary button.card').count()} cards`)
await page.locator('#obituary button.card').first().click()
await page.waitForTimeout(800)
ok('memorial dialog opens', await page.locator('[role=dialog]').isVisible())
await page.keyboard.press('Escape'); await page.waitForTimeout(600)

await page.goto('http://localhost:3000/obituary', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2000)
ok('obituary archive page lists every memorial', (await page.locator('button.card').count()) >= 6,
   `${await page.locator('button.card').count()} cards`)
ok('the page does not repeat Home under the banner’s own Home link',
   (await page.locator('main a[href="/"]').count()) === 0)
ok('obituary page counts the memorials', /\d+\s+memorials/i.test(await page.locator('main').innerText()))
ok('obituary link is the active one on its own route',
   (await page.locator('header [aria-current="true"]').first().innerText()).trim().toLowerCase() === 'obituary')
// the header cannot be transparent here — there is no dark hero behind it
const headerBg = await page.locator('header').first().evaluate((el) => getComputedStyle(el).backgroundColor)
ok('obituary page header is opaque', !/rgba\(0, 0, 0, 0\)/.test(headerBg), headerBg)
const allCards = await page.locator('button.card').count()
await page.locator('button[aria-pressed]').last().click()
await page.waitForTimeout(800)
ok('obituary year filter narrows the column', (await page.locator('button.card').count()) < allCards)
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1800)

// newsletter + contact
const nl = await page.request.post('http://localhost:3000/api/newsletter', { headers: fromRunAddress, data: { email: 'test.parishioner@example.com' } })
ok('newsletter API accepts valid email', nl.ok(), `status=${nl.status()}`)
const nlBad = await page.request.post('http://localhost:3000/api/newsletter', { headers: fromRunAddress, data: { email: 'nope' } })
ok('newsletter API rejects bad email', nlBad.status() === 422, `status=${nlBad.status()}`)
// forms are protected, and nothing they take is left un-acknowledged
const formAddress = { 'x-forwarded-for': `10.31.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` }
const runEmail = `e2e-${Date.now().toString(36)}@example.com`

const trap = await page.request.post('http://localhost:3000/api/contact', {
  headers: formAddress,
  data: {
    name: 'Robot', email: 'robot@example.com', message: 'Buy my things',
    website: 'http://spam.example',
  },
})
ok('a form filled by a robot is answered cheerfully', trap.ok())

const nlTrap = await page.request.post('http://localhost:3000/api/newsletter', {
  headers: formAddress,
  data: { email: 'robot@example.com', website: 'http://spam.example' },
})
ok('the newsletter has the same hidden field', nlTrap.ok())

// the contact form is now rate limited like everything else
const floodAddress = { 'x-forwarded-for': `10.32.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` }
let floodStatus = 0
for (let i = 0; i < 7; i += 1) {
  const res = await page.request.post('http://localhost:3000/api/contact', {
    headers: floodAddress,
    data: { name: 'Flood', email: 'flood@example.com', message: `Message number ${i}` },
  })
  floodStatus = res.status()
}
ok('the contact form stops a flood', floodStatus === 429, `last status=${floodStatus}`)

// subscribing, and leaving again
const joined = await page.request.post('http://localhost:3000/api/newsletter', {
  headers: formAddress,
  data: { email: runEmail },
})
ok('a new address can join the newsletter', joined.ok())
const joinedTwice = await page.request.post('http://localhost:3000/api/newsletter', {
  headers: formAddress,
  data: { email: runEmail },
})
ok('joining twice is not an error', joinedTwice.ok())

const cf = await page.request.post('http://localhost:3000/api/contact', {
  data: { name: 'Test Parishioner', email: 'test@example.com', subject: 'Baptism', message: 'Hello from the e2e test.' },
})
ok('contact API accepts message', cf.ok())

// admin must be locked
const locked = await page.request.get('http://localhost:3000/api/admin/content/notices')
ok('content API rejects anonymous read', locked.status() === 401)
const lockedW = await page.request.put('http://localhost:3000/api/admin/content/notices', { data: { data: {} } })
ok('content API rejects anonymous write', lockedW.status() === 401)
const badPass = await page.request.post('http://localhost:3000/api/admin/login', { headers: fromRunAddress, data: { username: ADMIN_USER, password: 'wrong' } })
ok('login rejects wrong password', badPass.status() === 401)
const badUser = await page.request.post('http://localhost:3000/api/admin/login', { headers: fromRunAddress, data: { username: 'nobody', password: ADMIN_PASS } })
ok('login rejects wrong user id', badUser.status() === 401)
const noUser = await page.request.post('http://localhost:3000/api/admin/login', { headers: fromRunAddress, data: { password: ADMIN_PASS } })
ok('login rejects missing user id', noUser.status() === 401)

// the theme: what the toggle promises is what the page does
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1800)
const themeState = async () => page.evaluate(() => ({
  dark: document.documentElement.classList.contains('dark'),
  label: [...document.querySelectorAll('header button')]
    .find((b) => /mode/i.test(b.getAttribute('aria-label') || ''))
    ?.getAttribute('aria-label'),
  page: getComputedStyle(document.body).getPropertyValue('--page').trim(),
}))
const themeBefore = await themeState()
ok('the toggle offers the theme you are not in',
   themeBefore.dark ? themeBefore.label === 'Light mode' : themeBefore.label === 'Dark mode',
   `${themeBefore.dark ? 'dark' : 'light'} / "${themeBefore.label}"`)
await page.evaluate(() => [...document.querySelectorAll('header button')]
  .find((b) => /mode/i.test(b.getAttribute('aria-label') || '')).click())
await page.waitForTimeout(800)
const themeAfter = await themeState()
ok('the toggle actually switches the theme', themeAfter.dark !== themeBefore.dark)
ok('the palette follows the theme', themeAfter.page !== themeBefore.page,
   `${themeBefore.page} -> ${themeAfter.page}`)
// and the sections that should follow it, do
const stuck = await page.evaluate((wantDark) => {
  const lum = (c) => {
    const [r, g, b] = (c.match(/[\d.]+/g) || []).slice(0, 3).map(Number)
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  }
  // sections painted from the palette, as opposed to the navy ones by design
  return ['#notices', '#gallery', '#contact', '#members']
    .map((id) => document.querySelector(id))
    .filter(Boolean)
    .filter((el) => (lum(getComputedStyle(el).backgroundColor) < 0.35) !== wantDark)
    .map((el) => el.id)
}, themeAfter.dark)
ok('every palette section follows the theme', stuck.length === 0, stuck.join(', ') || 'all follow')
// the stylesheet itself must be served — a stale server is what makes the page
// look as though the theme broke
const cssHref = await page.evaluate(() =>
  [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.getAttribute('href')).find((h) => h?.includes('/_next/')))
ok('the stylesheet the page asks for is served',
   cssHref ? (await page.request.get('http://localhost:3000' + cssHref)).ok() : false, String(cssHref))

// the footer columns should end at roughly the same depth, not one long ribbon
await page.setViewportSize({ width: 1400, height: 950 })
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2000)
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(900)
const footerCols = await page.$$eval('footer > div > div:first-child > *', (els) =>
  els.map((el) => Math.round(el.getBoundingClientRect().height)),
)
const tallest = Math.max(...footerCols)
const shortest = Math.min(...footerCols)
ok('footer columns are balanced', tallest - shortest < 120,
   `heights ${footerCols.join(', ')}`)
ok('the footer address does not break mid-word', await page.evaluate(() => {
  const mail = [...document.querySelectorAll('footer a')].find((a) => a.href.startsWith('mailto:'))
  return !!mail && !/break-all/.test(mail.className)
}))

// the everyday sections sit on the banner, not behind the menu
ok('a visitor never sees the admin strip',
   (await page.locator('text=Signed in as parish staff').count()) === 0)
ok('a visitor never sees an edit button',
   (await page.locator('button:has-text("Edit ")').count()) === 0)

await page.setViewportSize({ width: 1440, height: 950 })
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2200)
const barText = (await page.locator('header ul').first().innerText()).toLowerCase()
for (const label of ['home', 'mass timings', 'weekly events', 'ministries', 'notices', 'contact', 'hall']) {
  ok(`banner carries ${label}`, barText.includes(label))
}
ok('the banner never runs off the screen', await page.evaluate(() => {
  const cw = document.documentElement.clientWidth
  return ![...document.querySelectorAll('header *')].some((el) => {
    const r = el.getBoundingClientRect()
    return r.width > 0 && (r.right > cw + 1 || r.left < -1)
  })
}))

// the hall and the staff login must be reachable from the homepage itself
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2200)
ok('homepage carries a hall card', (await page.locator('#hall a[href="/hall"]').count()) > 0)
ok('the hall card links straight to booking', (await page.locator('#hall a[href="/hall#book"]').count()) > 0)
await page.locator('header button[aria-expanded]').click()
await page.waitForTimeout(900)
const drawer = await page.locator('[role=dialog]').innerText()
ok('the menu opens at desktop width too', /hall/i.test(drawer))
ok('the drawer offers the staff login',
   (await page.locator('[role=dialog] a[href^="/admin"]').count()) > 0)
await page.keyboard.press('Escape')
await page.waitForTimeout(600)

// -------------------------------------------------------------------- search
const found = await (await page.request.get('http://localhost:3000/api/search?q=thresiamma')).json()
ok('search finds a person by name', (found.results ?? []).some((r) => r.kind === 'Obituary'))
ok('search answers in both languages separately',
   (found.results ?? []).every((r) => typeof r.title?.en === 'string' && typeof r.title?.ml === 'string'))
const mlHits = await (await page.request.get(`http://localhost:3000/api/search?q=${encodeURIComponent('കുർബാന')}`)).json()
ok('a Malayalam word finds an English entry', (mlHits.results ?? []).length > 0,
   `${(mlHits.results ?? []).length} hits`)
ok('one letter is not a search',
   ((await (await page.request.get('http://localhost:3000/api/search?q=a')).json()).results ?? []).length === 0)
const hallHits = await (await page.request.get('http://localhost:3000/api/search?q=generator')).json()
ok('search reaches the hall pages',
   (hallHits.results ?? []).some((r) => String(r.href).startsWith('/hall')))

// the box itself
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2200)
await page.click('header button[aria-label="Search this site"]')
await page.waitForTimeout(700)
ok('the search box opens from the header', (await page.locator('[role=dialog] input').count()) === 1)
await page.fill('[role=dialog] input', 'catechism')
await page.waitForTimeout(1400)
ok('typing brings answers', (await page.locator('[role=dialog] a').count()) > 0,
   `${await page.locator('[role=dialog] a').count()} results`)
await page.keyboard.press('Escape')
await page.waitForTimeout(700)
ok('the search box closes on Escape', (await page.locator('[role=dialog]').count()) === 0)

// ------------------------------------------------------------------ calendar
const ics = await page.request.get('http://localhost:3000/calendar.ics')
const icsBody = await ics.text()
ok('the calendar feed is served', ics.ok() &&
   (ics.headers()['content-type'] ?? '').includes('text/calendar'))
ok('the calendar names the parish', icsBody.includes('X-WR-CALNAME:St. Thomas Church'))
ok('the calendar carries the Sunday masses', icsBody.includes('BYDAY=SU'))
ok('the calendar carries the parish week', /RRULE:FREQ=WEEKLY/.test(icsBody))
ok('every event is closed properly',
   (icsBody.match(/BEGIN:VEVENT/g) ?? []).length === (icsBody.match(/END:VEVENT/g) ?? []).length &&
   (icsBody.match(/BEGIN:VEVENT/g) ?? []).length > 8,
   `${(icsBody.match(/BEGIN:VEVENT/g) ?? []).length} events`)
ok('"By appointment" is not written in as a time', !icsBody.includes('DTSTART:NaN'))

// --------------------------------------------------------------- one memorial
await page.goto('http://localhost:3000/obituary', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2000)
await page.locator('main button.card').first().click()
await page.waitForTimeout(1000)
const memorialLink = await page.locator('[role=dialog] a[href^="/obituary/"]').first().getAttribute('href')
ok('a memorial can be opened on its own', !!memorialLink, memorialLink ?? '')
await page.goto(`http://localhost:3000${memorialLink}`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1600)
const memorial = await page.locator('main').innerText()
ok('the memorial page names the person', (await page.locator('main h1').count()) === 1)
ok('the memorial page offers to share itself', /share this memorial/i.test(memorial))
ok('the memorial page carries the parish prayer', memorial.length > 200)
ok('a memorial that does not exist is a proper 404',
   (await page.request.get('http://localhost:3000/obituary/nobody-here-xx99')).status() === 404)

// ---------------------------------------------------------------- parish hall
await page.goto('http://localhost:3000/hall', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)
ok('hall page opens', (await page.locator('h1, h2').first().count()) > 0)
const hallText = await page.locator('main').innerText()
for (const room of ['Small Hall', 'Medium Hall', 'Large Hall']) {
  ok(`hall page describes the ${room}`, hallText.includes(room))
}
ok('the two large halls can be taken together', /together/i.test(hallText))

// the venue page proper: hero, figures, the day, what is included, questions
ok('the hall page leads with one heading of its own',
   (await page.locator('main h1').count()) === 1)
ok('the hero carries the strip of facilities',
   /air conditioning/i.test(await page.locator('#top').innerText()))
ok('the hero offers the office number',
   (await page.locator('#top a[href^="tel:"]').count()) > 0)
// the header itself becomes the hall's navigation
const headerNav = await page.locator('header nav[aria-label="Primary"] + ul').innerText()
ok('the header keeps the way home', /home/i.test(headerNav))
for (const label of ['The halls', 'The day', 'What is included', 'Availability', 'Reviews', 'Good to know'])
  ok(`the header lists ${label.toLowerCase()}`, headerNav.toLowerCase().includes(label.toLowerCase()))
for (const gone of ['Mass timings', 'Ministries', 'Obituary', 'Committee'])
  ok(`the header drops ${gone.toLowerCase()} on the hall page`,
     !headerNav.toLowerCase().includes(gone.toLowerCase()))

// the parish is still reachable, one tap away in the menu
await page.locator('header button[aria-label]').last().click()
await page.waitForTimeout(900)
const hallDrawer = await page.locator('[role=dialog]').innerText()
ok('the hall menu still opens the rest of the parish',
   /rest of the parish site/i.test(hallDrawer) &&
   /mass timings/i.test(hallDrawer) && /ministries/i.test(hallDrawer))
ok('the hall menu does not offer home twice',
   (hallDrawer.match(/^home$/gim) ?? []).length === 1)
await page.keyboard.press('Escape')
await page.locator('[role=dialog] button[aria-label]').first().click()
await page.waitForTimeout(800)
for (const id of ['venue', 'halls', 'day', 'facilities', 'book', 'reviews', 'faq'])
  ok(`the section bar can reach #${id}`, (await page.locator(`#${id}`).count()) === 1)
ok('four figures sit under the hero',
   /halls beside the church/i.test(hallText) && /cars in the compound/i.test(hallText))
ok('the day is told in order', (await page.locator('#day article').count()) >= 5,
   `${await page.locator('#day article').count()} steps`)
const facilities = await page.locator('#facilities').innerText()
ok('what comes in the rent is listed', /no extra charge/i.test(facilities))
ok('what is charged is listed beside it', /arranged on request/i.test(facilities))

// the questions open and close
const firstQuestion = page.locator('#faq button[aria-expanded]').first()
ok('the first question starts open', (await firstQuestion.getAttribute('aria-expanded')) === 'true')
await firstQuestion.click()
await page.waitForTimeout(600)
ok('a question closes when tapped', (await firstQuestion.getAttribute('aria-expanded')) === 'false')
await page.locator('#faq button[aria-expanded]').nth(3).click()
await page.waitForTimeout(600)
ok('another question opens in its place',
   /not permitted anywhere in the church compound/i.test(await page.locator('#faq').innerText()))
ok('the house rules stand beside the questions',
   /house rules/i.test(await page.locator('#faq').innerText()))
ok('the page closes by asking for the date',
   /let us find your date/i.test(await page.locator('main').innerText()))

ok('each hall has its own gallery', (await page.locator('#halls article button img').count()) >= 12,
   `${await page.locator('#halls article button img').count()} thumbnails`)

// the gallery opens and closes
await page.locator('#halls article button').first().click()
await page.waitForTimeout(900)
ok('a hall gallery opens full screen', (await page.locator('[role=dialog]').count()) === 1)
await page.keyboard.press('Escape')
await page.waitForTimeout(700)
ok('the gallery closes on Escape', (await page.locator('[role=dialog]').count()) === 0)

// picking a hall changes what can be asked for: the small hall has no AC
await page.locator('button:has-text("Small Hall")').last().click()
await page.waitForTimeout(700)
const smallExtras = await page.locator('#book fieldset label').allInnerTexts()
ok('the small hall offers no air conditioning to tick',
   !smallExtras.some((label) => /air conditioning/i.test(label)), `${smallExtras.length} extras`)
ok('the small hall says why', /no air conditioning and no stage/i.test(await page.locator('#book').innerText()))
await page.locator('button:has-text("Large Hall")').last().click()
await page.waitForTimeout(700)
const largeExtras = await page.locator('#book fieldset label').allInnerTexts()
ok('the large hall does offer air conditioning',
   largeExtras.some((label) => /air conditioning/i.test(label)), `${largeExtras.length} extras`)

// one month at a time, not twelve grids down the page
ok('the calendar shows a single month', (await page.locator('#book #hall-month').count()) === 1)
const monthChoices = await page.locator('#book #hall-month option').count()
ok('the whole booking window is still reachable', monthChoices >= 12, `${monthChoices} months`)
ok('hall calendar marks days that cannot be taken',
   (await page.locator('#book button[disabled]').count()) > 0)
ok('every square says in words what the day holds',
   (await page.locator('#book button[aria-label*="free all day"]').count()) > 0)

// one tap on a day and all three halls are spelled out
await page.locator('#book button[aria-label*="free all day"]').first().click()
await page.waitForTimeout(600)
const dayPanel = await page.locator('#day-panel').innerText()
for (const room of ['Small Hall', 'Medium Hall', 'Large Hall'])
  ok(`the day panel names the ${room}`, dayPanel.includes(room))
ok('the day panel gives the hours behind each session',
   dayPanel.includes('7:00 AM') && dayPanel.includes('3:00 PM'))
ok('the day panel separates the whole day from the halves',
   /morning/i.test(dayPanel) && /evening/i.test(dayPanel) && /full day/i.test(dayPanel))

// two halls, one evening: the rooms are independent, the combined room is not
const hallDate = await page.evaluate(() => {
  const day = new Date()
  day.setDate(day.getDate() + 45)
  return day.toISOString().slice(0, 10)
})
const bookLarge = await page.request.post('http://localhost:3000/api/hall/book', {
  headers: fromRunAddress,
  data: {
    hall: 'large', date: hallDate, session: 'full-day', name: 'E2E Family', phone: '+91 90000 00000',
    email: 'e2e@example.com', purpose: 'Test booking', guests: 120,
    amenities: ['ac', 'generator'], message: 'Sent by the e2e suite.',
  },
})
ok('a hall booking request is accepted', bookLarge.ok(), `status=${bookLarge.status()}`)

const avail = await (await page.request.get('http://localhost:3000/api/hall/availability')).json()
ok('the booked room shows as held on the public calendar',
   avail.calendar?.large?.[hallDate]?.['full-day'] === 'pending')
ok('the other halls stay free that day', !avail.calendar?.small?.[hallDate])

const bookMedium = await page.request.post('http://localhost:3000/api/hall/book', {
  headers: fromRunAddress,
  data: { hall: 'medium', date: hallDate, session: 'evening', name: 'Second', phone: '2', email: 'two@example.com' },
})
ok('a different hall the same day is allowed', bookMedium.ok(), `status=${bookMedium.status()}`)

const bookBoth = await page.request.post('http://localhost:3000/api/hall/book', {
  headers: fromRunAddress,
  data: { hall: 'medium-large', date: hallDate, session: 'morning', name: 'Third', phone: '3', email: 'three@example.com' },
})
ok('taking both halls is refused once one is taken', bookBoth.status() === 409)

// what the three complaints were about: which hall, and for how long.
// Note the URL carries no #book: a hash-only change is a same-document
// navigation, so the page would keep the availability it fetched before these
// bookings existed and every square would still read free.
await page.goto('http://localhost:3000/hall', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2000)
const bookedMonth = new Date(`${hallDate}T00:00:00`).toLocaleDateString('en-IN', {
  month: 'long',
  year: 'numeric',
})
await page.selectOption('#hall-month', { label: bookedMonth })
const bookedDay = Number(hallDate.slice(8))

await page.locator('#book-large').click()
await page.waitForTimeout(500)
const largeSquare = await page
  .locator(`#book button[aria-label^="${bookedDay} "]`)
  .first()
  .getAttribute('aria-label')
ok('a whole-day booking reads as the whole day', /all day/i.test(largeSquare ?? ''), largeSquare)

await page.locator('#book-medium').click()
await page.waitForTimeout(500)
const mediumSquare = await page
  .locator(`#book button[aria-label^="${bookedDay} "]`)
  .first()
  .getAttribute('aria-label')
ok('a half-day booking names the session it took',
   /morning free/i.test(mediumSquare ?? '') && /evening held/i.test(mediumSquare ?? ''), mediumSquare)

await page.locator(`#book button[aria-label^="${bookedDay} "]`).first().click()
await page.waitForTimeout(600)
const largeText = await page.locator('#day-panel [data-hall="large"]').innerText()
ok('the day panel shows the large hall gone for every session',
   (largeText.match(/held/gi) ?? []).length === 3)
const mediumText = await page.locator('#day-panel [data-hall="medium"]').innerText()
ok('the day panel shows the medium hall free in the morning',
   /morning[\s\S]*?free/i.test(mediumText) && /evening[\s\S]*?held/i.test(mediumText))
const smallText = await page.locator('#day-panel [data-hall="small"]').innerText()
ok('the day panel shows the small hall untouched that day',
   (smallText.match(/free/gi) ?? []).length === 3)

ok('availability never leaks who booked',
   !JSON.stringify(avail).includes('e2e@example.com') && !JSON.stringify(avail).includes('E2E Family'))
ok('hall bookings are not readable when signed out',
   (await page.request.get('http://localhost:3000/api/admin/hall')).status() === 401)

// ------------------------------------------------------------- parish office
await page.goto('http://localhost:3000/office', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)
const officeText = await page.locator('main').innerText()
ok('the office page opens', (await page.locator('main h1').count()) === 1)
for (const part of ['Holy Mass', 'certificate', 'prayer']) {
  ok(`the office page offers a ${part.toLowerCase()}`, officeText.toLowerCase().includes(part.toLowerCase()))
}
for (const id of ['intentions', 'certificates', 'prayers']) {
  ok(`the office page has a #${id} section`, (await page.locator(`#${id}`).count()) === 1)
}

const officeAddress = { 'x-forwarded-for': `10.51.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` }
const massDay = await page.evaluate(() => {
  const day = new Date()
  day.setDate(day.getDate() + 30)
  return day.toISOString().slice(0, 10)
})

const askedMass = await page.request.post('http://localhost:3000/api/office', {
  headers: officeAddress,
  data: {
    kind: 'intentions', type: 'departed', date: massDay,
    subject: 'Thresiamma Devassy', name: 'E2E Family',
    phone: '+91 90000 33333', email: 'mass@example.com',
  },
})
const massJson = await askedMass.json()
ok('a Mass can be asked for', askedMass.ok(), `status=${askedMass.status()}`)
ok('the request comes back with a reference', typeof massJson.id === 'string' && massJson.id.length > 3)

ok('a second Mass on the same day is refused',
   (await page.request.post('http://localhost:3000/api/office', {
     headers: officeAddress,
     data: { kind: 'intentions', type: 'departed', date: massDay, subject: 'Somebody else', name: 'Second', phone: '2' },
   })).status() === 409)
ok('a Mass tomorrow is refused for want of notice',
   (await page.request.post('http://localhost:3000/api/office', {
     headers: officeAddress,
     data: { kind: 'intentions', type: 'departed', date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), subject: 'Too soon', name: 'X', phone: '1' },
   })).status() === 422)
const takenDays = await (await page.request.get('http://localhost:3000/api/office')).json()
ok('the day now shows as taken', (takenDays.taken ?? []).includes(massDay))
ok('the taken days say nothing about who asked',
   !JSON.stringify(takenDays).includes('E2E Family'))

const askedCert = await page.request.post('http://localhost:3000/api/office', {
  headers: officeAddress,
  data: {
    kind: 'certificates', type: 'baptism', subject: 'Jose Kunnel',
    detail: 'Baptised around 1974', name: 'E2E Family', email: 'cert@example.com',
  },
})
ok('a certificate can be asked for', askedCert.ok(), `status=${askedCert.status()}`)
ok('an unknown certificate is refused',
   (await page.request.post('http://localhost:3000/api/office', {
     headers: officeAddress,
     data: { kind: 'certificates', type: 'passport', subject: 'X', name: 'Y', phone: '1' },
   })).status() === 422)

const secondAddress = { 'x-forwarded-for': `10.52.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` }
const askedPrayer = await page.request.post('http://localhost:3000/api/office', {
  headers: secondAddress,
  data: { kind: 'prayers', detail: 'For my mother, who is in hospital.', name: 'E2E Family', mayPublish: false },
})
ok('a prayer can be asked for', askedPrayer.ok(), `status=${askedPrayer.status()}`)
ok('a prayer needs no telephone number', askedPrayer.ok(),
   'somebody asking for prayer should not have to leave one')
ok('a certificate with no way to reply is refused',
   (await page.request.post('http://localhost:3000/api/office', {
     headers: secondAddress,
     data: { kind: 'certificates', type: 'baptism', subject: 'X', name: 'Nameless' },
   })).status() === 422)
ok('the office form has the same hidden field',
   (await page.request.post('http://localhost:3000/api/office', {
     headers: secondAddress,
     data: { kind: 'prayers', detail: 'spam', name: 'Robot', website: 'http://spam.example' },
   })).ok())
ok('office requests are not readable when signed out',
   (await page.request.get('http://localhost:3000/api/admin/office')).status() === 401)

// back to the hall, which the checks below are about
await page.goto('http://localhost:3000/hall', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2000)

// reviews — written by anyone, published by the parish
ok('the hall page invites a review',
   (await page.locator('#reviews button:has-text("Write a review")').count()) === 1)
const sentReview = await page.request.post('http://localhost:3000/api/hall/reviews', {
  headers: fromRunAddress,
  data: {
    hall: 'large', rating: 5, name: 'E2E Reviewer', occasion: 'Test event',
    message: 'The suite wrote this review to check the moderation queue.',
  },
})
ok('a review can be sent', sentReview.ok(), `status=${sentReview.status()}`)
const reviewId = sentReview.ok() ? (await sentReview.json()).id : ''
const beforePublish = await (await page.request.get('http://localhost:3000/api/hall/reviews')).json()
ok('an unpublished review is not shown to visitors',
   !JSON.stringify(beforePublish).includes('E2E Reviewer'))
ok('a rating outside one to five is refused',
   (await page.request.post('http://localhost:3000/api/hall/reviews', {
     headers: fromRunAddress,
     data: { hall: 'large', rating: 9, name: 'X', message: 'Nine stars for this hall.' },
   })).status() === 422)
ok('a review for a hall that does not exist is refused',
   (await page.request.post('http://localhost:3000/api/hall/reviews', {
     headers: fromRunAddress,
     data: { hall: 'ballroom', rating: 5, name: 'X', message: 'A hall that is not ours.' },
   })).status() === 422)
ok('reviews are not moderatable when signed out',
   (await page.request.get('http://localhost:3000/api/admin/hall-reviews')).status() === 401)

// ---- admin round trip
await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' })
ok('admin shows login when signed out', (await page.locator('#admin-password').count()) === 1 && (await page.locator('#admin-username').count()) === 1)
// Upper case on purpose: the user ID is case-insensitive.
await page.fill('#admin-username', ADMIN_USER.toUpperCase())
await page.fill('#admin-password', ADMIN_PASS)
await page.click('button[type=submit]')
await page.waitForTimeout(3500)
// Signing in now returns staff to the site in administrative mode, not to the
// dashboard, so that is what the redirect should show.
ok('signing in returns to the site in admin mode',
   new URL(page.url()).pathname === '/' &&
   (await page.evaluate(() => document.body.dataset.admin)) === 'true',
   page.url())

await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2600)
ok('the dashboard is still there for bulk work',
   (await page.locator('text=Parish Dashboard').count()) > 0 &&
   (await page.locator('#admin-password').count()) === 0)

await page.click('button:has-text("Inbox, Gifts & Subscribers")')
await page.waitForTimeout(1600)
ok('dashboard shows the donations panel', (await page.locator('text=Donations (').count()) > 0)

await page.click('button:has-text("Parish Statistics")')
await page.waitForTimeout(1500)
await page.locator('button[aria-expanded]').first().click()
await page.waitForTimeout(900)
const numberInput = page.locator('input[type=number]').first()
const original = await numberInput.inputValue()
await numberInput.fill('999')
await page.click('button:has-text("Save changes")')
await page.waitForTimeout(2000)
const verify = await page.request.get('http://localhost:3000/api/admin/content/stats')
const json = await verify.json()
ok('admin save persists to content/stats.json', json.data.items[0].value === 999, `value=${json.data.items[0].value}`)

// restore
await numberInput.fill(original)
await page.click('button:has-text("Save changes")')
await page.waitForTimeout(1800)
const restored = await (await page.request.get('http://localhost:3000/api/admin/content/stats')).json()
ok('admin restores original value', String(restored.data.items[0].value) === original)

// the office decides on the request the suite just sent
const hallList = await (await page.request.get('http://localhost:3000/api/admin/hall')).json()
ok('the dashboard lists hall requests', Array.isArray(hallList.bookings) && hallList.bookings.length > 0)
const mine = hallList.bookings.find((entry) => entry.email === 'e2e@example.com')
ok('the request carries the hall and the amenities that were ticked',
   !!mine && mine.hall === 'large' && mine.amenities.includes('ac') && mine.amenities.includes('generator'))
const confirmed = await page.request.patch('http://localhost:3000/api/admin/hall', {
  data: { id: mine?.id, status: 'confirmed' },
})
ok('a request can be confirmed', confirmed.ok())
const afterConfirm = await (await page.request.get('http://localhost:3000/api/hall/availability')).json()
ok('confirming blocks that room publicly', afterConfirm.calendar?.large?.[mine?.date]?.['full-day'] === 'confirmed')
const declined = await page.request.patch('http://localhost:3000/api/admin/hall', {
  data: { id: mine?.id, status: 'declined' },
})
ok('declining frees the room again', declined.ok() &&
   !(await (await page.request.get('http://localhost:3000/api/hall/availability')).json())
     .calendar?.large?.[mine?.date])

// the office publishes the review the suite wrote, then removes it again
const published = await page.request.patch('http://localhost:3000/api/admin/hall-reviews', {
  data: { id: reviewId, status: 'published' },
})
// leave the diary clean, or the next run finds its own date already taken
const leftovers = (await (await page.request.get('http://localhost:3000/api/admin/hall')).json())
  .bookings.filter((entry) => /E2E|Second|Third/.test(entry.name ?? ''))
for (const entry of leftovers) {
  await page.request.delete('http://localhost:3000/api/admin/hall', { data: { id: entry.id } })
}
ok('the suite clears the bookings it made',
   !(await (await page.request.get('http://localhost:3000/api/admin/hall')).json())
     .bookings.some((entry) => /E2E|Second|Third/.test(entry.name ?? '')))

ok('a review can be published', published.ok())
const afterPublish = await (await page.request.get('http://localhost:3000/api/hall/reviews')).json()
ok('a published review reaches the hall page',
   JSON.stringify(afterPublish).includes('E2E Reviewer'))
const removed = await page.request.delete('http://localhost:3000/api/admin/hall-reviews', {
  data: { id: reviewId },
})
ok('a review can be deleted', removed.ok())
ok('the deleted review is gone from the page',
   !JSON.stringify(await (await page.request.get('http://localhost:3000/api/hall/reviews')).json())
     .includes('E2E Reviewer'))

// admin mode — the site itself becomes the editor once staff are signed in
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2200)
ok('the site shows an admin strip to signed-in staff',
   (await page.evaluate(() => document.body.dataset.admin)) === 'true')
// signing in leaves editing switched on, and the strip can turn it off again
const editButtons = await page.locator('button').filter({ hasText: /^Edit / }).count()
ok('every section carries an edit button', editButtons >= 15, `${editButtons} buttons`)
await page.click('button:has-text("Done editing")')
await page.waitForTimeout(800)
ok('turning editing off clears the buttons',
   (await page.locator('button:has-text("Edit Notice Board")').count()) === 0)
await page.click('button:has-text("Edit this page")')
await page.waitForTimeout(800)
ok('turning it back on restores them',
   (await page.locator('button:has-text("Edit Notice Board")').count()) === 1)
await page.click('button:has-text("Edit Notice Board")')
await page.waitForTimeout(1800)
ok('a section opens for editing in place', (await page.locator('[role=dialog]').count()) === 1)
ok('the editor names the file it writes',
   /content\/notices\.json/.test(await page.locator('[role=dialog]').innerText()))
await page.click('[role=dialog] button:has-text("Close")')
await page.waitForTimeout(700)

// the hall diary: a booking taken at the counter, written straight into the calendar
await page.goto('http://localhost:3000/hall', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)
ok('staff are told they can manage the calendar',
   /open a day, then tap the hall/i.test(await page.locator('#book').innerText()))
const freeDay = page.locator('#book button[aria-label*="free all day"]:not([disabled])').first()
const offlineDate = (await freeDay.getAttribute('data-date')) ?? ''
await freeDay.click()
await page.waitForTimeout(1000)
ok('staff open the same day panel a visitor sees', (await page.locator('#day-panel').count()) === 1)
await page.locator('#day-panel [data-hall="small"] button').first().click()
await page.waitForTimeout(1400)
ok('tapping a slot opens the parish office diary',
   /hall diary/i.test(await page.locator('[role=dialog]').innerText()))
await page.fill('input[placeholder="Family or group"]', 'E2E walk-in')
await page.click('button:has-text("Book this slot")')
await page.waitForTimeout(2000)
ok('an offline booking is written in and confirmed',
   /E2E walk-in/.test(await page.locator('[role=dialog]').innerText()) &&
   /confirmed/i.test(await page.locator('[role=dialog]').innerText()))
const afterOffline = await (await page.request.get('http://localhost:3000/api/hall/availability')).json()
ok('the offline booking closes that session publicly',
   !!afterOffline.calendar?.small?.[offlineDate], `date ${offlineDate}`)
await page.click('button:has-text("Free this slot")')
await page.waitForTimeout(1800)
const afterFree = await (await page.request.get('http://localhost:3000/api/hall/availability')).json()
ok('freeing the slot opens the day again', !afterFree.calendar?.small?.[offlineDate])
await page.keyboard.press('Escape')
await page.waitForTimeout(600)

// back to the dashboard for the rest of the admin checks
await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2600)

// dashboard ergonomics — the parish should not be typing raw ids or ISO dates
await page.click('button:has-text("Notice Board")')
await page.waitForTimeout(1500)
await page.locator('button[aria-expanded]', { hasText: 'Assumption Feast' }).first().click()
await page.waitForTimeout(900)
ok('notice date uses a calendar picker', (await page.locator('input[type=date]').count()) > 0)
ok('notice category is a dropdown of declared categories',
   (await page.locator('select').count()) > 0 && (await page.locator('select').first().inputValue()) === 'feast')
ok('an array says how many entries it holds', /\d+ entr(y|ies)/.test(await page.locator('main').innerText()))
await page.evaluate(() => window.scrollTo(0, 1800))
await page.waitForTimeout(600)
const saveBox = await page.locator('button:has-text("Save"), button:has-text("Saved")').first().boundingBox()
ok('the save bar follows you down the form', !!saveBox && saveBox.y > 0 && saveBox.y < 600,
   `y=${saveBox && Math.round(saveBox.y)}`)
await page.evaluate(() => window.scrollTo(0, 0))
await page.fill('input[placeholder="Find a section…"]', 'obit')
await page.waitForTimeout(500)
ok('sidebar search narrows the section list', (await page.locator('aside nav button').count()) < 4)
await page.fill('input[placeholder="Find a section…"]', '')
await page.waitForTimeout(400)

// concurrency guard — a save built on a stale copy must be refused
const cur = await (await page.request.get('http://localhost:3000/api/admin/content/stats')).json()
ok('content GET returns a version', typeof cur.version === 'string' && cur.version.length > 0)
const staleSave = await page.request.put('http://localhost:3000/api/admin/content/stats', {
  data: { data: cur.data, version: 'stale-version-string' },
})
ok('stale save rejected with 409', staleSave.status() === 409)
const freshSave = await page.request.put('http://localhost:3000/api/admin/content/stats', {
  data: { data: cur.data, version: cur.version },
})
ok('save with current version accepted', freshSave.ok())

// machine translation for the bilingual fields
const tr = await page.request.post('http://localhost:3000/api/admin/translate', {
  data: { text: 'Holy Mass', from: 'en', to: 'ml' },
})
const trJson = tr.ok() ? await tr.json() : { text: '' }
ok('translate en -> ml returns Malayalam', tr.ok() && /[ഀ-ൿ]/.test(trJson.text || ''), trJson.text)
const trBack = await page.request.post('http://localhost:3000/api/admin/translate', {
  data: { text: 'ഇടവക വികാരി', from: 'ml', to: 'en' },
})
const trBackJson = trBack.ok() ? await trBack.json() : { text: '' }
ok('translate ml -> en returns English', trBack.ok() && /[A-Za-z]/.test(trBackJson.text || ''), trBackJson.text)

// editing one language rewrites the other in place, not only when it is blank
await page.click('button:has-text("Homepage & Banners")')
await page.waitForTimeout(1500)
const enBox = page.locator('label:has(span:text-is("English"))').first().locator('input.field, textarea.field').first()
const mlBox = page.locator('label:has(span:text-is("മലയാളം"))').first().locator('input.field, textarea.field').first()
const mlBefore = await mlBox.inputValue()
ok('bilingual field starts with both languages filled', mlBefore.trim().length > 0)
await enBox.fill('The parish office will stay open on Saturday evening')
await page.keyboard.press('Tab')
await page.waitForFunction(
  (old) => {
    const label = [...document.querySelectorAll('label')].find((l) => l.textContent.includes('മലയാളം'))
    const field = label && label.querySelector('input.field, textarea.field')
    return field && field.value !== old
  },
  mlBefore,
  { timeout: 25000 },
).catch(() => {})
const mlAfter = await mlBox.inputValue()
ok('editing English rewrites the filled Malayalam', mlAfter !== mlBefore && /[ഀ-ൿ]/.test(mlAfter), mlAfter)
const enBefore = await enBox.inputValue()
await mlBox.fill('ഇടവക ഓഫീസ് ഞായറാഴ്ച അടച്ചിരിക്കും')
await page.keyboard.press('Tab')
await page.waitForFunction(
  (old) => {
    const label = [...document.querySelectorAll('label')].find((l) => l.textContent.includes('English'))
    const field = label && label.querySelector('input.field, textarea.field')
    return field && field.value !== old
  },
  enBefore,
  { timeout: 25000 },
).catch(() => {})
ok('editing Malayalam rewrites the filled English', (await enBox.inputValue()) !== enBefore, await enBox.inputValue())
// the toggle stops it, and nothing here is saved
const autoToggle = page.locator('button[aria-pressed]').first()
await autoToggle.click()
const heldMl = await mlBox.inputValue()
await enBox.fill('Nothing should be translated now')
await page.keyboard.press('Tab')
await page.waitForTimeout(4000)
ok('auto translate off leaves the other language alone', (await mlBox.inputValue()) === heldMl)
await autoToggle.click()
await page.click('button:has-text("Revert")')
await page.waitForTimeout(1500)

// ------------------------------------------------------------- operations
// Everything under "Running the site": accounts, history, backups, figures,
// faults and health.

// --- the activity log has been recording the whole run
const auditRes = await page.request.get('http://localhost:3000/api/admin/audit?limit=500')
const auditJson = await auditRes.json()
const entries = auditJson.entries ?? []
ok('the activity log is readable when signed in', auditRes.ok() && Array.isArray(entries))
ok('signing in is recorded', entries.some((e) => e.action === 'sign-in'))
ok('a refused sign-in is recorded', entries.some((e) => e.action === 'sign-in-refused'))
ok('a content save is recorded against a person',
   entries.some((e) => e.action === 'content-save' && e.target === 'stats' && e.actor))
ok('confirming a hall booking is recorded', entries.some((e) => e.action === 'hall-decide'))
ok('publishing a review is recorded', entries.some((e) => e.action === 'review-decide'))
ok('every entry carries the time it happened', entries.every((e) => typeof e.at === 'string'))

// --- backups can be read and put back
const backupIndex = await (await page.request.get('http://localhost:3000/api/admin/backups')).json()
ok('every section reports its saved copies',
   Array.isArray(backupIndex.sections) && backupIndex.sections.length > 10)
const statsBackups = await (await page.request.get('http://localhost:3000/api/admin/backups?key=stats')).json()
ok('the section just edited has saved copies', (statsBackups.backups ?? []).length > 0,
   `${(statsBackups.backups ?? []).length} copies`)
const copyName = statsBackups.backups?.[0]?.name
const oneCopy = await page.request.get(
  `http://localhost:3000/api/admin/backups?file=${encodeURIComponent(copyName ?? '')}`,
)
ok('a saved copy can be read back', oneCopy.ok() && (await oneCopy.json()).key === 'stats')
ok('a made-up backup name is refused',
   (await page.request.get('http://localhost:3000/api/admin/backups?file=../../.env.local')).status() === 404)
const putBack = await page.request.post('http://localhost:3000/api/admin/backups', {
  data: { file: copyName },
})
ok('a saved copy can be put back', putBack.ok(), `status=${putBack.status()}`)
ok('putting a copy back is itself recorded',
   ((await (await page.request.get('http://localhost:3000/api/admin/audit?action=content-restore')).json())
     .entries ?? []).length > 0)

// --- health
const health = await (await page.request.get('http://localhost:3000/api/admin/health')).json()
ok('health reports the content folder is writable', health.writable === true)
ok('health lists no missing content files', (health.missing ?? []).length === 0,
   (health.missing ?? []).join(', '))
ok('health counts what is stored', typeof health.counts?.audit === 'number')
ok('health warns that no mail server is set up',
   (health.warnings ?? []).some((w) => /mail server/i.test(w)))
// The demo warnings are right only while the demo settings are in use. Once a
// parish sets its own password and secret there is nothing to warn about, and
// warning anyway would teach them to ignore the panel that matters.
const demoSettings =
  ADMIN_PASS === 'mangalassery1893' || fromEnvFile('ADMIN_SESSION_SECRET', '').length < 32
ok('health warns about the demo settings exactly while they are in use',
   (health.warnings ?? []).some((w) => /demo password|SESSION_SECRET/i.test(w)) === demoSettings,
   demoSettings ? 'demo settings still in use' : 'own password and secret are set')

// --- visits, counted by the site itself
for (const path of ['/', '/', '/hall']) {
  await page.request.post('http://localhost:3000/api/metrics', {
    headers: fromRunAddress,
    data: { path, referrer: 'https://www.google.com/search', first: path === '/hall' },
  })
}
await page.request.post('http://localhost:3000/api/metrics', {
  headers: fromRunAddress,
  data: { path: '/admin', referrer: '' },
})
await page.waitForTimeout(500)
const visits = await (await page.request.get('http://localhost:3000/api/admin/metrics?days=7')).json()
ok('page views are counted', visits.views >= 3, `${visits.views} views`)
ok('the pages read are listed', (visits.paths ?? []).some((p) => p.name === '/'))
ok('the dashboard is never counted', !(visits.paths ?? []).some((p) => p.name === '/admin'))
ok('where readers came from is kept as a host only',
   (visits.referrers ?? []).some((r) => r.name === 'google.com'))
ok('a column exists for every day asked for', (visits.days ?? []).length === 7)

// --- faults
await page.request.post('http://localhost:3000/api/report', {
  headers: fromRunAddress,
  data: { message: 'E2E synthetic fault', where: '/e2e', detail: 'raised by the test suite' },
})
await page.request.post('http://localhost:3000/api/report', {
  headers: fromRunAddress,
  data: { message: 'E2E synthetic fault', where: '/e2e' },
})
await page.waitForTimeout(400)
const problems = await (await page.request.get('http://localhost:3000/api/admin/problems')).json()
const mineFault = (problems.faults ?? []).find((f) => f.message === 'E2E synthetic fault')
ok('a browser fault reaches the dashboard', !!mineFault)
ok('the same fault twice is counted, not listed twice', (mineFault?.count ?? 0) === 2)
const cleared = await page.request.delete('http://localhost:3000/api/admin/problems')
ok('the problem list can be cleared',
   cleared.ok() &&
   ((await (await page.request.get('http://localhost:3000/api/admin/problems')).json()).faults ?? []).length === 0)

// --- the office queues, and what happens when one is marked done
const queues = await (await page.request.get('http://localhost:3000/api/admin/office')).json()
ok('the dashboard holds all three office queues',
   Array.isArray(queues.intentions) && Array.isArray(queues.certificates) && Array.isArray(queues.prayers))
const waitingCert = (queues.certificates ?? []).find((entry) => entry.email === 'cert@example.com')
ok('the certificate request reached the dashboard', !!waitingCert)
ok('a prayer marked not for publication says so',
   (queues.prayers ?? []).some((entry) => entry.mayPublish === false))
const certDone = await page.request.patch('http://localhost:3000/api/admin/office', {
  data: { kind: 'certificates', id: waitingCert?.id, status: 'done', note: 'Ready at the counter.' },
})
ok('a certificate can be marked ready', certDone.ok(), `status=${certDone.status()}`)
await page.waitForTimeout(600)
ok('marking it ready writes to the person who asked',
   ((await (await page.request.get('http://localhost:3000/api/admin/outbox')).json()).letters ?? [])
     .some((l) => l.kind === 'office-certificates-done'))
ok('deciding an office request is recorded',
   ((await (await page.request.get('http://localhost:3000/api/admin/audit?action=office-decide')).json())
     .entries ?? []).length > 0)

// tidy the office queues so a second run starts clean
for (const kind of ['intentions', 'certificates', 'prayers']) {
  const list = (await (await page.request.get('http://localhost:3000/api/admin/office')).json())[kind] ?? []
  for (const entry of list.filter((row) => /E2E|Robot|Second/.test(row.name ?? ''))) {
    await page.request.delete('http://localhost:3000/api/admin/office', {
      data: { kind, id: entry.id },
    })
  }
}
ok('the suite clears the office requests it made',
   ((await (await page.request.get('http://localhost:3000/api/admin/office')).json()).intentions ?? [])
     .every((row) => !/E2E/.test(row.name ?? '')))

// --- answering somebody from the dashboard
const replyAddress = { 'x-forwarded-for': `10.53.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` }
const askerEmail = `asker-${Date.now().toString(36)}@example.com`
await page.request.post('http://localhost:3000/api/contact', {
  headers: replyAddress,
  data: {
    name: 'E2E Asker', email: askerEmail, phone: '98470 12345',
    subject: 'A question', message: 'Is the large hall free in December?',
  },
})
await page.waitForTimeout(500)

const inbox = await (await page.request.get('http://localhost:3000/api/admin/submissions')).json()
const asked = (inbox.messages ?? []).find((m) => m.email === askerEmail)
ok('a message now carries an id of its own', !!asked?.id, asked?.id ?? 'none')

const answered = await page.request.post('http://localhost:3000/api/admin/reply', {
  data: {
    list: 'messages', key: asked?.id, channel: 'email',
    text: 'Yes, the large hall is free on the 14th. Ring the office to hold it.',
  },
})
const answerJson = await answered.json()
ok('the office can answer from the dashboard', answered.ok(), `status=${answered.status()}`)
ok('an answer says honestly that no mail server is set up',
   answerJson.reply?.status === 'not-configured', answerJson.reply?.status)

const afterReply = await (await page.request.get('http://localhost:3000/api/admin/submissions')).json()
const repliedTo = (afterReply.messages ?? []).find((m) => m.email === askerEmail)
ok('the answer is kept beside the message', (repliedTo?.replies ?? []).length === 1)
ok('the answer records who wrote it', repliedTo?.replies?.[0]?.by === ADMIN_USER)

ok('the answer reaches the outbox',
   ((await (await page.request.get('http://localhost:3000/api/admin/outbox')).json()).letters ?? [])
     .some((l) => l.kind === 'reply' && l.to === askerEmail))

const whatsapped = await page.request.post('http://localhost:3000/api/admin/reply', {
  data: { list: 'messages', key: asked?.id, channel: 'whatsapp', text: 'Ringing you now.' },
})
ok('a WhatsApp answer is noted without claiming it was delivered',
   (await whatsapped.json()).reply?.status === 'handed-over')

ok('a Malayalam answer is stored exactly as written',
   (await (await page.request.post('http://localhost:3000/api/admin/reply', {
     data: { list: 'messages', key: asked?.id, channel: 'whatsapp', text: 'ഹാൾ ഒഴിവുണ്ട്.' },
   })).json()).reply?.text === 'ഹാൾ ഒഴിവുണ്ട്.')

ok('an empty answer is refused',
   (await page.request.post('http://localhost:3000/api/admin/reply', {
     data: { list: 'messages', key: asked?.id, text: '  ' },
   })).status() === 422)
ok('an answer to a message that does not exist is refused',
   (await page.request.post('http://localhost:3000/api/admin/reply', {
     data: { list: 'messages', key: 'no-such-message', text: 'hello' },
   })).status() === 404)
ok('only the lists that hold people can be answered',
   (await page.request.post('http://localhost:3000/api/admin/reply', {
     data: { list: 'users', key: 'x', text: 'hello' },
   })).status() === 422)
ok('answering is recorded in the activity log',
   ((await (await page.request.get('http://localhost:3000/api/admin/audit?action=reply')).json())
     .entries ?? []).length > 0)

// --- letters. No mail server is set up in development, so every letter is
// recorded as never posted — which is exactly what the parish must be able to
// see before it goes live.
const outbox = await (await page.request.get('http://localhost:3000/api/admin/outbox')).json()
const letters = outbox.letters ?? []
ok('the outbox is readable when signed in', Array.isArray(letters))
ok('the outbox knows whether mail is set up at all', typeof outbox.configured === 'boolean')
ok('a contact message writes to the office and back to the sender',
   letters.some((l) => l.kind === 'contact-ack'))
ok('a hall request is acknowledged with a reference',
   letters.some((l) => l.kind === 'hall-ack'))
ok('confirming a booking writes to the family',
   letters.some((l) => l.kind === 'hall-confirmed'))
ok('joining the newsletter is welcomed', letters.some((l) => l.kind === 'subscribe-welcome'))
ok('a Mass intention is acknowledged', letters.some((l) => l.kind === 'office-intentions-ack'))
ok('a certificate request is acknowledged',
   letters.some((l) => l.kind === 'office-certificates-ack'))
ok('a letter nobody could post is marked, not lost',
   letters.every((l) => ['sent', 'failed', 'not-configured'].includes(l.status)))
ok('nothing was written to the robot that filled the hidden field',
   !letters.some((l) => l.to === 'robot@example.com'))

const mailCheck = await (await page.request.get('http://localhost:3000/api/admin/outbox?check=1')).json()
ok('the mail settings can be tested without sending anything',
   mailCheck.check && mailCheck.check.ok === false, mailCheck.check?.error)

// --- the newsletter itself
const listInfo = await (await page.request.get('http://localhost:3000/api/admin/newsletter')).json()
ok('the newsletter panel counts who is on the list', listInfo.subscribers > 0,
   `${listInfo.subscribers} subscribers`)
ok('an empty subject is refused',
   (await page.request.post('http://localhost:3000/api/admin/newsletter', {
     data: { subject: '', body: 'A long enough body to pass the length check.' },
   })).status() === 422)
ok('a letter with almost nothing in it is refused',
   (await page.request.post('http://localhost:3000/api/admin/newsletter', {
     data: { subject: 'Hello', body: 'Too short' },
   })).status() === 422)
const testSend = await page.request.post('http://localhost:3000/api/admin/newsletter', {
  data: {
    subject: 'E2E test letter',
    body: 'This is the body of the test letter, long enough to be accepted.',
    testTo: 'e2e-test@example.com',
  },
})
ok('a test letter goes to one address only', testSend.ok(), `status=${testSend.status()}`)
ok('the test letter reached the outbox',
   ((await (await page.request.get('http://localhost:3000/api/admin/outbox')).json()).letters ?? [])
     .some((l) => l.to === 'e2e-test@example.com'))

// --- unsubscribing works from the link in the letter
const subs = JSON.parse(readFileSync('content/subscribers.json', 'utf-8'))
const joiner = subs.find((entry) => entry.email === runEmail)
ok('a subscriber is given a token to leave with', !!joiner?.token)
const left = await page.request.delete(
  `http://localhost:3000/api/newsletter?token=${encodeURIComponent(joiner?.token ?? 'none')}`,
)
ok('the unsubscribe link works', left.ok())
ok('a made-up unsubscribe link is refused',
   (await page.request.delete('http://localhost:3000/api/newsletter?token=not-a-real-token')).status() === 404)
const afterLeaving = await (await page.request.get('http://localhost:3000/api/admin/newsletter')).json()
ok('somebody who left is not written to again',
   !(afterLeaving.addresses ?? []).includes(runEmail))

// and the page at the end of that link says so
await page.goto(`http://localhost:3000/unsubscribe?token=${encodeURIComponent(joiner?.token ?? 'none')}`,
  { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
const stopPage = await page.locator('main').innerText()
ok('the unsubscribe page confirms it in words', /taken off|expired/i.test(stopPage))
await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2000)

// --- accounts. The file is put back exactly as it was afterwards, because
// creating the first account is what switches off the .env.local login.
const USERS_FILE = 'content/users.json'
const usersBefore = existsSync(USERS_FILE) ? readFileSync(USERS_FILE, 'utf-8') : null

// Creating the first account switches off the .env.local login, so the file
// is put back whatever happens in between — a half-finished run must not
// leave the next one locked out.
try {

  const beforeAccounts = await (await page.request.get('http://localhost:3000/api/admin/users')).json()
  ok('the site starts on the shared login', beforeAccounts.bootstrap === true,
     `${(beforeAccounts.users ?? []).length} accounts`)

  const madeOwner = await page.request.post('http://localhost:3000/api/admin/users', {
    data: { username: 'e2eowner', name: 'E2E Owner', password: 'a-long-enough-pass', role: 'editor' },
  })
  const ownerJson = await madeOwner.json()
  ok('the first account can be made', madeOwner.ok(), `status=${madeOwner.status()}`)
  ok('the first account is an owner whatever was asked for', ownerJson.user?.role === 'owner')
  ok('making the first account replaces the shared login', ownerJson.replacedBootstrap === true)

  ok('a short password is refused',
     (await page.request.post('http://localhost:3000/api/admin/users', {
       data: { username: 'e2eshort', name: 'Short', password: 'abc' },
     })).status() === 422)
  ok('a duplicate user id is refused',
     (await page.request.post('http://localhost:3000/api/admin/users', {
       data: { username: 'e2eowner', name: 'Again', password: 'a-long-enough-pass' },
     })).status() === 409)

  const madeEditor = await page.request.post('http://localhost:3000/api/admin/users', {
    data: { username: 'e2eeditor', name: 'E2E Editor', password: 'another-long-pass', role: 'editor' },
  })
  const editorJson = await madeEditor.json()
  ok('a second account can be made as an editor', madeEditor.ok() && editorJson.user?.role === 'editor',
     `status=${madeEditor.status()}`)

  // the shared login is finished the moment a real account exists
  const sharedAgain = await page.request.post('http://localhost:3000/api/admin/login', {
    headers: { 'x-forwarded-for': `10.66.${Math.floor(Math.random() * 250)}.4` },
    data: { username: ADMIN_USER, password: ADMIN_PASS },
  })
  ok('the shared login stops working once an account exists', sharedAgain.status() === 401,
     `status=${sharedAgain.status()}`)

  ok('the last owner cannot be demoted',
     (await page.request.patch('http://localhost:3000/api/admin/users', {
       data: { id: ownerJson.user.id, role: 'editor' },
     })).status() === 409)
  ok('the last owner cannot be suspended',
     (await page.request.patch('http://localhost:3000/api/admin/users', {
       data: { id: ownerJson.user.id, disabled: true },
     })).status() === 409)
  ok('the last owner cannot be removed',
     (await page.request.delete('http://localhost:3000/api/admin/users', {
       data: { id: ownerJson.user.id },
     })).status() === 409)

  // --- an editor is held to what an editor may do
  const editorCtx = await browser.newContext()
  const editorPage = await editorCtx.newPage()
  const editorLogin = await editorPage.request.post('http://localhost:3000/api/admin/login', {
    headers: { 'x-forwarded-for': `10.77.${Math.floor(Math.random() * 250)}.9` },
    data: { username: 'e2eeditor', password: 'another-long-pass' },
  })
  ok('an editor can sign in', editorLogin.ok(), `status=${editorLogin.status()}`)
  ok('an editor may still edit the site',
     (await editorPage.request.get('http://localhost:3000/api/admin/content/stats')).ok())
  ok('an editor may not add accounts',
     (await editorPage.request.post('http://localhost:3000/api/admin/users', {
       data: { username: 'e2esneak', name: 'Sneak', password: 'a-long-enough-pass' },
     })).status() === 403)
  ok('an editor may not change somebody else',
     (await editorPage.request.patch('http://localhost:3000/api/admin/users', {
       data: { id: ownerJson.user.id, password: 'taking-over-here' },
     })).status() === 403)
  ok('an editor may change their own password',
     (await editorPage.request.patch('http://localhost:3000/api/admin/users', {
       data: { id: editorJson.user.id, password: 'my-own-new-pass' },
     })).ok())
  ok('an editor may not restore a backup over the site',
     (await editorPage.request.post('http://localhost:3000/api/admin/backups', {
       data: { file: copyName },
     })).status() === 403)

  // suspending somebody ends their session on the next request, not in eight hours
  await page.request.patch('http://localhost:3000/api/admin/users', {
    data: { id: editorJson.user.id, disabled: true },
  })
  ok('suspending an account ends its session at once',
     (await editorPage.request.get('http://localhost:3000/api/admin/content/stats')).status() === 401)
  await editorCtx.close()

  ok('account changes are recorded',
     ((await (await page.request.get('http://localhost:3000/api/admin/audit?action=user-create')).json())
       .entries ?? []).length >= 2)

} finally {
  if (usersBefore === null) rmSync(USERS_FILE, { force: true })
  else writeFileSync(USERS_FILE, usersBefore)
}
ok('the suite leaves the accounts as it found them',
   (existsSync(USERS_FILE) ? readFileSync(USERS_FILE, 'utf-8') : null) === usersBefore)

// logout
await page.click('button:has-text("Sign out")')
await page.waitForTimeout(2000)
const afterLogout = await page.request.get('http://localhost:3000/api/admin/content/stats')
ok('sign out invalidates session', afterLogout.status() === 401)

const trAnon = await page.request.post('http://localhost:3000/api/admin/translate', {
  data: { text: 'Holy Mass', from: 'en', to: 'ml' },
})
ok('translate API rejects signed-out caller', trAnon.status() === 401)

// none of the operations panels answer a stranger
for (const route of ['users', 'audit', 'backups', 'health', 'metrics', 'problems', 'outbox', 'newsletter']) {
  ok(`the ${route} panel is closed to a signed-out caller`,
     (await page.request.get(`http://localhost:3000/api/admin/${route}`)).status() === 401)
}
const publicHealth = await page.request.get('http://localhost:3000/api/health')
const publicHealthJson = await publicHealth.json()
ok('the health check answers an uptime monitor without a session',
   publicHealth.ok() && publicHealthJson.ok === true)
ok('the health check says nothing about the parish',
   !JSON.stringify(publicHealthJson).toLowerCase().includes('thomas'))

ok('no uncaught console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '))

console.log(results.join('\n'))
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`)
await browser.close()
