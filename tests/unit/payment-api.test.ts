import { createHmac } from 'node:crypto'
import { existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { calls, callsTo, request, respond, type GatewayCall, type TestEvent } from './setup'

type Handler = (event: TestEvent) => Promise<Record<string, unknown>>

const createOrder = (await import('../../server/api/payment/create-order.post')).default as unknown as Handler
const verify = (await import('../../server/api/payment/verify.post')).default as unknown as Handler

const TURNSTILE = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const RAZORPAY = 'https://api.razorpay.com/v1'
const PHONEPE_TOKEN = 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token'
const PHONEPE_API = 'https://api.phonepe.com/apis/pg/checkout/v2'
const ZOHO_TOKEN = 'https://accounts.zoho.in/oauth/v2/token'
const ZOHO_API = 'https://paymentssandbox.zoho.in/api/v1'

const PHONEPE_SERVER_TOKEN = 'phonepe-token-that-must-stay-on-the-server'
const ZOHO_SERVER_TOKEN = 'zoho-token-that-must-stay-on-the-server'
const RAZORPAY_SECRET = 'unit-test-razorpay-secret'
const ZOHO_SIGNING_KEY = 'unit-test-zoho-signing-key'

const env = {
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
  RAZORPAY_IS_SANDBOX: 'true',
  RAZORPAY_TEST_KEY_ID: 'rzp_test_unit',
  RAZORPAY_TEST_KEY_SECRET: RAZORPAY_SECRET,
  PHONEPE_CLIENT_ID: 'phonepe-client',
  PHONEPE_API_KEY: 'phonepe-secret',
  ZOHO_ACCOUNT_ID: '23137556',
  ZOHO_API_KEY: 'zoho-widget-key',
  ZOHO_SIGN_KEY: ZOHO_SIGNING_KEY,
  ZOHO_CLIENT_ID: 'zoho-client',
  ZOHO_CLIENT_SECRET: 'zoho-client-secret',
  ZOHO_REFRESH_TOKEN: 'zoho-refresh-token',
  ZOHO_IS_SANDBOX: 'true',
}

/** Answers like the gateways do, unless a test overrides a call. */
function gateways(overrides: (call: GatewayCall) => unknown = () => undefined) {
  respond((call) => {
    const override = overrides(call)
    if (override !== undefined) return override

    if (call.url === TURNSTILE) return { success: true }
    if (call.url === `${RAZORPAY}/orders`) {
      const order = JSON.parse(call.body)
      return { id: 'order_UnitTest0001', amount: order.amount, currency: order.currency }
    }
    if (call.url === PHONEPE_TOKEN) return { access_token: PHONEPE_SERVER_TOKEN }
    if (call.url === `${PHONEPE_API}/pay`) {
      return { orderId: 'OMO123456789', state: 'PENDING', expireAt: 1900000000000, redirectUrl: 'https://mercury.phonepe.com/transact/pgv3?token=per-order' }
    }
    if (call.url.startsWith(`${PHONEPE_API}/order/`)) {
      return { orderId: 'OMO123456789', state: 'COMPLETED', amount: 10000, paymentDetails: [{ transactionId: 'OM987654321', paymentMode: 'UPI_QR', timestamp: 1800000000000 }] }
    }
    if (call.url.startsWith(ZOHO_TOKEN)) return { access_token: ZOHO_SERVER_TOKEN }
    if (call.url.startsWith(`${ZOHO_API}/paymentsessions`)) {
      return { payments_session: { payments_session_id: '2000000012001', currency: 'INR', amount: String(JSON.parse(call.body).amount) } }
    }
    throw new Error(`Unexpected outbound request to ${call.url}`)
  })
}

const order = (body: Record<string, unknown>, variables: Record<string, string> = env) =>
  createOrder(request({ turnstileToken: 'visitor-token', ...body }, variables, 'https://ybxlabs.test/api/payment/create-order'))

describe('create-order: the security check', () => {
  it('sends the visitor token to Turnstile with the secret key', async () => {
    gateways()
    await order({ amount: 100, currency: 'INR' })

    const [check] = callsTo(TURNSTILE)
    const form = new URLSearchParams(check?.body)
    expect(form.get('secret')).toBe('turnstile-secret')
    expect(form.get('response')).toBe('visitor-token')
    expect(form.get('remoteip')).toBe('203.0.113.7')
  })

  it('refuses to run when no secret key is configured', async () => {
    gateways()
    const { TURNSTILE_SECRET_KEY: _removed, ...withoutSecret } = env

    await expect(order({ amount: 100 }, withoutSecret)).rejects.toMatchObject({ statusCode: 503 })
    expect(calls).toHaveLength(0)
  })

  it('refuses a request without a token', async () => {
    gateways()
    await expect(order({ amount: 100, turnstileToken: undefined })).rejects.toMatchObject({ statusCode: 403 })
    expect(calls).toHaveLength(0)
  })

  it('refuses a token Turnstile rejects, and creates no order', async () => {
    gateways(call => (call.url === TURNSTILE ? { 'success': false, 'error-codes': ['invalid-input-response'] } : undefined))

    await expect(order({ amount: 100 })).rejects.toMatchObject({ statusCode: 403 })
    expect(callsTo(RAZORPAY)).toHaveLength(0)
  })

  it('does not trust the Host header to skip the check', async () => {
    gateways(call => (call.url === TURNSTILE ? { success: false } : undefined))
    const event = request({ amount: 100, turnstileToken: 'x' }, env, 'http://localhost:3000/api/payment/create-order')

    await expect(createOrder(event)).rejects.toMatchObject({ statusCode: 403 })
  })
})

describe('create-order with Razorpay', () => {
  it.each([
    [100, 'INR', 10000],
    [19.99, 'USD', 1999],
    [25.5, 'GBP', 2550],
    [1000, 'JPY', 1000],
    [50000, 'KRW', 50000],
    [100000, 'VND', 100000],
    [5, 'KWD', 5000],
    [5.25, 'BHD', 5250],
  ])('sends %s %s as %i', async (amount, currency, expected) => {
    gateways()
    const response = await order({ amount, currency })

    const [call] = callsTo(`${RAZORPAY}/orders`)
    expect(JSON.parse(call!.body)).toMatchObject({ amount: expected, currency, payment_capture: 1 })
    expect(call?.headers.authorization).toBe(`Basic ${btoa(`rzp_test_unit:${RAZORPAY_SECRET}`)}`)
    expect(response).toEqual({
      success: true,
      gateway: 'razorpay',
      order_id: 'order_UnitTest0001',
      amount: expected,
      currency,
      key_id: 'rzp_test_unit',
      is_test_mode: true,
    })
  })

  it('never returns the key secret', async () => {
    gateways()
    expect(JSON.stringify(await order({ amount: 100 }))).not.toContain(RAZORPAY_SECRET)
  })

  it('uses Razorpay for any currency other than INR, whatever gateway was asked for', async () => {
    gateways()
    const response = await order({ amount: 50, currency: 'USD', gateway: 'phonepe' })

    expect(response.gateway).toBe('razorpay')
    expect(callsTo(PHONEPE_TOKEN)).toHaveLength(0)
  })

  it.each([
    [100.5, 'JPY', 'JPY amounts cannot have decimals'],
    [10.555, 'USD', 'USD amounts can have at most 2 decimal places'],
    [99.991, 'KWD', 'KWD amounts can have at most 2 decimal places'],
    [-10, 'INR', 'Amount must be a positive number'],
    ['ten', 'INR', 'Amount must be a positive number'],
    [100, 'RUPEES', 'Currency must be a 3-letter ISO code'],
  ])('rejects %s %s before any outside call', async (amount, currency, message) => {
    gateways()
    await expect(order({ amount, currency })).rejects.toMatchObject({ statusCode: 400, statusMessage: message })
    expect(calls).toHaveLength(0)
  })

  it('requires an amount', async () => {
    gateways()
    await expect(order({ currency: 'INR' })).rejects.toMatchObject({ statusCode: 400, statusMessage: 'Amount is required' })
  })

  it('passes on Razorpay\'s own explanation of a rejected order', async () => {
    gateways(call => (call.url === `${RAZORPAY}/orders`
      ? new Response(JSON.stringify({ error: { code: 'BAD_REQUEST_ERROR', description: 'The amount must be at least INR 1.00' } }), { status: 400 })
      : undefined))

    await expect(order({ amount: 0.5 })).rejects.toMatchObject({ statusCode: 400, statusMessage: 'The amount must be at least INR 1.00' })
  })

  it('reports wrong credentials as unavailable, with no details about the keys', async () => {
    gateways(call => (call.url === `${RAZORPAY}/orders`
      ? new Response(JSON.stringify({ error: { description: 'Authentication failed' } }), { status: 401 })
      : undefined))

    const error = await order({ amount: 100 }).catch(cause => cause)
    expect(error).toMatchObject({ statusCode: 503 })
    expect(JSON.stringify({ message: error.statusMessage, data: error.data })).not.toMatch(/rzp_|secret|fingerprint|Authentication/i)
  })

  it.each([
    ['no keys', { RAZORPAY_TEST_KEY_ID: '', RAZORPAY_TEST_KEY_SECRET: '' }],
    ['a live key in sandbox mode', { RAZORPAY_TEST_KEY_ID: 'rzp_live_unit' }],
    ['a test key in live mode', { RAZORPAY_IS_SANDBOX: 'false', RAZORPAY_KEY_ID: 'rzp_test_unit', RAZORPAY_KEY_SECRET: 'x' }],
  ])('answers "not configured" with %s', async (_label, change) => {
    gateways()
    await expect(order({ amount: 100 }, { ...env, ...change })).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: 'Razorpay is not configured on this site. Please choose another payment method or contact us.',
    })
    expect(callsTo(RAZORPAY)).toHaveLength(0)
  })

  it('reads settings given with the NUXT_ prefix', async () => {
    gateways()
    const prefixed = Object.fromEntries(Object.entries(env).map(([name, value]) => [`NUXT_${name}`, value]))

    await expect(order({ amount: 100 }, prefixed)).resolves.toMatchObject({ success: true, key_id: 'rzp_test_unit' })
  })
})

