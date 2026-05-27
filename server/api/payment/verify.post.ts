import crypto from 'crypto'
import { createRazorpayClient } from '../../utils/razorpay'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { gateway = 'razorpay' } = body

    // Handle Zoho Payments verification
    if (gateway === 'zoho') {
      const { paymentId, paymentSessionId, signature } = body

      if (!paymentId || !paymentSessionId) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Missing required Zoho verification parameters'
        })
      }

      const zohoResponse = await $fetch('/api/payment/zoho-verify', {
        method: 'POST',
        body: {
          paymentId,
          paymentSessionId,
          signature
        }
      }) as any

      return zohoResponse
    }

    // Handle PhonePe verification
    if (gateway === 'phonepe') {
      const { merchantOrderId, accessToken } = body

      if (!merchantOrderId || !accessToken) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Missing required PhonePe verification parameters'
        })
      }

      const phonepeResponse = await $fetch('/api/payment/phonepe-verify', {
        method: 'POST',
        body: {
          merchantOrderId,
          accessToken
        }
      }) as any

      return phonepeResponse
    }

    // Handle Razorpay verification (existing logic)
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required payment verification parameters'
      })
    }

    const config = useRuntimeConfig()
    const { client: razorpay, keySecret } = createRazorpayClient(config)

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(razorpay_order_id + '|' + razorpay_payment_id)
      .digest('hex')

    const isSignatureValid = expectedSignature === razorpay_signature

    if (!isSignatureValid) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid payment signature'
      })
    }

    // Fetch payment details
    const payment = await razorpay.payments.fetch(razorpay_payment_id)

    return {
      success: true,
      gateway: 'razorpay',
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id,
      amount: Number(payment.amount) / 100, // Convert back to rupees
      currency: payment.currency,
      status: payment.status,
      method: payment.method,
      created_at: payment.created_at
    }
  } catch (error: any) {
    console.error('Payment verification error:', error)
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Payment verification failed'
    })
  }
}) 