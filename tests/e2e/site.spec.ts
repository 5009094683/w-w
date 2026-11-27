import { expect, test } from '@playwright/test'

const CONTENT_PAGES = ['/', '/services', '/services/development', '/products', '/products/flavorgpt', '/about-us', '/careers', '/careers/ai-ml-engineer', '/pricing', '/faq', '/glossary', '/privacy-policy']

test.describe('content pages', () => {
  for (const path of CONTENT_PAGES) {
    test(`${path} renders without running any script`, async ({ page }) => {
      const scripts: string[] = []
      page.on('request', (request) => {
        if (request.resourceType() === 'script') scripts.push(request.url())
      })
      const errors: string[] = []
      page.on('pageerror', error => errors.push(String(error)))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })

      const response = await page.goto(path)
      expect(response?.status()).toBe(200)
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('footer')).toContainText('UDYAM-GJ-30-0012290')

      expect(scripts).toEqual([])
      expect(errors).toEqual([])
    })

    test(`${path} fits a narrow phone without sideways scrolling`, async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 })
      await page.goto(path)

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow).toBeLessThanOrEqual(0)
    })
  }

  test('the home page opens with a plain statement of what the company does', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('h1')).toHaveText('YBX Labs builds AI products and the systems behind them.')
    await expect(page.getByText('Company record')).toBeVisible()
  })

  test('the three published prices are shown unchanged', async ({ page }) => {
    await page.goto('/pricing')

    for (const price of ['18,000 INR', '*10,000 INR', '20,000 INR']) {
      await expect(page.getByText(price, { exact: true })).toBeVisible()
    }
  })
})

test.describe('navigation', () => {
  test('works with JavaScript switched off', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } })
    const page = await context.newPage()

    await page.goto('/')
    await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Services' }).click()
    await expect(page).toHaveURL(/\/services$/)

    await page.getByRole('link', { name: /Web3 and blockchain development/ }).first().click()
    await expect(page).toHaveURL(/\/services\/web3$/)
    await expect(page.locator('h1')).toHaveText('Web3 and blockchain development')
    await context.close()
  })

  test('the phone menu opens and closes without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } })
    const page = await context.newPage()

    await page.goto('/')
    const menu = page.locator('details.menu')
    await expect(menu.getByRole('link', { name: 'Pricing' })).toBeHidden()

    await menu.locator('summary').click()
    await expect(menu.getByRole('link', { name: 'Pricing' })).toBeVisible()

    await menu.getByRole('link', { name: 'Pricing' }).click()
    await expect(page).toHaveURL(/\/pricing$/)
    await context.close()
  })

  test('a row in a list of pages has one link, named after the page, and is clickable anywhere', async ({ page }) => {
    await page.goto('/')
    const row = page.locator('.index-row', { hasText: 'P-01' })

    await expect(row.getByRole('link')).toHaveCount(1)
    await expect(row.getByRole('link')).toHaveAccessibleName('FlavorGPT')

    // Click over the summary, well away from the title.
    const box = (await row.boundingBox())!
    await row.click({ position: { x: box.width * 0.75, y: box.height / 2 } })
    await expect(page).toHaveURL(/\/products\/flavorgpt$/)
  })

  test('a related-page card is clickable anywhere, and reachable with the keyboard', async ({ page }) => {
    await page.goto('/services/development')
    const link = page.getByRole('link', { name: 'Technology consulting', exact: true })
    const card = page.locator('li', { has: link })

    // Click the bottom corner of the card, away from the title.
    const box = (await card.boundingBox())!
    await card.click({ position: { x: box.width - 12, y: box.height - 12 } })
    await expect(page).toHaveURL(/\/services\/consulting$/)

    await page.goto('/services/development')
    await link.focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/services\/consulting$/)
  })

  test('marks the current section in the menu', async ({ page }) => {
    await page.goto('/services/development')

    // The wide menu and the phone menu both carry the mark; only one is visible.
    const current = await page.locator('a.nav-link.is-current').evaluateAll(links => links.map(link => link.getAttribute('href')))

    expect(current).toEqual(['/services', '/services'])
  })
})

test.describe('addresses', () => {
  test('an unknown address gets a real 404 with the designed page', async ({ page }) => {
    const response = await page.goto('/no-such-page')

    expect(response?.status()).toBe(404)
    await expect(page.locator('h1')).toHaveText('This page does not exist.')
    await expect(page.getByRole('link', { name: 'Services' }).first()).toBeVisible()
  })

  for (const [from, to] of [
    ['/services/flavorai', '/products/flavorai'],
    ['/services/flavorai-api', '/products/flavorai-api'],
    ['/services/web3.0', '/services/web3'],
  ]) {
    test(`${from} redirects to ${to}`, async ({ page, request }) => {
      const hop = await request.get(from, { maxRedirects: 0 })
      expect(hop.status()).toBe(301)

      await page.goto(from)
      await expect(page).toHaveURL(new RegExp(`${to.replace(/[.]/g, '\\.')}$`))
      await expect(page.locator('h1')).toBeVisible()
    })
  }

  for (const [from, to] of [
    ['/About-Us', '/about-us'],
    ['/about-us/', '/about-us'],
    ['/CAREERS/AI-ML-Engineer/', '/careers/ai-ml-engineer'],
    ['/Services/Development?utm_source=newsletter', '/services/development?utm_source=newsletter'],
  ]) {
    test(`${from} is sent for good to ${to}`, async ({ request }) => {
      const hop = await request.get(from, { maxRedirects: 0 })

      expect(hop.status()).toBe(301)
      expect(hop.headers().location).toBe(to)
    })
  }

  test('other spellings are only redirected when the page exists', async ({ request }) => {
    expect((await request.get('/No-Such-Page/', { maxRedirects: 0 })).status()).toBe(404)
    // The currency code in a payment link is written in capitals and must stay as it is.
    expect((await request.get('/payment/100INR', { maxRedirects: 0 })).status()).toBe(200)
  })
})

test.describe('appearance', () => {
  test('follows the device setting for dark mode', async ({ browser }) => {
    const paper = async (colorScheme: 'light' | 'dark') => {
      const context = await browser.newContext({ colorScheme })
      const page = await context.newPage()
      await page.goto('/')
      const color = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)
      await context.close()
      return color
    }

    expect(await paper('light')).toBe('rgb(246, 243, 236)')
    expect(await paper('dark')).toBe('rgb(18, 18, 20)')
  })

  test('uses the self-hosted fonts', async ({ page }) => {
    const fonts: string[] = []
    page.on('request', (request) => {
      if (request.resourceType() === 'font') fonts.push(new URL(request.url()).host)
    })
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)

    expect(fonts.length).toBeGreaterThan(0)
    expect(new Set(fonts)).toEqual(new Set([new URL(page.url()).host]))
  })
})
