import { getRazorpayDiagnostics } from '../../utils/razorpay'

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

  return {
    ok: true,
    host: getRequestHeader(event, 'host'),
    ...diagnostics
  }
})
