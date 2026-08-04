<template>
  <div>
    <label :for="id" class="block text-sm font-medium text-text-secondary mb-2">
      {{ label }}
    </label>

    <div
      class="relative rounded-lg border bg-overlay focus-within:ring-0"
      :class="invalid
        ? 'border-status-error-border focus-within:border-status-error-border'
        : 'border-border-input focus-within:border-accent'"
    >
      <div
        v-if="completion"
        class="pointer-events-none absolute inset-0 z-10 flex items-center overflow-hidden whitespace-pre px-4 py-3 text-base leading-6"
      >
        <span class="invisible" aria-hidden="true">{{ modelValue }}</span>
        <button
          type="button"
          tabindex="-1"
          :aria-label="`Use ${completion.book.name}`"
          class="pointer-events-auto min-h-6 text-left text-text-muted transition-colors hover:text-accent focus:outline-none"
          @mousedown.prevent
          @click="acceptCompletion"
        >
          {{ completion.displayText }}
        </button>
      </div>

      <input
        :id="id"
        ref="inputRef"
        :value="modelValue"
        :type="type"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :aria-invalid="invalid ? 'true' : undefined"
        :aria-describedby="invalid && errorMessageId ? errorMessageId : undefined"
        autocomplete="off"
        autocapitalize="words"
        spellcheck="false"
        class="relative z-0 w-full bg-transparent px-4 py-3 text-base leading-6 text-text-primary outline-none disabled:cursor-not-allowed disabled:opacity-60"
        :class="{ 'pr-11': invalid }"
        @input="$emit('update:modelValue', $event.target.value)"
        @keydown="handleKeydown"
        @blur="$emit('blur', $event)"
      />

      <svg
        v-if="invalid"
        class="pointer-events-none absolute right-3 top-1/2 z-20 h-5 w-5 -translate-y-1/2 text-status-error-text"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path stroke-linecap="round" d="M12 7.5v5.5" />
        <circle cx="12" cy="16.5" r="0.75" fill="currentColor" stroke="none" />
      </svg>
    </div>
  </div>
</template>

<script>
import { nextTick } from 'vue'
import { getBibleBookSuggestion } from '../utils/bible-reference.js'

export default {
  name: 'VerseReferenceInput',
  props: {
    id: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      default: 'Reference',
    },
    modelValue: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: '',
    },
    required: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    invalid: {
      type: Boolean,
      default: false,
    },
    errorMessageId: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      default: 'text',
    },
  },
  emits: ['update:modelValue', 'blur', 'accept'],
  computed: {
    completion() {
      const book = getBibleBookSuggestion(this.modelValue)
      if (!book) return null

      const typed = this.modelValue.trim()
      const displayText = book.name.slice(typed.length)

      return {
        book,
        displayText,
      }
    },
  },
  methods: {
    acceptCompletion() {
      if (!this.completion) return

      this.$emit('update:modelValue', `${this.completion.book.name} `)
      this.$emit('accept', this.completion.book)
      nextTick(() => {
        this.$refs.inputRef?.focus()
      })
    },
    handleKeydown(event) {
      if ((event.key === 'Enter' || event.key === 'Tab') && this.completion) {
        event.preventDefault()
        this.acceptCompletion()
      }
    },
  },
}
</script>
