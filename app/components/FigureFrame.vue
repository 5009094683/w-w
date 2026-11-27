<script setup lang="ts">
// A numbered figure: a framed image with its caption underneath.
defineProps<{
  image: {
    src: string
    alt: string
    caption?: string
    width: number
    height: number
    sources: Array<{ type: string, srcset: string }>
  }
  number: number
  /** How wide the image is shown, as an HTML `sizes` value. The browser uses it to pick a file. */
  sizes: string
  eager?: boolean
}>()
</script>

<template>
  <figure>
    <div class="border border-rule-strong bg-[#070707]">
      <picture>
        <source
          v-for="source in image.sources"
          :key="source.type"
          :type="source.type"
          :srcset="source.srcset"
          :sizes="sizes"
        >
        <img
          :src="image.src"
          :alt="image.alt"
          :width="image.width"
          :height="image.height"
          :loading="eager ? 'eager' : 'lazy'"
          decoding="async"
          class="block h-auto w-full"
        >
      </picture>
    </div>
    <figcaption class="mt-3 text-[0.875rem] leading-snug text-soft">
      <span class="label label-accent mr-2">Fig. {{ number }}</span>{{ image.caption }}
    </figcaption>
  </figure>
</template>
