<script setup lang="ts">
// A numbered figure: a framed image with its caption underneath.
defineProps<{
  image: { src: string, alt: string, caption?: string, width: number, height: number }
  number: number
  /** The widths the image is shown at, in @nuxt/image `sizes` form. */
  sizes: string
  eager?: boolean
}>()
</script>

<template>
  <figure>
    <div class="border border-rule-strong bg-[#070707]">
      <NuxtPicture
        :src="image.src"
        :alt="image.alt"
        :width="image.width"
        :height="image.height"
        :sizes="sizes"
        format="avif,webp"
        :loading="eager ? 'eager' : 'lazy'"
        :img-attrs="{ class: 'block h-auto w-full', decoding: 'async' }"
      />
    </div>
    <figcaption class="mt-3 text-[0.875rem] leading-snug text-soft">
      <span class="label label-accent mr-2">Fig. {{ number }}</span>{{ image.caption }}
    </figcaption>
  </figure>
</template>
