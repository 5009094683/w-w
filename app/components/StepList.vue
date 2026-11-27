<script setup lang="ts">
defineProps<{
  steps: Array<{ title: string, text: { html: string } }>
}>()
</script>

<template>
  <ol class="grid border-l border-t border-rule sm:grid-cols-2" :class="steps.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'">
    <li v-for="(step, index) in steps" :key="step.title" class="border-b border-r border-rule p-5">
      <p class="label label-accent">
        Step {{ sectionNumber(index + 1) }}
      </p>
      <p class="mt-6 text-[1.125rem] font-semibold leading-snug tracking-[-0.01em]">
        {{ step.title }}
      </p>
      <div class="rich mt-2 text-[0.9375rem] leading-normal text-soft" v-html="step.text.html" />
    </li>
  </ol>
</template>
