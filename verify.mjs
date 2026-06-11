import { chromium } from 'playwright'

const base = process.env.BASE_URL ?? 'http://localhost:5173'
const routes = [
  '/',
  '/assets',
  '/assets/apollo',
  '/work-orders',
  '/work-orders/wo-1',
  '/requests',
  '/insights',
  '/insights/it-cat-summary',
  '/insights/it-usage-projection',
  '/insights/it-emd-summary',
  '/insights/it-engine-hours',
  '/insights/it-safety-pm',
  '/insights/it-open-deficiencies',
  '/drydock',
  '/analytics',
]
const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[console] ${m.text()}`)
})
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))

for (const r of routes) {
  await page.goto(base + r, { waitUntil: 'networkidle' })
  await page.waitForTimeout(700)
  const text = await page.evaluate(() => document.body.innerText.slice(0, 120).replace(/\n/g, ' '))
  console.log(`OK ${r.padEnd(22)} → ${text}`)
}

// capture a couple of screenshots
await page.goto(base + '/', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: 'verify-dashboard.png', fullPage: true })
await page.goto(base + '/assets/apollo', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: 'verify-asset.png', fullPage: true })
await page.goto(base + '/work-orders/wo-2', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: 'verify-wo.png', fullPage: true })
await page.goto(base + '/insights', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: 'verify-insights.png', fullPage: true })
await page.goto(base + '/insights/it-cat-summary', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: 'verify-insight-cat.png', fullPage: true })
await page.goto(base + '/insights/it-usage-projection', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: 'verify-insight-usage.png', fullPage: true })
await page.goto(base + '/drydock', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({ path: 'verify-drydock.png', fullPage: true })

await browser.close()
console.log('\nERRORS:', errors.length ? '\n' + errors.join('\n') : 'none')
