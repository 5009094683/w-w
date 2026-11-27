import { createHmac } from 'node:crypto'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runtimeConfig, type TestEvent } from './setup/nitro-globals'

const mocks = vi.hoisted(() => ({
  razorpayOrdersCreate: vi.fn(),
  razorpayPaymentsFetch: vi.fn()
}))

vi.mock('razorpay', () => ({
  default: class {
    orders = { create: mocks.razorpayOrdersCreate }
    payments = { fetch: mocks.razorpayPaymentsFetch }
  }
}))

type Handler = (event: TestEvent) => Promise<Record<string, unknown>>

const createOrder = (await import('../server/api/payment/create-order.post')).default as unknown as Handler
const verify = (await import('../server/api/payment/verify.post')).default as unknown as Handler
const phonepeCreateOrder = (await import('../server/api/payment/phonepe-create-order.post')).default as unknown as Handler
const phonepeVerify = (await import('../server/api/payment/phonepe-verify.post')).default as unknown as Handler

const SERVER_TOKEN = 'phonepe-token-that-must-stay-on-the-server'
const RAZORPAY_SECRET = 'unit-test-key-secret'
const PHONEPE_TOKEN_URL = 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token'
const PHONEPE_PAY_URL = 'https://api.phonepe.com/apis/pg/checkout/v2/pay'
const PHONEPE_ORDER_URL = 'https://api.phonepe.com/apis/pg/checkout/v2/order/'
const PHONEPE_CHECKOUT_URL = 'https://mercury.phonepe.com/transact/pgv3?token=per-order-checkout-token'
const ZOHO_SERVER_TOKEN = 'zoho-token-that-must-stay-on-the-server'
const ZOHO_TOKEN_URL = 'https://accounts.zoho.in/oauth/v2/token'
const ZOHO_SESSION_URL = 'https://paymentssandbox.zoho.in/api/v1/paymentsessions'

interface GatewayCall {
  url: string
  options: { method?: string, headers?: Record<string, string>, body?: unknown }
}

let gatewayCalls: GatewayCall[] = []

const callsTo = (prefix: string) => gatewayCalls.filter(call => call.url.startsWith(prefix))
const jsonBody = (call?: GatewayCall) => (call?.options.body ?? {}) as Record<string, unknown>
const formBody = (call?: GatewayCall) => new URLSearchParams(String(call?.options.body ?? ''))

// Stands in for Nitro's $fetch: internal routes run in-process, PhonePe is mocked.
const fetchStub = vi.fn(async (url: string, options: GatewayCall['options'] = {}) => {
  if (url === '/api/payment/phonepe-create-order') {
    return phonepeCreateOrder({ body: options.body })
  }
  if (url === '/api/payment/phonepe-verify') {
    return phonepeVerify({ body: options.body })
  }

  gatewayCalls.push({ url, options })

  if (url === PHONEPE_TOKEN_URL) {
    return { access_token: SERVER_TOKEN, expires_at: 1900000000, token_type: 'O-Bearer' }
  }
  if (url === PHONEPE_PAY_URL) {
    return { orderId: 'OMO123456789', state: 'PENDING', expireAt: 1900000000000, redirectUrl: PHONEPE_CHECKOUT_URL }
  }
  if (url.startsWith(PHONEPE_ORDER_URL)) {
    return {
      orderId: 'OMO123456789',
      state: 'COMPLETED',
      amount: 10000,
      expireAt: 1900000000000,
      paymentDetails: [{ transactionId: 'OM987654321', paymentMode: 'UPI_QR', timestamp: 1800000000000, amount: 10000, state: 'COMPLETED' }]
    }
  }
  if (url.startsWith(ZOHO_TOKEN_URL)) {
    return { access_token: ZOHO_SERVER_TOKEN, expires_in: 3600 }
  }
  if (url.startsWith(ZOHO_SESSION_URL)) {
    return {
      code: 0,
      message: 'success',
      payments_session: { payments_session_id: '2000000012001', currency: 'INR', amount: String((options.body as { amount: number }).amount) }
    }
  }

  throw new Error(`Unexpected outbound request to ${url}`)
})

