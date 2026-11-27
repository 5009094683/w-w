<script setup lang="ts">
import { site } from '#content/site'

const config = useRuntimeConfig()
const siteKey = config.public.turnstileSiteKey
// In development the server skips the check, so the form works without keys.
const checkRequired = !import.meta.dev

const form = reactive({ name: '', email: '', message: '' })
const token = ref('')
const status = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')
const errorMessage = ref('')
const widget = ref<{ reset: () => void }>()

const unavailable = checkRequired && !siteKey
const canSubmit = computed(() => status.value !== 'sending' && (!checkRequired || token.value !== ''))

async function submit() {
  if (!canSubmit.value) {
    return
  }

  status.value = 'sending'
  errorMessage.value = ''

  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: { ...form, turnstileToken: token.value },
    })
    status.value = 'sent'
    form.name = ''
    form.email = ''
    form.message = ''
  } catch (error) {
    const data = (error as { data?: { statusMessage?: string, message?: string } }).data
    errorMessage.value = data?.statusMessage || data?.message || 'Your message could not be sent.'
    status.value = 'error'
  } finally {
    // A token can be used once, so ask for a new one after every attempt.
    widget.value?.reset()
  }
}
</script>

<template>
  <div>
    <div v-if="status === 'sent'" role="status" class="border border-rule-strong p-6 md:p-8">
      <p class="label label-accent">
        Sent
      </p>
      <p class="mt-3 text-[1.5rem] font-semibold tracking-[-0.02em]">
        Thank you. Your message is on its way.
      </p>
      <p class="mt-2 text-soft">
        {{ site.contact.responseTime }}
      </p>
      <button type="button" class="btn btn-secondary mt-6" @click="status = 'idle'">
        Send another message
      </button>
    </div>

    <form v-else class="space-y-5" @submit.prevent="submit">
      <div>
        <label for="contact-name" class="label mb-2 block text-ink">Name</label>
        <input
          id="contact-name"
          v-model.trim="form.name"
          type="text"
          name="name"
          autocomplete="name"
          required
          maxlength="100"
          class="field"
        >
      </div>
      <div>
        <label for="contact-email" class="label mb-2 block text-ink">Email</label>
        <input
          id="contact-email"
          v-model.trim="form.email"
          type="email"
          name="email"
          autocomplete="email"
          required
          maxlength="254"
          class="field"
        >
      </div>
      <div>
        <label for="contact-message" class="label mb-2 block text-ink">Message</label>
        <textarea
          id="contact-message"
          v-model.trim="form.message"
          name="message"
          rows="7"
          required
          maxlength="5000"
          class="field resize-y"
        />
      </div>

      <p v-if="unavailable" role="alert" class="border border-rule-strong p-4 text-soft">
        The form is not available right now. Please email
        <a class="link" :href="`mailto:${site.contact.email}`">{{ site.contact.email }}</a> instead.
      </p>
      <TurnstileWidget v-else-if="checkRequired" ref="widget" :site-key="siteKey" @token="token = $event" />

      <p v-if="status === 'error'" role="alert" class="border-l-2 border-accent pl-4 text-accent-ink">
        {{ errorMessage }} You can also email
        <a class="underline" :href="`mailto:${site.contact.email}`">{{ site.contact.email }}</a>.
      </p>

      <button type="submit" class="btn btn-primary" :disabled="!canSubmit || unavailable">
        {{ status === 'sending' ? 'Sending…' : 'Send message' }}
        <AppIcon v-if="status !== 'sending'" name="arrow-right" class="arrow" />
      </button>
    </form>
  </div>
</template>

<style scoped>
.field {
  display: block;
  width: 100%;
  padding: 0.75rem 0.875rem;
  border: 1px solid var(--rule-strong);
  border-radius: 2px;
  background-color: var(--paper);
  color: var(--ink);
  font: inherit;
  line-height: 1.4;
}

.field:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
</style>
