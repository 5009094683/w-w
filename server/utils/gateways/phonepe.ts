import type { H3Event } from 'h3'
import { readEnv } from '../env'
import { GatewayError, GatewayNotConfiguredError, gatewayJson } from './http'

const TOKEN_URL = 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token'
const API = 'https://api.phonepe.com/apis/pg/checkout/v2'

export interface PhonePeConfig {
  clientId: string
  clientSecret: string
  clientVersion: string
}

interface PhonePeOrder {
  orderId: string
  state: string
  expireAt: number
  redirectUrl: string
}

export interface PhonePeOrderStatus {
  orderId: string
  state: string
  amount: number
  paymentDetails?: Array<{ transactionId: string, paymentMode: string, timestamp: number }>
}

export function phonepeConfig(event: H3Event): PhonePeConfig {
  const clientId = readEnv(event, 'PHONEPE_CLIENT_ID')
  const clientSecret = readEnv(event, 'PHONEPE_API_KEY')

  if (!clientId || !clientSecret) {
    throw new GatewayNotConfiguredError('phonepe', 'client ID or API key is missing')
  }
  return { clientId, clientSecret, clientVersion: readEnv(event, 'PHONEPE_CLIENT_VERSION') ?? '1' }
}

/** PhonePe allows letters, digits, "_" and "-" in a merchant order ID, up to 63 characters. */
export function isPhonePeOrderId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,63}$/.test(value)
}

export function newPhonePeOrderId(): string {
  return `ORDER_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
}

/**
 * Requests a merchant access token. The token authorizes payment operations
 * on the merchant account, so it is used inside the server only and is never
 * returned from a route.
 */
async function accessToken(config: PhonePeConfig): Promise<string> {
  const response = await gatewayJson<{ access_token?: string }>('phonepe', TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      client_version: config.clientVersion,
      grant_type: 'client_credentials',
    }).toString(),
  })

  if (!response.access_token) {
    throw new GatewayError('phonepe', 502, 'token response had no access_token')
  }
  return response.access_token
}

export async function createPhonePeOrder(
  config: PhonePeConfig,
  order: { merchantOrderId: string, amountInPaise: number, displayAmount: string, redirectUrl: string },
) {
  const token = await accessToken(config)

  return gatewayJson<PhonePeOrder>('phonepe', `${API}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `O-Bearer ${token}` },
    body: JSON.stringify({
      merchantOrderId: order.merchantOrderId,
      amount: order.amountInPaise,
      expireAfter: 1200,
      metaInfo: {
        udf1: 'YBX Labs Payment',
        udf2: 'INR',
        udf3: order.displayAmount,
        udf4: 'Web Payment',
        udf5: 'PhonePe Gateway',
      },
      paymentFlow: {
        type: 'PG_CHECKOUT',
        message: `Payment of INR ${order.displayAmount} for YBX Labs`,
        merchantUrls: { redirectUrl: order.redirectUrl },
      },
    }),
  })
}

export async function fetchPhonePeOrderStatus(config: PhonePeConfig, merchantOrderId: string) {
  const token = await accessToken(config)

  return gatewayJson<PhonePeOrderStatus>('phonepe', `${API}/order/${encodeURIComponent(merchantOrderId)}/status`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', 'Authorization': `O-Bearer ${token}` },
  })
}
