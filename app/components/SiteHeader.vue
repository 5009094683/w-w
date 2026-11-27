<script setup lang="ts">
import { site } from '#content/site'
</script>

<template>
  <header class="border-b border-rule">
    <div class="wrap flex h-[4.5rem] items-center justify-between gap-6">
      <NuxtLink to="/" class="-ml-1 flex items-center p-1 text-ink" aria-label="YBX Labs home">
        <SiteLogo class="h-8 w-auto" />
      </NuxtLink>

      <nav aria-label="Main" class="hidden items-center gap-1 md:flex">
        <NuxtLink
          v-for="item in site.navigation"
          :key="item.href"
          :to="item.href"
          class="nav-link px-3 py-2 text-[0.9375rem] font-medium text-soft transition-colors hover:text-ink"
        >
          {{ item.label }}
        </NuxtLink>
        <NuxtLink to="/contact-us" class="btn btn-primary ml-3 !min-h-10 !px-4 !py-2 !text-[0.9375rem]">
          Contact
        </NuxtLink>
      </nav>

      <!-- Small screens: a native disclosure, so the menu needs no JavaScript. -->
      <details class="menu relative md:hidden">
        <summary class="flex h-11 cursor-pointer list-none items-center gap-2 border border-ink px-3 text-[0.9375rem] font-medium">
          <AppIcon name="menu" class="menu-open-icon text-[1.25rem]" />
          <AppIcon name="close" class="menu-close-icon text-[1.25rem]" />
          Menu
        </summary>
        <nav
          aria-label="Main"
          class="absolute right-0 top-[calc(100%+0.5rem)] z-40 w-[min(18rem,calc(100vw-2.5rem))] border border-ink bg-paper p-2 shadow-[6px_6px_0_var(--rule)]"
        >
          <NuxtLink
            v-for="item in site.navigation"
            :key="item.href"
            :to="item.href"
            class="nav-link flex min-h-11 items-center border-b border-rule px-3 font-medium"
          >
            {{ item.label }}
          </NuxtLink>
          <NuxtLink to="/contact-us" class="nav-link flex min-h-11 items-center justify-between px-3 font-medium text-accent-ink">
            Contact
            <AppIcon name="arrow-right" />
          </NuxtLink>
        </nav>
      </details>
    </div>
  </header>
</template>

<style scoped>
.nav-link.router-link-active {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-color: var(--accent);
  text-decoration-thickness: 2px;
  text-underline-offset: 0.45em;
}

.menu > summary::-webkit-details-marker {
  display: none;
}

.menu .menu-close-icon,
.menu[open] .menu-open-icon {
  display: none;
}

.menu[open] .menu-close-icon {
  display: inline-block;
}
</style>
