<script setup>
defineProps({
  title: { type: String, required: true },
  body: { type: String, default: '' },
  icon: {
    type: String,
    default: 'lightbulb',
    validator: (value) => ['lightbulb', 'download', 'none'].includes(value),
  },
  pointer: {
    type: String,
    default: 'none',
    validator: (value) => ['none', 'top-start', 'top-center'].includes(value),
  },
  dismissible: { type: Boolean, default: true },
  dismissLabel: { type: String, default: 'Dismiss tip' },
})

defineEmits(['dismiss'])
</script>

<template>
  <div class="onboarding-guidance">
    <span
      v-if="pointer !== 'none'"
      class="onboarding-guidance__pointer"
      :class="`onboarding-guidance__pointer--${pointer}`"
      aria-hidden="true"
    />

    <div class="onboarding-guidance__surface pressed-paper">
      <div
        class="onboarding-guidance__content"
        :class="{ 'onboarding-guidance__content--title-only': !body }"
      >
        <div v-if="icon !== 'none'" class="onboarding-guidance__icon">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <template v-if="icon === 'download'">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </template>
            <template v-else>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 18h6" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 22h4" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3a6 6 0 00-3.6 10.8c.79.59 1.35 1.44 1.56 2.4h4.08c.21-.96.77-1.81 1.56-2.4A6 6 0 0012 3z" />
            </template>
          </svg>
        </div>

        <div class="onboarding-guidance__copy">
          <p class="onboarding-guidance__title">{{ title }}</p>
          <p v-if="body" class="onboarding-guidance__body">{{ body }}</p>
          <div v-if="$slots.actions" class="onboarding-guidance__actions">
            <slot name="actions" />
          </div>
        </div>

        <button
          v-if="dismissible"
          type="button"
          class="onboarding-guidance__close"
          :aria-label="dismissLabel"
          @click="$emit('dismiss')"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.onboarding-guidance {
  position: relative;
  isolation: isolate;
  width: 100%;
  overflow: visible;
}

.onboarding-guidance__surface {
  position: relative;
  z-index: 1;
  border-color: var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: 0.85rem 1rem;
}

.onboarding-guidance__content {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.onboarding-guidance__content--title-only {
  align-items: center;
}

.onboarding-guidance__icon {
  display: flex;
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-lg);
  background-color: color-mix(in srgb, var(--color-accent-warm) 14%, transparent);
  color: var(--color-accent-warm-text);
}

.onboarding-guidance__copy {
  min-width: 0;
  flex: 1;
}

.onboarding-guidance__title {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-text-primary);
}

.onboarding-guidance__body {
  margin: 0.25rem 0 0;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.onboarding-guidance__actions {
  margin-top: 0.75rem;
}

.onboarding-guidance__close {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  margin: -0.1rem -0.25rem 0 0;
  border-radius: var(--radius-pill);
  padding: 0.35rem;
  color: var(--color-text-muted);
  transition: background-color 160ms ease, color 160ms ease;
  cursor: pointer;
}

.onboarding-guidance__content--title-only .onboarding-guidance__close {
  margin-top: 0;
}

.onboarding-guidance__close:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-accent-warm-text);
}

.onboarding-guidance__pointer {
  position: absolute;
  top: 0;
  z-index: 2;
  width: 0.9rem;
  height: 0.9rem;
  border-top: 1px solid var(--color-border-default);
  border-left: 1px solid var(--color-border-default);
  background-color: var(--color-bg-pressed-paper);
  transform: translateY(-50%) rotate(45deg);
}

.onboarding-guidance__pointer--top-start {
  left: 2rem;
}

.onboarding-guidance__pointer--top-center {
  left: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
}
</style>
