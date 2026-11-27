import { z } from 'zod'
import { fromMinorUnits } from '#shared/utils/currency'
import { fetchPhonePeOrderStatus, isPhonePeOrderId, phonepeConfig } from '../../utils/gateways/phonepe'
import { fetchRazorpayPayment, isValidRazorpaySignature, razorpayConfig } from '../../utils/gateways/razorpay'
import { fetchZohoPayment, isValidZohoSignature, zohoConfig } from '../../utils/gateways/zoho'
import { toPaymentError } from '../../utils/payment-errors'

const id = (pattern: RegExp) => z.string().regex(pattern)

const bodySchema = z.discriminatedUnion('gateway', [
  z.object({
    gateway: z.literal('razorpay'),
    razorpay_order_id: id(/^order_[A-Za-z0-9]{1,40}$/),
    razorpay_payment_id: id(/^pay_[A-Za-z0-9]{1,40}$/),
    razorpay_signature: id(/^[a-f0-9]{64}$/),
  }),
  z.object({
    gateway: z.literal('phonepe'),
    merchantOrderId: z.string().refine(isPhonePeOrderId),
  }),
  z.object({
    gateway: z.literal('zoho'),
    paymentId: id(/^[A-Za-z0-9_-]{1,64}$/),
    paymentSessionId: id(/^[A-Za-z0-9_-]{1,64}$/),
    signature: id(/^[a-f0-9]{64}$/i),
  }),
])

/**
 * Confirms a payment with the gateway itself. A result reported by the browser
 * is never trusted on its own: Razorpay and Zoho results must carry a valid
 * signature, and every payment is looked up on the gateway from the server.
 */
export default defineEventHandler(async (event) => {
  try {
    const raw = await readBody(event)
    const parsed = bodySchema.safeParse({ gateway: 'razorpay', ...(raw && typeof raw === 'object' ? raw : {}) })
    if (!parsed.success) {
      throw createError({ statusCode: 400, statusMessage: 'Missing or invalid payment verification details' })
    }
    const body = parsed.data

    if (body.gateway === 'phonepe') {
      const status = await fetchPhonePeOrderStatus(phonepeConfig(event), body.merchantOrderId)
      const detail = status.paymentDetails?.[0]

      return {
        success: status.state === 'COMPLETED',
        gateway: body.gateway,
        payment_id: detail?.transactionId,
        order_id: status.orderId,
        merchant_order_id: body.merchantOrderId,
        amount: fromMinorUnits(Number(status.amount), 'INR'),
        currency: 'INR',
        status: status.state,
        method: detail?.paymentMode?.toLowerCase() || 'phonepe',
        created_at: detail?.timestamp ? Math.floor(detail.timestamp / 1000) : undefined,
      }
    }

    if (body.gateway === 'zoho') {
      const config = zohoConfig(event)
      if (!isValidZohoSignature(config, body.paymentId, body.paymentSessionId, body.signature.toLowerCase())) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid payment signature' })
      }

      const payment = await fetchZohoPayment(config, body.paymentId)
      if (payment.payments_session_id && payment.payments_session_id !== body.paymentSessionId) {
        throw createError({ statusCode: 400, statusMessage: 'Payment does not belong to this session' })
      }

      return {
        success: payment.status === 'succeeded',
        gateway: body.gateway,
        payment_id: payment.payment_id,
        order_id: payment.payments_session_id || body.paymentSessionId,
        amount: Number(payment.amount),
        currency: payment.currency,
        status: payment.status,
        method: payment.payment_method?.type || 'zoho',
        created_at: payment.date ? Math.floor(payment.date / 1000) : undefined,
      }
    }

    const config = razorpayConfig(event)
    if (!isValidRazorpaySignature(config, body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid payment signature' })
    }

    const payment = await fetchRazorpayPayment(config, body.razorpay_payment_id)
    if (payment.order_id !== body.razorpay_order_id) {
      throw createError({ statusCode: 400, statusMessage: 'Payment does not belong to this order' })
    }

    return {
      success: payment.status === 'captured' || payment.status === 'authorized',
      gateway: body.gateway,
      payment_id: payment.id,
      order_id: body.razorpay_order_id,
      amount: fromMinorUnits(Number(payment.amount), payment.currency),
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      created_at: payment.created_at,
    }
  } catch (error) {
    throw toPaymentError(error)
  }
})
