<script setup lang="ts">
interface Crumb {
  label: string
  to: string
}

defineProps<{
  /** Monospaced label above the heading, for example "Service S-01". */
  label?: string
  title: string
  /** Rendered HTML for the opening paragraph. */
  lead?: string
  crumbs?: Crumb[]
  updatedAt?: string
}>()
</script>

<template>
  <section class="border-b border-rule">
    <div class="wrap grid gap-x-10 gap-y-10 pb-12 pt-8 md:pb-16 md:pt-10 lg:grid-cols-12">
      <div class="min-w-0" :class="$slots.aside ? 'lg:col-span-7' : 'lg:col-span-9'">
        <nav v-if="crumbs?.length" aria-label="Breadcrumb" class="label mb-8">
          <ol class="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li v-for="crumb in crumbs" :key="crumb.to" class="flex items-center gap-2">
              <NuxtLink :to="crumb.to" class="hover:text-ink hover:underline">{{ crumb.label }}</NuxtLink>
              <span aria-hidden="true">/</span>
            </li>
            <li aria-current="page" class="text-ink">
              {{ title }}
            </li>
          </ol>
        </nav>

        <p v-if="label" class="label label-accent mb-4">
          {{ label }}
        </p>
        <h1 class="text-[clamp(2.25rem,5.2vw,4rem)] leading-[1.04] tracking-[-0.03em]">
          {{ title }}
        </h1>
        <div v-if="lead" class="lead rich mt-6 max-w-[40rem]" v-html="lead" />

        <div v-if="$slots.actions" class="mt-8 flex flex-wrap gap-3">
          <slot name="actions" />
        </div>

        <p v-if="updatedAt" class="label mt-10">
          Last updated <time :datetime="updatedAt">{{ formatDate(updatedAt) }}</time>
        </p>
      </div>

      <!-- Not an <aside>: the fact table is main content, and the Markdown copy of the page leaves asides out. -->
      <div v-if="$slots.aside" class="min-w-0 lg:col-span-5 lg:pl-4">
        <slot name="aside" />
      </div>
    </div>
  </section>
</template>
