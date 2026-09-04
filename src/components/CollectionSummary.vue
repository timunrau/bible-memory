<script setup>
import { computed } from 'vue'

const props = defineProps({
  summary: { type: Object, required: true },
  showStatus: { type: Boolean, default: true },
})

const label = computed(() => {
  const { total, due, learning } = props.summary
  const parts = [`${total} verse${total !== 1 ? 's' : ''}`]
  if (props.showStatus) {
    if (due > 0) parts.push(`${due} due`)
    if (learning > 0) parts.push(`${learning} unmastered`)
  }
  return parts.join(' · ')
})
</script>

<template>
  <div class="collection-tile__meta">{{ label }}</div>
</template>
