<script setup lang="ts">
import type { PaymentResult } from '~/components/PaymentReceipt.vue'

// PhonePe sends the customer back here after a payment made on its own page.
// The page confirms the payment with the server before saying anything about it.
definePageMeta({ layout: 'payment' })

useHead({ titleTemplate: '%s %separator %siteName' })
useSeoMeta({
  title: 'Payment status',
  description: 'The status of your payment to YBX Labs.',
  robots: 'noindex, nofollow',
})

const PHONEPE_ORDER_KEY = 'phonepe_merchant_order_id'

const route = useRoute()
const state = ref<'checking' | 'done' | 'unknown' | 'error'>('checking')
const result = ref<PaymentResult>()
const error = ref('')

async function check() {
  state.value = 'checking'

  const fromLink = typeof route.query.order === 'string' ? route.query.order : ''
  const merchantOrderId = fromLink || sessionStorage.getItem(PHONEPE_ORDER_KEY) || ''
  if (!merchantOrderId) {
    state.value = 'unknown'
    return
  }

  try {
    result.value = await $fetch<PaymentResult>('/api/payment/verify', {
      method: 'POST',
      body: { gateway: 'phonepe', merchantOrderId },
    })
    sessionStorage.removeItem(PHONEPE_ORDER_KEY)
    state.value = 'done'
  } catch (cause) {
    error.value = fetchErrorMessage(cause, 'We could not confirm the payment.')
    state.value = 'error'
  }
}

onMounted(check)
</script>

<template>
  <div>
    <PaymentReceipt v-if="state === 'done' && result" :result="result" />

    <div v-else>
      <p class="label label-accent">
        Payment
      </p>
      <h1 class="mt-3 text-[clamp(2rem,5vw,2.75rem)] tracking-[-0.03em]">
        <template v-if="state === 'checking'">
          Confirming your payment
        </template>
        <template v-else-if="state === 'unknown'">
          No payment to show
        </template>
        <template v-else>
          We could not confirm the payment
        </template>
      </h1>

      <p v-if="state === 'checking'" role="status" class="mt-4 text-soft">
        One moment. We are checking the payment with PhonePe.
      </p>
      <p v-else-if="state === 'unknown'" class="mt-4 text-soft">
        This page shows the result of a payment after you return from the payment gateway. There is no payment linked to this visit.
      </p>
      <div v-else>
        <p role="alert" class="mt-4 border-l-2 border-accent pl-4 text-accent-ink">
          {{ error }}
        </p>
        <p class="mt-4 text-soft">
          If money left your account, contact us and we will check it by hand.
        </p>
        <button type="button" class="btn btn-primary mt-6" @click="check">
          Check again
        </button>
      </div>

      <div v-if="state !== 'checking'" class="mt-8 flex flex-wrap gap-3">
        <a href="/payment" class="btn btn-secondary">
          Make a payment
        </a>
        <a href="/contact-us" class="btn btn-secondary">
          Contact us
        </a>
      </div>
    </div>
  </div>
</template>