describe('create-order with PhonePe', () => {
  it('creates the order with a token fetched on the server and never returns it', async () => {
    gateways()
    const response = await order({ amount: 100, currency: 'INR', gateway: 'phonepe' })

    expect(response).toEqual({
      success: true,
      gateway: 'phonepe',
      order_id: 'OMO123456789',
      merchant_order_id: expect.stringMatching(/^ORDER_\d+_[a-f0-9]{16}$/),
      amount: 100,
      currency: 'INR',
      redirect_url: 'https://mercury.phonepe.com/transact/pgv3?token=per-order',
    })
    expect(JSON.stringify(response)).not.toContain(PHONEPE_SERVER_TOKEN)

    const [pay] = callsTo(`${PHONEPE_API}/pay`)
    const body = JSON.parse(pay!.body)
    expect(pay?.headers.authorization).toBe(`O-Bearer ${PHONEPE_SERVER_TOKEN}`)
    expect(body.amount).toBe(10000)
    expect(body.merchantOrderId).toBe(response.merchant_order_id)
  })

  it('sends the customer back to a page that exists, with the order in the address', async () => {
    gateways()
    const response = await order({ amount: 100, gateway: 'phonepe' })

    const body = JSON.parse(callsTo(`${PHONEPE_API}/pay`)[0]!.body)
    expect(body.paymentFlow.merchantUrls.redirectUrl).toBe(`https://ybxlabs.test/payment/success?gateway=phonepe&order=${response.merchant_order_id}`)
    expect(existsSync(fileURLToPath(new URL('../../app/pages/payment/success.vue', import.meta.url)))).toBe(true)
  })

  it('sends an exact number of paise', async () => {
    gateways()
    await order({ amount: 19.99, gateway: 'phonepe' })

    expect(JSON.parse(callsTo(`${PHONEPE_API}/pay`)[0]!.body).amount).toBe(1999)
  })

  it('answers "not configured" without credentials', async () => {
    gateways()
    await expect(order({ amount: 100, gateway: 'phonepe' }, { ...env, PHONEPE_API_KEY: '' })).rejects.toMatchObject({ statusCode: 503 })
    expect(callsTo(PHONEPE_TOKEN)).toHaveLength(0)
  })
})

