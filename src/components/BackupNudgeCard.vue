<script setup>
import OnboardingCallout from './OnboardingCallout.vue'

defineEmits(['sync', 'close'])
</script>

<template>
  <OnboardingCallout
    data-testid="backup-nudge-card"
    role="region"
    aria-label="Sync your verses"
    title="Sync your verses."
    body="Keep them safe and available on every device you use."
    icon="download"
    dismiss-label="Dismiss sync reminder"
    @dismiss="$emit('close')"
  >
    <template #actions>
      <button
        type="button"
        class="btn-primary btn--sm"
        data-testid="backup-nudge-sync"
        @click="$emit('sync')"
      >
        Set up sync
      </button>
    </template>
  </OnboardingCallout>
</template>