const localRequest = (body: unknown): TestEvent => ({ body, headers: { host: 'localhost:3000' } })

beforeEach(() => {
  gatewayCalls = []
  fetchStub.mockClear()
  mocks.razorpayOrdersCreate.mockReset()
  mocks.razorpayPaymentsFetch.mockReset()
  mocks.razorpayOrdersCreate.mockImplementation(async (options: { amount: number, currency: string }) => ({
    id: 'order_unit_test',
    amount: options.amount,
    currency: options.currency
  }))

  vi.stubGlobal('$fetch', fetchStub)
  // The handlers log every failure; the rejection tests would flood the output.
  vi.spyOn(console, 'error').mockImplementation(() => {})

  for (const name of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_TEST_KEY_ID', 'RAZORPAY_TEST_KEY_SECRET', 'RAZORPAY_IS_SANDBOX']) {
    vi.stubEnv(name, '')
    vi.stubEnv(`NUXT_${name}`, '')
  }

  for (const key of Object.keys(runtimeConfig)) {
    Reflect.deleteProperty(runtimeConfig, key)
  }
  Object.assign(runtimeConfig, {
    razorpayIsSandbox: true,
    razorpayTestKeyId: 'rzp_test_unit',
    razorpayTestKeySecret: RAZORPAY_SECRET,
    phonepeClientId: 'unit-client-id',
    phonepeApiKey: 'unit-client-secret',
    zohoAccountId: '23137556',
    zohoApiKey: 'zoho-widget-key',
    zohoClientId: 'zoho-client-id',
    zohoClientSecret: 'zoho-client-secret',
    zohoRefreshToken: 'zoho-refresh-token',
    zohoIsSandbox: true,
    turnstile: {},
    public: { siteUrl: 'http://localhost:3000' }
  })
})

describe('create-order with PhonePe', () => {
  it('creates the order with a token fetched on the server and never returns that token', async () => {
    const response = await createOrder(localRequest({ amount: 100, currency: 'INR', gateway: 'phonepe' }))

    expect(response).toEqual({
      success: true,
      gateway: 'phonepe',
      order_id: 'OMO123456789',
      merchant_order_id: expect.stringMatching(/^ORDER_\d+_[a-z0-9]+$/),
      amount: 100,
      currency: 'INR',
      redirect_url: PHONEPE_CHECKOUT_URL
    })
    expect(JSON.stringify(response)).not.toContain(SERVER_TOKEN)

    const [tokenCall] = callsTo(PHONEPE_TOKEN_URL)
    expect(formBody(tokenCall).get('grant_type')).toBe('client_credentials')
    expect(formBody(tokenCall).get('client_id')).toBe('unit-client-id')

    const [payCall] = callsTo(PHONEPE_PAY_URL)
    expect(payCall?.options.headers?.Authorization).toBe(`O-Bearer ${SERVER_TOKEN}`)
    expect(jsonBody(payCall).amount).toBe(10000)
    expect(jsonBody(payCall).merchantOrderId).toBe(response.merchant_order_id)
  })

  it('sends an exact number of paise for amounts with decimals', async () => {
    await createOrder(localRequest({ amount: 19.99, currency: 'INR', gateway: 'phonepe' }))

    expect(jsonBody(callsTo(PHONEPE_PAY_URL)[0]).amount).toBe(1999)
  })

  it('fails without contacting PhonePe when credentials are missing', async () => {
    Reflect.deleteProperty(runtimeConfig, 'phonepeApiKey')

    await expect(createOrder(localRequest({ amount: 100, currency: 'INR', gateway: 'phonepe' })))
      .rejects.toMatchObject({ statusCode: 500, statusMessage: 'PhonePe credentials not configured' })
    expect(gatewayCalls).toHaveLength(0)
  })
})

