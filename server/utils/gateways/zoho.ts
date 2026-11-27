import type { H3Event } from 'h3'
import { readEnv, readEnvFlag } from '../env'
import { hmacSha256Hex, safeEqual } from '../security'
import { GatewayError, GatewayNotConfiguredError, gatewayJson } from './http'

const TOKEN_URL = 'https://accounts.zoho.in/oauth/v2/token'

export interface ZohoConfig {
  accountId: string
  /** The public key the checkout widget is opened with. */
  apiKey: string
  /** Signs the widget's result, so a payment result cannot be forged. */
  signingKey: string
  clientId: string
  clientSecret: string
  refreshToken: string
  sandbox: boolean
}

interface ZohoSession {
  payments_session_id: string
  currency: string
  amount: string
  reference_number?: string
}

export interface ZohoPayment {
  payment_id: string
  amount: string
  currency: string
  status: string
  payments_session_id?: string
  date?: number
  payment_method?: { type?: string }
}

export function zohoConfig(event: H3Event): ZohoConfig {
  const settings = {
    accountId: readEnv(event, 'ZOHO_ACCOUNT_ID'),
    apiKey: readEnv(event, 'ZOHO_API_KEY'),
    signingKey: readEnv(event, 'ZOHO_SIGN_KEY'),
    clientId: readEnv(event, 'ZOHO_CLIENT_ID'),
    clientSecret: readEnv(event, 'ZOHO_CLIENT_SECRET'),
    refreshToken: readEnv(event, 'ZOHO_REFRESH_TOKEN'),
  }

  const missing = Object.entries(settings).filter(([, value]) => !value).map(([name]) => name)
  if (missing.length) {
    throw new GatewayNotConfiguredError('zoho', `missing ${missing.join(', ')}`)
  }

  return { ...(settings as Record<keyof typeof settings, string>), sandbox: readEnvFlag(event, 'ZOHO_IS_SANDBOX') }
}

function apiUrl(config: ZohoConfig, path: string) {
  const host = config.sandbox ? 'https://paymentssandbox.zoho.in' : 'https://payments.zoho.in'
  return `${host}/api/v1/${path}?account_id=${encodeURIComponent(config.accountId)}`
}

/** Exchanges the refresh token for a short-lived access token. It stays on the server. */
async function accessToken(config: ZohoConfig): Promise<string> {
  const query = new URLSearchParams({
    refresh_token: config.refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'refresh_token',
  })
  const response = await gatewayJson<{ access_token?: string }>('zoho', `${TOKEN_URL}?${query}`, { method: 'POST' })

  if (!response.access_token) {
    throw new GatewayError('zoho', 502, 'token response had no access_token')
  }
  return response.access_token
}

export async function createZohoSession(config: ZohoConfig, order: { amount: number, referenceNumber: string }) {
  const token = await accessToken(config)

  const response = await gatewayJson<{ payments_session: ZohoSession }>('zoho', apiUrl(config, 'paymentsessions'), {
    method: 'POST',
    headers: { 'Authorization': `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: order.amount,
      currency: 'INR',
      description: `Payment of INR ${order.amount} for YBX Labs`,
      reference_number: order.referenceNumber,
    }),
  })
  return response.payments_session
}

export async function fetchZohoPayment(config: ZohoConfig, paymentId: string) {
  const token = await accessToken(config)

  const response = await gatewayJson<{ payment: ZohoPayment }>('zoho', apiUrl(config, `payments/${encodeURIComponent(paymentId)}`), {
    method: 'GET',
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  })
  return response.payment
}

/** The widget signs "payment_id|payments_session_id" with the signing key. */
export function isValidZohoSignature(config: ZohoConfig, paymentId: string, sessionId: string, signature: string) {
  return safeEqual(hmacSha256Hex(config.signingKey, `${paymentId}|${sessionId}`), signature)
}
