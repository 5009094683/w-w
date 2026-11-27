import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { stubTurnstile } from './support/helpers'

const PAGES = [
  '/',
  '/services',
  '/services/development',
  '/products',
  '/products/flavorgpt',
  '/about-us',
  '/careers',
  '/careers/ai-ml-engineer',
  '/pricing',
  '/faq',
  '/glossary',
  '/refund-policy',
  '/contact-us',
  '/payment',
  '/payment/gateway-selection?amount=500&currency=INR',
  '/payment/100INR',
  '/no-such-page',
]

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`accessibility, ${colorScheme}`, () => {
    test.use({ colorScheme })

    for (const path of PAGES) {
      test(`${path} has no WCAG A or AA violations`, async ({ page }) => {
        await stubTurnstile(page)
        await page.goto(path)
        await page.evaluate(() => document.fonts.ready)

        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()

        expect(results.violations.map(violation => ({
          rule: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.slice(0, 3).map(node => node.target.join(' ')),
        }))).toEqual([])
      })
    }
  })
}
