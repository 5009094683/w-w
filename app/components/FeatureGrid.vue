<script setup lang="ts">
withDefaults(defineProps<{
  items: Array<{ title: string, text: { html: string } }>
  /** Heading level for each item. */
  level?: 'h3' | 'h4'
  columns?: 3 | 4
}>(), { level: 'h3', columns: 3 })
</script>

<template>
  <ul class="grid border-l border-t border-rule sm:grid-cols-2" :class="columns === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'">
    <li v-for="(item, index) in items" :key="item.title" class="border-b border-r border-rule p-5">
      <p class="label" aria-hidden="true">
        {{ sectionNumber(index + 1) }}
      </p>
      <component :is="level" class="mt-5 text-[1.0625rem] leading-snug tracking-[-0.01em]">
        {{ item.title }}
      </component>
      <div class="rich mt-2 text-[0.9375rem] leading-normal text-soft" v-html="item.text.html" />
    </li>
  </ul>
</template>
