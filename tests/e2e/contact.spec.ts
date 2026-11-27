import { expect, test } from '@playwright/test'
import { E2E } from '../../playwright.config'
import { outboundCalls, resetOutboundCalls, stubTurnstile } from './support/helpers'

test.beforeEach(async ({ page }) => {
  await resetOutboundCalls()
  await stubTurnstile(page)
})

test.describe('contact page', () => {
  test('opens without loading any third-party script', async ({ page }) => {
    const thirdParty: string[] = []
    page.on('request', (request) => {
      if (request.url().startsWith('http') && new URL(request.url()).host !== new URL(E2E.baseURL).host) {
        thirdParty.push(request.url())
      }
    })

    await page.goto('/contact-us')
    await expect(page.getByRole('heading', { name: 'Contact us' })).toBeVisible()
    await page.waitForLoadState('networkidle')

    expect(thirdParty).toEqual([])
  })

  test('shows the published contact details', async ({ page }) => {
    await page.goto('/contact-us')
    const details = page.locator('aside')

    await expect(details.getByRole('link', { name: 'hi@yesbhautik.co.in' })).toHaveAttribute('href', 'mailto:hi@yesbhautik.co.in')
    await expect(details.getByRole('link', { name: '+91 63535 86391' })).toHaveAttribute('href', 'tel:+916353586391')
    await expect(details).toContainText('C/O Hitendra Bavadiya, Jaragali, Gir Gadhada, Gir Somnath, Gujarat, India - 362530')
    await expect(details).toContainText('UDYAM-GJ-30-0012290')
  })

  test('sends a message', async ({ page }) => {
    await page.goto('/contact-us')
    await page.getByLabel('Name').fill('Asha Patel')
    await page.getByLabel('Email').fill('asha@example.com')
    await page.getByLabel('Company').fill('Example Ltd')
    await page.getByLabel('Message').fill('We need a backend audit before our launch.')
    await page.getByRole('button', { name: 'Send message' }).click()

    await expect(page.getByText('Thank you. Your message is on its way.')).toBeVisible()

    const calls = await outboundCalls()
    const check = calls.find(call => call.host === 'challenges.cloudflare.com')
    const email = calls.find(call => call.host === 'api.resend.com')
    expect(new URLSearchParams(check!.body).get('response')).toBe('e2e-turnstile-token')
    expect(JSON.parse(email!.body)).toMatchObject({
      to: ['hello@ybxlabs.com'],
      reply_to: 'asha@example.com',
      subject: '[Website Contact] Asha Patel — Example Ltd',
    })
  })

  test('does not send an invalid email address', async ({ page }) => {
    await page.goto('/contact-us')
    await page.getByLabel('Name').fill('Asha Patel')
    await page.getByLabel('Email').fill('not-an-email')
    await page.getByLabel('Message').fill('Hello')
    await page.getByRole('button', { name: 'Send message' }).click()

    await expect(page.getByLabel('Email')).toHaveJSProperty('validity.valid', false)
    expect((await outboundCalls()).filter(call => call.host === 'api.resend.com')).toHaveLength(0)
  })

  test('tells the visitor when the message could not be sent, and offers email instead', async ({ page }) => {
    await page.goto('/contact-us')
    await page.getByLabel('Name').fill('FAIL')
    await page.getByLabel('Email').fill('asha@example.com')
    await page.getByLabel('Message').fill('This one is rejected by the mail service.')
    await page.getByRole('button', { name: 'Send message' }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toContainText('Failed to send email. Please try again.')
    await expect(alert.getByRole('link', { name: 'hi@yesbhautik.co.in' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send message' })).toBeEnabled()
  })

  test('explains itself when JavaScript is off', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto('/contact-us')

    await expect(page.getByText('This form needs JavaScript.')).toBeVisible()
    await context.close()
  })
})
