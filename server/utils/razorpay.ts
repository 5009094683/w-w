import Razorpay from 'razorpay'

interface RazorpayRuntimeConfig {
  razorpayKeyId?: string
  razorpayKeySecret?: string
  razorpayTestKeyId?: string
  razorpayTestKeySecret?: string
  razorpayIsSandbox?: boolean
}

export function getRazorpayCredentials(config: RazorpayRuntimeConfig) {
  const useSandbox = !!config.razorpayIsSandbox

  const keyId = useSandbox
    ? config.razorpayTestKeyId
    : config.razorpayKeyId
  const keySecret = useSandbox
    ? config.razorpayTestKeySecret
    : config.razorpayKeySecret

  return { keyId, keySecret, useSandbox }
}

export function createRazorpayClient(config: RazorpayRuntimeConfig) {
  const { keyId, keySecret } = getRazorpayCredentials(config)

  if (!keyId || !keySecret) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Razorpay credentials not configured'
    })
  }

  return {
    client: new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    }),
    keyId,
    keySecret
  }
}
