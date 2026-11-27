<script setup lang="ts">
import { pricing } from '#content/pricing'

const crumbs = [{ label: 'Home', to: '/' }]

usePageSeo({
  path: pricing.path,
  title: pricing.title,
  description: pricing.description,
  updatedAt: pricing.updatedAt,
  summary: pricing.lead.text,
  heading: pricing.heading,
  label: 'Pricing',
  crumbs,
})
</script>

<template>
  <article>
    <PageHero label="Pricing" :title="pricing.heading" :lead="pricing.lead.html" :crumbs="crumbs" :updated-at="pricing.updatedAt" />

    <PageSection number="01" label="Prices" title="Average prices">
      <ul class="border-t border-rule-strong">
        <li
          v-for="price in pricing.prices"
          :key="price.name"
          class="grid items-baseline gap-x-8 gap-y-2 border-b border-rule py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
        >
          <h3 class="text-[1.25rem] tracking-[-0.01em]">
            <NuxtLink :to="price.href" class="link">
              {{ price.name }}
            </NuxtLink>
          </h3>
          <div class="rich text-soft" v-html="price.about.html" />
          <p class="font-mono text-[1.5rem] font-medium tracking-[-0.02em] md:text-right">
            {{ price.price }}
          </p>
        </li>
      </ul>
    </PageSection>

    <DocBody number="02" label="Billing" :body="pricing.body" />

    <CtaBand heading="Want a price for your project?" />
  </article>
</template>
