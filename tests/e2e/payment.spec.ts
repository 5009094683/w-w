import { expect, test } from '@playwright/test'
import { outboundCalls, recordApi, resetOutboundCalls, stubPhonePe, stubRazorpay, stubTurnstile, stubZoho } from './support/helpers'

const SERVER_ONLY = ['e2e-phonepe-token-that-must-stay-on-the-server', 'e2e-zoho-token-that-must-stay-on-the-server', 'e2e-razorpay-secret', 'e2e-zoho-signing-key']

test.beforeEach(async ({ page }) => {
  await resetOutboundCalls()
  await stubTurnstile(page)
})

test.describe('payment form', () => {
  test('sends a non-rupee amount straight to Razorpay', async ({ page }) => {
    await page.goto('/payment')
    await page.getByLabel('Amount').fill('50')
    await page.getByLabel('Currency').selectOption('USD')
    await expect(page.getByText('You will pay $50.')).toBeVisible()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page).toHaveURL(/\/payment\/50USD\?gateway=razorpay$/)
    await expect(page.getByRole('button', { name: 'Pay $50 with Razorpay' })).toBeVisible()
  })

  test('lets a rupee payment choose its gateway', async ({ page }) => {
    await page.goto('/payment')
    await page.getByRole('button', { name: '₹500', exact: true }).click()
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page).toHaveURL(/\/payment\/gateway-selection\?amount=500&currency=INR$/)
    await page.getByText('PhonePe', { exact: true }).click()
    await page.getByRole('button', { name: 'Continue to PhonePe' }).click()

    await expect(page).toHaveURL(/\/payment\/500INR\?gateway=phonepe$/)
  })

  test('refuses an amount the currency cannot carry', async ({ page }) => {
    await page.goto('/payment')
    await page.getByLabel('Currency').selectOption('JPY')
    await page.getByLabel('Amount').fill('100.5')
    await page.getByRole('button', { name: 'Continue' }).click()

    await expect(page.getByText('JPY amounts cannot have decimals')).toBeVisible()
    await expect(page).toHaveURL(/\/payment$/)
  })

  test('/pay goes to the payment form', async ({ page }) => {
    await page.goto('/pay')
    await expect(page).toHaveURL(/\/payment$/)
    await expect(page.getByRole('heading', { name: 'Make a payment' })).toBeVisible()
  })
})

test.describe('paying with Razorpay', () => {
  for (const [link, shown, amount, currency, confirmed] of [
    ['/payment/100INR', '₹100', 10000, 'INR', '₹100'],
    ['/payment/1000JPY', '¥1000', 1000, 'JPY', '¥1000'],
    ['/payment/19.99USD', '$19.99', 1999, 'USD', '$19.99'],
    ['/payment/5.25KWD', 'د.ك5.25', 5250, 'KWD', 'د.ك5.25'],
    ['/payment/250', '₹250', 25000, 'INR', '₹250'],
  ] as const) {
    test(`${link} charges ${amount} ${currency} units`, async ({ page }) => {
      await stubRazorpay(page)
      const api = recordApi(page)

      await page.goto(link)
      await expect(page.getByText(shown, { exact: true })).toBeVisible()
      await page.getByRole('button', { name: `Pay ${shown} with Razorpay` }).click()

      await expect(page.getByRole('heading', { name: 'Payment successful' })).toBeVisible()
      await expect(page.getByText(confirmed, { exact: true })).toBeVisible()
      await expect(page.getByText('pay_E2E0000000001')).toBeVisible()

      // What the checkout was opened with, and what the server asked Razorpay for.
      expect(await page.evaluate(() => (window as unknown as { __razorpayOptions: unknown }).__razorpayOptions)).toMatchObject({ amount, currency, key: 'rzp_test_E2E0000000001' })
      const order = (await outboundCalls()).find(call => call.host === 'api.razorpay.com' && call.path === '/v1/orders')
      expect(JSON.parse(order!.body)).toMatchObject({ amount, currency })

      for (const secret of SERVER_ONLY) {
        expect(JSON.stringify(api)).not.toContain(secret)
      }
    })
  }

  test('does nothing when the customer closes the checkout', async ({ page }) => {
    await stubRazorpay(page, 'dismissed')
    await page.goto('/payment/100INR')
    await page.getByRole('button', { name: 'Pay ₹100 with Razorpay' }).click()

    await expect(page.getByRole('button', { name: 'Pay ₹100 with Razorpay' })).toBeEnabled()
    expect((await outboundCalls()).some(call => call.path.startsWith('/v1/payments/'))).toBe(false)
  })

  test('a payment link with too many decimals cannot be paid', async ({ page }) => {
    await page.goto('/payment/100.5JPY')

    await expect(page.getByRole('heading', { name: 'This payment link cannot be used' })).toBeVisible()
    await expect(page.getByText('JPY amounts cannot have decimals')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Pay / })).toHaveCount(0)
  })

  test('a currency other than INR is paid with Razorpay whatever the link says', async ({ page }) => {
    await stubRazorpay(page)
    await page.goto('/payment/50USD?gateway=phonepe')

    await expect(page.getByRole('button', { name: 'Pay $50 with Razorpay' })).toBeVisible()
  })
})

