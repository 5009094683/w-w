import crypto from 'crypto'
import { assertZohoAccountConfigured, getZohoAccessToken, getZohoPaymentsApiUrl } from '../../utils/zoho-payments'

interface ZohoPaymentResponse {
  code: number
  message: string
  payment: {
    payment_id: string
    amount: string
    currency: string
    status: string
    payments_session_id?: string
    reference_number?: string
    date?: number
    payment_method?: {
      type?: string
    }
  }
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { paymentId, paymentSessionId, signature } = body

    if (!paymentId || !paymentSessionId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required Zoho verification parameters'
      })
    }

    const config = useRuntimeConfig()
    assertZohoAccountConfigured(config)

    if (config.zohoSigningKey) {
      if (!signature) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Missing Zoho payment signature'
        })
      }

      const expectedSignature = crypto
        .createHmac('sha256', config.zohoSigningKey)
        .update(`${paymentId}|${paymentSessionId}`)
        .digest('hex')

      if (expectedSignature !== signature) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid Zoho payment signature'
        })
      }
    }

    const accessToken = await getZohoAccessToken(config)
    const paymentUrl = getZohoPaymentsApiUrl(
      config,
      `payments/${encodeURIComponent(paymentId)}`
    )

    const response = await $fetch<ZohoPaymentResponse>(paymentUrl, {
      method: 'GET',
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`
      }
    })

    const payment = response.payment
    const isSuccessful = payment.status === 'succeeded'

    if (!isSuccessful) {
      throw createError({
        statusCode: 400,
        statusMessage: `Payment not successful: ${payment.status}`
      })
    }

    return {
      success: true,
      gateway: 'zoho',
      payment_id: payment.payment_id,
      order_id: payment.payments_session_id || paymentSessionId,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      method: payment.payment_method?.type || 'zoho',
      created_at: payment.date
        ? Math.floor(payment.date / 1000)
        : Math.floor(Date.now() / 1000)
    }
  } catch (error: any) {
    console.error('Zoho payment verification error:', error)

    if (error.data) {
      console.error('Zoho verify error response:', error.data)
    }

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Zoho payment verification failed'
    })
  }
})
