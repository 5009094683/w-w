<script setup lang="ts">
import { faq } from '#content/faq'
import { home } from '#content/home'
import { products } from '#content/products'
import { services } from '#content/services'
import { site } from '#content/site'

usePageSeo({
  path: home.path,
  title: home.title,
  description: home.description,
  updatedAt: home.updatedAt,
  summary: site.description,
  heading: home.hero.heading,
  label: 'AI products · Engineering',
})

const record = [
  { label: 'Name', value: { html: site.name } },
  { label: 'Formerly', value: { html: site.formerName } },
  { label: 'Registration', value: { html: site.registration.number } },
  { label: 'Based in', value: { html: `${site.address.district}, ${site.address.region}, ${site.address.country}` } },
  { label: 'Works', value: { html: site.workingModel } },
  {
    label: 'Products',
    value: { html: products.map(product => `<a href="${product.path}">${product.name}</a>`).join(', ') },
  },
  { label: 'Contact', value: { html: `<a href="mailto:${site.contact.email}">${site.contact.email}</a>` } },
]

const productIndex = products.map(product => ({
  code: product.code,
  title: product.name,
  meta: product.category,
  text: firstSentences(product.summary.text, 2),
  to: product.path,
}))

const serviceIndex = services.map(service => ({
  code: service.code,
  title: service.navTitle,
  text: firstSentences(service.summary.text, 1),
  to: service.path,
}))

const flavorgpt = products.find(product => product.slug === 'flavorgpt')
const development = services.find(service => service.slug === 'development')
// Shown here without question markup: the same questions carry it on /faq.
const questions = faq.groups.flatMap(group => group.items).filter(item => item.home)
</script>

<template>
  <div>
    <section class="border-b border-rule">
      <div class="wrap grid gap-x-10 gap-y-12 pb-14 pt-12 md:pb-20 md:pt-16 lg:grid-cols-12">
        <div class="lg:col-span-7">
          <p class="label label-accent mb-5">
            {{ home.hero.eyebrow }}
          </p>
          <h1 class="text-[clamp(2.5rem,6.1vw,4.75rem)] leading-[1.02] tracking-[-0.035em]">
            {{ home.hero.heading }}
          </h1>
          <div class="lead rich mt-7 max-w-[38rem]" v-html="home.hero.lead.html" />
          <div class="mt-9 flex flex-wrap gap-3">
            <NuxtLink :to="home.hero.primary.href" class="btn btn-primary">
              {{ home.hero.primary.label }}
              <AppIcon name="arrow-right" class="arrow" />
            </NuxtLink>
            <NuxtLink :to="home.hero.secondary.href" class="btn btn-secondary">
              {{ home.hero.secondary.label }}
            </NuxtLink>
          </div>
        </div>
        <aside class="lg:col-span-5 lg:pl-4">
          <SpecTable :facts="record" caption="Company record" />
        </aside>
      </div>
    </section>

    <PageSection number="01" :label="home.products.heading" title="What we make" :lead="home.products.lead.html">
      <IndexList :items="productIndex" />
      <p class="mt-6">
        <NuxtLink to="/products" class="link font-medium">
          Compare the products
        </NuxtLink>
      </p>
    </PageSection>

    <PageSection number="02" :label="home.services.heading" title="What we do for other teams" :lead="home.services.lead.html">
      <IndexList :items="serviceIndex" />
      <p class="mt-6">
        <NuxtLink to="/services" class="link font-medium">
          Find the right service
        </NuxtLink>
      </p>
    </PageSection>

    <PageSection number="03" label="FlavorGPT" :title="home.highlights.heading" :lead="home.highlights.lead.html">
      <FigureFrame
        v-if="flavorgpt?.figures[0]"
        :image="flavorgpt.figures[0]"
        :number="1"
        :sizes="FIGURE_SIZES.full"
        class="mb-10"
      />
      <FeatureGrid :items="home.highlights.items" />
      <p class="mt-6">
        <NuxtLink :to="home.highlights.more.href" class="link font-medium">
          {{ home.highlights.more.label }}
        </NuxtLink>
      </p>
    </PageSection>

    <PageSection number="04" label="FlavorAI API">
      <div class="border border-rule-strong bg-raised p-7 md:p-10">
        <p class="label">
          {{ home.showcase.label }}
        </p>
        <h2 class="mt-5 text-[clamp(1.9rem,3.6vw,3rem)] tracking-[-0.03em]">
          {{ home.showcase.heading }}
        </h2>
        <div class="lead rich mt-4 max-w-[40rem]" v-html="home.showcase.text.html" />
        <div class="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
          <NuxtLink :to="home.showcase.action.href" class="btn btn-primary">
            {{ home.showcase.action.label }}
            <AppIcon name="arrow-right" class="arrow" />
          </NuxtLink>
          <NuxtLink :to="home.showcase.more.href" class="link font-medium">
            {{ home.showcase.more.label }}
          </NuxtLink>
        </div>
      </div>
    </PageSection>

    <PageSection
      v-if="development"
      number="05"
      label="Process"
      :title="home.process.heading"
      :lead="home.process.lead.html"
    >
      <StepList :steps="development.process" />
      <p class="mt-6">
        <NuxtLink :to="home.process.more.href" class="link font-medium">
          {{ home.process.more.label }}
        </NuxtLink>
      </p>
    </PageSection>

    <PageSection number="06" label="Questions" :title="home.faq.heading" :lead="home.faq.lead.html">
      <FaqList :items="questions" />
      <p class="mt-6">
        <NuxtLink :to="home.faq.more.href" class="link font-medium">
          {{ home.faq.more.label }}
        </NuxtLink>
      </p>
    </PageSection>

    <CtaBand :heading="home.cta.heading" :text="home.cta.text.html" :action="home.cta.action" />
  </div>
</template>
