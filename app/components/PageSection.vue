<script setup lang="ts">
// A numbered section: the label sits in a narrow left column, like a margin
// note, and the content takes the rest of the width.
defineProps<{
  number?: string
  label: string
  title?: string
  /** Rendered HTML shown under the title. */
  lead?: string
  id?: string
}>()
</script>

<template>
  <section :id="id" class="border-b border-rule">
    <div class="wrap grid gap-x-10 gap-y-6 py-12 md:py-16 lg:grid-cols-12">
      <header class="min-w-0 lg:col-span-3">
        <p class="label">
          <span v-if="number" class="label-accent mr-3">{{ number }}</span> {{ label }}
        </p>
      </header>
      <div class="min-w-0 lg:col-span-9">
        <h2 v-if="title" class="max-w-[36rem] text-[clamp(1.6rem,2.4vw,2.25rem)]">
          {{ title }}
        </h2>
        <div v-if="lead" class="lead rich mt-4 max-w-[40rem]" v-html="lead" />
        <div :class="{ 'mt-9': title || lead }">
          <slot />
        </div>
      </div>
    </div>
  </section>
</template>
