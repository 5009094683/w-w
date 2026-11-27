<script setup lang="ts">
import { services } from '#content/services'

const route = useRoute()
const service = services.find(item => item.slug === route.params.slug)

if (!service) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const crumbs = [{ label: 'Home', to: '/' }, { label: 'Services', to: '/services' }]

usePageSeo({
  path: service.path,
  title: service.title,
  description: service.description,
  updatedAt: service.updatedAt,
  summary: service.summary.text,
  heading: service.name,
  label: `Service ${service.code}`,
  crumbs,
  faq: service.faq,
})

const { absolute, organizationId } = useAbsoluteUrl()

useSchemaOrg([
  {
    '@type': 'Service',
    '@id': absolute(`${service.path}#service`),
    'name': service.name,
    'serviceType': service.name,
    'description': service.summary.text,
    'url': absolute(service.path),
    'provider': { '@id': organizationId },
  },
])
</script>

<template>
  <article v-if="service">
    <PageHero
      :label="`Service ${service.code}`"
      :title="service.name"
      :lead="service.summary.html"
      :crumbs="crumbs"
      :updated-at="service.updatedAt"
    >
      <template #actions>
        <NuxtLink to="/contact-us" class="btn btn-primary">
          Talk to us
          <AppIcon name="arrow-right" class="arrow" />
        </NuxtLink>
        <NuxtLink to="/pricing" class="btn btn-secondary">
          See pricing
        </NuxtLink>
      </template>
      <template #aside>
        <SpecTable :facts="service.facts" caption="At a glance" />
      </template>
    </PageHero>

    <DocBody number="01" label="Overview" :body="service.body" />

    <PageSection v-if="service.process.length" number="02" label="Process" title="How the work runs">
      <StepList :steps="service.process" />
    </PageSection>

    <PageSection v-if="service.faq.length" :number="service.process.length ? '03' : '02'" label="Questions" title="Questions about this service">
      <FaqList :items="service.faq" />
    </PageSection>

    <PageSection v-if="service.related.length" label="Related">
      <RelatedPages :paths="service.related" />
    </PageSection>

    <CtaBand />
  </article>
</template>
