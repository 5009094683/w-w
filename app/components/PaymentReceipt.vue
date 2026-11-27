<script setup lang="ts">
export interface PaymentResult {
  success: boolean
  gateway: Gateway
  payment_id?: string
  order_id?: string
  amount?: number
  currency?: string
  status?: string
  method?: string
  created_at?: number
}

const props = defineProps<{ result: PaymentResult }>()

const paidAt = computed(() => (props.result.created_at ? new Date(props.result.created_at * 1000).toLocaleString() : ''))

const rows = computed(() => [
  ['Amount', props.result.amount != null && props.result.currency ? formatMoney(props.result.amount, props.result.currency) : ''],
  ['Paid with', GATEWAYS[props.result.gateway].name],
  ['Method', props.result.method ?? ''],
  ['Payment ID', props.result.payment_id ?? ''],
  ['Order ID', props.result.order_id ?? ''],
  ['Status', props.result.status ?? ''],
  ['Date', paidAt.value],
].filter(([, value]) => value))
</script>

<template>
  <div role="status">
    <p class="label" :class="result.success ? 'label-accent' : ''">
      {{ result.success ? 'Paid' : 'Not completed' }}
    </p>
    <h1 class="mt-3 text-[clamp(2rem,5vw,2.75rem)] tracking-[-0.03em]">
      {{ result.success ? 'Payment successful' : 'Payment not completed' }}
    </h1>
    <p class="mt-3 text-soft">
      <template v-if="result.success">
        Thank you. Keep the payment ID below for your records.
      </template>
      <template v-else>
        The gateway did not confirm this payment. If money left your account, contact us with the order ID below.
      </template>
    </p>

    <dl class="mt-8 border border-rule-strong">
      <div
        v-for="[label, value] in rows"
        :key="label"
        class="grid gap-x-4 gap-y-1 border-b border-rule px-5 py-3.5 last:border-b-0 sm:grid-cols-[8rem_1fr]"
      >
        <dt class="label pt-[0.2rem]">
          {{ label }}
        </dt>
        <dd class="break-all font-mono text-[0.9375rem]">
          {{ value }}
        </dd>
      </div>
    </dl>

    <div class="mt-8 flex flex-wrap gap-3">
      <a href="/payment" class="btn btn-secondary">
        Make another payment
      </a>
      <a href="/contact-us" class="btn btn-secondary">
        Contact us
      </a>
    </div>
  </div>
</template>
