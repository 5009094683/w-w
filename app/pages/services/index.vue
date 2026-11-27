<script setup lang="ts">
import { services } from '#content/services'
import { servicesHub as hub } from '#content/servicesHub'

const crumbs = [{ label: 'Home', to: '/' }]

usePageSeo({
  path: hub.path,
  title: hub.title,
  description: hub.description,
  updatedAt: hub.updatedAt,
  summary: hub.lead.text,
  heading: hub.heading,
  label: 'Services',
  crumbs,
  schemaType: 'CollectionPage',
  faq: hub.faq,
})

const items = services.map(service => ({
  code: service.code,
  title: service.name,
  text: firstSentences(service.summary.text, 2),
  to: service.path,
}))
</script>

<template>
  <div>
    <PageHero label="Engineering services" :title="hub.heading" :lead="hub.lead.html" :crumbs="crumbs" :updated-at="hub.updatedAt" />

    <PageSection number="01" label="All services" title="Six ways we work with other teams">
      <IndexList :items="items" />
    </PageSection>

    <DocBody number="02" label="Guide" :body="hub.body" />

    <PageSection v-if="hub.faq.length" number="03" label="Questions" title="Questions about our services">
      <FaqList :items="hub.faq" />
    </PageSection>

    <CtaBand />
  </div>
</template>
