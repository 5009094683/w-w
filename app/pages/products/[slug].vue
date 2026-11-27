<script setup lang="ts">
import { products } from '#content/products'

const route = useRoute()
const product = products.find(item => item.slug === route.params.slug)

if (!product) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const crumbs = [{ label: 'Home', to: '/' }, { label: 'Products', to: '/products' }]

usePageSeo({
  path: product.path,
  title: product.title,
  description: product.description,
  updatedAt: product.updatedAt,
  summary: product.summary.text,
  heading: product.name,
  label: `Product ${product.code}`,
  crumbs,
  schemaType: 'ItemPage',
  faq: product.faq,
})

const img = useImage()
const cover = product.figures[0]

useSchemaOrg([
  {
    '@type': 'SoftwareApplication',
    '@id': `${product.path}#software`,
    'name': product.name,
    'applicationCategory': 'BusinessApplication',
    'applicationSubCategory': product.category,
    'description': product.summary.text,
    'url': product.path,
    ...(product.website ? { sameAs: product.website.href } : {}),
    ...(cover ? { image: img(cover.src, { width: 1200, format: 'webp' }) } : {}),
    ...(product.features.length ? { featureList: product.features.map(feature => feature.title) } : {}),
    'publisher': { '@id': '/#identity' },
  },
])

// Tall panel screenshots sit three to a row; wide screenshots take the full width.
const wide = product.figures.map((figure, index) => ({ figure, number: index + 1 })).filter(item => item.figure.width > item.figure.height)
const tall = product.figures.map((figure, index) => ({ figure, number: index + 1 })).filter(item => item.figure.width <= item.figure.height)

let section = 0
const next = () => sectionNumber(++section)
const numbers = {
  features: product.features.length ? next() : '',
  screens: product.figures.length ? next() : '',
  overview: next(),
  questions: product.faq.length ? next() : '',
}
</script>

<template>
  <article v-if="product">
    <PageHero
      :label="`Product ${product.code} · ${product.category}`"
      :title="product.name"
      :lead="product.summary.html"
      :crumbs="crumbs"
      :updated-at="product.updatedAt"
    >
      <template #actions>
        <a v-if="product.website" :href="product.website.href" rel="noopener" class="btn btn-primary">
          {{ product.website.label }}
          <AppIcon name="arrow-up-right" class="arrow" />
        </a>
        <NuxtLink to="/contact-us" class="btn" :class="product.website ? 'btn-secondary' : 'btn-primary'">
          Talk to us
          <AppIcon v-if="!product.website" name="arrow-right" class="arrow" />
        </NuxtLink>
      </template>
      <template #aside>
        <SpecTable :facts="product.facts" caption="At a glance" />
      </template>
    </PageHero>

    <PageSection v-if="product.features.length" :number="numbers.features" label="Features" :title="`What ${product.name} does`">
      <FeatureGrid :items="product.features" />
    </PageSection>

    <PageSection v-if="product.figures.length" :number="numbers.screens" label="Screens" :title="`${product.name} in pictures`">
      <div class="space-y-10">
        <FigureFrame
          v-for="item in wide.slice(0, 1)"
          :key="item.figure.src"
          :image="item.figure"
          :number="item.number"
          sizes="xs:100vw sm:100vw md:100vw lg:880px"
        />
        <div v-if="tall.length" class="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3">
          <FigureFrame
            v-for="item in tall"
            :key="item.figure.src"
            :image="item.figure"
            :number="item.number"
            sizes="xs:50vw sm:50vw md:33vw lg:290px"
          />
        </div>
        <FigureFrame
          v-for="item in wide.slice(1)"
          :key="item.figure.src"
          :image="item.figure"
          :number="item.number"
          sizes="xs:100vw sm:100vw md:100vw lg:880px"
        />
      </div>
    </PageSection>

    <DocBody :number="numbers.overview" label="Overview" :body="product.body" />

    <PageSection v-if="product.faq.length" :number="numbers.questions" label="Questions" :title="`Questions about ${product.name}`">
      <FaqList :items="product.faq" />
    </PageSection>

    <PageSection v-if="product.related.length" label="Related">
      <RelatedPages :paths="product.related" />
    </PageSection>

    <CtaBand />
  </article>
</template>
