export function useTurnstileEnabled() {
  const { siteKey } = useTurnstileRequired()

  return computed(() => {
    if (import.meta.server) {
      return false
    }

    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      return false
    }

    return !!siteKey.value
  })
}

const modalOpen = useState('turnstile-modal-open', () => false)
const modalToken = useState('turnstile-modal-token', () => '')

let pendingResolve: ((token: string) => void) | null = null
let pendingReject: ((reason?: unknown) => void) | null = null

export function useTurnstileChallenge() {
  const isEnabled = useTurnstileEnabled()

  function completeChallenge(token: string) {
    modalOpen.value = false
    pendingResolve?.(token)
    pendingResolve = null
    pendingReject = null
  }

  function cancelChallenge() {
    modalOpen.value = false
    modalToken.value = ''
    pendingReject?.(new Error('Verification cancelled'))
    pendingResolve = null
    pendingReject = null
  }

  async function ensureTurnstileToken(): Promise<string> {
    if (!isEnabled.value) {
      return ''
    }

    modalToken.value = ''
    modalOpen.value = true

    return new Promise((resolve, reject) => {
      pendingResolve = resolve
      pendingReject = reject
    })
  }

  return {
    modalOpen,
    modalToken,
    isEnabled,
    ensureTurnstileToken,
    completeChallenge,
    cancelChallenge
  }
}
