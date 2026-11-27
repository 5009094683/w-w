<script setup lang="ts">
import { careers } from '#content/careers'
import { jobs } from '#content/jobs'
import { site } from '#content/site'

const crumbs = [{ label: 'Home', to: '/' }]

usePageSeo({
  path: careers.path,
  title: careers.title,
  description: careers.description,
  updatedAt: careers.updatedAt,
  summary: careers.lead.text,
  heading: careers.heading,
  label: 'Careers',
  crumbs,
  schemaType: 'CollectionPage',
})

const openings = jobs.map((job, index) => ({
  code: `J-${sectionNumber(index + 1)}`,
  title: job.title,
  meta: `${job.department} · ${job.employmentType} · ${job.location}`,
  text: firstSentences(job.summary.text, 1),
  to: job.path,
}))
</script>

<template>
  <div>
    <PageHero label="Work with us" :title="careers.heading" :lead="careers.lead.html" :crumbs="crumbs" :updated-at="careers.updatedAt">
      <template #actions>
        <a href="#open-positions" class="btn btn-primary">
          See open positions
          <AppIcon name="arrow-right" class="arrow" />
        </a>
      </template>
    </PageHero>

    <PageSection number="01" label="Why here" title="What working at YBX Labs is like">
      <FeatureGrid :items="careers.perks" :columns="4" />
    </PageSection>

    <PageSection id="open-positions" number="02" label="Openings" :title="careers.openings.heading" :lead="careers.openings.lead.html">
      <IndexList :items="openings" />
    </PageSection>

    <PageSection number="03" label="Applying" :title="careers.apply.heading" :lead="careers.apply.lead.html">
      <StepList :steps="careers.apply.steps" />
      <div class="mt-8 border border-rule-strong p-6 md:p-8">
        <p class="label">
          No matching role
        </p>
        <div class="rich mt-3 max-w-[38rem] text-[1.125rem]" v-html="careers.apply.openApplication.html" />
        <div class="mt-6 flex flex-wrap gap-3">
          <a :href="site.contact.telegram.url" rel="noopener" class="btn btn-secondary">
            <AppIcon name="telegram" />
            Telegram
          </a>
          <a :href="`mailto:${site.contact.email}`" class="btn btn-secondary">
            <AppIcon name="mail" />
            {{ site.contact.email }}
          </a>
        </div>
      </div>
    </PageSection>
  </div>
</template>
