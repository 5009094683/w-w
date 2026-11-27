<script setup lang="ts">
withDefaults(defineProps<{
  heading?: string
  /** Rendered HTML. */
  text?: string
  action?: { label: string, href: string }
}>(), {
  heading: 'Ready to get started?',
  text: 'Tell us about your project. We typically respond within 24 hours on business days.',
  action: () => ({ label: 'Contact us', href: '/contact-us' }),
})
</script>

<template>
  <section>
    <div class="wrap py-16 md:py-24">
      <div class="grid items-end gap-8 border border-rule-strong p-7 md:grid-cols-[minmax(0,1fr)_auto] md:p-12">
        <div>
          <p class="label label-accent">
            Next step
          </p>
          <h2 class="mt-4 text-[clamp(1.9rem,3.6vw,3rem)] tracking-[-0.03em]">
            {{ heading }}
          </h2>
          <div class="lead rich mt-4 max-w-[34rem]" v-html="text" />
        </div>
        <NuxtLink :to="action.href" class="btn btn-primary">
          {{ action.label }}
          <AppIcon name="arrow-right" class="arrow" />
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
