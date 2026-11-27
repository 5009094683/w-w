interface PhonePeRuntimeConfig {
  phonepeClientId?: string
  phonepeApiKey?: string
}

interface PhonePeAuthResponse {
  access_token: string
  expires_at?: number
  token_type?: string
}

const PHONEPE_TOKEN_URL = 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token'

/**
 * Requests a PhonePe merchant access token. The token authorises payment
 * operations on the merchant account, so it must stay on the server: never
 * return it from an API route or include it in a response body.
 */
export async function getPhonePeAccessToken(config: PhonePeRuntimeConfig): Promise<string> {
  if (!config.phonepeClientId || !config.phonepeApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'PhonePe credentials not configured'
    })
  }

  const authPayload = new URLSearchParams({
    client_id: config.phonepeClientId,
    client_secret: config.phonepeApiKey,
    client_version: '1',
    grant_type: 'client_credentials'
  })

  const response = await $fetch<PhonePeAuthResponse>(PHONEPE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: authPayload.toString()
  })

  if (!response?.access_token) {
    throw createError({
      statusCode: 502,
      statusMessage: 'PhonePe authorization failed'
    })
  }

  return response.access_token
}

// PhonePe allows letters, digits, "_" and "-" in a merchant order ID, up to 63 characters.
export function isValidPhonePeMerchantOrderId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,63}$/.test(value)
}
