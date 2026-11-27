import { isError } from 'h3'
import { InvalidAmountError } from '#shared/utils/currency'
import { logEvent } from './env'
import { GatewayError, GatewayNotConfiguredError } from './gateways/http'

const GATEWAY_LABEL = { razorpay: 'Razorpay', phonepe: 'PhonePe', zoho: 'Zoho Payments' } as const

/**
 * Turns any failure into a response that is safe to show to a customer.
 * Details go to the server log; keys, secrets and gateway diagnostics never
 * go to the browser.
 */
export function toPaymentError(error: unknown): Error {
  if (isError(error)) {
    return error
  }

  if (error instanceof InvalidAmountError) {
    return createError({ statusCode: 400, statusMessage: error.message })
  }

  if (error instanceof GatewayNotConfiguredError) {
    logEvent('error', 'payment gateway is not configured', { gateway: error.gateway, reason: error.reason })
    return createError({
      statusCode: 503,
      statusMessage: `${GATEWAY_LABEL[error.gateway]} is not configured on this site. Please choose another payment method or contact us.`,
    })
  }

  if (error instanceof GatewayError) {
    logEvent('error', 'payment gateway request failed', { gateway: error.gateway, status: error.status, body: error.body })

    if (error.status === 401 || error.status === 403) {
      return createError({
        statusCode: 503,
        statusMessage: `${GATEWAY_LABEL[error.gateway]} is not available right now. Please choose another payment method or contact us.`,
      })
    }

    // Razorpay explains a rejected order in plain words, for example an amount below its minimum.
    const description = (error.body as { error?: { description?: unknown } } | null)?.error?.description
    if (error.gateway === 'razorpay' && error.status === 400 && typeof description === 'string') {
      return createError({ statusCode: 400, statusMessage: description.slice(0, 200) })
    }

    return createError({ statusCode: 502, statusMessage: 'The payment gateway could not complete the request. Please try again.' })
  }

  logEvent('error', 'unexpected payment error', { error: String(error) })
  return createError({ statusCode: 500, statusMessage: 'Something went wrong. Please try again.' })
}
