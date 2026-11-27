<script setup lang="ts">
import { about } from '#content/about'
import { site } from '#content/site'

const crumbs = [{ label: 'Home', to: '/' }]

usePageSeo({
  path: about.path,
  title: about.title,
  description: about.description,
  updatedAt: about.updatedAt,
  summary: site.description,
  heading: about.heading,
  label: 'Company',
  crumbs,
  schemaType: 'AboutPage',
})

const address = `C/O ${site.address.careOf}, ${site.address.street}, ${site.address.locality}, ${site.address.district}, ${site.address.region}, ${site.address.country} - ${site.address.postalCode}`

const facts = [
  { label: 'Name', value: { html: site.name } },
  { label: 'Formerly', value: { html: site.formerName } },
  { label: 'Registration', value: { html: `${site.registration.number}<br><span class="text-faint">${site.registration.scheme}</span>` } },
  { label: 'Address', value: { html: address } },
  { label: 'Email', value: { html: `<a href="mailto:${site.contact.email}">${site.contact.email}</a>` } },
  { label: 'Phone', value: { html: `<a href="${telHref(site.contact.phone)}">${site.contact.phone}</a>` } },
  { label: 'Telegram', value: { html: `<a href="${site.contact.telegram.url}" rel="noopener">${site.contact.telegram.handle}</a>` } },
  { label: 'Works', value: { html: site.workingModel } },
  { label: 'Governing law', value: { html: `${site.governingLaw} (<a href="/terms-conditions">Terms &amp; Conditions</a>)` } },
]
</script>

<template>
  <article>
    <PageHero label="Company" :title="about.heading" :lead="about.lead.html" :crumbs="crumbs" :updated-at="about.updatedAt">
      <template #aside>
        <SpecTable :facts="facts" caption="Company facts" />
      </template>
    </PageHero>

    <DocBody number="01" label="About" :body="about.body" />

    <PageSection number="02" label="Find us" title="Where YBX Labs is online">
      <ul class="grid border-l border-t border-rule sm:grid-cols-2 lg:grid-cols-4">
        <li v-for="item in site.social" :key="item.url" class="border-b border-r border-rule">
          <a :href="item.url" rel="noopener me" class="group flex items-center justify-between gap-4 p-5 transition-colors hover:bg-wash">
            <span class="flex items-center gap-3 font-medium">
              <AppIcon :name="item.icon" class="text-[1.15rem]" />
              {{ item.name }}
            </span>
            <AppIcon name="arrow-up-right" class="text-faint transition-colors group-hover:text-accent-ink" />
          </a>
        </li>
      </ul>
    </PageSection>

    <CtaBand />
  </article>
</template>
