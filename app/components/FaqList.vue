<script setup lang="ts">
// Questions and answers, always visible so people and crawlers read the same text.
withDefaults(defineProps<{
  items: Array<{ q: string, a: { html: string } }>
  /** Heading level for each question. */
  level?: 'h2' | 'h3' | 'h4'
}>(), { level: 'h3' })
</script>

<template>
  <div class="border-t border-rule-strong">
    <div
      v-for="item in items"
      :key="item.q"
      class="grid gap-x-10 gap-y-2 border-b border-rule py-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
    >
      <component :is="level" class="text-[1.125rem] leading-snug tracking-[-0.01em]">
        {{ item.q }}
      </component>
      <div class="rich text-soft" v-html="item.a.html" />
    </div>
  </div>
</template>
