import { assertZohoAccountConfigured, getZohoPaymentsApiUrl } from '../../utils/zoho-payments'

interface ZohoCreateSessionResponse {
  code: number
  message: string
  payments_session: {
    payments_session_id: string
    currency: string
    amount: string
    description?: string
    reference_number?: string
    expiry_time?: number
  }
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { amount, accessToken } = body

    if (!amount) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Amount is required'
      })
    }

    if (!accessToken) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Access token is required'
      })
    }

    const config = useRuntimeConfig()
    assertZohoAccountConfigured(config)

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
      payment_session_id: session.payments_session_id,
      amount: Number(session.amount),
      currency: session.currency,
      reference_number: session.reference_number || referenceNumber,
      expiry_time: session.expiry_time
    }
  } catch (error: any) {
    console.error('Zoho payment session creation error:', error)

    if (error.data) {
      console.error('Zoho create session error response:', error.data)
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create Zoho payment session'
    })
  }
})
