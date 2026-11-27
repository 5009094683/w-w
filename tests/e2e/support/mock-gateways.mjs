// Loaded before the server in end-to-end tests (node --import). It answers
// every call the server makes to an outside service, so the real payment and
// contact routes run in full without keys, charges or emails.
//
// Every outbound call is recorded and can be read by the tests from a small
// control server: GET /calls returns them, POST /reset clears them.

import http from 'node:http'

export const SECRETS = {
  phonepeToken: 'e2e-phonepe-token-that-must-stay-on-the-server',
  zohoToken: 'e2e-zoho-token-that-must-stay-on-the-server',
}

const CONTROL_PORT = Number(process.env.E2E_CONTROL_PORT || 4199)
const calls = []
let lastRazorpayOrder = { id: 'order_E2E0000000001', amount: 0, currency: 'INR' }
let lastPhonePeAmount = 0

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

function answer(url, method, headers, body) {
  const { hostname, pathname } = url

  if (hostname === 'challenges.cloudflare.com' && pathname.endsWith('/siteverify')) {
    const token = new URLSearchParams(body).get('response')
    return json(token === 'e2e-turnstile-token' ? { success: true } : { 'success': false, 'error-codes': ['invalid-input-response'] })
  }

  if (hostname === 'api.resend.com' && pathname === '/emails') {
    return JSON.parse(body).subject.includes('FAIL') ? json({ message: 'rejected by the mock' }, 422) : json({ id: 'email_e2e_1' })
  }

  if (hostname === 'api.razorpay.com') {
    if (method === 'POST' && pathname === '/v1/orders') {
      const order = JSON.parse(body)
      if (!Number.isInteger(order.amount)) {
        return json({ error: { code: 'BAD_REQUEST_ERROR', description: 'The amount must be an integer.' } }, 400)
      }
      lastRazorpayOrder = { id: `order_E2E${String(calls.length).padStart(10, '0')}`, amount: order.amount, currency: order.currency }
      return json({ ...lastRazorpayOrder, entity: 'order', status: 'created' })
    }
    const payment = /^\/v1\/payments\/(pay_\w+)$/.exec(pathname)
    if (method === 'GET' && payment) {
      return json({ id: payment[1], order_id: lastRazorpayOrder.id, amount: lastRazorpayOrder.amount, currency: lastRazorpayOrder.currency, status: 'captured', method: 'card', created_at: 1764200000 })
    }
  }

  if (hostname === 'api.phonepe.com') {
    if (pathname === '/apis/identity-manager/v1/oauth/token') {
      return json({ access_token: SECRETS.phonepeToken, token_type: 'O-Bearer' })
    }
    if (headers.authorization !== `O-Bearer ${SECRETS.phonepeToken}`) {
      return json({ code: 'AUTHORIZATION_FAILED' }, 401)
    }
    if (pathname === '/apis/pg/checkout/v2/pay') {
      lastPhonePeAmount = JSON.parse(body).amount
      return json({ orderId: 'OMO_E2E_0001', state: 'PENDING', expireAt: Date.now() + 1200000, redirectUrl: 'https://mercury.phonepe.com/transact/pgv3?token=e2e-per-order-token' })
    }
    if (/^\/apis\/pg\/checkout\/v2\/order\/[^/]+\/status$/.test(pathname)) {
      const pending = pathname.includes('PENDING')
      return json({
        orderId: 'OMO_E2E_0001',
        state: pending ? 'PENDING' : 'COMPLETED',
        amount: lastPhonePeAmount || 10000,
        paymentDetails: pending ? [] : [{ transactionId: 'OM_E2E_TXN_1', paymentMode: 'UPI_QR', timestamp: 1764200000000 }],
      })
    }
  }

  if (hostname === 'accounts.zoho.in' && pathname === '/oauth/v2/token') {
    return json({ access_token: SECRETS.zohoToken })
  }
  if (hostname === 'paymentssandbox.zoho.in') {
    if (headers.authorization !== `Zoho-oauthtoken ${SECRETS.zohoToken}`) {
      return json({ code: 'unauthorized' }, 401)
    }
    if (method === 'POST' && pathname === '/api/v1/paymentsessions') {
      return json({ payments_session: { payments_session_id: '2000000012001', currency: 'INR', amount: String(JSON.parse(body).amount) } })
    }
    const payment = /^\/api\/v1\/payments\/(\w+)$/.exec(pathname)
    if (method === 'GET' && payment) {
      return json({ payment: { payment_id: payment[1], amount: '499.50', currency: 'INR', status: 'succeeded', payments_session_id: '2000000012001', date: 1764200000000, payment_method: { type: 'upi' } } })
    }
  }

  return undefined
}

const realFetch = globalThis.fetch

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url ?? String(input))
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = Object.fromEntries(new Headers(init.headers ?? {}).entries())
  const body = init.body == null ? '' : String(init.body)

  const response = answer(url, method, headers, body)
  if (!response) {
    if (['127.0.0.1', 'localhost'].includes(url.hostname)) {
      return realFetch(input, init)
    }
    throw new Error(`[e2e] the server made an unexpected outside request: ${method} ${url}`)
  }

  calls.push({ method, host: url.hostname, path: url.pathname + url.search, authorization: headers.authorization ?? null, body })
  return response
}

http.createServer((request, response) => {
  if (request.method === 'POST' && request.url === '/reset') {
    calls.length = 0
  }
  response.writeHead(200, { 'content-type': 'application/json' })
  response.end(JSON.stringify(calls))
}).listen(CONTROL_PORT, '127.0.0.1').unref()
