<script setup lang="ts">
import { products } from '#content/products'
import { productsHub as hub } from '#content/productsHub'

const crumbs = [{ label: 'Home', to: '/' }]

usePageSeo({
  path: hub.path,
  title: hub.title,
  description: hub.description,
  updatedAt: hub.updatedAt,
  summary: hub.lead.text,
  heading: hub.heading,
  label: 'Products',
  crumbs,
  schemaType: 'CollectionPage',
  faq: hub.faq,
})

const items = products.map(product => ({
  code: product.code,
  title: product.name,
  meta: product.category,
  text: firstSentences(product.summary.text, 2),
  to: product.path,
}))
</script>

<template>
  <div>
    <PageHero label="AI products" :title="hub.heading" :lead="hub.lead.html" :crumbs="crumbs" :updated-at="hub.updatedAt" />

    <PageSection number="01" label="All products" title="Three products, one family">
      <IndexList :items="items" />
    </PageSection>

    <DocBody number="02" label="Guide" :body="hub.body" />

    <PageSection v-if="hub.faq.length" number="03" label="Questions" title="Questions about our products">
      <FaqList :items="hub.faq" />
    </PageSection>

    <CtaBand />
  </div>
</template>