test.describe('paying with PhonePe', () => {
  test('pays inside the page and never gives the browser a gateway token', async ({ page }) => {
    await stubPhonePe(page)
    const api = recordApi(page)

    await page.goto('/payment/100INR?gateway=phonepe')
    await page.getByRole('button', { name: 'Pay ₹100 with PhonePe' }).click()

    await expect(page.getByRole('heading', { name: 'Payment successful' })).toBeVisible()
    await expect(page.getByText('OM_E2E_TXN_1')).toBeVisible()

    const create = api.find(exchange => exchange.path === '/api/payment/create-order')!
    const verify = api.find(exchange => exchange.path === '/api/payment/verify')!
    expect(Object.keys(JSON.parse(create.response)).sort()).toEqual(['amount', 'currency', 'gateway', 'merchant_order_id', 'order_id', 'redirect_url', 'success'])
    expect(Object.keys(JSON.parse(verify.request)).sort()).toEqual(['gateway', 'merchantOrderId'])
    for (const secret of SERVER_ONLY) {
      expect(JSON.stringify(api)).not.toContain(secret)
    }

    // Only the order ID is kept in the browser, and only until the payment is confirmed.
    const during = await page.evaluate(() => (window as unknown as { __storageDuringCheckout: Record<string, string> }).__storageDuringCheckout)
    expect(Object.keys(during).filter(key => key.startsWith('phonepe'))).toEqual(['phonepe_merchant_order_id'])
    expect(JSON.stringify(during)).not.toMatch(/token/i)
    expect(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith('phonepe')))).toEqual([])

    const pay = (await outboundCalls()).find(call => call.path === '/apis/pg/checkout/v2/pay')!
    expect(JSON.parse(pay.body).amount).toBe(10000)
    expect(JSON.parse(pay.body).paymentFlow.merchantUrls.redirectUrl).toMatch(/\/payment\/success\?gateway=phonepe&order=ORDER_\d+_[a-f0-9]{16}$/)
  })

  test('reports a cancelled payment', async ({ page }) => {
    await stubPhonePe(page, 'USER_CANCEL')
    await page.goto('/payment/100INR?gateway=phonepe')
    await page.getByRole('button', { name: 'Pay ₹100 with PhonePe' }).click()

    await expect(page.getByText('Payment cancelled.')).toBeVisible()
  })

  test('confirms the payment when PhonePe sends the customer back', async ({ page }) => {
    await page.goto('/payment/success?gateway=phonepe&order=ORDER_1764200000000_0123456789abcdef')

    await expect(page.getByRole('heading', { name: 'Payment successful' })).toBeVisible()
    await expect(page.getByText('OM_E2E_TXN_1')).toBeVisible()
  })

  test('does not call an unfinished payment successful', async ({ page }) => {
    await page.goto('/payment/success?gateway=phonepe&order=ORDER_PENDING_1')

    await expect(page.getByRole('heading', { name: 'Payment not completed' })).toBeVisible()
  })

  test('shows nothing to confirm without an order', async ({ page }) => {
    await page.goto('/payment/success')

    await expect(page.getByRole('heading', { name: 'No payment to show' })).toBeVisible()
    expect(await outboundCalls()).toHaveLength(0)
  })

  test('rejects a crafted order in the return address', async ({ page }) => {
    await page.goto('/payment/success?gateway=phonepe&order=..%2F..%2Frefund')

    await expect(page.getByRole('heading', { name: 'We could not confirm the payment' })).toBeVisible()
    expect((await outboundCalls()).filter(call => call.host === 'api.phonepe.com')).toHaveLength(0)
  })
})

test.describe('paying with Zoho Payments', () => {
  test('pays through the widget and verifies the signed result', async ({ page }) => {
    await stubZoho(page)
    const api = recordApi(page)

    await page.goto('/payment/499.5INR?gateway=zoho')
    await page.getByRole('button', { name: 'Pay ₹499.5 with Zoho Payments' }).click()

    await expect(page.getByRole('heading', { name: 'Payment successful' })).toBeVisible()
    await expect(page.getByText('173000002315107')).toBeVisible()

    expect(await page.evaluate(() => (window as unknown as { __zohoOptions: unknown }).__zohoOptions)).toMatchObject({ amount: '499.5', currency_code: 'INR', payments_session_id: '2000000012001' })
    for (const secret of SERVER_ONLY) {
      expect(JSON.stringify(api)).not.toContain(secret)
    }
  })
})

test.describe('the security check', () => {
  test('a token Turnstile rejects starts no payment', async ({ page }) => {
    await page.unroute('https://challenges.cloudflare.com/**')
    await stubTurnstile(page, 'a-token-turnstile-will-reject')
    await stubRazorpay(page)

    await page.goto('/payment/100INR')
    await page.getByRole('button', { name: 'Pay ₹100 with Razorpay' }).click()

    await expect(page.getByText('The security check failed. Please try again.')).toBeVisible()
    expect((await outboundCalls()).some(call => call.host === 'api.razorpay.com')).toBe(false)
  })
})
