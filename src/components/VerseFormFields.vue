<template>
  <div class="space-y-4">
    <div>
      <VerseReferenceInput
        :id="referenceId"
        :model-value="modelValue.reference"
        class="w-full sm:max-w-80"
        placeholder="e.g., Joshua 1:8-9 or Psalm 1"
        required
        :invalid="referenceInvalid"
        :error-message-id="referenceFeedbackId"
        @update:model-value="handleReferenceInput"
        @blur="$emit('reference-blur')"
      />
      <Transition name="reference-feedback">
        <p
          v-if="displayedReferenceWarning"
          :id="referenceFeedbackId"
          class="mt-2 overflow-hidden text-xs leading-relaxed"
          :class="referenceWarningClass"
          :role="referenceInvalid ? 'alert' : undefined"
        >
          <span class="block">{{ displayedReferenceWarning }}</span>
          <span v-if="referenceInvalid" class="mt-1 block text-text-muted">
            Examples: John 3:16 · John 3:16–17 · John 3:36–4:2 · Psalm 1 · Psalm 1–3
          </span>
        </p>
      </Transition>
    </div>

    <div>
      <label :for="bibleVersionId" class="block text-sm font-medium text-text-secondary mb-2">
        Bible version
      </label>
      <input
        :id="bibleVersionId"
        :value="modelValue.bibleVersion"
        type="text"
        placeholder="e.g., BSB"
        maxlength="10"
        class="w-28 max-w-full px-4 py-3 border border-border-input rounded-lg focus:ring-0 focus:border-accent outline-none bg-overlay text-text-primary uppercase tracking-wider"
        style="text-transform: uppercase;"
        @input="handleBibleVersionInput"
      />
      <label
        v-if="showDefaultBibleVersionOption"
        class="mt-2 flex w-fit cursor-pointer items-center gap-1.5 text-sm text-text-secondary"
      >
        <input
          :checked="useBibleVersionAsDefault"
          type="checkbox"
          data-testid="new-verse-default-bible-version"
          class="h-4 w-4 rounded border-border-input accent-accent-strong"
          @change="$emit('update-default-bible-version', $event.target.checked)"
        />
        <span>Use {{ bibleVersionLabel }} by default</span>
      </label>
    </div>

    <Transition name="verse-import-action">
      <div v-if="importVisible" class="pt-2">
        <button
          type="button"
          aria-label="Import verse text"
          :disabled="importing"
          class="btn-secondary btn--sm"
          @click="$emit('import')"
        >
          <svg v-if="importing" class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14" />
          </svg>
          <span>{{ importing ? 'Importing...' : 'Import verse text' }}</span>
        </button>

        <div
          v-if="importError"
          ref="importErrorRef"
          class="mt-2 p-3 bg-status-amber-bg border border-status-amber-border rounded-lg space-y-2"
        >
          <template v-if="importErrorShowLink">
            <p class="text-sm text-status-amber-text">
              This translation is copyrighted. Copy the text from one of the links below and paste it into <strong>Verse text</strong>.
            </p>
            <div class="flex flex-wrap gap-2">
              <a
                :href="bibleGatewayUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center px-3 py-1 rounded-full border border-status-amber-border text-sm text-status-purple-text hover:bg-status-amber-border transition-colors"
              >
                Bible Gateway
              </a>
              <a
                v-if="youVersionUrl"
                :href="youVersionUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center px-3 py-1 rounded-full border border-status-amber-border text-sm text-status-purple-text hover:bg-status-amber-border transition-colors"
              >
                YouVersion
              </a>
            </div>
            <p class="text-sm text-status-amber-text">
              Or try the BSB translation to fill in the verse text automatically.
            </p>
            <a
              href="https://fetch.bible/content/need/"
              target="_blank"
              rel="noopener noreferrer"
              class="text-sm text-status-purple-text hover:underline inline-block"
            >
              Find out why popular Bibles can't be freely shared
            </a>
          </template>
          <p v-else class="text-sm text-status-amber-text">{{ importError }}</p>
        </div>
      </div>
    </Transition>

    <div class="pt-1">
      <label :for="contentId" class="block text-sm font-medium text-text-secondary mb-2">
        Verse text
      </label>
      <textarea
        :id="contentId"
        :value="modelValue.content"
        rows="6"
        placeholder="Enter the verse text here..."
        required
        class="w-full px-4 py-3 border border-border-input rounded-lg focus:ring-0 focus:border-accent outline-none bg-overlay text-text-primary resize-none"
        @input="updateField('content', $event.target.value)"
      ></textarea>
    </div>

    <CollectionPicker
      :collections="collections"
      :model-value="modelValue.collectionIds"
      @update:model-value="updateField('collectionIds', $event)"
    />
  </div>
</template>

<script>
import { nextTick } from 'vue'
import CollectionPicker from './CollectionPicker.vue'
import VerseReferenceInput from './VerseReferenceInput.vue'
import { parseVerseSpanReference } from '../utils/bible-reference.js'

const REFERENCE_FEEDBACK_DELAY_MS = 200
const IMPORT_REVEAL_DELAY_MS = 200
const IMPORT_REVEAL_WITH_FEEDBACK_DELAY_MS = 300

