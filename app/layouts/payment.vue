<script setup lang="ts">
import { site } from '#content/site'

const year = new Date().getFullYear()

const links = [
  { label: 'Refund Policy', to: '/refund-policy' },
  { label: 'Terms & Conditions', to: '/terms-conditions' },
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Contact', to: '/contact-us' },
]
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <header class="border-b border-rule">
      <div class="wrap flex h-[4.5rem] items-center justify-between gap-6">
        <a href="/" class="-ml-1 flex items-center p-1 text-ink" aria-label="YBX Labs home">
          <SiteLogo class="h-8 w-auto" />
        </a>
        <p class="label flex items-center gap-2 text-ink">
          <AppIcon name="lock" class="text-[1rem]" />
          Secure payment
        </p>
      </div>
    </header>

    <main id="main" class="flex-1">
      <div class="wrap py-10 md:py-16">
        <div class="mx-auto max-w-[34rem]">
          <slot />
        </div>
      </div>
    </main>

    <footer class="border-t border-rule">
      <div class="wrap flex flex-col gap-3 py-5 text-[0.875rem] text-soft md:flex-row md:items-center md:justify-between">
        <p>© {{ year }} {{ site.name }} · {{ site.registration.number }}</p>
        <ul class="flex flex-wrap gap-x-5 gap-y-1">
          <li v-for="link in links" :key="link.to">
            <a :href="link.to" class="hover:text-ink hover:underline">{{ link.label }}</a>
          </li>
        </ul>
      </div>
    </footer>
  </div>
</template>
