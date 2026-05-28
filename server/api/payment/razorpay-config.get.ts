import { getRazorpayDiagnostics, probeRazorpayAuth } from '../../utils/razorpay'

/**
 * Safe diagnostics: key prefix + mode only (no secrets).
 * Set RAZORPAY_CONFIG_DEBUG=true in hosting env to enable on production.
 */
export default defineEventHandler((event) => {
  const debugEnabled =
    process.env.RAZORPAY_CONFIG_DEBUG === 'true'
    || process.env.NUXT_RAZORPAY_CONFIG_DEBUG === 'true'

  if (process.env.NODE_ENV === 'production' && !debugEnabled) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const config = useRuntimeConfig()
  const diagnostics = getRazorpayDiagnostics(config)

  let auth_ok = false
  let auth_error: string | undefined

  try {
    await probeRazorpayAuth(config)
    auth_ok = true
  } catch (error: any) {
    auth_error = error?.error?.description || error?.message || 'Authentication failed'
  }

  return {
    ok: auth_ok,
    host: getRequestHeader(event, 'host'),
    auth_ok,
    auth_error,
    ...diagnostics
  }
})
