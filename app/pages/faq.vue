<script setup lang="ts">
import { faq } from '#content/faq'

const crumbs = [{ label: 'Home', to: '/' }]

usePageSeo({
  path: faq.path,
  title: faq.title,
  description: faq.description,
  updatedAt: faq.updatedAt,
  summary: faq.lead.text,
  heading: faq.heading,
  label: 'Questions',
  crumbs,
  faq: faq.groups.flatMap(group => group.items),
})
</script>

<template>
  <article>
    <PageHero label="Questions" :title="faq.heading" :lead="faq.lead.html" :crumbs="crumbs" :updated-at="faq.updatedAt">
      <template #actions>
        <nav aria-label="Question groups" class="flex flex-wrap gap-2">
          <a
            v-for="group in faq.groups"
            :key="group.id"
            :href="`#${group.id}`"
            class="flex min-h-11 items-center border border-rule px-4 text-[0.9375rem] font-medium transition-colors hover:border-ink"
          >
            {{ group.title }}
          </a>
        </nav>
      </template>
    </PageHero>

    <PageSection
      v-for="(group, index) in faq.groups"
      :id="group.id"
      :key="group.id"
      :number="sectionNumber(index + 1)"
      :label="group.title"
      :title="group.title"
    >
      <FaqList :items="group.items" />
    </PageSection>

    <CtaBand heading="Still have a question?" />
  </article>
</template>