describe('create-order with Zoho Payments', () => {
  it('creates the session in rupees and never returns the OAuth token', async () => {
    gateways()
    const response = await order({ amount: 499.5, gateway: 'zoho' })

    expect(response).toMatchObject({
      success: true,
      gateway: 'zoho',
      payment_session_id: '2000000012001',
      amount: 499.5,
      currency: 'INR',
      account_id: '23137556',
      api_key: 'zoho-widget-key',
      is_test_mode: true,
    })
    expect(JSON.stringify(response)).not.toContain(ZOHO_SERVER_TOKEN)
    expect(JSON.stringify(response)).not.toContain(ZOHO_SIGNING_KEY)

    const [session] = callsTo(`${ZOHO_API}/paymentsessions`)
    expect(session?.headers.authorization).toBe(`Zoho-oauthtoken ${ZOHO_SERVER_TOKEN}`)
    expect(JSON.parse(session!.body)).toMatchObject({ amount: 499.5, currency: 'INR' })
  })

  it('is not offered without a signing key, so no payment can go unverified', async () => {
    gateways()
    await expect(order({ amount: 100, gateway: 'zoho' }, { ...env, ZOHO_SIGN_KEY: '' })).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: 'Zoho Payments is not configured on this site. Please choose another payment method or contact us.',
    })
    expect(callsTo(ZOHO_TOKEN)).toHaveLength(0)
  })
})

