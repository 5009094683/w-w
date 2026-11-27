import { createHmac } from 'node:crypto'
import type { Page } from '@playwright/test'
import { E2E } from '../../../playwright.config'

export interface OutboundCall {
  method: string
  host: string
  path: string
  authorization: string | null
  body: string
}

/** The calls the server made to outside services since the last reset. */
export async function outboundCalls(): Promise<OutboundCall[]> {
  return (await fetch(`${E2E.controlURL}/calls`)).json() as Promise<OutboundCall[]>
}

export async function resetOutboundCalls() {
  await fetch(`${E2E.controlURL}/reset`, { method: 'POST' })
}

/** Replaces the Turnstile script with one that passes at once, as the real widget does for most visitors. */
export async function stubTurnstile(page: Page, token = 'e2e-turnstile-token') {
  await page.route('https://challenges.cloudflare.com/**', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.turnstile = {
      render: function (element, options) {
        element.textContent = 'Security check passed (test)';
        window.__turnstile = options;
        setTimeout(function () { options.callback(${JSON.stringify(token)}) }, 30);
        return 'widget-1';
      },
      reset: function () { setTimeout(function () { window.__turnstile.callback(${JSON.stringify(token)}) }, 30) },
      remove: function () {}
    };`,
  }))
}

/** Replaces Razorpay's checkout with one that pays at once and returns a correctly signed result. */
export async function stubRazorpay(page: Page, outcome: 'paid' | 'dismissed' = 'paid') {
  await page.exposeFunction('__signRazorpay', (orderId: string, paymentId: string) =>
    createHmac('sha256', E2E.razorpaySecret).update(`${orderId}|${paymentId}`).digest('hex'))

  await page.route('https://checkout.razorpay.com/**', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.Razorpay = function (options) {
      window.__razorpayOptions = { key: options.key, amount: options.amount, currency: options.currency, order_id: options.order_id };
      this.on = function () {};
      this.open = function () {
        if (${JSON.stringify(outcome)} === 'dismissed') { options.modal.ondismiss(); return; }
        window.__signRazorpay(options.order_id, 'pay_E2E0000000001').then(function (signature) {
          options.handler({ razorpay_order_id: options.order_id, razorpay_payment_id: 'pay_E2E0000000001', razorpay_signature: signature });
        });
      };
    };`,
  }))
}

/** Replaces PhonePe's checkout with one that reports the given result. */
export async function stubPhonePe(page: Page, result: 'CONCLUDED' | 'USER_CANCEL' = 'CONCLUDED') {
  await page.route('https://mercury.phonepe.com/**', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.PhonePeCheckout = { transact: function (options) {
      window.__phonepeOptions = { tokenUrl: options.tokenUrl, type: options.type };
      window.__storageDuringCheckout = Object.assign({}, sessionStorage);
      setTimeout(function () { options.callback(${JSON.stringify(result)}) }, 50);
    } };`,
  }))
}

/** Replaces the Zoho Payments widget with one that pays at once and returns a correctly signed result. */
export async function stubZoho(page: Page) {
  await page.exposeFunction('__signZoho', (paymentId: string, sessionId: string) =>
    createHmac('sha256', E2E.zohoSigningKey).update(`${paymentId}|${sessionId}`).digest('hex'))

  await page.route('https://static.zohocdn.com/**', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.ZPayments = function (config) {
      window.__zohoConfig = config;
      this.requestPaymentMethod = function (options) {
        window.__zohoOptions = options;
        return window.__signZoho('173000002315107', options.payments_session_id).then(function (signature) {
          return { payment_id: '173000002315107', signature: signature };
        });
      };
      this.close = function () { return Promise.resolve(); };
    };`,
  }))
}

/** Everything the browser received from or sent to the site's own API. */
export function recordApi(page: Page) {
  const exchanges: Array<{ path: string, status: number, request: string, response: string }> = []
  page.on('response', async (response) => {
    const url = new URL(response.url())
    if (!url.pathname.startsWith('/api/')) {
      return
    }
    exchanges.push({
      path: url.pathname,
      status: response.status(),
      request: response.request().postData() ?? '',
      response: await response.text().catch(() => ''),
    })
  })
  return exchanges
}
