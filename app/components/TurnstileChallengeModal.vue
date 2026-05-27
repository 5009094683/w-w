<script setup lang="ts">
const {
  modalOpen,
  modalToken,
  isEnabled,
  completeChallenge,
  cancelChallenge
} = useTurnstileChallenge()

watch(modalToken, (token) => {
  if (token) {
    completeChallenge(token)
  }
})

watch(modalOpen, (open) => {
  if (!open) {
    modalToken.value = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="modalOpen && isEnabled"
      class="turnstile-modal-overlay"
      @click.self="cancelChallenge"
    >
      <div
        class="turnstile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="turnstile-modal-title"
      >
        <h3 id="turnstile-modal-title" class="turnstile-modal-title">
          Security check
        </h3>
        <p class="turnstile-modal-text">
          Please verify you're human to continue.
        </p>
        <div class="turnstile-modal-widget">
          <NuxtTurnstile v-model="modalToken" />
        </div>
        <button type="button" class="turnstile-modal-cancel" @click="cancelChallenge">
          Cancel
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.turnstile-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
}

.turnstile-modal {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 16px;
  padding: 28px 24px 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  text-align: center;
}

.turnstile-modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}

.turnstile-modal-text {
  font-size: 0.95rem;
  color: #6b7280;
  margin-bottom: 20px;
}

.turnstile-modal-widget {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.turnstile-modal-cancel {
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.turnstile-modal-cancel:hover {
  background: #e5e7eb;
}
</style>
