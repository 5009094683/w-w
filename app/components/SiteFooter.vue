<script setup lang="ts">
import { footer } from '#content/footer'
import { site } from '#content/site'

const columns = [
  { title: 'Services', all: '/services', links: footer.services },
  { title: 'Products', all: '/products', links: footer.products },
  { title: 'Company', links: footer.company },
  { title: 'Legal', links: footer.legal },
]

const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-rule-strong">
    <div class="wrap grid gap-x-8 gap-y-12 py-14 md:grid-cols-12">
      <div class="md:col-span-4">
        <p class="text-2xl font-semibold tracking-tight">
          {{ site.name }}
        </p>
        <p class="mt-2 max-w-xs text-soft">
          {{ site.tagline }}
        </p>

        <dl class="mt-8 space-y-3 text-[0.9375rem]">
          <div class="flex gap-3">
            <dt class="pt-0.5 text-faint">
              <AppIcon name="mail" /><span class="sr-only">Email</span>
            </dt>
            <dd><a class="link" :href="`mailto:${site.contact.email}`">{{ site.contact.email }}</a></dd>
          </div>
          <div class="flex gap-3">
            <dt class="pt-0.5 text-faint">
              <AppIcon name="phone" /><span class="sr-only">Phone</span>
            </dt>
            <dd><a class="link" :href="`tel:${site.contact.phone.replace(/\s/g, '')}`">{{ site.contact.phone }}</a></dd>
          </div>
          <div class="flex gap-3">
            <dt class="pt-0.5 text-faint">
              <AppIcon name="map-pin" /><span class="sr-only">Address</span>
            </dt>
            <dd class="text-soft">
              C/O {{ site.address.careOf }}, {{ site.address.street }}, {{ site.address.locality }},
              {{ site.address.district }}, {{ site.address.region }}, {{ site.address.country }} - {{ site.address.postalCode }}
            </dd>
          </div>
        </dl>

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

      <nav aria-label="Footer" class="grid grid-cols-2 gap-x-8 gap-y-10 md:col-span-8 md:grid-cols-4">
        <div v-for="column in columns" :key="column.title">
          <p class="label">
            <NuxtLink v-if="column.all" :to="column.all" class="hover:text-ink">{{ column.title }}</NuxtLink>
            <template v-else>
              {{ column.title }}
            </template>
          </p>
          <ul class="mt-4 space-y-2.5 text-[0.9375rem]">
            <li v-for="item in column.links" :key="item.href">
              <NuxtLink :to="item.href" class="text-soft transition-colors hover:text-ink hover:underline">
                {{ item.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>
      </nav>
    </div>

    <div class="border-t border-rule">
      <div class="wrap label flex flex-col gap-2 py-5 normal-case tracking-normal sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {{ year }} {{ site.name }} · {{ site.address.region }}, {{ site.address.country }} · {{ site.registration.number }}
        </p>
        <p>
          All rights reserved.
        </p>
      </div>
    </div>
  </footer>
</template>
