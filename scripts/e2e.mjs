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
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
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
await page.keyboard.press('Escape'); await page.waitForTimeout(500)
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
await page.keyboard.press('Escape'); await page.waitForTimeout(600)
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
ok('obituary page carries a breadcrumb', (await page.locator('nav[aria-label="Breadcrumb"]').count()) === 1)
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

// the everyday sections sit on the banner, not behind the menu
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
ok('the drawer offers the staff login', (await page.locator('[role=dialog] a[href="/admin"]').count()) > 0)
await page.keyboard.press('Escape')
await page.waitForTimeout(600)

// ---------------------------------------------------------------- parish hall
await page.goto('http://localhost:3000/hall', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)
ok('hall page opens', (await page.locator('h1, h2').first().count()) > 0)
ok('hall lists what can be arranged', /air conditioning/i.test(await page.locator('main').innerText()))
ok('hall shows a generator', /generator/i.test(await page.locator('main').innerText()))
const monthCards = await page.locator('#book .grid > div').count()
ok('hall calendar covers the year', monthCards >= 12, `${monthCards} months`)
ok('hall calendar marks days that cannot be taken',
   (await page.locator('#book button[disabled]').count()) > 0)

// a free day, one session, two amenities, sent through the real API
const hallDate = await page.evaluate(() => {
  const day = new Date()
  day.setDate(day.getDate() + 45)
  return day.toISOString().slice(0, 10)
})
const booked = await page.request.post('http://localhost:3000/api/hall/book', {
  data: {
    date: hallDate, session: 'full-day', name: 'E2E Family', phone: '+91 90000 00000',
    email: 'e2e@example.com', purpose: 'Test booking', guests: 120,
    amenities: ['ac', 'generator'], message: 'Sent by the e2e suite.',
  },
})
ok('hall booking request is accepted', booked.ok(), `status=${booked.status()}`)
const bookedId = booked.ok() ? (await booked.json()).id : ''

const avail = await (await page.request.get('http://localhost:3000/api/hall/availability')).json()
ok('the booked day shows as held on the public calendar', avail.calendar?.[hallDate]?.['full-day'] === 'pending')

const clash = await page.request.post('http://localhost:3000/api/hall/book', {
  data: { date: hallDate, session: 'morning', name: 'Second', phone: '1', email: 'two@example.com' },
})
ok('a clashing session is refused', clash.status() === 409)

ok('availability never leaks who booked',
   !JSON.stringify(avail).includes('e2e@example.com') && !JSON.stringify(avail).includes('E2E Family'))
ok('hall bookings are not readable when signed out',
   (await page.request.get('http://localhost:3000/api/admin/hall')).status() === 401)

// ---- admin round trip
await page.goto('http://localhost:3000/admin', { waitUntil: 'domcontentloaded' })
ok('admin shows login when signed out', (await page.locator('#admin-password').count()) === 1 && (await page.locator('#admin-username').count()) === 1)
await page.fill('#admin-username', 'Vicar')
await page.fill('#admin-password', 'mangalassery1893')
await page.click('button[type=submit]')
await page.waitForTimeout(3500)
ok('admin signs in (user id case-insensitive)', (await page.locator('text=Parish Dashboard').count()) > 0 && (await page.locator('#admin-password').count()) === 0)

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
ok('the request carries the amenities that were ticked',
   !!mine && mine.amenities.includes('ac') && mine.amenities.includes('generator'))
const confirmed = await page.request.patch('http://localhost:3000/api/admin/hall', {
  data: { id: mine?.id, status: 'confirmed' },
})
ok('a request can be confirmed', confirmed.ok())
const afterConfirm = await (await page.request.get('http://localhost:3000/api/hall/availability')).json()
ok('confirming blocks the day publicly', afterConfirm.calendar?.[mine?.date]?.['full-day'] === 'confirmed')
const declined = await page.request.patch('http://localhost:3000/api/admin/hall', {
  data: { id: mine?.id, status: 'declined' },
})
ok('declining frees the day again', declined.ok() &&
   !(await (await page.request.get('http://localhost:3000/api/hall/availability')).json()).calendar?.[mine?.date])

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
