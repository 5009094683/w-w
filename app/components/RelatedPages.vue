<script setup lang="ts">
import { routes } from '#content/routes'

const props = defineProps<{ paths: string[] }>()

const pages = computed(() => props.paths
  .map(path => routes.find(route => route.path === path))
  .filter(route => route !== undefined))
</script>

<template>
  <!-- Same structure as IndexList: the link is the title, and its ::before makes the whole card clickable. -->
  <ul class="grid border-l border-t border-rule md:grid-cols-3">
    <li v-for="page in pages" :key="page.path" class="border-b border-r border-rule">
      <div class="group relative flex h-full flex-col p-5 transition-colors hover:bg-wash">
        <p class="label">
          {{ page.section }}
        </p>
        <p class="mt-5 text-[1.125rem] font-semibold leading-snug tracking-[-0.01em]">
          <NuxtLink :to="page.path" class="row-link">{{ page.title }}</NuxtLink>
        </p>
        <p class="mt-2 line-clamp-3 text-[0.9375rem] leading-normal text-soft">
          {{ page.summary }}
        </p>
        <!-- The word "Read" is drawn by CSS: it is decoration, and the link above already names the page. -->
        <p aria-hidden="true" class="mt-5 flex items-center gap-2 text-[0.9375rem] font-medium text-accent-ink before:content-['Read']">
          <AppIcon name="arrow-right" class="transition-transform group-hover:translate-x-1" />
        </p>
      </div>
    </li>
  </ul>
</template>
