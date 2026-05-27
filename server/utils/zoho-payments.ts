interface ZohoRuntimeConfig {
  zohoAccountId?: string
  zohoIsSandbox?: boolean
  zohoClientId?: string
  zohoClientSecret?: string
  zohoRefreshToken?: string
}

interface ZohoTokenResponse {
  access_token: string
  expires_in?: number
}

export function getZohoPaymentsBaseUrl(isSandbox?: boolean) {
  return isSandbox
    ? 'https://paymentssandbox.zoho.in'
    : 'https://payments.zoho.in'
}

export function getZohoPaymentsApiUrl(config: ZohoRuntimeConfig, path: string) {
  const baseUrl = getZohoPaymentsBaseUrl(config.zohoIsSandbox)
  const accountQuery = config.zohoAccountId
    ? `?account_id=${encodeURIComponent(config.zohoAccountId)}`
    : ''

  return `${baseUrl}/api/v1/${path}${accountQuery}`
}

export function assertZohoAccountConfigured(config: ZohoRuntimeConfig) {
  if (!config.zohoAccountId) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Zoho Payments account ID not configured'
    })
  }
}

export async function getZohoAccessToken(config: ZohoRuntimeConfig) {
  if (!config.zohoClientId || !config.zohoClientSecret || !config.zohoRefreshToken) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Zoho OAuth credentials not configured'
    })
  }

  const params = new URLSearchParams({
    refresh_token: config.zohoRefreshToken,
    client_id: config.zohoClientId,
    client_secret: config.zohoClientSecret,
    grant_type: 'refresh_token'
  })

  const response = await $fetch<ZohoTokenResponse>(
    `https://accounts.zoho.in/oauth/v2/token?${params.toString()}`,
    { method: 'POST' }
  )

  return response.access_token
}
