<script setup lang="ts">
// Cloudflare Turnstile, rendered explicitly so the script loads only on the
// pages that have a form.
interface TurnstileApi {
  render: (element: HTMLElement, options: Record<string, unknown>) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

const props = defineProps<{ siteKey: string }>()

/** Emits the token when the check passes, and an empty string when it expires or fails. */
const emit = defineEmits<{ token: [value: string] }>()

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

const element = ref<HTMLElement>()
const failed = ref(false)
let widgetId: string | undefined

function turnstile() {
  return (window as unknown as { turnstile?: TurnstileApi }).turnstile
}

function loadScript(): Promise<void> {
  if (turnstile()) {
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`)
    const script = existing ?? document.createElement('script')
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Turnstile failed to load')), { once: true })
    if (!existing) {
      script.src = SCRIPT_URL
      script.async = true
      document.head.appendChild(script)
    }
  })
}

onMounted(async () => {
  try {
    await loadScript()
    if (!element.value) {
      return
    }
    widgetId = turnstile()?.render(element.value, {
      'sitekey': props.siteKey,
      'theme': 'auto',
      'callback': (token: string) => emit('token', token),
      'expired-callback': () => emit('token', ''),
      'error-callback': () => {
        failed.value = true
        emit('token', '')
      },
    })
  } catch {
    failed.value = true
  }
})

onBeforeUnmount(() => {
  if (widgetId) {
    turnstile()?.remove(widgetId)
  }
})

defineExpose({
  reset() {
    emit('token', '')
    if (widgetId) {
      turnstile()?.reset(widgetId)
    }
  },
})
</script>

<template>
  <div>
    <div ref="element" class="min-h-[65px]" />
    <p v-if="failed" role="alert" class="mt-2 text-[0.9375rem] text-accent-ink">
      The security check could not load. Check your connection or any content blocker, then reload the page.
    </p>
  </div>
</template>
