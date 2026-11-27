<script setup lang="ts">
import type { PaymentResult } from '~/components/PaymentReceipt.vue'

definePageMeta({ layout: 'payment' })

interface Order {
  gateway: Gateway
  order_id: string
  amount: number
  currency: string
  // Razorpay
  key_id?: string
  // PhonePe
  merchant_order_id?: string
  redirect_url?: string
  // Zoho Payments
  payment_session_id?: string
  reference_number?: string
  account_id?: string
  api_key?: string
  is_test_mode?: boolean
}

const PHONEPE_ORDER_KEY = 'phonepe_merchant_order_id'

const route = useRoute()
const config = useRuntimeConfig()

const parsed = parsePaymentParam(String(route.params.amount ?? ''))
const amount = parsed?.amount ?? ''
const currency = parsed?.currency ?? 'INR'
const requested = isGateway(route.query.gateway) ? route.query.gateway : 'razorpay'
// PhonePe and Zoho Payments take rupees only, so other currencies go to Razorpay.
const gateway: Gateway = currency === 'INR' ? requested : 'razorpay'

const invalid = parsed ? amountProblem(amount, currency) : 'This payment link is not valid.'
const money = formatMoney(amount, currency)

useHead({ titleTemplate: '%s %separator %siteName' })
useSeoMeta({
  title: invalid ? 'Payment' : `Pay ${money}`,
  description: 'Secure payment to YBX Labs.',
  robots: 'noindex, nofollow',
})

const siteKey = config.public.turnstileSiteKey
// In development the server skips the security check.
const checkRequired = !import.meta.dev
const unavailable = checkRequired && !siteKey

const token = ref('')
const busy = ref(false)
const note = ref('')
const error = ref('')
const result = ref<PaymentResult>()
const widget = ref<{ reset: () => void }>()

const canPay = computed(() => !busy.value && !unavailable && (!checkRequired || token.value !== ''))

function fail(message: string) {
  error.value = message
  note.value = ''
  busy.value = false
}

async function verify(body: Record<string, unknown>) {
  note.value = 'Confirming your payment…'
  try {
    result.value = await $fetch<PaymentResult>('/api/payment/verify', { method: 'POST', body })
  } catch (cause) {
    fail(fetchErrorMessage(cause, 'We could not confirm the payment. If money left your account, contact us.'))
  } finally {
    busy.value = false
    note.value = ''
  }
}

async function payWithRazorpay(order: Order) {
  await loadScript('https://checkout.razorpay.com/v1/checkout.js')

  const Razorpay = (window as unknown as { Razorpay: new (options: Record<string, unknown>) => { open: () => void, on: (name: string, handler: () => void) => void } }).Razorpay
  const checkout = new Razorpay({
    key: order.key_id,
    amount: order.amount,
    currency: order.currency,
    name: 'YBX Labs',
    description: `Payment of ${money}`,
    order_id: order.order_id,
    handler: (response: Record<string, string>) => verify({ gateway: 'razorpay', ...response }),
    modal: { ondismiss: () => { busy.value = false } },
    theme: { color: '#d2401c' },
  })
  checkout.on('payment.failed', () => fail('The payment failed. Please try again.'))
  checkout.open()
}

async function payWithZoho(order: Order) {
  await loadScript('https://static.zohocdn.com/zpay/zpay-js/v1/zpayments.js')

  const ZPayments = (window as unknown as { ZPayments: new (options: Record<string, unknown>) => { requestPaymentMethod: (options: Record<string, unknown>) => Promise<{ payment_id?: string, signature?: string }>, close: () => Promise<void> } }).ZPayments
  const instance = new ZPayments({
    account_id: order.account_id,
    domain: 'IN',
    otherOptions: { api_key: order.api_key, ...(order.is_test_mode ? { is_test_mode: true } : {}) },
  })

  try {
    const response = await instance.requestPaymentMethod({
      amount: String(order.amount),
      currency_code: order.currency,
      payments_session_id: order.payment_session_id,
      currency_symbol: '₹',
      business: 'YBX Labs',
      description: `Payment of ${money}`,
      reference_number: order.reference_number,
      invoice_number: order.reference_number,
    })
    if (!response?.payment_id) {
      throw new Error('Zoho Payments did not return a payment.')
    }
    await verify({
      gateway: 'zoho',
      paymentId: response.payment_id,
      paymentSessionId: order.payment_session_id,
      signature: response.signature,
    })
  } catch (cause) {
    if ((cause as { code?: string })?.code === 'widget_closed') {
      fail('Payment cancelled.')
    } else {
      throw cause
    }
  } finally {
    await instance.close().catch(() => {})
  }
}

