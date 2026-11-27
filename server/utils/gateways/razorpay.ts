import type { H3Event } from 'h3'
import { readEnv, readEnvFlag } from '../env'
import { hmacSha256Hex, safeEqual } from '../security'
import { GatewayNotConfiguredError, gatewayJson } from './http'

const API = 'https://api.razorpay.com/v1'

export interface RazorpayConfig {
  keyId: string
  keySecret: string
  sandbox: boolean
}

interface RazorpayOrder {
  id: string
  amount: number
  currency: string
}

export interface RazorpayPayment {
  id: string
  order_id: string | null
  amount: number
  currency: string
  status: string
  method: string
  created_at: number
}

/**
 * RAZORPAY_IS_SANDBOX chooses between the test and the live key pair. A test
 * key in live mode, or the reverse, is refused before anything is sent.
 */
export function razorpayConfig(event: H3Event): RazorpayConfig {
  const sandbox = readEnvFlag(event, 'RAZORPAY_IS_SANDBOX')
  const keyId = readEnv(event, sandbox ? 'RAZORPAY_TEST_KEY_ID' : 'RAZORPAY_KEY_ID')
  const keySecret = readEnv(event, sandbox ? 'RAZORPAY_TEST_KEY_SECRET' : 'RAZORPAY_KEY_SECRET')

  if (!keyId || !keySecret) {
    throw new GatewayNotConfiguredError('razorpay', `${sandbox ? 'test' : 'live'} key ID or key secret is missing`)
  }
  if (sandbox && keyId.startsWith('rzp_live_')) {
    throw new GatewayNotConfiguredError('razorpay', 'sandbox mode is on but the key ID is a live key')
  }
  if (!sandbox && keyId.startsWith('rzp_test_')) {
    throw new GatewayNotConfiguredError('razorpay', 'live mode is on but the key ID is a test key')
  }

  return { keyId, keySecret, sandbox }
}

function headers(config: RazorpayConfig) {
  return {
    'Authorization': `Basic ${btoa(`${config.keyId}:${config.keySecret}`)}`,
    'Content-Type': 'application/json',
  }
}

export function createRazorpayOrder(config: RazorpayConfig, order: { amount: number, currency: string, receipt: string }) {
  return gatewayJson<RazorpayOrder>('razorpay', `${API}/orders`, {
    method: 'POST',
    headers: headers(config),
    body: JSON.stringify({ ...order, payment_capture: 1 }),
  })
}

export function fetchRazorpayPayment(config: RazorpayConfig, paymentId: string) {
  return gatewayJson<RazorpayPayment>('razorpay', `${API}/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: headers(config),
  })
}

/** Razorpay signs "order_id|payment_id" with the key secret after a successful payment. */
export function isValidRazorpaySignature(config: RazorpayConfig, orderId: string, paymentId: string, signature: string) {
  return safeEqual(hmacSha256Hex(config.keySecret, `${orderId}|${paymentId}`), signature)
}
