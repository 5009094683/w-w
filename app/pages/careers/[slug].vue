<script setup lang="ts">
import { careers } from '#content/careers'
import { jobs } from '#content/jobs'
import { site } from '#content/site'

const route = useRoute()
const job = jobs.find(item => item.slug === route.params.slug)

if (!job) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const crumbs = [{ label: 'Home', to: '/' }, { label: 'Careers', to: '/careers' }]

usePageSeo({
  path: job.path,
  title: `${job.title} (${job.location}, ${job.employmentType})`,
  description: job.description,
  updatedAt: job.updatedAt,
  summary: job.summary.text,
  heading: job.title,
  label: `Careers · ${job.department}`,
  crumbs,
})

// Job listings are only accepted by search engines with a posting date, a
// closing date and a place applicants may work from, so the structured data
// is added only once the job file has all three.
if (job.datePosted && job.validThrough && job.applicantCountries?.length) {
  useSchemaOrg([
    defineJobPosting({
      title: job.title,
      description: job.body.html,
      datePosted: job.datePosted,
      validThrough: job.validThrough,
      employmentType: job.employmentType.toLowerCase() === 'full-time' ? 'FULL_TIME' : job.employmentType.toLowerCase() === 'contract' ? 'CONTRACTOR' : 'INTERN',
      jobLocationType: 'TELECOMMUTE',
      applicantLocationRequirements: job.applicantCountries.map(name => ({ '@type': 'Country', name })),
      hiringOrganization: { '@id': '/#identity' },
    }),
  ])
}

const facts = [
  { label: 'Department', value: { html: job.department } },
  { label: 'Location', value: { html: job.location } },
  { label: 'Type', value: { html: job.employmentType } },
  { label: 'Experience', value: { html: job.experience } },
]

const telegramHref = telegramApplyHref(site.contact.telegram.url, job.title)
const emailHref = emailApplyHref(site.contact.email, job.title)
const others = jobs.filter(item => item.slug !== job.slug).slice(0, 3).map(item => item.path)
</script>

<template>
  <article v-if="job">
    <PageHero :label="job.department" :title="job.title" :lead="job.summary.html" :crumbs="crumbs" :updated-at="job.updatedAt">
      <template #actions>
        <a href="#apply" class="btn btn-primary">
          How to apply
          <AppIcon name="arrow-right" class="arrow" />
        </a>
      </template>
      <template #aside>
        <SpecTable :facts="facts" caption="Role" />
      </template>
    </PageHero>

    <DocBody number="01" label="The role" :body="job.body" />

    <PageSection id="apply" number="02" label="Applying" :title="careers.apply.heading" :lead="careers.apply.lead.html">
      <StepList :steps="careers.apply.steps" />
      <div class="mt-8 flex flex-wrap gap-3">
        <a :href="telegramHref" rel="noopener" class="btn btn-primary">
          <AppIcon name="telegram" />
          Apply on Telegram
        </a>
        <a :href="emailHref" class="btn btn-secondary">
          <AppIcon name="mail" />
          Apply by email
        </a>
      </div>
      <p class="mt-4 max-w-[38rem] text-[0.9375rem] text-soft">
        Both buttons open a message with the list of links already written. Replace each [link] with your own and send it.
      </p>
    </PageSection>

    <PageSection v-if="others.length" label="Other roles">
      <RelatedPages :paths="others" />
    </PageSection>
  </article>
</template>