async function payWithPhonePe(order: Order) {
  // Kept so the payment can be confirmed when PhonePe sends the customer back.
  sessionStorage.setItem(PHONEPE_ORDER_KEY, order.merchant_order_id!)

  const redirect = () => {
    note.value = 'Taking you to PhonePe…'
    window.location.href = order.redirect_url!
  }

  try {
    await loadScript('https://mercury.phonepe.com/web/bundle/checkout.js')
  } catch {
    return redirect()
  }

  const checkout = (window as unknown as { PhonePeCheckout?: { transact: (options: Record<string, unknown>) => void } }).PhonePeCheckout
  if (typeof checkout?.transact !== 'function') {
    return redirect()
  }

  // PhonePe opens inside the page and reports back when the customer is done.
  checkout.transact({
    tokenUrl: order.redirect_url,
    type: 'IFRAME',
    callback: (response: string) => {
      if (response === 'USER_CANCEL') {
        fail('Payment cancelled.')
      } else if (response === 'CONCLUDED') {
        sessionStorage.removeItem(PHONEPE_ORDER_KEY)
        verify({ gateway: 'phonepe', merchantOrderId: order.merchant_order_id })
      }
    },
  })
}

async function pay() {
  if (!canPay.value) {
    return
  }
  busy.value = true
  error.value = ''
  note.value = 'Starting your payment…'

  try {
    const order = await $fetch<Order>('/api/payment/create-order', {
      method: 'POST',
      body: { amount, currency, gateway, turnstileToken: token.value },
    })
    note.value = ''

    if (order.gateway === 'zoho') {
      await payWithZoho(order)
    } else if (order.gateway === 'phonepe') {
      await payWithPhonePe(order)
    } else {
      await payWithRazorpay(order)
    }
  } catch (cause) {
    fail(fetchErrorMessage(cause, (cause as Error)?.message || 'The payment could not be started. Please try again.'))
  } finally {
    // A security token can be used once.
    widget.value?.reset()
  }
}
</script>

<template>
  <div>
    <PaymentReceipt v-if="result" :result="result" />

    <div v-else-if="invalid">
      <p class="label label-accent">
        Payment
      </p>
      <h1 class="mt-3 text-[clamp(2rem,5vw,2.75rem)] tracking-[-0.03em]">
        This payment link cannot be used
      </h1>
      <p role="alert" class="mt-4 border-l-2 border-accent pl-4 text-accent-ink">
        {{ invalid }}
      </p>
      <a href="/payment" class="btn btn-primary mt-8">
        Enter an amount
        <AppIcon name="arrow-right" class="arrow" />
      </a>
    </div>

    <div v-else>
      <p class="label label-accent">
        Payment
      </p>
      <h1 class="mt-3 text-[clamp(2rem,5vw,2.75rem)] tracking-[-0.03em]">
        Complete your payment
      </h1>

      <div class="mt-8 border border-rule-strong">
        <div class="border-b border-rule-strong px-6 py-6 md:px-8">
          <p class="label">
            You are about to pay
          </p>
          <p class="mt-2 break-all font-mono text-[clamp(2.25rem,8vw,3.25rem)] font-medium leading-none tracking-[-0.03em]">
            {{ money }}
          </p>
        </div>

        <dl class="border-b border-rule px-6 py-4 text-[0.9375rem] md:px-8">
          <div class="flex justify-between gap-4 py-1">
            <dt class="text-soft">
              To
            </dt>
            <dd>YBX Labs</dd>
          </div>
          <div class="flex justify-between gap-4 py-1">
            <dt class="text-soft">
              Currency
            </dt>
            <dd>{{ currency }} · {{ currencyName(currency) }}</dd>
          </div>
          <div class="flex justify-between gap-4 py-1">
            <dt class="text-soft">
              Gateway
            </dt>
            <dd>{{ GATEWAYS[gateway].name }}</dd>
          </div>
        </dl>

        <div class="px-6 py-6 md:px-8">
          <p v-if="unavailable" role="alert" class="text-accent-ink">
            Online payment is not available right now. Please <a class="underline" href="/contact-us">contact us</a>.
          </p>
          <ClientOnly v-else-if="checkRequired">
            <TurnstileWidget ref="widget" :site-key="siteKey" @token="token = $event" />
          </ClientOnly>

          <p v-if="error" role="alert" class="mb-4 mt-2 border-l-2 border-accent pl-4 text-accent-ink">
            {{ error }}
          </p>

          <button type="button" class="btn btn-primary mt-2 w-full" :disabled="!canPay" @click="pay">
            <AppIcon name="lock" />
            {{ busy ? (note || 'Working…') : `Pay ${money} with ${GATEWAYS[gateway].name}` }}
          </button>
          <p class="mt-4 text-center text-[0.875rem] text-soft">
            <a href="/payment" class="hover:underline">Change the amount</a>
          </p>
        </div>
      </div>

      <p class="mt-6 text-[0.9375rem] text-soft">
        Payments are covered by our <a class="link" href="/refund-policy">Payment &amp; Refund Policy</a>.
      </p>
    </div>
  </div>
</template>
