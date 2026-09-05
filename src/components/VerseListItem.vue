<script setup>
import { ref } from 'vue'
import HeadwordReference from './brand/HeadwordReference.vue'
import POSBadge from './brand/POSBadge.vue'

defineProps({
  reference: { type: String, required: true },
  bibleVersion: { type: String, default: '' },
  status: { type: String, default: '' },
  due: { type: Boolean, default: false },
  meta: { type: String, default: '' },
  expandable: { type: Boolean, default: false },
  expanded: { type: Boolean, default: false },
  selecting: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
  showEdit: { type: Boolean, default: false },
})

defineEmits([
  'toggle-expanded',
  'toggle-selected',
  'edit',
])

const root = ref(null)

const scrollIntoView = (options) => root.value?.scrollIntoView(options)

defineExpose({ scrollIntoView })
</script>

<template>
  <div
    ref="root"
    class="verse-card"
    :class="{
      'verse-card--due': due,
      'verse-card--expanded': expanded,
      'verse-card--selecting': selecting,
      'verse-card--selected': selected,
    }"
    :aria-selected="selecting ? selected : null"
  >
    <div class="verse-card__summary-row">
      <button
        v-if="expandable && !selecting"
        type="button"
        class="verse-card__leading-control"
        :aria-label="expanded ? 'Collapse verse' : 'Expand verse'"
        @click.stop="$emit('toggle-expanded', $event)"
      >
        <svg
          class="verse-card__leading-icon h-5 w-5"
          :class="{ 'verse-card__leading-icon--expanded': expanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <button
        v-else-if="selecting"
        type="button"
        class="verse-card__leading-control verse-card__select-check"
        :class="{ 'verse-card__select-check--checked': selected }"
        :aria-label="selected ? 'Deselect verse' : 'Select verse'"
        @click.stop="$emit('toggle-selected', $event)"
      >
        <svg v-if="selected" class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.4" d="M5 13l4 4L19 7" />
        </svg>
      </button>

      <div class="verse-card__summary">
        <div class="verse-card__identity">
          <HeadwordReference class="verse-card__reference" :reference="reference" size="sm" />
          <span v-if="bibleVersion" class="verse-card__version">{{ bibleVersion }}</span>
        </div>

        <div class="verse-card__actions">
          <POSBadge v-if="status" class="verse-card__status" :status="status" :due="due" />
          <span v-else-if="meta" class="verse-card__meta">{{ meta }}</span>
          <button
            v-if="showEdit"
            type="button"
            class="verse-card__edit"
            title="Edit verse"
            aria-label="Edit verse"
            @click.stop="$emit('edit', $event)"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="$slots.body"
      class="verse-card__body-grid"
      :class="{ 'verse-card__body-grid--expanded': expanded }"
      :aria-hidden="!expanded"
    >
      <div class="verse-card__body-clip">
        <div class="verse-card__body" :class="{ 'verse-card__body--indented': expandable || selecting }">
          <slot name="body" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.verse-card {
  position: relative;
  display: flex;
  min-height: 3.5rem;
  flex-direction: column;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background-color: var(--color-bg-chrome);
  padding: 0.6875rem 1rem;
  box-shadow: var(--shadow-soft);
  cursor: pointer;
  transition: transform 160ms ease, background-color 160ms ease, border-color 160ms ease;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

.verse-card:active {
  transform: scale(0.985);
}

.verse-card--expanded {
  box-shadow: var(--shadow-soft);
}

.verse-card--onboarding {
  border-color: color-mix(in srgb, var(--color-accent) 24%, var(--color-border-default));
}

.verse-card--selecting {
  cursor: default;
}

.verse-card--selected {
  border-color: color-mix(in srgb, var(--color-accent) 42%, var(--color-border-default));
  background-color: color-mix(in srgb, var(--color-action-bg) 10%, var(--color-bg-chrome));
}

.verse-card__summary-row,
.verse-card__summary,
.verse-card__identity,
.verse-card__actions {
  display: flex;
  align-items: center;
}

.verse-card__summary-row {
  width: 100%;
  min-height: 2rem;
  gap: 0.5rem;
}

.verse-card__summary,
.verse-card__identity {
  min-width: 0;
  flex: 1;
}

.verse-card__summary {
  justify-content: space-between;
  gap: 0.5rem;
}

.verse-card__identity {
  flex-wrap: nowrap;
  gap: 0.5rem;
}

.verse-card__reference {
  transform: translateY(-0.125rem);
}

.verse-card__version {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  text-transform: uppercase;
}

.verse-card__actions {
  min-height: 2rem;
  flex-shrink: 0;
  gap: 0.25rem;
}

.verse-card__meta {
  font-family: var(--font-sans);
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.2;
  letter-spacing: 0;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.verse-card__leading-control {
  display: inline-flex;
  width: 1.75rem;
  height: 1.75rem;
  margin-left: -0.25rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: var(--color-text-muted);
  transition: color 160ms ease, background-color 160ms ease;
}

.verse-card__leading-control:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-accent);
}

.verse-card__leading-icon {
  transform-origin: center;
  transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.verse-card__leading-icon--expanded {
  transform: rotate(90deg);
}

.verse-card__select-check::before {
  content: '';
  width: 1.05rem;
  height: 1.05rem;
  border: 1px solid color-mix(in srgb, var(--color-border-input) 78%, transparent);
  border-radius: 999px;
  background-color: color-mix(in srgb, var(--color-bg-surface) 76%, transparent);
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

.verse-card__select-check--checked {
  position: relative;
  color: var(--color-action-text);
}

.verse-card__select-check--checked::before {
  border-color: var(--color-action-border);
  background-color: var(--color-action-bg);
}

.verse-card__select-check svg {
  position: absolute;
}

.verse-card__edit {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.375rem;
  color: var(--color-text-muted);
  transition: color 160ms ease, background-color 160ms ease;
}

.verse-card__edit:hover {
  background-color: var(--color-bg-hover);
  color: var(--color-accent);
}

.verse-card__body-grid {
  display: grid;
  grid-template-rows: 0fr;
  width: 100%;
  visibility: hidden;
  opacity: 0;
  transform: translateY(-0.25rem);
  transition:
    grid-template-rows 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity 150ms ease,
    transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
    visibility 0s linear 220ms;
}

.verse-card__body-grid--expanded {
  grid-template-rows: 1fr;
  visibility: visible;
  opacity: 1;
  transform: translateY(0);
  transition-delay: 0s;
}

.verse-card__body-clip {
  min-height: 0;
  overflow: hidden;
}

.verse-card__body {
  margin-top: 0.6rem;
  border-top: 1px solid var(--color-border-default);
  padding-top: 0.6rem;
  font-family: var(--font-serif);
  font-size: 1rem;
  line-height: 1.65;
  color: var(--color-text-primary);
}

.verse-card__body--indented {
  margin-left: 2.25rem;
}

@media (prefers-reduced-motion: reduce) {
  .verse-card__leading-icon,
  .verse-card__body-grid {
    transition-duration: 0ms;
  }
}
</style>
