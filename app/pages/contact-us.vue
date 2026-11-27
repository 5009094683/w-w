<script setup lang="ts">
import { contact } from '#content/contact'
import { site } from '#content/site'

const crumbs = [{ label: 'Home', to: '/' }]

usePageSeo({
  path: contact.path,
  title: contact.title,
  description: contact.description,
  updatedAt: contact.updatedAt,
  summary: contact.lead.text,
  heading: contact.heading,
  label: 'Contact',
  crumbs,
  schemaType: 'ContactPage',
})

const address = `C/O ${site.address.careOf}, ${site.address.street}, ${site.address.locality}, ${site.address.district}, ${site.address.region}, ${site.address.country} - ${site.address.postalCode}`
</script>

<template>
  <article>
    <PageHero label="Contact" :title="contact.heading" :lead="contact.lead.html" :crumbs="crumbs" />

    <section>
      <div class="wrap grid gap-x-10 gap-y-14 py-12 md:py-16 lg:grid-cols-12">
        <div class="lg:col-span-7">
          <h2 class="label mb-6">
            <span class="label-accent mr-1">01</span> Send a message
          </h2>
          <ContactForm />
          <p class="needs-script mt-6 border border-rule-strong p-4">
            This form needs JavaScript. You can email us at
            <a class="link" :href="`mailto:${site.contact.email}`">{{ site.contact.email }}</a> instead.
          </p>
        </div>

        <!-- Not an <aside>: these are the page's main facts, and the Markdown copy of the page leaves asides out. -->
        <div id="contact-details" class="lg:col-span-5 lg:pl-4">
          <h2 class="label mb-6">
            <span class="label-accent mr-1">02</span> Reach us directly
          </h2>
          <div class="border border-rule-strong">
            <ul>
              <li class="grid gap-x-4 gap-y-1 border-b border-rule px-4 py-3.5 sm:grid-cols-[7rem_1fr]">
                <strong class="label pt-[0.2rem]">Email<span class="sr-only">:</span></strong> <span><a class="link" :href="`mailto:${site.contact.email}`">{{ site.contact.email }}</a></span>
              </li>
              <li class="grid gap-x-4 gap-y-1 border-b border-rule px-4 py-3.5 sm:grid-cols-[7rem_1fr]">
                <strong class="label pt-[0.2rem]">Telegram<span class="sr-only">:</span></strong> <span><a class="link" :href="site.contact.telegram.url" rel="noopener">{{ site.contact.telegram.handle }}</a></span>
              </li>
              <li class="grid gap-x-4 gap-y-1 border-b border-rule px-4 py-3.5 sm:grid-cols-[7rem_1fr]">
                <strong class="label pt-[0.2rem]">Phone<span class="sr-only">:</span></strong> <span><a class="link" :href="telHref(site.contact.phone)">{{ site.contact.phone }}</a></span>
              </li>
              <li class="grid gap-x-4 gap-y-1 border-b border-rule px-4 py-3.5 sm:grid-cols-[7rem_1fr]">
                <strong class="label pt-[0.2rem]">Address<span class="sr-only">:</span></strong> <span>{{ address }}</span>
              </li>
              <li class="grid gap-x-4 gap-y-1 px-4 py-3.5 sm:grid-cols-[7rem_1fr]">
                <strong class="label pt-[0.2rem]">Registration<span class="sr-only">:</span></strong> <span>{{ site.registration.number }}</span>
              </li>
            </ul>
          </div>

          <p class="mt-6 flex gap-3 text-soft">
            <AppIcon name="clock" class="mt-1 text-[1.1rem] text-faint" />
            <span>{{ site.contact.responseTime }}</span>
          </p>

          <ul class="mt-8 flex gap-2">
            <li v-for="item in site.social" :key="item.url">
              <a
                :href="item.url"
                rel="noopener me"
                class="flex size-11 items-center justify-center border border-rule text-[1.05rem] transition-colors hover:border-ink hover:bg-ink hover:text-on-ink"
              >
                <AppIcon :name="item.icon" />
                <span class="sr-only">{{ site.name }} on {{ item.name }}</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  </article>
</template>
