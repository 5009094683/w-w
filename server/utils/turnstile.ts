import type { H3Event } from 'h3'

interface TurnstileVerifyResponse {
  success: boolean
  'error-codes'?: string[]
}

function shouldSkipTurnstile(event: H3Event) {
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  const host = getRequestHeader(event, 'host') || ''

  return /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)
}

export async function verifyTurnstileToken(options: {
  token?: string
  secretKey?: string
  remoteip?: string
}) {
  const { token, secretKey, remoteip } = options

  if (!secretKey) {
    return
  }

  if (!token) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Bot verification required. Please complete the security check.'
    })
  }

  const body: Record<string, string> = {
    secret: secretKey,
    response: token
  }

  if (remoteip) {
    body.remoteip = remoteip
  }

  const result = await $fetch<TurnstileVerifyResponse>(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    { method: 'POST', body }
  )

  if (!result.success) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Bot verification failed. Please try again.'
    })
  }
}

export async function verifyTurnstileFromRequest(event: H3Event, token?: string) {
  if (shouldSkipTurnstile(event)) {
    return
  }

  const config = useRuntimeConfig()
  const remoteip = getRequestIP(event, { xForwardedFor: true }) || undefined

  await verifyTurnstileToken({
    token,
    secretKey: config.turnstile?.secretKey,
    remoteip
  })
}
