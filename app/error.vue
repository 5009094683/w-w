<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const notFound = props.error.statusCode === 404
const heading = notFound ? 'This page does not exist.' : 'Something went wrong.'

useHead({ titleTemplate: '%s %separator %siteName' })
useSeoMeta({
  title: notFound ? 'Page not found' : 'Error',
  description: notFound ? 'The page you were looking for does not exist on ybxlabs.com.' : 'An error occurred on ybxlabs.com.',
  robots: 'noindex, nofollow',
})

const places = [
  { label: 'Home', to: '/' },
  { label: 'Services', to: '/services' },
  { label: 'Products', to: '/products' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Questions', to: '/faq' },
  { label: 'Contact', to: '/contact-us' },
]
</script>

<template>
  <NuxtLayout>
    <section>
      <div class="wrap py-16 md:py-24">
        <p class="label label-accent">
          Error {{ error.statusCode }}
        </p>
        <h1 class="mt-5 max-w-[44rem] text-[clamp(2.25rem,5.2vw,4rem)] leading-[1.04] tracking-[-0.03em]">
          {{ heading }}
        </h1>
        <p class="lead mt-6 max-w-[38rem]">
          <template v-if="notFound">
            The address may be mistyped, or the page may have moved. These pages are a good place to start.
          </template>
          <template v-else>
            Please try again in a moment. If it keeps happening, let us know through the contact page.
          </template>
        </p>
        <ul class="mt-10 grid max-w-[44rem] border-l border-t border-rule sm:grid-cols-3">
          <li v-for="place in places" :key="place.to" class="border-b border-r border-rule">
            <a :href="place.to" class="group flex min-h-14 items-center justify-between gap-3 px-4 font-medium transition-colors hover:bg-wash">
              {{ place.label }}
              <AppIcon name="arrow-right" class="text-faint transition-transform group-hover:translate-x-1 group-hover:text-accent-ink" />
            </a>
          </li>
        </ul>
      </div>
    </section>
  </NuxtLayout>
</template>
