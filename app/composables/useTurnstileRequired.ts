export function useTurnstileRequired() {
  const config = useRuntimeConfig()

  const siteKey = computed(() =>
    config.public.turnstile?.siteKey
    || config.public.turnstileSiteKey
    || ''
  )

  const isRequired = computed(() => !!siteKey.value)

  return { isRequired, siteKey }
}
