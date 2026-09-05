<script setup>
import { computed } from 'vue'

const props = defineProps({
  // One of: 'unmemorized' | 'learned' | 'memorized' | 'mastered'
  status: { type: String, required: true },
  // If true, a 'mastered' verse becomes 'due' instead of 'mastered'
  due: { type: Boolean, default: false },
})

const label = computed(() => {
  if (props.due) return 'due'
  switch (props.status) {
    case 'unmemorized':
      return 'learn'
    case 'learned':
      return 'memorize'
    case 'memorized':
      return 'master'
    case 'mastered':
      return 'mastered'
    default:
      return props.status
  }
})

const variant = computed(() => {
  if (props.due) return 'due'
  if (props.status === 'mastered') return 'mastered'
  return 'progress'
})
</script>

<template>
  <span class="pos-badge-el" :class="[`pos-badge-el--${variant}`]">{{ label }}</span>
</template>

<style scoped>
.pos-badge-el {
  display: inline-block;
  font-family: var(--font-sans);
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: 0;
  white-space: nowrap;
}

.pos-badge-el--progress {
  color: var(--color-status-progress-text);
}

.pos-badge-el--mastered {
  color: var(--color-text-muted);
}

.pos-badge-el--due {
  font-weight: 600;
  color: var(--color-status-due-text);
}
</style>