describe('verify with PhonePe', () => {
  const merchantOrderId = 'ORDER_1764200000000_k3j9x0q2a'

  it('needs only the merchant order ID from the browser', async () => {
    const response = await verify(localRequest({ gateway: 'phonepe', merchantOrderId }))

    expect(response).toMatchObject({
      success: true,
      gateway: 'phonepe',
      merchant_order_id: merchantOrderId,
      amount: 100,
      currency: 'INR',
      status: 'COMPLETED',
      transaction_id: 'OM987654321'
    })
    expect(JSON.stringify(response)).not.toContain(SERVER_TOKEN)

    const [statusCall] = callsTo(PHONEPE_ORDER_URL)
    expect(statusCall?.url).toBe(`${PHONEPE_ORDER_URL}${merchantOrderId}/status`)
    expect(statusCall?.options.headers?.Authorization).toBe(`O-Bearer ${SERVER_TOKEN}`)
  })

  it('ignores an access token supplied by the caller', async () => {
    await verify(localRequest({ gateway: 'phonepe', merchantOrderId, accessToken: 'token-from-the-browser' }))

    expect(callsTo(PHONEPE_ORDER_URL)[0]?.options.headers?.Authorization).toBe(`O-Bearer ${SERVER_TOKEN}`)
  })

  it('reports an unfinished payment as unsuccessful', async () => {
    fetchStub.mockImplementationOnce(async (url: string, options = {}) => {
      gatewayCalls.push({ url, options })
      return { access_token: SERVER_TOKEN }
    })
    fetchStub.mockImplementationOnce(async (_url: string, options = {}) => phonepeVerify({ body: options.body }))
    fetchStub.mockImplementationOnce(async (url: string, options = {}) => {
      gatewayCalls.push({ url, options })
      return { orderId: 'OMO123456789', state: 'PENDING', amount: 10000, expireAt: 1900000000000 }
    })

    const response = await verify(localRequest({ gateway: 'phonepe', merchantOrderId }))

    expect(response).toMatchObject({ success: false, status: 'PENDING' })
  })

  it.each([
    ['a path traversal', '../../../payments/v2/refund'],
    ['a nested path', 'ORDER_1/status'],
    ['a query string', 'ORDER_1?details=true'],
    ['an over-long ID', 'A'.repeat(64)],
    ['a number', 1764200000000],
    ['an object', { id: 'ORDER_1' }]
  ])('rejects %s without contacting PhonePe', async (_label, badId) => {
    await expect(verify(localRequest({ gateway: 'phonepe', merchantOrderId: badId })))
      .rejects.toMatchObject({ statusCode: 400, statusMessage: 'Invalid PhonePe order ID' })
    expect(gatewayCalls).toHaveLength(0)
  })

  it('rejects a missing order ID', async () => {
    await expect(verify(localRequest({ gateway: 'phonepe' })))
      .rejects.toMatchObject({ statusCode: 400, statusMessage: 'Missing required PhonePe verification parameters' })
    expect(gatewayCalls).toHaveLength(0)
  })
})

