<script setup lang="ts">
definePageMeta({ layout: 'payment' })

useHead({ titleTemplate: '%s %separator %siteName' })
useSeoMeta({
  title: 'Choose a payment gateway',
  description: 'Choose how to pay YBX Labs: Razorpay, Zoho Payments or PhonePe.',
  robots: 'noindex, nofollow',
})

const route = useRoute()

const amount = String(route.query.amount ?? '')
const currency = String(route.query.currency ?? 'INR').toUpperCase()
const problem = amountProblem(amount, currency)

// Only rupee payments have a choice of gateway.
const options: Gateway[] = currency === 'INR' ? ['razorpay', 'zoho', 'phonepe'] : ['razorpay']
const selected = ref<Gateway>('razorpay')

async function proceed() {
  await navigateTo(paymentPath(amount, currency, selected.value))
}
</script>

<template>
  <div>
    <p class="label label-accent">
      Payment
    </p>
    <h1 class="mt-3 text-[clamp(2rem,5vw,2.75rem)] tracking-[-0.03em]">
      Choose a payment gateway
    </h1>

    <div v-if="problem" class="mt-8 border border-rule-strong p-6 md:p-8">
      <p role="alert" class="text-accent-ink">
        {{ problem }}
      </p>
      <a href="/payment" class="btn btn-secondary mt-6">
        <AppIcon name="arrow-left" />
        Back to the payment form
      </a>
    </div>

    <form v-else class="mt-8 border border-rule-strong" @submit.prevent="proceed">
      <div class="flex items-baseline justify-between gap-4 border-b border-rule-strong px-6 py-4 md:px-8">
        <span class="label text-ink">Amount</span>
        <span class="font-mono text-[1.75rem] font-medium tracking-[-0.02em]">{{ formatMoney(amount, currency) }}</span>
      </div>

      <fieldset class="p-6 md:p-8">
        <legend class="label mb-4 float-left w-full">
          Select your preferred payment method
        </legend>
        <div class="clear-both space-y-3">
          <label
            v-for="gateway in options"
            :key="gateway"
            class="flex cursor-pointer items-start gap-4 border p-4 transition-colors"
            :class="selected === gateway ? 'border-ink bg-wash' : 'border-rule hover:border-ink'"
          >
            <input v-model="selected" type="radio" name="gateway" :value="gateway" class="mt-1.5 size-4 accent-[var(--accent)]">
            <span>
              <span class="block text-[1.125rem] font-semibold tracking-[-0.01em]">{{ GATEWAYS[gateway].name }}</span>
              <span class="mt-1 block text-[0.9375rem] text-soft">{{ GATEWAYS[gateway].description }}</span>
            </span>
          </label>
        </div>

        <button type="submit" class="btn btn-primary mt-8 w-full">
          Continue to {{ GATEWAYS[selected].name }}
          <AppIcon name="arrow-right" class="arrow" />
        </button>
        <a href="/payment" class="btn btn-secondary mt-3 w-full">
          <AppIcon name="arrow-left" />
          Back to the payment form
        </a>
      </fieldset>
    </form>
  </div>
</template>
