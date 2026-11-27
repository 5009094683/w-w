<script setup lang="ts">
import { legal } from '#content/legal'

const props = defineProps<{ slug: string }>()

const page = legal.find(item => item.slug === props.slug)

if (!page) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const crumbs = [{ label: 'Home', to: '/' }]

usePageSeo({
  path: page.path,
  title: page.title,
  description: page.description,
  updatedAt: page.updatedAt,
  heading: page.heading,
  label: 'Legal',
  crumbs,
})

const others = legal.filter(item => item.slug !== props.slug)
</script>

<template>
  <article v-if="page">
    <PageHero label="Legal" :title="page.heading" :crumbs="crumbs">
      <template #actions>
        <p class="text-[1.0625rem]">
          <strong class="font-semibold">Effective Date:</strong>
          <time :datetime="page.effectiveDate"> {{ formatDate(page.effectiveDate) }}</time>
        </p>
      </template>
    </PageHero>

    <DocBody label="Contents" :body="page.body" />

    <PageSection label="Other policies">
      <ul class="border-t border-rule-strong">
        <li v-for="item in others" :key="item.slug" class="border-b border-rule">
          <NuxtLink :to="item.path" class="group flex items-center justify-between gap-4 py-5 text-[1.2rem] font-semibold tracking-[-0.01em]">
            {{ item.heading }}
            <AppIcon name="arrow-right" class="text-faint transition-transform group-hover:translate-x-1 group-hover:text-accent-ink" />
          </NuxtLink>
        </li>
      </ul>
    </PageSection>
  </article>
</template>
