import { z } from 'zod'
import { normalizeCurrency, toMinorUnits } from '#shared/utils/currency'
import { createPhonePeOrder, newPhonePeOrderId, phonepeConfig } from '../../utils/gateways/phonepe'
import { createRazorpayOrder, razorpayConfig } from '../../utils/gateways/razorpay'
import { createZohoSession, zohoConfig } from '../../utils/gateways/zoho'
import { toPaymentError } from '../../utils/payment-errors'
import { requireTurnstile } from '../../utils/security'

const bodySchema = z.object({
  amount: z.union([z.number(), z.string()]),
  currency: z.string().optional(),
  gateway: z.enum(['razorpay', 'phonepe', 'zoho']).optional(),
  turnstileToken: z.string().optional(),
})

/**
 * Starts a payment. Only this route and /api/payment/verify are public; every
 * gateway call happens here on the server and no gateway token is returned.
 */
export default defineEventHandler(async (event) => {
  try {
    const parsed = bodySchema.safeParse(await readBody(event))
    if (!parsed.success) {
      throw createError({ statusCode: 400, statusMessage: 'Amount is required' })
    }

    const currency = normalizeCurrency(parsed.data.currency ?? 'INR')
    const amountInMinorUnits = toMinorUnits(parsed.data.amount, currency)
    const amount = Number(parsed.data.amount)
    // PhonePe and Zoho Payments take rupees only; any other currency goes to Razorpay.
    const gateway = currency === 'INR' ? parsed.data.gateway ?? 'razorpay' : 'razorpay'

    await requireTurnstile(event, parsed.data.turnstileToken)

    if (gateway === 'zoho') {
      const config = zohoConfig(event)
      const referenceNumber = `YBX-${Date.now()}`
      const session = await createZohoSession(config, { amount, referenceNumber })

      return {
        success: true,
        gateway,
        payment_session_id: session.payments_session_id,
        order_id: session.payments_session_id,
        amount: Number(session.amount),
        currency: session.currency,
        reference_number: session.reference_number || referenceNumber,
        account_id: config.accountId,
        api_key: config.apiKey,
        is_test_mode: config.sandbox,
      }
    }

    if (gateway === 'phonepe') {
      const config = phonepeConfig(event)
      const merchantOrderId = newPhonePeOrderId()
      const returnUrl = new URL('/payment/success', getRequestURL(event))
      returnUrl.searchParams.set('gateway', 'phonepe')
      returnUrl.searchParams.set('order', merchantOrderId)

      const order = await createPhonePeOrder(config, {
        merchantOrderId,
        amountInPaise: amountInMinorUnits,
        displayAmount: String(parsed.data.amount),
        redirectUrl: returnUrl.toString(),
      })

      return {
        success: true,
        gateway,
        order_id: order.orderId,
        merchant_order_id: merchantOrderId,
        amount,
        currency,
        redirect_url: order.redirectUrl,
      }
    }

    const config = razorpayConfig(event)
    const order = await createRazorpayOrder(config, {
      // The smallest unit of the currency: paise for INR, cents for USD, whole yen for JPY.
      amount: amountInMinorUnits,
      currency,
      receipt: `receipt_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`,
    })

    return {
      success: true,
      gateway,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: config.keyId,
      is_test_mode: config.sandbox,
    }
  } catch (error) {
    throw toPaymentError(error)
  }
})
