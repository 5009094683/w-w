import { createHash } from 'node:crypto'
import Razorpay from 'razorpay'
import { maskKeyId, parseEnvBool, readEnv } from './env'

function secretFingerprint(keySecret?: string) {
  if (!keySecret) {
    return null
  }

  return createHash('sha256').update(keySecret).digest('hex').slice(0, 8)
}

interface RazorpayRuntimeConfig {
  razorpayKeyId?: string
  razorpayKeySecret?: string
  razorpayTestKeyId?: string
  razorpayTestKeySecret?: string
  razorpayIsSandbox?: boolean
}

function assertKeyMatchesMode(keyId: string, useSandbox: boolean) {
  const isTestKey = keyId.startsWith('rzp_test_')
  const isLiveKey = keyId.startsWith('rzp_live_')

  if (useSandbox && isLiveKey) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Razorpay sandbox mode is on but a live key ID is configured. Set RAZORPAY_IS_SANDBOX=false or use test keys.'
    })
  }

  if (!useSandbox && isTestKey) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Razorpay live mode is on but a test key ID is configured. Set RAZORPAY_IS_SANDBOX=true or use live keys.'
    })
  }
}

export function getRazorpayCredentials(config: RazorpayRuntimeConfig) {
  const useSandbox = parseEnvBool(
    readEnv('NUXT_RAZORPAY_IS_SANDBOX', 'RAZORPAY_IS_SANDBOX')
    ?? config.razorpayIsSandbox
  )

  const keyId = useSandbox
    ? readEnv('NUXT_RAZORPAY_TEST_KEY_ID', 'RAZORPAY_TEST_KEY_ID') || config.razorpayTestKeyId
    : readEnv('NUXT_RAZORPAY_KEY_ID', 'RAZORPAY_KEY_ID') || config.razorpayKeyId
  const keySecret = useSandbox
    ? readEnv('NUXT_RAZORPAY_TEST_KEY_SECRET', 'RAZORPAY_TEST_KEY_SECRET') || config.razorpayTestKeySecret
    : readEnv('NUXT_RAZORPAY_KEY_SECRET', 'RAZORPAY_KEY_SECRET') || config.razorpayKeySecret

  if (keyId) {
    assertKeyMatchesMode(keyId, useSandbox)
  }

  return { keyId, keySecret, useSandbox }
}

export function getRazorpayDiagnostics(config: RazorpayRuntimeConfig) {
  const { keyId, keySecret, useSandbox } = getRazorpayCredentials(config)

  return {
    mode: useSandbox ? 'sandbox' : 'live',
    key_id_prefix: maskKeyId(keyId),
    has_secret: !!keySecret,
    secret_length: keySecret?.length ?? 0,
    secret_fingerprint: secretFingerprint(keySecret)
  }
}

export async function probeRazorpayAuth(config: RazorpayRuntimeConfig) {
  const { client } = createRazorpayClient(config)

  await client.orders.create({
    amount: 100,
    currency: 'INR',
    receipt: `probe_${Date.now()}`
  })

  return { auth_ok: true }
}

export function createRazorpayClient(config: RazorpayRuntimeConfig) {
  const { keyId, keySecret, useSandbox } = getRazorpayCredentials(config)

  if (!keyId || !keySecret) {
    throw createError({
      statusCode: 500,
      statusMessage: useSandbox
        ? 'Razorpay test credentials not configured'
        : 'Razorpay live credentials not configured'
    })
  }

  return {
    client: new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    }),
    keyId,
    keySecret,
    useSandbox
  }
}
