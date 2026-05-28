import { createRazorpayClient, getRazorpayDiagnostics } from '../../utils/razorpay'
import { verifyTurnstileFromRequest } from '../../utils/turnstile'
import { assertZohoAccountConfigured, getZohoAccessToken, getZohoPaymentsApiUrl } from '../../utils/zoho-payments'

interface ZohoCreateSessionResponse {
  code: number
  message: string
  payments_session: {
    payments_session_id: string
    currency: string
    amount: string
    reference_number?: string
    expiry_time?: number
  }
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { amount, currency = 'INR', gateway = 'razorpay', turnstileToken } = body

    if (!amount) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Amount is required'
      })
    }

    await verifyTurnstileFromRequest(event, turnstileToken)

    const config = useRuntimeConfig()

    // If Zoho Payments is selected and currency is INR
    if (gateway === 'zoho' && currency === 'INR') {
      if (!config.zohoAccountId || !config.zohoApiKey) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Zoho Payments not configured'
        })
      }

      assertZohoAccountConfigured(config)
      const accessToken = await getZohoAccessToken(config)
      const referenceNumber = `YBX-${Date.now()}`
      const sessionUrl = getZohoPaymentsApiUrl(config, 'paymentsessions')

      const response = await $fetch<ZohoCreateSessionResponse>(sessionUrl, {
        method: 'POST',
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: {
          amount,
          currency: 'INR',
          description: `Payment of INR ${amount} for YBX Labs`,
          reference_number: referenceNumber
        }
      })

      const session = response.payments_session

      return {
        success: true,
        gateway: 'zoho',
        payment_session_id: session.payments_session_id,
        order_id: session.payments_session_id,
        amount: Number(session.amount),
        currency: session.currency,
        reference_number: session.reference_number || referenceNumber,
        account_id: config.zohoAccountId,
        api_key: config.zohoApiKey,
        is_test_mode: !!config.zohoIsSandbox
      }
    }

    // If PhonePe is selected and currency is INR
    if (gateway === 'phonepe' && currency === 'INR') {
      // First get PhonePe access token
      const authResponse = await $fetch('/api/payment/phonepe-auth', {
        method: 'POST'
      }) as any

      if (!authResponse.success) {
        throw new Error('Failed to authenticate with PhonePe')
      }

      // Create PhonePe payment order
      const phonepeResponse = await $fetch('/api/payment/phonepe-create-order', {
        method: 'POST',
        body: {
          amount,
          accessToken: authResponse.accessToken
        }
      }) as any

      return {
        success: true,
        gateway: 'phonepe',
        order_id: phonepeResponse.order_id,
        merchant_order_id: phonepeResponse.merchant_order_id,
        amount: phonepeResponse.amount,
        currency: phonepeResponse.currency,
        redirect_url: phonepeResponse.redirect_url,
        access_token: authResponse.accessToken // Pass token for verification later
      }
    }

    // For Razorpay (default) or non-INR currencies
    const { client: razorpay, keyId, useSandbox } = createRazorpayClient(config)

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: currency,
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1
    }

    const order = await razorpay.orders.create(options)

    return {
      success: true,
      gateway: 'razorpay',
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: keyId,
      is_test_mode: useSandbox
    }
  } catch (error: any) {
    console.error('Payment order creation error:', error)

    if (error.data) {
      console.error('Payment order creation error response:', error.data)
    }

    const razorpayMessage = error?.error?.description
    let statusMessage = razorpayMessage
      || error.statusMessage
      || error.message
      || 'Failed to create payment order'

    const isRazorpayAuthError =
      error.statusCode === 401 || razorpayMessage === 'Authentication failed'

    if (isRazorpayAuthError) {
      const diagnostics = getRazorpayDiagnostics(useRuntimeConfig())
      console.error('Razorpay auth failed. Server config:', diagnostics)

      statusMessage =
        `Razorpay authentication failed on server (${diagnostics.mode} mode, key ${diagnostics.key_id_prefix}). `
        + 'The Key ID and Key Secret on hosting must be from the same Razorpay API key pair. '
        + 'Compare secret_fingerprint with local, or paste fresh values from Dashboard → API Keys → Live.'
    }

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage,
      data: isRazorpayAuthError
        ? { razorpay: getRazorpayDiagnostics(useRuntimeConfig()) }
        : undefined
    })
  }
}) 