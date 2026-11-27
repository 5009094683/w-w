<script setup lang="ts">
// A list of pages set out like an index: code, name, one-line summary, arrow.
defineProps<{
  items: Array<{ code: string, title: string, text: string, to: string, meta?: string }>
}>()
</script>

<template>
  <!--
    The link wraps only the title, and its ::before covers the row, so the whole
    row is clickable while the link text is the name of the page it leads to.
    Each part is its own paragraph, so a text or Markdown copy of the page
    reads "code, title, summary" on separate lines, not as one run of words.
  -->
  <ul class="border-t border-rule-strong">
    <li v-for="item in items" :key="item.to" class="border-b border-rule">
      <div class="index-row group relative transition-colors hover:bg-wash">
        <p class="index-code label label-accent">
          {{ item.code }}
        </p>
        <div class="index-title">
          <p class="text-[1.2rem] font-semibold leading-snug tracking-[-0.01em]">
            <NuxtLink :to="item.to" class="row-link">{{ item.title }}</NuxtLink>
          </p>
          <p v-if="item.meta" class="label mt-1 normal-case tracking-normal">
            {{ item.meta }}
          </p>
        </div>
        <p class="index-text text-soft">
          {{ item.text }}
        </p>
        <AppIcon
          name="arrow-right"
          class="index-arrow text-[1.25rem] text-faint transition-transform group-hover:translate-x-1 group-hover:text-accent-ink"
        />
      </div>
    </li>
  </ul>
</template>

<style scoped>
.index-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1.5rem;
  column-gap: 1rem;
  row-gap: 0.35rem;
  align-items: baseline;
  margin-inline: -0.75rem;
  padding: 1.25rem 0.75rem;
}

.index-code,
.index-title,
.index-text {
  grid-column: 1;
}

.index-arrow {
  grid-column: 2;
  grid-row: 1 / span 3;
  align-self: center;
  justify-self: end;
}

@media (min-width: 48rem) {
  .index-row {
    grid-template-columns: 4.5rem minmax(0, 17rem) minmax(0, 1fr) 1.5rem;
    column-gap: 1.5rem;
  }

  .index-code {
    grid-column: 1;
  }

  .index-title {
    grid-column: 2;
  }

  .index-text {
    grid-column: 3;
  }

  .index-arrow {
    grid-column: 4;
    grid-row: 1;
  }
}
</style>
