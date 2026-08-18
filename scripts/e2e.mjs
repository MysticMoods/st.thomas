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

// upcoming events popup — it greets every first-time visitor and must go away
ok('upcoming events popup opens', (await page.locator('[role=dialog]').count()) === 1)
await page.click('[role=dialog] button:has-text("Maybe later")')
await page.waitForTimeout(700)
ok('popup dismisses', (await page.locator('[role=dialog]').count()) === 0)
await page.reload({ waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2600)
ok('popup stays dismissed on the next page load', (await page.locator('[role=dialog]').count()) === 0)

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

// upcoming events section
await page.locator('#upcoming').scrollIntoViewIfNeeded(); await page.waitForTimeout(1200)
ok('upcoming events section lists dated events', (await page.locator('#upcoming article').count()) > 1,
   `${await page.locator('#upcoming article').count()} events`)

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