export default {
  name: 'VerseFormFields',
  components: { CollectionPicker, VerseReferenceInput },
  data() {
    return {
      displayedReferenceWarning: '',
      importVisible: false,
      referenceFeedbackTimer: null,
      importRevealTimer: null,
      reduceMotion: false,
      motionPreference: null,
    }
  },
  props: {
    modelValue: {
      type: Object,
      required: true,
    },
    collections: {
      type: Array,
      required: true,
    },
    referenceId: {
      type: String,
      required: true,
    },
    bibleVersionId: {
      type: String,
      required: true,
    },
    contentId: {
      type: String,
      required: true,
    },
    referenceWarning: {
      type: String,
      default: '',
    },
    referenceWarningClass: {
      type: [String, Array, Object],
      default: '',
    },
    referenceInvalid: {
      type: Boolean,
      default: false,
    },
    showDefaultBibleVersionOption: {
      type: Boolean,
      default: false,
    },
    useBibleVersionAsDefault: {
      type: Boolean,
      default: false,
    },
    bibleVersionLabel: {
      type: String,
      default: '',
    },
    showImport: {
      type: Boolean,
      default: true,
    },
    importing: {
      type: Boolean,
      default: false,
    },
    importError: {
      type: String,
      default: '',
    },
    importErrorShowLink: {
      type: Boolean,
      default: false,
    },
    bibleGatewayUrl: {
      type: String,
      default: 'https://www.biblegateway.com/',
    },
    youVersionUrl: {
      type: String,
      default: null,
    },
  },
  emits: [
    'update:modelValue',
    'reference-blur',
    'reference-input',
    'citation-input',
    'bible-version-input',
    'update-default-bible-version',
    'import',
  ],
  computed: {
    referenceFeedbackId() {
      return `${this.referenceId}-feedback`
    },
    importEligible() {
      return this.showImport
        && Boolean(parseVerseSpanReference(this.modelValue.reference || ''))
        && Boolean(String(this.modelValue.bibleVersion || '').trim())
    },
  },
  watch: {
    referenceWarning() {
      this.scheduleReferenceFeedback()
    },
    'modelValue.reference'() {
      this.scheduleReferenceFeedback()
      this.scheduleImportReveal()
    },
    'modelValue.bibleVersion'() {
      this.scheduleImportReveal()
    },
    showImport() {
      this.scheduleImportReveal()
    },
    importErrorShowLink(showLink) {
      if (!showLink) return
      nextTick(() => {
        this.$refs.importErrorRef?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    },
  },
  mounted() {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
      this.reduceMotion = this.motionPreference.matches
      this.motionPreference.addEventListener?.('change', this.handleMotionPreferenceChange)
    }

    this.scheduleReferenceFeedback()
    this.scheduleImportReveal()
  },
  beforeUnmount() {
    clearTimeout(this.referenceFeedbackTimer)
    clearTimeout(this.importRevealTimer)
    this.motionPreference?.removeEventListener?.('change', this.handleMotionPreferenceChange)
  },
  methods: {
    updateField(field, value) {
      this.$emit('update:modelValue', {
        ...this.modelValue,
        [field]: value,
      })
    },
    handleReferenceInput(value) {
      this.updateField('reference', value)
      this.$emit('reference-input')
      this.$emit('citation-input')
    },
    handleBibleVersionInput(event) {
      this.updateField('bibleVersion', event.target.value)
      this.$emit('citation-input')
      this.$emit('bible-version-input')
    },
    scheduleReferenceFeedback() {
      clearTimeout(this.referenceFeedbackTimer)

      if (this.displayedReferenceWarning !== this.referenceWarning) {
        this.displayedReferenceWarning = ''
      }
      if (!this.referenceWarning) return

      const warning = this.referenceWarning
      const delay = this.reduceMotion || this.referenceInvalid ? 0 : REFERENCE_FEEDBACK_DELAY_MS
      this.referenceFeedbackTimer = setTimeout(() => {
        if (this.referenceWarning === warning) {
          this.displayedReferenceWarning = warning
        }
      }, delay)
    },
    scheduleImportReveal() {
      clearTimeout(this.importRevealTimer)

      if (!this.importEligible) {
        this.importVisible = false
        return
      }

      const delay = this.reduceMotion
        ? 0
        : (this.referenceWarning ? IMPORT_REVEAL_WITH_FEEDBACK_DELAY_MS : IMPORT_REVEAL_DELAY_MS)
      this.importRevealTimer = setTimeout(() => {
        if (this.importEligible) {
          this.importVisible = true
        }
      }, delay)
    },
    handleMotionPreferenceChange(event) {
      this.reduceMotion = event.matches
      this.scheduleReferenceFeedback()
      this.scheduleImportReveal()
    },
  },
}
</script>

<style scoped>
.reference-feedback-enter-active,
.reference-feedback-leave-active {
  max-height: 8rem;
  transition: opacity 180ms ease, transform 180ms ease, max-height 180ms ease, margin-top 180ms ease;
}

.reference-feedback-enter-from,
.reference-feedback-leave-to {
  max-height: 0;
  margin-top: 0;
  opacity: 0;
  transform: translateY(-0.25rem);
}

.verse-import-action-enter-active,
.verse-import-action-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}

.verse-import-action-enter-from,
.verse-import-action-leave-to {
  opacity: 0;
  transform: translateY(-0.25rem);
}

@media (prefers-reduced-motion: reduce) {
  .reference-feedback-enter-active,
  .reference-feedback-leave-active,
  .verse-import-action-enter-active,
  .verse-import-action-leave-active {
    transition: none;
  }
}
</style>