describe('verify with Razorpay', () => {
  const sign = (orderId: string, paymentId: string) => createHmac('sha256', RAZORPAY_SECRET).update(`${orderId}|${paymentId}`).digest('hex')
  const body = (override: Record<string, unknown> = {}) => ({
    gateway: 'razorpay',
    razorpay_order_id: 'order_UnitTest0001',
    razorpay_payment_id: 'pay_UnitTest0001',
    razorpay_signature: sign('order_UnitTest0001', 'pay_UnitTest0001'),
    ...override,
  })
  const payment = (override: Record<string, unknown> = {}) => (call: GatewayCall) => (call.url === `${RAZORPAY}/payments/pay_UnitTest0001`
    ? { id: 'pay_UnitTest0001', order_id: 'order_UnitTest0001', amount: 10000, currency: 'INR', status: 'captured', method: 'card', created_at: 1764200000, ...override }
    : undefined)

  it.each([
    [10000, 'INR', 100],
    [1999, 'USD', 19.99],
    [1000, 'JPY', 1000],
    [5250, 'KWD', 5.25],
  ])('reports %i %s units as %s', async (amount, currency, expected) => {
    gateways(payment({ amount, currency }))

    await expect(verify(request(body(), env))).resolves.toEqual({
      success: true,
      gateway: 'razorpay',
      payment_id: 'pay_UnitTest0001',
      order_id: 'order_UnitTest0001',
      amount: expected,
      currency,
      status: 'captured',
      method: 'card',
      created_at: 1764200000,
    })
  })

  it('treats a request without a gateway as Razorpay, as before', async () => {
    gateways(payment())
    const { gateway: _removed, ...legacy } = body()

    await expect(verify(request(legacy, env))).resolves.toMatchObject({ success: true, gateway: 'razorpay' })
  })

  it('rejects a signature made for another payment, without asking Razorpay', async () => {
    gateways(payment())
    await expect(verify(request(body({ razorpay_signature: sign('order_UnitTest0001', 'pay_Other') }), env)))
      .rejects.toMatchObject({ statusCode: 400, statusMessage: 'Invalid payment signature' })
    expect(callsTo(RAZORPAY)).toHaveLength(0)
  })

  it('rejects a payment that belongs to a different order', async () => {
    gateways(payment({ order_id: 'order_Other' }))
    await expect(verify(request(body(), env))).rejects.toMatchObject({ statusCode: 400, statusMessage: 'Payment does not belong to this order' })
  })

  it('does not call a failed payment successful', async () => {
    gateways(payment({ status: 'failed' }))
    await expect(verify(request(body(), env))).resolves.toMatchObject({ success: false, status: 'failed' })
  })

  it.each([
    ['a missing signature', { razorpay_signature: undefined }],
    ['a path in the payment ID', { razorpay_payment_id: 'pay_1/../../orders' }],
    ['a signature that is not hex', { razorpay_signature: 'z'.repeat(64) }],
  ])('rejects %s', async (_label, change) => {
    gateways(payment())
    await expect(verify(request(body(change), env))).rejects.toMatchObject({ statusCode: 400 })
    expect(calls).toHaveLength(0)
  })
})

