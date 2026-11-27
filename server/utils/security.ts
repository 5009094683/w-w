import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { logEvent, readEnv } from './env'

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** Compares two strings without leaking, through timing, where they differ. */
export function safeEqual(a: string, b: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(a), digest(b))
}

export function hmacSha256Hex(secret: string, message: string): string {
  return createHmac('sha256', secret).update(message).digest('hex')
}

/**
 * Rejects the request unless Cloudflare Turnstile confirms the visitor's token.
 *
 * The check is skipped only under `nuxt dev`. Everywhere else a missing secret
 * key stops the request, so a deployment without keys cannot be used by bots.
 */
export async function requireTurnstile(event: H3Event, token: unknown): Promise<void> {
  if (import.meta.dev) {
    return
  }

  const secret = readEnv(event, 'TURNSTILE_SECRET_KEY')
  if (!secret) {
    logEvent('error', 'turnstile secret key is not configured')
    throw createError({ statusCode: 503, statusMessage: 'The security check is not configured. Please contact us by email.' })
  }

  if (typeof token !== 'string' || !token || token.length > 2048) {
    throw createError({ statusCode: 403, statusMessage: 'Please complete the security check.' })
  }

  const form = new URLSearchParams({ secret, response: token })
  const ip = getRequestIP(event, { xForwardedFor: true })
  if (ip) {
    form.set('remoteip', ip)
  }

  let result: { success?: boolean, 'error-codes'?: string[] }
  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, { method: 'POST', body: form })
    result = await response.json()
  } catch (error) {
    logEvent('error', 'turnstile verification request failed', { error: String(error) })
    throw createError({ statusCode: 503, statusMessage: 'The security check is unavailable. Please try again.' })
  }

  if (result.success !== true) {
    logEvent('info', 'turnstile rejected a token', { codes: result['error-codes'] })
    throw createError({ statusCode: 403, statusMessage: 'The security check failed. Please try again.' })
  }
}
