<script setup lang="ts">
definePageMeta({ layout: 'payment' })

useHead({ titleTemplate: '%s %separator %siteName' })
useSeoMeta({
  title: 'Make a payment',
  description: 'Pay YBX Labs online. Enter an amount and choose a currency.',
  robots: 'noindex, nofollow',
})

const COMMON = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY']

const amount = ref('')
const currency = ref('INR')
const touched = ref(false)

const common = CURRENCIES.filter(item => COMMON.includes(item.code)).sort((a, b) => COMMON.indexOf(a.code) - COMMON.indexOf(b.code))
const quick = computed(() => quickAmounts(currency.value))
const problem = computed(() => (amount.value === '' ? 'Enter an amount.' : amountProblem(amount.value, currency.value)))
const preview = computed(() => (problem.value ? '' : formatMoney(amount.value, currency.value)))

async function proceed() {
  touched.value = true
  if (problem.value) {
    return
  }
  // Rupee payments can choose between gateways; every other currency uses Razorpay.
  await navigateTo(
    currency.value === 'INR'
      ? { path: '/payment/gateway-selection', query: { amount: amount.value, currency: 'INR' } }
      : paymentPath(amount.value, currency.value, 'razorpay'),
  )
}
</script>

<template>
  <div>
    <p class="label label-accent">
      Payment
    </p>
    <h1 class="mt-3 text-[clamp(2rem,5vw,2.75rem)] tracking-[-0.03em]">
      Make a payment
    </h1>
    <p class="mt-3 text-soft">
      Enter the amount you have agreed with us and choose its currency.
    </p>

    <form class="mt-8 border border-rule-strong p-6 md:p-8" novalidate @submit.prevent="proceed">
      <div class="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,11rem)]">
        <div>
          <label for="pay-amount" class="label mb-2 block text-ink">Amount</label>
          <input
            id="pay-amount"
            v-model.trim="amount"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0.00"
            class="field font-mono text-[1.25rem]"
            :aria-invalid="touched && !!problem"
            aria-describedby="pay-amount-help"
            @blur="touched = true"
          >
        </div>
        <div>
          <label for="pay-currency" class="label mb-2 block text-ink">Currency</label>
          <select id="pay-currency" v-model="currency" class="field h-[3.25rem]">
            <optgroup label="Common">
              <option v-for="item in common" :key="item.code" :value="item.code">
                {{ item.code }} · {{ item.name }}
              </option>
            </optgroup>
            <optgroup label="All currencies">
              <option v-for="item in CURRENCIES" :key="item.code" :value="item.code">
                {{ item.code }} · {{ item.name }}
              </option>
            </optgroup>
          </select>
        </div>
      </div>

      <p id="pay-amount-help" class="mt-2 min-h-6 text-[0.9375rem]" :class="touched && problem ? 'text-accent-ink' : 'text-soft'" aria-live="polite">
        <template v-if="touched && problem">
          {{ problem }}
        </template>
        <template v-else-if="preview">
          You will pay {{ preview }}.
        </template>
      </p>

      <fieldset class="mt-5">
        <legend class="label mb-2">
          Quick amounts
        </legend>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="value in quick"
            :key="value"
            type="button"
            class="min-h-11 border border-rule font-mono text-[0.9375rem] transition-colors hover:border-ink"
            :class="{ 'border-ink bg-ink text-on-ink': amount === String(value) }"
            @click="amount = String(value); touched = true"
          >
            {{ formatMoney(value, currency) }}
          </button>
        </div>
      </fieldset>

      <button type="submit" class="btn btn-primary mt-8 w-full">
        Continue
        <AppIcon name="arrow-right" class="arrow" />
      </button>
    </form>

    <p class="mt-6 text-[0.9375rem] text-soft">
      Payments are covered by our <a class="link" href="/refund-policy">Payment &amp; Refund Policy</a>.
    </p>
  </div>
</template>