describe('verify with PhonePe', () => {
  const merchantOrderId = 'ORDER_1764200000000_0123456789abcdef'

  it('needs only the merchant order ID from the browser', async () => {
    gateways()
    const response = await verify(request({ gateway: 'phonepe', merchantOrderId }, env))

    expect(response).toMatchObject({
      success: true,
      gateway: 'phonepe',
      merchant_order_id: merchantOrderId,
      payment_id: 'OM987654321',
      amount: 100,
      currency: 'INR',
      status: 'COMPLETED',
      method: 'upi_qr',
    })
    expect(JSON.stringify(response)).not.toContain(PHONEPE_SERVER_TOKEN)

    const [status] = callsTo(`${PHONEPE_API}/order/`)
    expect(status?.url).toBe(`${PHONEPE_API}/order/${merchantOrderId}/status`)
    expect(status?.headers.authorization).toBe(`O-Bearer ${PHONEPE_SERVER_TOKEN}`)
  })

  it('ignores an access token supplied by the caller', async () => {
    gateways()
    await verify(request({ gateway: 'phonepe', merchantOrderId, accessToken: 'token-from-the-browser' }, env))

    expect(callsTo(`${PHONEPE_API}/order/`)[0]?.headers.authorization).toBe(`O-Bearer ${PHONEPE_SERVER_TOKEN}`)
  })

  it('reports an unfinished payment as unsuccessful', async () => {
    gateways(call => (call.url.startsWith(`${PHONEPE_API}/order/`) ? { orderId: 'OMO123456789', state: 'PENDING', amount: 10000 } : undefined))

    await expect(verify(request({ gateway: 'phonepe', merchantOrderId }, env))).resolves.toMatchObject({ success: false, status: 'PENDING' })
  })

  it.each([
    ['a path traversal', '../../../payments/v2/refund'],
    ['a nested path', 'ORDER_1/status'],
    ['a query string', 'ORDER_1?details=true'],
    ['an over-long ID', 'A'.repeat(64)],
    ['a number', 1764200000000],
    ['nothing', undefined],
  ])('rejects %s without contacting PhonePe', async (_label, bad) => {
    gateways()
    await expect(verify(request({ gateway: 'phonepe', merchantOrderId: bad }, env))).rejects.toMatchObject({ statusCode: 400 })
    expect(calls).toHaveLength(0)
  })
})

describe('verify with Zoho Payments', () => {
  const sign = (paymentId: string, sessionId: string) => createHmac('sha256', ZOHO_SIGNING_KEY).update(`${paymentId}|${sessionId}`).digest('hex')
  const body = (override: Record<string, unknown> = {}) => ({
    gateway: 'zoho',
    paymentId: '173000002315107',
    paymentSessionId: '2000000012001',
    signature: sign('173000002315107', '2000000012001'),
    ...override,
  })
  const payment = (override: Record<string, unknown> = {}) => (call: GatewayCall) => (call.url.startsWith(`${ZOHO_API}/payments/173000002315107`)
    ? { payment: { payment_id: '173000002315107', amount: '499.50', currency: 'INR', status: 'succeeded', payments_session_id: '2000000012001', date: 1764200000000, payment_method: { type: 'upi' }, ...override } }
    : undefined)

  it('confirms a signed, succeeded payment', async () => {
    gateways(payment())
    await expect(verify(request(body(), env))).resolves.toEqual({
      success: true,
      gateway: 'zoho',
      payment_id: '173000002315107',
      order_id: '2000000012001',
      amount: 499.5,
      currency: 'INR',
      status: 'succeeded',
      method: 'upi',
      created_at: 1764200000,
    })
  })

  it('always requires the signature', async () => {
    gateways(payment())
    await expect(verify(request(body({ signature: undefined }), env))).rejects.toMatchObject({ statusCode: 400 })
    await expect(verify(request(body({ signature: sign('173000002315107', 'another-session') }), env)))
      .rejects.toMatchObject({ statusCode: 400, statusMessage: 'Invalid payment signature' })
    expect(callsTo(ZOHO_API)).toHaveLength(0)
  })

  it('rejects a payment made in a different session', async () => {
    gateways(payment({ payments_session_id: '2000000099999' }))
    await expect(verify(request(body(), env))).rejects.toMatchObject({ statusCode: 400, statusMessage: 'Payment does not belong to this session' })
  })

  it('does not call a failed payment successful', async () => {
    gateways(payment({ status: 'failed' }))
    await expect(verify(request(body(), env))).resolves.toMatchObject({ success: false, status: 'failed' })
  })
})

describe('public payment routes', () => {
  it('are only create-order and verify', () => {
    const folder = fileURLToPath(new URL('../../server/api/payment/', import.meta.url))

    expect(readdirSync(folder).sort()).toEqual(['create-order.post.ts', 'verify.post.ts'])
  })
})
