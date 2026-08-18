import { chromium } from 'playwright'
const out = process.argv[2]
const browser = await chromium.launch()
for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport: vp })
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2600)
  await page.screenshot({ path: `${out}/popup-${name}.png` })
  await page.keyboard.press('Escape'); await page.waitForTimeout(600)
  for (const id of ['upcoming', 'committee', 'donate', 'obituary']) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded()
    await page.waitForTimeout(1400)
    await page.screenshot({ path: `${out}/${id}-${name}.png` })
  }
  await page.locator('#ministries').scrollIntoViewIfNeeded(); await page.waitForTimeout(1200)
  await page.locator('#ministries button.card').first().click(); await page.waitForTimeout(1200)
  await page.screenshot({ path: `${out}/ministry-${name}.png` })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  console.log(name, 'horizontal overflow px:', overflow)
  await page.close()
}
await browser.close()