describe('create-order with Zoho Payments', () => {
  it('creates the session in rupees and never returns the OAuth token', async () => {
    const response = await createOrder(localRequest({ amount: 499.5, currency: 'INR', gateway: 'zoho' }))

    expect(response).toMatchObject({
      success: true,
      gateway: 'zoho',
      payment_session_id: '2000000012001',
      amount: 499.5,
      currency: 'INR',
      account_id: '23137556',
      is_test_mode: true
    })
    expect(JSON.stringify(response)).not.toContain(ZOHO_SERVER_TOKEN)

    const [sessionCall] = callsTo(ZOHO_SESSION_URL)
    expect(sessionCall?.options.headers?.Authorization).toBe(`Zoho-oauthtoken ${ZOHO_SERVER_TOKEN}`)
    expect(jsonBody(sessionCall)).toMatchObject({ amount: 499.5, currency: 'INR' })
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
    [5.25, 'BHD', 5250]
  ])('sends %s %s to Razorpay as %i', async (amount, currency, expected) => {
    const response = await createOrder(localRequest({ amount, currency, gateway: 'razorpay' }))

    expect(mocks.razorpayOrdersCreate).toHaveBeenCalledOnce()
    expect(mocks.razorpayOrdersCreate.mock.calls[0]?.[0]).toMatchObject({ amount: expected, currency, payment_capture: 1 })
    expect(response).toMatchObject({
      success: true,
      gateway: 'razorpay',
      order_id: 'order_unit_test',
      amount: expected,
      currency,
      key_id: 'rzp_test_unit',
      is_test_mode: true
    })
  })

  it('defaults to INR when no currency is sent', async () => {
    await createOrder(localRequest({ amount: 250 }))

    expect(mocks.razorpayOrdersCreate.mock.calls[0]?.[0]).toMatchObject({ amount: 25000, currency: 'INR' })
  })

  it.each([
    [100.5, 'JPY', 'JPY amounts cannot have decimals'],
    [10.555, 'USD', 'USD amounts can have at most 2 decimal places'],
    [99.991, 'KWD', 'KWD amounts can have at most 2 decimal places'],
    [-10, 'INR', 'Amount must be a positive number'],
    ['ten', 'INR', 'Amount must be a positive number'],
    [100, 'RUPEES', 'Currency must be a 3-letter ISO code']
  ])('rejects %s %s with a 400 and creates no order', async (amount, currency, message) => {
    await expect(createOrder(localRequest({ amount, currency, gateway: 'razorpay' })))
      .rejects.toMatchObject({ statusCode: 400, statusMessage: message })
    expect(mocks.razorpayOrdersCreate).not.toHaveBeenCalled()
  })

  it('still requires an amount', async () => {
    await expect(createOrder(localRequest({ currency: 'INR' })))
      .rejects.toMatchObject({ statusCode: 400, statusMessage: 'Amount is required' })
  })
})

describe('verify with Razorpay', () => {
  const sign = (orderId: string, paymentId: string) =>
    createHmac('sha256', RAZORPAY_SECRET).update(`${orderId}|${paymentId}`).digest('hex')

  it.each([
    [10000, 'INR', 100],
    [1999, 'USD', 19.99],
    [1000, 'JPY', 1000],
    [5250, 'KWD', 5.25]
  ])('reports a payment of %i %s units as %s', async (minorAmount, currency, expected) => {
    mocks.razorpayPaymentsFetch.mockResolvedValue({
      amount: minorAmount,
      currency,
      status: 'captured',
      method: 'card',
      created_at: 1764200000
    })

    const response = await verify(localRequest({
      gateway: 'razorpay',
      razorpay_order_id: 'order_unit_test',
      razorpay_payment_id: 'pay_unit_test',
      razorpay_signature: sign('order_unit_test', 'pay_unit_test')
    }))

    expect(mocks.razorpayPaymentsFetch).toHaveBeenCalledWith('pay_unit_test')
    expect(response).toEqual({
      success: true,
      gateway: 'razorpay',
      payment_id: 'pay_unit_test',
      order_id: 'order_unit_test',
      amount: expected,
      currency,
      status: 'captured',
      method: 'card',
      created_at: 1764200000
    })
  })

  it('rejects a wrong signature without fetching the payment', async () => {
    await expect(verify(localRequest({
      gateway: 'razorpay',
      razorpay_order_id: 'order_unit_test',
      razorpay_payment_id: 'pay_unit_test',
      razorpay_signature: sign('order_unit_test', 'pay_someone_else')
    }))).rejects.toMatchObject({ statusCode: 400, statusMessage: 'Invalid payment signature' })
    expect(mocks.razorpayPaymentsFetch).not.toHaveBeenCalled()
  })
})

describe('gateway token routes', () => {
  it.each(['phonepe-auth.post.ts', 'zoho-auth.post.ts'])('%s stays removed', (file) => {
    const path = fileURLToPath(new URL(`../server/api/payment/${file}`, import.meta.url))

    expect(existsSync(path)).toBe(false)
  })
})
