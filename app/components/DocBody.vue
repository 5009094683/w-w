<script setup lang="ts">
// A long text section: a list of its headings in the margin, the text beside it.
const props = defineProps<{
  number?: string
  label: string
  body: { html: string, headings: Array<{ depth: number, id: string, text: string }> }
}>()

const contents = computed(() => props.body.headings.filter(heading => heading.depth === 2))
</script>

<template>
  <section class="border-b border-rule">
    <div class="wrap grid gap-x-10 gap-y-8 py-12 md:py-16 lg:grid-cols-12">
      <div class="lg:col-span-3">
        <p class="label flex items-baseline gap-3">
          <span v-if="number" class="label-accent">{{ number }}</span>
          <span>{{ label }}</span>
        </p>
        <nav v-if="contents.length > 1" aria-label="On this page" class="mt-6 hidden lg:sticky lg:top-8 lg:block">
          <ol class="space-y-2 border-l border-rule pl-4 text-[0.9375rem]">
            <li v-for="heading in contents" :key="heading.id">
              <a :href="`#${heading.id}`" class="text-soft transition-colors hover:text-ink hover:underline">{{ heading.text }}</a>
            </li>
          </ol>
        </nav>
      </div>
      <div class="prose lg:col-span-9" v-html="body.html" />
    </div>
  </section>
</template>
