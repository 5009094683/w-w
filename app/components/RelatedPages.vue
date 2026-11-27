<script setup lang="ts">
import { routes } from '#content/routes'

const props = defineProps<{ paths: string[] }>()

const pages = computed(() => props.paths
  .map(path => routes.find(route => route.path === path))
  .filter(route => route !== undefined))
</script>

<template>
  <ul class="grid border-l border-t border-rule md:grid-cols-3">
    <li v-for="page in pages" :key="page.path" class="border-b border-r border-rule">
      <NuxtLink :to="page.path" class="group flex h-full flex-col p-5 transition-colors hover:bg-wash">
        <span class="label">{{ page.section }}</span>
        <span class="mt-5 text-[1.125rem] font-semibold leading-snug tracking-[-0.01em]">{{ page.title }}</span>
        <span class="mt-2 line-clamp-3 text-[0.9375rem] leading-normal text-soft">{{ page.summary }}</span>
        <span class="mt-5 flex items-center gap-2 text-[0.9375rem] font-medium text-accent-ink">
          Read
          <AppIcon name="arrow-right" class="transition-transform group-hover:translate-x-1" />
        </span>
      </NuxtLink>
    </li>
  </ul>
</template>
