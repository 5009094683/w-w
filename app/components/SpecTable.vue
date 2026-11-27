<script setup lang="ts">
// A specification table: labels on the left, values on the right.
defineProps<{
  facts: Array<{ label: string, value: { html: string } }>
  caption?: string
}>()
</script>

<template>
  <div class="border border-rule-strong bg-paper">
    <p v-if="caption" class="label border-b border-rule-strong px-4 py-2.5 text-ink">
      {{ caption }}
    </p>
    <dl>
      <div
        v-for="fact in facts"
        :key="fact.label"
        class="grid gap-x-4 gap-y-1 border-b border-rule px-4 py-3 last:border-b-0 sm:grid-cols-[9.5rem_1fr]"
      >
        <dt class="label pt-[0.2rem]">
          {{ fact.label }}
        </dt>
        <dd class="rich min-w-0 break-words text-[0.9375rem] leading-normal" v-html="fact.value.html" />
      </div>
    </dl>
  </div>
</template>
