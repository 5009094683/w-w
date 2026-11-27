<script setup lang="ts">
// The share image used when a page is posted on social media or in chat apps.
// It is drawn once per page at build time.
const { title = 'YBX Labs', label = 'ybxlabs.com' } = defineProps<{ title?: string, label?: string }>()

const titleSize = computed(() => (title.length > 60 ? 60 : title.length > 34 ? 72 : 88))
</script>

<template>
  <div
    class="flex h-full w-full flex-col justify-between"
    style="background-color: #f6f3ec; color: #16161a; padding: 64px 72px; font-family: 'Instrument Sans'"
  >
    <div class="flex w-full items-center justify-between">
      <div class="flex items-center" style="gap: 20px">
        <svg viewBox="0 0 155 122" width="74" height="58">
          <path
            fill="#16161a"
            fill-rule="evenodd"
            clip-rule="evenodd"
            d="M57.0979 104.976L122 122L99 90L109.578 73.0001H77.0623L57.0979 104.976ZM82.0571 65.0001H114.556L155 0L104.237 29.4753L82.0571 65.0001ZM89.4424 38.0657L72.6259 65.0001H43.0554L89.4424 38.0657ZM67.6311 73.0001L48.9938 102.851L0 90L29.2776 73.0001H67.6311Z"
          />
        </svg>
        <div class="flex" style="font-size: 40px; font-weight: 700; letter-spacing: -1px">
          YBX Labs
        </div>
      </div>
      <div
        class="flex"
        style="font-family: 'JetBrains Mono'; font-size: 22px; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; color: #ad300f"
      >
        {{ label }}
      </div>
    </div>

    <div class="flex w-full flex-col">
      <div
        class="flex"
        :style="{ fontSize: `${titleSize}px`, fontWeight: 600, lineHeight: 1.04, letterSpacing: '-2.5px', maxWidth: '1000px' }"
      >
        {{ title }}
      </div>
      <div class="flex w-full" style="margin-top: 44px; height: 2px; background-color: #16161a" />
      <div
        class="flex w-full justify-between"
        style="margin-top: 20px; font-family: 'JetBrains Mono'; font-size: 22px; color: #45454d"
      >
        <div class="flex">
          ybxlabs.com
        </div>
        <div class="flex">
          AI products and engineering services
        </div>
      </div>
    </div>
  </div>
</template>
