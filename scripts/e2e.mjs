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
import { chromium } from 'playwright'

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
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

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
const nl = await page.request.post('http://localhost:3000/api/newsletter', { data: { email: 'test.parishioner@example.com' } })
ok('newsletter API accepts valid email', nl.ok())
const nlBad = await page.request.post('http://localhost:3000/api/newsletter', { data: { email: 'nope' } })
ok('newsletter API rejects bad email', nlBad.status() === 422)
const cf = await page.request.post('http://localhost:3000/api/contact', {
  data: { name: 'Test Parishioner', email: 'test@example.com', subject: 'Baptism', message: 'Hello from the e2e test.' },
})
ok('contact API accepts message', cf.ok())

// admin must be locked
const locked = await page.request.get('http://localhost:3000/api/admin/content/notices')
ok('content API rejects anonymous read', locked.status() === 401)
const lockedW = await page.request.put('http://localhost:3000/api/admin/content/notices', { data: { data: {} } })
ok('content API rejects anonymous write', lockedW.status() === 401)
const badPass = await page.request.post('http://localhost:3000/api/admin/login', { data: { username: 'vicar', password: 'wrong' } })
ok('login rejects wrong password', badPass.status() === 401)
const badUser = await page.request.post('http://localhost:3000/api/admin/login', { data: { username: 'nobody', password: 'mangalassery1893' } })
ok('login rejects wrong user id', badUser.status() === 401)
const noUser = await page.request.post('http://localhost:3000/api/admin/login', { data: { password: 'mangalassery1893' } })
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

// ---------------------------------------------------------------- parish hall
await page.goto('http://localhost:3000/hall', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)
ok('hall page opens', (await page.locator('h1, h2').first().count()) > 0)
const hallText = await page.locator('main').innerText()
for (const room of ['Small Hall', 'Medium Hall', 'Large Hall']) {
  ok(`hall page describes the ${room}`, hallText.includes(room))
}
ok('the two large halls can be taken together', /together/i.test(hallText))
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
const dayPanel = await page.locator('#day').innerText()
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
const largeText = await page.locator('#day [data-hall="large"]').innerText()
ok('the day panel shows the large hall gone for every session',
   (largeText.match(/held/gi) ?? []).length === 3)
const mediumText = await page.locator('#day [data-hall="medium"]').innerText()
ok('the day panel shows the medium hall free in the morning',
   /morning[\s\S]*?free/i.test(mediumText) && /evening[\s\S]*?held/i.test(mediumText))
const smallText = await page.locator('#day [data-hall="small"]').innerText()
ok('the day panel shows the small hall untouched that day',
   (smallText.match(/free/gi) ?? []).length === 3)

ok('availability never leaks who booked',
   !JSON.stringify(avail).includes('e2e@example.com') && !JSON.stringify(avail).includes('E2E Family'))
ok('hall bookings are not readable when signed out',
   (await page.request.get('http://localhost:3000/api/admin/hall')).status() === 401)

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
await page.fill('#admin-username', 'Vicar')
await page.fill('#admin-password', 'mangalassery1893')
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
ok('staff open the same day panel a visitor sees', (await page.locator('#day').count()) === 1)
await page.locator('#day [data-hall="small"] button').first().click()
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

// logout
await page.click('button:has-text("Sign out")')
await page.waitForTimeout(2000)
const afterLogout = await page.request.get('http://localhost:3000/api/admin/content/stats')
ok('sign out invalidates session', afterLogout.status() === 401)

const trAnon = await page.request.post('http://localhost:3000/api/admin/translate', {
  data: { text: 'Holy Mass', from: 'en', to: 'ml' },
})
ok('translate API rejects signed-out caller', trAnon.status() === 401)

ok('no uncaught console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '))

console.log(results.join('\n'))
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} passed`)
await browser.close()
