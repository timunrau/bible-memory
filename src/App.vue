<template>
  <!-- Memorization Screen -->
  <div
    v-if="memorizingVerse"
    class="fixed inset-0 bg-gray-50 z-50 flex flex-col"
    style="height: 100dvh;"
  >
    <!-- Top App Bar -->
    <header class="bg-white shadow-sm z-40 flex-shrink-0">
      <div class="h-16 flex items-center px-4">
        <button
          @click="exitMemorization"
          class="p-2 -ml-2 mr-1 text-gray-700 active:bg-gray-100 rounded-full transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-xl font-semibold text-gray-900 flex-1 text-center mr-20">
          {{ memorizingVerse.reference }}
        </h1>
        <div class="flex items-center gap-1 ml-1">
          <!-- Sync Button -->
          <button
            @click="manualSync"
            :disabled="syncing"
            class="p-2 text-gray-700 active:bg-gray-100 rounded-full transition-colors relative"
            :class="{ 'opacity-50 cursor-not-allowed': syncing }"
            :title="syncing ? 'Syncing...' : 'Sync with WebDAV'"
          >
            <!-- Spinning sync icon -->
            <svg 
              v-if="syncing" 
              class="w-6 h-6 animate-spin" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style="transform-origin: center;"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <!-- Success checkmark -->
            <svg 
              v-else-if="syncSuccess" 
              class="w-6 h-6 text-green-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <!-- Default sync icon -->
            <svg 
              v-else 
              class="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <div ref="memorizationScrollContainer" class="flex-1 overflow-y-auto max-w-4xl mx-auto w-full px-4 py-4">
      <div class="mb-6">
        
        <!-- Progress Indicator -->
        <div class="flex items-center gap-2 mb-4">
          <div
            v-for="(stage, index) in [
              { name: 'Learn', status: 'unmemorized' },
              { name: 'Memorize', status: 'learned' },
              { name: 'Master', status: 'memorized' }
            ]"
            :key="index"
            class="flex items-center"
          >
            <div
              :class="[
                'px-4 py-2 rounded-lg font-semibold',
                getMemorizationStatus(memorizingVerse) === stage.status
                  ? 'bg-blue-600 text-white'
                  : getMemorizationStatus(memorizingVerse) === 'mastered' || 
                    (stage.status === 'unmemorized' && getMemorizationStatus(memorizingVerse) === 'learned') ||
                    (stage.status === 'learned' && getMemorizationStatus(memorizingVerse) === 'memorized') ||
                    (stage.status === 'memorized' && getMemorizationStatus(memorizingVerse) === 'mastered')
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-200 text-gray-600'
              ]"
            >
              {{ stage.name }}
            </div>
            <svg
              v-if="index < 2"
              class="w-6 h-6 mx-2 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-xl p-4 my-4">
        <div
          class="text-xl leading-relaxed text-gray-900 font-serif min-h-[200px]"
          @click="focusInput"
        >
          <span
            v-for="(word, index) in reviewWords"
            :key="index"
            :id="`memorize-word-${index}`"
            class="inline-block mr-2"
          >
            <span
              v-if="memorizationMode === 'learn'"
              :class="word.revealed ? (word.incorrect ? 'text-red-600 font-semibold' : 'text-gray-900 font-semibold') : 'text-gray-300'"
            >
              {{ word.text }}
            </span>
            <span
              v-else-if="memorizationMode === 'memorize'"
            >
              <span v-if="word.visible && !word.revealed" class="text-gray-300">
                {{ word.text }}
              </span>
              <span v-else-if="word.revealed" :class="word.incorrect ? 'text-red-600' : 'text-gray-900'">
                {{ word.text }}
              </span>
              <span v-else class="text-gray-300">
                {{ '_'.repeat(word.text.length) }}
              </span>
            </span>
            <span
              v-else-if="memorizationMode === 'master'"
            >
              <span v-if="word.revealed" :class="word.incorrect ? 'text-red-600' : 'text-gray-900'">
                {{ word.text }}
              </span>
              <span v-else class="text-gray-300">
                {{ '_'.repeat(word.text.length) }}
              </span>
            </span>
          </span>
        </div>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div class="flex justify-between items-center mb-2">
          <p class="text-sm text-blue-800">
            <strong>Progress:</strong> {{ revealedCount }} / {{ reviewWords.length }} words
          </p>
          <p class="text-sm text-blue-800">
            <strong>Mistakes:</strong> {{ reviewMistakes }}
          </p>
        </div>
        <div class="mt-2 w-full bg-blue-200 rounded-full h-2">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${(revealedCount / reviewWords.length) * 100}%` }"
          ></div>
        </div>
      </div>

      <div class="text-center">
        <input
          ref="reviewInput"
          v-model="typedLetter"
          @keydown="handleKeyPress"
          @input="checkLetter"
          type="text"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          inputmode="text"
          name="letter-input"
          id="letter-input-memorize"
          class="absolute opacity-0 w-0 h-0"
        />
      </div>

      <!-- Completion Modal for Memorization -->
      <div
        v-if="allWordsRevealed && memorizationMode"
        class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      >
        <div class="bg-white rounded-3xl shadow-xl max-w-md w-full p-6">
          <div v-if="meetsAccuracyRequirement">
            <p class="text-2xl font-bold text-green-800 mb-2 text-center">🎉 Great job!</p>
            <p class="text-green-700 text-center mb-6">
              <span v-if="memorizationMode === 'learn'">You've learned this verse! Ready to memorize it?</span>
              <span v-else-if="memorizationMode === 'memorize'">You've memorized this verse! Ready to master it?</span>
              <span v-else-if="memorizationMode === 'master'">You've mastered this verse! It's now in your spaced repetition system.</span>
            </p>
            <div class="flex justify-center">
              <button
                v-if="memorizationMode !== 'master'"
                @click="advanceToNextMode"
                class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors duration-200"
              >
                Continue to {{ memorizationMode === 'learn' ? 'Memorize' : 'Master' }}
              </button>
              <button
                v-else
                @click="exitMemorization"
                class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors duration-200"
              >
                Done
              </button>
            </div>
          </div>
          <div v-else>
            <p class="text-2xl font-bold text-orange-800 mb-2 text-center">Keep practicing!</p>
            <p class="text-orange-700 text-center mb-2">
              Your accuracy is {{ accuracy.toFixed(1) }}%. You need 90% accuracy to advance.
            </p>
            <p class="text-sm text-gray-600 text-center mb-6">
              Mistakes: {{ reviewMistakes }} / {{ reviewWords.length }} words
            </p>
            <div class="flex justify-center">
              <button
                @click="retryMemorization"
                class="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors duration-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Review Screen -->
  <div
    v-if="reviewingVerse"
    class="fixed inset-0 bg-gray-50 z-50 flex flex-col"
    style="height: 100dvh;"
  >
    <!-- Top App Bar -->
    <header class="bg-white shadow-sm z-40 flex-shrink-0">
      <div class="h-16 flex items-center px-4">
        <button
          @click="exitReview"
          class="p-2 -ml-2 mr-1 text-gray-700 active:bg-gray-100 rounded-full transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-xl font-semibold text-gray-900 flex-1 text-center mr-20">
          {{ reviewingVerse.reference }}
        </h1>
        <div class="flex items-center gap-1 ml-1">
          <!-- Sync Button -->
          <button
            @click="manualSync"
            :disabled="syncing"
            class="p-2 text-gray-700 active:bg-gray-100 rounded-full transition-colors relative"
            :class="{ 'opacity-50 cursor-not-allowed': syncing }"
            :title="syncing ? 'Syncing...' : 'Sync with WebDAV'"
          >
            <!-- Spinning sync icon -->
            <svg 
              v-if="syncing" 
              class="w-6 h-6 animate-spin" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style="transform-origin: center;"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <!-- Success checkmark -->
            <svg 
              v-else-if="syncSuccess" 
              class="w-6 h-6 text-green-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <!-- Default sync icon -->
            <svg 
              v-else 
              class="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <div class="flex-1 flex flex-col overflow-hidden max-w-4xl mx-auto w-full px-4">
      <!-- Scrollable text box -->
      <div ref="reviewTextContainer" class="flex-1 overflow-y-auto min-h-0 py-4">
        <div class="bg-white rounded-lg shadow-xl p-4">
          <div
            class="text-xl leading-relaxed text-gray-900 font-serif"
            @click="focusInput"
          >
            <span
              v-for="(word, index) in reviewWords"
              :key="index"
              :id="`review-word-${index}`"
              class="inline-block mr-2"
            >
              <span v-if="word.revealed" :class="word.incorrect ? 'text-red-600' : 'text-gray-900'">
                {{ word.text }}
              </span>
              <span v-else class="text-gray-300">
                {{ '_'.repeat(word.text.length) }}
              </span>
            </span>
          </div>
        </div>
      </div>

      <!-- Progress section - stays above keyboard -->
      <div class="flex-shrink-0 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div class="flex justify-between items-center mb-2">
          <p class="text-sm text-blue-800">
            <strong>Progress:</strong> {{ revealedCount }} / {{ reviewWords.length }} words revealed
          </p>
          <p class="text-sm text-blue-800">
            <strong>Mistakes:</strong> {{ reviewMistakes }}
          </p>
        </div>
        <div class="mt-2 w-full bg-blue-200 rounded-full h-2">
          <div
            class="bg-blue-600 h-2 rounded-full transition-all duration-300"
            :style="{ width: `${(revealedCount / reviewWords.length) * 100}%` }"
          ></div>
        </div>
        <div v-if="reviewWords.length > 0" class="mt-2 text-xs text-blue-700">
          <strong>Accuracy:</strong> {{ ((reviewWords.length - reviewMistakes) / reviewWords.length * 100).toFixed(1) }}%
        </div>
      </div>

      <div class="text-center">
        <input
          ref="reviewInput"
          v-model="typedLetter"
          @keydown="handleKeyPress"
          @input="checkLetter"
          type="text"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          inputmode="text"
          name="letter-input"
          id="letter-input-review"
          class="absolute opacity-0 w-0 h-0"
        />
      </div>
    </div>

      <!-- Completion Modal for Review -->
      <div
        v-if="allWordsRevealed && reviewingVerse"
        class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
      >
        <div class="bg-white rounded-3xl shadow-xl max-w-md w-full p-6">
          <div v-if="meetsAccuracyRequirement">
            <p class="text-2xl font-bold text-green-800 mb-2 text-center">🎉 Great job!</p>
            <p class="text-green-700 text-center mb-6">You've reviewed this verse with {{ accuracy.toFixed(1) }}% accuracy!</p>
            <div class="flex justify-center gap-3">
              <button
                @click="retryReview"
                class="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors duration-200"
              >
                Retry
              </button>
              <button
                @click="nextVerse"
                class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors duration-200"
              >
                Next Verse
              </button>
            </div>
          </div>
          <div v-else>
            <p class="text-2xl font-bold text-orange-800 mb-2 text-center">Keep practicing!</p>
            <p class="text-orange-700 text-center mb-2">
              Your accuracy is {{ accuracy.toFixed(1) }}%. You need 90% accuracy to count this as reviewed.
            </p>
            <p class="text-sm text-gray-600 text-center mb-6">
              Mistakes: {{ reviewMistakes }} / {{ reviewWords.length }} words
            </p>
            <div class="flex justify-center">
              <button
                @click="retryReview"
                class="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold transition-colors duration-200"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
  </div>

  <!-- Main Content -->
  <div v-if="!memorizingVerse && !reviewingVerse" class="min-h-screen bg-gray-50">
    <!-- Top App Bar -->
    <header class="bg-white shadow-sm fixed top-0 left-0 right-0 z-40">
      <div class="h-16 flex items-center px-4">
        <button
          v-if="currentCollectionId"
          @click="viewAllVerses"
          class="p-2 -ml-2 mr-1 text-gray-700 active:bg-gray-100 rounded-full transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 class="text-xl font-semibold text-gray-900 flex-1 text-center" :class="{ 'mr-20': !currentCollectionId || currentCollectionId }">
          {{ currentCollectionId ? getCollectionName(currentCollectionId) : 'Collections' }}
        </h1>
        <div class="flex items-center gap-1 ml-1">
          <!-- Sync Button -->
          <button
            @click="manualSync"
            :disabled="syncing"
            class="p-2 text-gray-700 active:bg-gray-100 rounded-full transition-colors relative"
            :class="{ 'opacity-50 cursor-not-allowed': syncing }"
            :title="syncing ? 'Syncing...' : 'Sync with WebDAV'"
          >
            <!-- Spinning sync icon -->
            <svg 
              v-if="syncing" 
              class="w-6 h-6 animate-spin" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              style="transform-origin: center;"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <!-- Success checkmark -->
            <svg 
              v-else-if="syncSuccess" 
              class="w-6 h-6 text-green-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <!-- Default sync icon -->
            <svg 
              v-else 
              class="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <!-- Settings Button -->
          <button
            @click="showSettings = true"
            class="p-2 text-gray-700 active:bg-gray-100 rounded-full transition-colors"
            title="Settings"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <!-- Sync Error Toast -->
    <div
      v-if="syncError"
      class="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 border border-red-200 rounded-lg shadow-lg p-4 max-w-md mx-4"
    >
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="flex-1">
          <p class="text-sm font-medium text-red-800">Sync Failed</p>
          <p class="text-sm text-red-700 mt-1">{{ syncError }}</p>
        </div>
        <button
          @click="syncError = null"
          class="text-red-600 hover:text-red-800 flex-shrink-0"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Content Area with top padding for fixed header -->
    <div class="pt-16 pb-24 px-4">
      <div class="max-w-4xl mx-auto">

      <!-- Collections View -->
      <div v-if="!currentCollectionId" class="py-4">
        
        <div class="space-y-3">
          <!-- Master List Collection -->
          <div
            @click="viewCollection('master-list')"
            class="bg-blue-50 rounded-2xl shadow-sm p-4 cursor-pointer active:scale-98 transition-all duration-200 border border-blue-200"
          >
            <div class="flex items-start justify-between mb-2">
              <h3 class="text-lg font-semibold text-blue-900 flex-1">Master List</h3>
            </div>
            <div class="flex items-center justify-between">
              <div class="text-xs text-gray-500">
                {{ verses.length }} verse{{ verses.length !== 1 ? 's' : '' }}
              </div>
              <div class="flex items-center gap-2">
                <span
                  v-if="dueVersesCount > 0"
                  class="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full"
                >
                  {{ dueVersesCount }}
                </span>
                <span
                  v-else-if="verses.length > 0"
                  class="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full"
                >
                  ✓
                </span>
              </div>
            </div>
          </div>

          <!-- User Collections -->
          <div
            v-for="collection in collections"
            :key="collection.id"
            @click="viewCollection(collection.id)"
            class="bg-white rounded-2xl shadow-sm p-4 cursor-pointer active:scale-98 transition-all duration-200 border border-gray-100"
          >
            <div class="flex items-start justify-between mb-2">
              <h3 class="text-lg font-semibold text-gray-800 flex-1">{{ collection.name }}</h3>
              <button
                @click.stop="deleteCollection(collection.id)"
                class="text-red-600 hover:bg-red-50 p-1 rounded-full -mr-1"
                title="Delete collection"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p v-if="collection.description" class="text-gray-500 text-sm mb-3 line-clamp-2">{{ collection.description }}</p>
            <div class="flex items-center justify-between">
              <div class="text-xs text-gray-500">
                {{ getCollectionVerseCount(collection.id) }} verse{{ getCollectionVerseCount(collection.id) !== 1 ? 's' : '' }}
              </div>
              <div class="flex items-center gap-2">
                <span
                  v-if="getCollectionDueCount(collection.id) > 0"
                  class="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full"
                >
                  {{ getCollectionDueCount(collection.id) }}
                </span>
                <span
                  v-else-if="getCollectionVerseCount(collection.id) > 0"
                  class="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full"
                >
                  ✓
                </span>
              </div>
            </div>
          </div>

          <!-- Empty state when no verses exist -->
          <div v-if="verses.length === 0 && collections.length === 0" class="bg-white rounded-2xl shadow-sm p-12 text-center mt-8">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p class="text-gray-500 text-lg">No verses yet</p>
            <p class="text-gray-400 text-sm mt-2">Tap + to add your first verse</p>
          </div>
        </div>
      </div>

      <!-- Collection View -->
      <div v-if="currentCollectionId" class="py-4">
        <!-- Verse List -->
        <div class="space-y-3 overflow-y-auto max-h-[calc(100vh-5rem)]">
        <div
          v-for="verse in sortedVerses"
          :key="verse.id"
          @click="handleVerseClick(verse)"
          :class="[
            'bg-white rounded-2xl shadow-sm p-4 border transition-all duration-200 cursor-pointer active:scale-98',
            verse.memorizationStatus === 'mastered' && isDueForReview(verse)
              ? 'border-red-200 bg-red-50'
              : verse.memorizationStatus === 'mastered'
              ? 'border-blue-200'
              : 'border-yellow-200 bg-yellow-50'
          ]"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1 flex items-center gap-2">
              <h3 class="text-lg font-semibold text-gray-800">
                {{ verse.reference }}
              </h3>
              <span
                v-if="verse.bibleVersion"
                class="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md uppercase tracking-wider"
              >
                {{ verse.bibleVersion }}
              </span>
            </div>
            <div class="flex items-center gap-1">
              <button
                @click.stop="startEditVerse(verse)"
                class="text-gray-600 hover:bg-gray-100 p-1.5 rounded-full"
                title="Edit verse"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                @click.stop="deleteVerse(verse.id)"
                class="text-red-600 hover:bg-red-50 p-1.5 rounded-full"
                title="Delete verse"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div class="flex items-center justify-between">
            <div class="text-xs text-gray-500">
              <span v-if="verse.collectionIds && verse.collectionIds.length > 0">
                Collections: {{ verse.collectionIds.map(id => getCollectionName(id)).join(', ') }}
              </span>
              <span v-else class="text-gray-400">No collections</span>
            </div>
            <div class="flex items-center gap-2">
              <span
                v-if="verse.memorizationStatus !== 'mastered'"
                :class="[
                  'px-3 py-1 text-xs font-medium rounded-full',
                  verse.memorizationStatus === 'unmemorized'
                    ? 'bg-yellow-100 text-yellow-800'
                    : verse.memorizationStatus === 'learned'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-purple-100 text-purple-800'
                ]"
              >
                {{ verse.memorizationStatus === 'unmemorized' ? 'Learn' : verse.memorizationStatus === 'learned' ? 'Memorize' : 'Master' }}
              </span>
              <span
                v-else-if="isDueForReview(verse)"
                class="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full"
              >
                Due
              </span>
              <span
                v-else
                class="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full"
              >
                {{ getTimeUntilReview(verse) }}
              </span>
            </div>
          </div>
          <div class="text-xs text-gray-500 mt-2">
            <span v-if="verse.memorizationStatus === 'mastered' && verse.reviewCount > 0">
              Reviewed {{ verse.reviewCount }} time{{ verse.reviewCount !== 1 ? 's' : '' }}
              <span v-if="verse.lastReviewed">
                • Last: {{ new Date(verse.lastReviewed).toLocaleDateString() }}
              </span>
              <span v-if="verse.lastAccuracy">
                • Last accuracy: {{ verse.lastAccuracy }}%
              </span>
              <span v-if="verse.easeFactor">
                • Ease: {{ verse.easeFactor.toFixed(2) }}
              </span>
            </span>
            <span v-else-if="verse.memorizationStatus === 'mastered'">
              Mastered - Ready for review
            </span>
            <span v-else>
              <span v-if="verse.memorizationStatus === 'unmemorized'">Click to start learning</span>
              <span v-else-if="verse.memorizationStatus === 'learned'">Click to continue memorizing</span>
              <span v-else-if="verse.memorizationStatus === 'memorized'">Click to master</span>
            </span>
          </div>
        </div>

          <div v-if="sortedVerses.length === 0" class="bg-white rounded-2xl shadow-sm p-12 text-center mt-8">
            <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p class="text-gray-500 text-lg">No verses yet</p>
            <p class="text-gray-400 text-sm mt-2">Tap + to add a verse</p>
          </div>
        </div>
      </div>
      </div>
    </div>

    <!-- Floating Action Button with Menu -->
    <div class="fixed bottom-6 right-6 z-30">
      <!-- FAB Menu (only shown on collections screen) -->
      <transition-group
        v-if="!currentCollectionId && fabMenuOpen"
        name="fab-menu"
        tag="div"
        class="absolute bottom-20 right-0 mb-2 flex flex-col gap-2"
      >
        <!-- New Verse Option -->
        <button
          key="verse"
          @click="openNewVerse"
          class="bg-white text-gray-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-3 px-4 py-3 min-w-[160px] active:bg-gray-50"
          style="box-shadow: 0 4px 5px 0 rgba(0, 0, 0, 0.14), 0 1px 10px 0 rgba(0, 0, 0, 0.12), 0 2px 4px -1px rgba(0, 0, 0, 0.2);"
        >
          <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span class="text-sm font-medium">New Verse</span>
        </button>
        
        <!-- New Collection Option -->
        <button
          key="collection"
          @click="openNewCollection"
          class="bg-white text-gray-900 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-3 px-4 py-3 min-w-[160px] active:bg-gray-50"
          style="box-shadow: 0 4px 5px 0 rgba(0, 0, 0, 0.14), 0 1px 10px 0 rgba(0, 0, 0, 0.12), 0 2px 4px -1px rgba(0, 0, 0, 0.2);"
        >
          <div class="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <span class="text-sm font-medium">New Collection</span>
        </button>
      </transition-group>

      <!-- Main FAB Button -->
      <button
        @click="handleFabClick"
        class="w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
        :class="{ 'rotate-45': !currentCollectionId && fabMenuOpen }"
        :title="currentCollectionId ? 'Add new verse' : 'Add new item'"
        style="box-shadow: 0 6px 10px 0 rgba(0, 0, 0, 0.14), 0 1px 18px 0 rgba(0, 0, 0, 0.12), 0 3px 5px -1px rgba(0, 0, 0, 0.2);"
      >
        <svg class="w-7 h-7 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>

    <!-- Backdrop to close menu when clicking outside -->
    <div
      v-if="!currentCollectionId && fabMenuOpen"
      @click="fabMenuOpen = false"
      class="fixed inset-0 z-20"
    ></div>
  </div>

      <!-- Add Verse Form Modal -->
      <div
        v-if="showForm"
        class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
        @click.self="closeForm"
      >
        <div class="bg-white rounded-3xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Add New Verse</h2>
          
          <form @submit.prevent="addVerse" class="space-y-4">
            <div>
              <label for="reference" class="block text-sm font-medium text-gray-700 mb-2">
                Verse Reference
              </label>
              <input
                id="reference"
                v-model="newVerse.reference"
                type="text"
                placeholder="e.g., John 3:16"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label for="bible-version" class="block text-sm font-medium text-gray-700 mb-2">
                Bible Version
              </label>
              <input
                id="bible-version"
                v-model="newVerse.bibleVersion"
                type="text"
                placeholder="e.g., BSB, NIV, ESV"
                maxlength="10"
                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none uppercase tracking-wider"
                style="text-transform: uppercase;"
              />
            </div>

            <div>
              <label for="content" class="block text-sm font-medium text-gray-700 mb-2">
                Verse Content
              </label>
              <textarea
                id="content"
                v-model="newVerse.content"
                rows="6"
                placeholder="Enter the verse text here..."
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              ></textarea>
            </div>

            <div v-if="!currentCollectionId || currentCollectionId === 'master-list'">
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Collections
              </label>
              <div v-if="collections.length > 0" class="space-y-2">
                <label
                  v-for="collection in collections"
                  :key="collection.id"
                  class="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :value="collection.id"
                    v-model="newVerse.collectionIds"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-gray-700">{{ collection.name }}</span>
                </label>
              </div>
              <p v-else class="text-sm text-gray-500">No collections yet. Create one to organize verses.</p>
            </div>

            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="closeForm"
                class="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors duration-200"
              >
                Save Verse
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Edit Verse Form Modal -->
      <div
        v-if="showEditVerseForm"
        class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
        @click.self="closeEditVerseForm"
      >
        <div class="bg-white rounded-3xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Edit Verse</h2>
          
          <form @submit.prevent="saveEditedVerse" class="space-y-4" v-if="editingVerse">
            <div>
              <label for="edit-reference" class="block text-sm font-medium text-gray-700 mb-2">
                Verse Reference
              </label>
              <input
                id="edit-reference"
                v-model="editingVerse.reference"
                type="text"
                placeholder="e.g., John 3:16"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label for="edit-bible-version" class="block text-sm font-medium text-gray-700 mb-2">
                Bible Version
              </label>
              <input
                id="edit-bible-version"
                v-model="editingVerse.bibleVersion"
                type="text"
                placeholder="e.g., BSB, NIV, ESV"
                maxlength="10"
                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none uppercase tracking-wider"
                style="text-transform: uppercase;"
              />
            </div>

            <div>
              <label for="edit-content" class="block text-sm font-medium text-gray-700 mb-2">
                Verse Content
              </label>
              <textarea
                id="edit-content"
                v-model="editingVerse.content"
                rows="6"
                placeholder="Enter the verse text here..."
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Collections
              </label>
              <div v-if="collections.length > 0" class="space-y-2">
                <label
                  v-for="collection in collections"
                  :key="collection.id"
                  class="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :value="collection.id"
                    v-model="editingVerse.collectionIds"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-gray-700">{{ collection.name }}</span>
                </label>
              </div>
              <p v-else class="text-sm text-gray-500">No collections yet.</p>
            </div>

            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="closeEditVerseForm"
                class="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors duration-200"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Add Collection Form Modal -->
      <div
        v-if="showCollectionForm"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        @click.self="closeCollectionForm"
      >
        <div class="bg-white rounded-3xl shadow-xl max-w-2xl w-full p-6">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">Create New Collection</h2>
          
          <form @submit.prevent="addCollection" class="space-y-4">
            <div>
              <label for="collection-name" class="block text-sm font-medium text-gray-700 mb-2">
                Collection Name
              </label>
              <input
                id="collection-name"
                v-model="newCollection.name"
                type="text"
                placeholder="e.g., Favorite Verses, Daily Devotion"
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label for="collection-description" class="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <textarea
                id="collection-description"
                v-model="newCollection.description"
                rows="3"
                placeholder="Describe this collection..."
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
              ></textarea>
            </div>

            <div class="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                @click="closeCollectionForm"
                class="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors duration-200"
              >
                Create Collection
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Settings Modal -->
      <div
        v-if="showSettings"
        class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4"
        @click.self="closeSettings"
      >
        <div class="bg-white rounded-3xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">WebDAV Sync Settings</h2>
          
          <form @submit.prevent="saveWebDAVSettingsForm" class="space-y-4">
            <div>
              <label for="webdav-url" class="block text-sm font-medium text-gray-700 mb-2">
                WebDAV Server URL
              </label>
              <input
                id="webdav-url"
                v-model="webdavSettings.url"
                type="url"
                placeholder="https://example.com/webdav"
                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <p class="text-xs text-gray-500 mt-1">Full URL to your WebDAV server</p>
            </div>

            <div>
              <label for="webdav-folder" class="block text-sm font-medium text-gray-700 mb-2">
                Folder Path (optional)
              </label>
              <input
                id="webdav-folder"
                v-model="webdavSettings.folder"
                type="text"
                placeholder="bible-memory"
                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <p class="text-xs text-gray-500 mt-1">Subfolder path on your WebDAV server (leave empty for root)</p>
            </div>

            <div>
              <label for="webdav-username" class="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                id="webdav-username"
                v-model="webdavSettings.username"
                type="text"
                placeholder="your-username"
                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label for="webdav-password" class="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="webdav-password"
                v-model="webdavSettings.password"
                type="password"
                placeholder="your-password"
                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div class="border-t border-gray-200 pt-4 mt-4">
              <div class="flex items-center space-x-2 mb-4">
                <input
                  id="use-proxy"
                  v-model="webdavSettings.useProxy"
                  type="checkbox"
                  class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label for="use-proxy" class="text-sm font-medium text-gray-700">
                  Use CORS Proxy (for development with Nextcloud)
                </label>
              </div>
              
              <div v-if="webdavSettings.useProxy" class="ml-6 space-y-3">
                <div>
                  <label for="proxy-url" class="block text-sm font-medium text-gray-700 mb-2">
                    Proxy Server URL
                  </label>
                  <input
                    id="proxy-url"
                    v-model="webdavSettings.proxyUrl"
                    type="url"
                    placeholder="http://localhost:3001"
                    class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <p class="text-xs text-gray-500 mt-1">URL of the CORS proxy server (default: http://localhost:3001)</p>
                </div>
                
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p class="text-xs text-yellow-800">
                    <strong>Setup:</strong> Run the proxy server with:<br/>
                    <code class="bg-yellow-100 px-2 py-1 rounded">NEXTCLOUD_URL={{ webdavSettings.url || 'YOUR_NEXTCLOUD_URL' }} npm run dev:proxy</code><br/>
                    Or use <code class="bg-yellow-100 px-2 py-1 rounded">npm run dev:all</code> to run both the app and proxy together.
                  </p>
                </div>
              </div>
            </div>

            <div v-if="syncStatus" class="p-3 rounded-lg" :class="syncStatus.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'">
              <p class="text-sm whitespace-pre-line">{{ syncStatus.message }}</p>
            </div>

            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p class="text-sm text-blue-800">
                <strong>Note:</strong> If you see a "CORS Error", enable the CORS proxy option above and run the proxy server. 
                This is needed for Nextcloud and other servers that don't allow direct browser access.
              </p>
            </div>

            <div class="flex justify-between items-center pt-4">
              <button
                type="button"
                @click="testWebDAVConnection"
                :disabled="testingConnection"
                class="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ testingConnection ? 'Testing...' : 'Test Connection' }}
              </button>
              <div class="flex gap-3">
                <button
                  type="button"
                  @click="closeSettings"
                  class="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors duration-200"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
</template>

<script>
import { ref, onMounted, computed, nextTick } from 'vue'
import { 
  getWebDAVSettings, 
  saveWebDAVSettings, 
  syncData, 
  testWebDAVConnection as testConnection,
  markVerseDeleted,
  markCollectionDeleted
} from './webdav-sync.js'

export default {
  name: 'App',
  setup() {
    const verses = ref([])
    const collections = ref([])
    const showForm = ref(false)
    const showCollectionForm = ref(false)
    const showEditVerseForm = ref(false)
    const showSettings = ref(false)
    const editingVerse = ref(null)
    const currentCollectionId = ref(null) // null = all verses, string = specific collection
    const reviewingVerse = ref(null)
    const memorizingVerse = ref(null)
    const memorizationMode = ref(null) // 'learn', 'memorize', 'master'
    const reviewWords = ref([])
    const typedLetter = ref('')
    const reviewInput = ref(null)
    const reviewTextContainer = ref(null)
    const memorizationScrollContainer = ref(null)
    const reviewMistakes = ref(0) // Track mistakes during review
    const testingConnection = ref(false)
    const syncStatus = ref(null)
    const syncing = ref(false)
    const syncSuccess = ref(false)
    const syncError = ref(null)
    const fabMenuOpen = ref(false)

    const newVerse = ref({
      reference: '',
      content: '',
      bibleVersion: '',
      collectionIds: []
    })

    const newCollection = ref({
      name: '',
      description: ''
    })

    // WebDAV settings
    const webdavSettings = ref({
      url: '',
      folder: '',
      username: '',
      password: '',
      useProxy: false,
      proxyUrl: 'http://localhost:3001'
    })

    const STORAGE_KEY = 'bible-memory-verses'
    const COLLECTIONS_KEY = 'bible-memory-collections'

    // Computed properties
    const revealedCount = computed(() => {
      return reviewWords.value.filter(w => w.revealed).length
    })

    const allWordsRevealed = computed(() => {
      if (reviewWords.value.length === 0) return false
      
      if (memorizationMode.value === 'memorize') {
        // In memorize mode, all words that were hidden (not visible) should be revealed
        return reviewWords.value.every(w => w.visible || w.revealed)
      } else {
        // In learn, master, or review mode, all words should be revealed
        return reviewWords.value.every(w => w.revealed)
      }
    })

    // Calculate accuracy percentage
    const accuracy = computed(() => {
      if (reviewWords.value.length === 0) return 0
      return ((reviewWords.value.length - reviewMistakes.value) / reviewWords.value.length) * 100
    })

    // Check if accuracy meets the 90% requirement
    const meetsAccuracyRequirement = computed(() => {
      return accuracy.value >= 90
    })

    // Count verses due for review
    const dueVersesCount = computed(() => {
      return verses.value.filter(v => isDueForReview(v)).length
    })

    // Biblical book order for sorting
    const bookOrder = {
      // Old Testament
      'genesis': 1, 'gen': 1,
      'exodus': 2, 'ex': 2, 'exo': 2,
      'leviticus': 3, 'lev': 3,
      'numbers': 4, 'num': 4,
      'deuteronomy': 5, 'deut': 5,
      'joshua': 6, 'josh': 6,
      'judges': 7, 'judg': 7,
      'ruth': 8,
      '1 samuel': 9, '1sam': 9, '1 sam': 9,
      '2 samuel': 10, '2sam': 10, '2 sam': 10,
      '1 kings': 11, '1kings': 11, '1 ki': 11,
      '2 kings': 12, '2kings': 12, '2 ki': 12,
      '1 chronicles': 13, '1chron': 13, '1 chron': 13,
      '2 chronicles': 14, '2chron': 14, '2 chron': 14,
      'ezra': 15,
      'nehemiah': 16, 'neh': 16,
      'esther': 17, 'est': 17,
      'job': 18,
      'psalms': 19, 'psalm': 19, 'ps': 19,
      'proverbs': 20, 'prov': 20,
      'ecclesiastes': 21, 'eccl': 21,
      'song of solomon': 22, 'song': 22,
      'isaiah': 23, 'isa': 23,
      'jeremiah': 24, 'jer': 24,
      'lamentations': 25, 'lam': 25,
      'ezekiel': 26, 'ezek': 26,
      'daniel': 27, 'dan': 27,
      'hosea': 28, 'hos': 28,
      'joel': 29,
      'amos': 30,
      'obadiah': 31, 'obad': 31,
      'jonah': 32,
      'micah': 33, 'mic': 33,
      'nahum': 34, 'nah': 34,
      'habakkuk': 35, 'hab': 35,
      'zephaniah': 36, 'zeph': 36,
      'haggai': 37, 'hag': 37,
      'zechariah': 38, 'zech': 38,
      'malachi': 39, 'mal': 39,
      // New Testament
      'matthew': 40, 'matt': 40, 'mat': 40, 'mt': 40,
      'mark': 41, 'mk': 41,
      'luke': 42, 'lk': 42,
      'john': 43, 'jn': 43,
      'acts': 44,
      'romans': 45, 'rom': 45,
      '1 corinthians': 46, '1cor': 46, '1 cor': 46,
      '2 corinthians': 47, '2cor': 47, '2 cor': 47,
      'galatians': 48, 'gal': 48,
      'ephesians': 49, 'eph': 49,
      'philippians': 50, 'phil': 50,
      'colossians': 51, 'col': 51,
      '1 thessalonians': 52, '1thess': 52, '1 thess': 52,
      '2 thessalonians': 53, '2thess': 53, '2 thess': 53,
      '1 timothy': 54, '1tim': 54, '1 tim': 54,
      '2 timothy': 55, '2tim': 55, '2 tim': 55,
      'titus': 56,
      'philemon': 57, 'phlm': 57,
      'hebrews': 58, 'heb': 58,
      'james': 59, 'jas': 59,
      '1 peter': 60, '1pet': 60, '1 pet': 60,
      '2 peter': 61, '2pet': 61, '2 pet': 61,
      '1 john': 62, '1jn': 62, '1 jn': 62,
      '2 john': 63, '2jn': 63, '2 jn': 63,
      '3 john': 64, '3jn': 64, '3 jn': 64,
      'jude': 65,
      'revelation': 66, 'rev': 66
    }

    // Parse verse reference into sortable components
    const parseReference = (reference) => {
      if (!reference) return { book: 999, chapter: 0, verse: 0 }
      
      // Match patterns like "Matthew 24:1" or "1 John 3:16" or "Psalm 119:105"
      const match = reference.match(/^((?:\d\s)?[a-z]+)\s+(\d+):(\d+)/i)
      
      if (match) {
        const bookName = match[1].toLowerCase().trim()
        const chapter = parseInt(match[2], 10)
        const verse = parseInt(match[3], 10)
        const bookNum = bookOrder[bookName] || 999
        
        return { book: bookNum, chapter, verse }
      }
      
      // If no match, return high numbers to sort to the end
      return { book: 999, chapter: 0, verse: 0 }
    }

    // Filtered verses for current view
    const filteredVerses = computed(() => {
      return getVersesForView()
    })

    // Sort filtered verses by biblical reference
    const sortedVerses = computed(() => {
      const versesToSort = filteredVerses.value
      return [...versesToSort].sort((a, b) => {
        const aParsed = parseReference(a.reference)
        const bParsed = parseReference(b.reference)
        
        // Sort by book
        if (aParsed.book !== bParsed.book) {
          return aParsed.book - bParsed.book
        }
        
        // Then by chapter
        if (aParsed.chapter !== bParsed.chapter) {
          return aParsed.chapter - bParsed.chapter
        }
        
        // Then by verse
        return aParsed.verse - bParsed.verse
      })
    })

    // Load collections from local storage
    const loadCollections = () => {
      const stored = localStorage.getItem(COLLECTIONS_KEY)
      if (stored) {
        collections.value = JSON.parse(stored)
      }
    }

    // Save collections to local storage
    const saveCollections = () => {
      localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections.value))
      // Trigger sync after save
      triggerSync()
    }

    // Load verses from local storage
    const loadVerses = () => {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const loadedVerses = JSON.parse(stored)
        // Migrate existing verses to include review fields
        verses.value = loadedVerses.map(verse => {
          if (!verse.hasOwnProperty('reviewCount')) {
            verse.reviewCount = 0
            verse.lastReviewed = null
            verse.nextReviewDate = verse.createdAt || new Date().toISOString()
            verse.easeFactor = 2.5 // Default ease factor
            verse.interval = 0
            verse.reviewHistory = []
          }
          // Ensure all new fields exist
          if (!verse.hasOwnProperty('easeFactor')) verse.easeFactor = 2.5
          if (!verse.hasOwnProperty('interval')) verse.interval = 0
          if (!verse.hasOwnProperty('reviewHistory')) verse.reviewHistory = []
          // Set memorization status - if it has reviews, it's mastered, otherwise unmemorized
          if (!verse.hasOwnProperty('memorizationStatus')) {
            verse.memorizationStatus = (verse.reviewCount > 0) ? 'mastered' : 'unmemorized'
          }
          // If unmemorized, clear nextReviewDate
          if (verse.memorizationStatus === 'unmemorized') {
            verse.nextReviewDate = null
          }
          // Add collectionIds if missing
          if (!verse.hasOwnProperty('collectionIds')) {
            verse.collectionIds = []
          }
          // Add bibleVersion if missing
          if (!verse.hasOwnProperty('bibleVersion')) {
            verse.bibleVersion = ''
          }
          return verse
        })
        saveVerses() // Save migrated data
      }
    }

    // Save verses to local storage
    const saveVerses = () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(verses.value))
      // Trigger sync after save
      triggerSync()
    }

    // Get adjacent keys on QWERTY keyboard for fuzzy typing
    const getAdjacentKeys = (letter) => {
      const qwertyLayout = {
        // Row 1
        'q': ['w', 'a'],
        'w': ['q', 'e', 'a', 's'],
        'e': ['w', 'r', 's', 'd'],
        'r': ['e', 't', 'd', 'f'],
        't': ['r', 'y', 'f', 'g'],
        'y': ['t', 'u', 'g', 'h'],
        'u': ['y', 'i', 'h', 'j'],
        'i': ['u', 'o', 'j', 'k'],
        'o': ['i', 'p', 'k', 'l'],
        'p': ['o', 'l'],
        // Row 2
        'a': ['q', 'w', 's', 'z'],
        's': ['a', 'w', 'e', 'd', 'x', 'z'],
        'd': ['s', 'e', 'r', 'f', 'c', 'x'],
        'f': ['d', 'r', 't', 'g', 'v', 'c'],
        'g': ['f', 't', 'y', 'h', 'b', 'v'],
        'h': ['g', 'y', 'u', 'j', 'n', 'b'],
        'j': ['h', 'u', 'i', 'k', 'm', 'n'],
        'k': ['j', 'i', 'o', 'l', 'm'],
        'l': ['k', 'o', 'p'],
        // Row 3
        'z': ['a', 's', 'x'],
        'x': ['z', 's', 'd', 'c'],
        'c': ['x', 'd', 'f', 'v'],
        'v': ['c', 'f', 'g', 'b'],
        'b': ['v', 'g', 'h', 'n'],
        'n': ['b', 'h', 'j', 'm'],
        'm': ['n', 'j', 'k']
      }
      return qwertyLayout[letter.toLowerCase()] || []
    }

    // Check if typed letter is correct or adjacent (fuzzy typing)
    const isLetterMatch = (typedLetter, correctLetter) => {
      const typed = typedLetter.toLowerCase()
      const correct = correctLetter.toLowerCase()
      
      // Exact match
      if (typed === correct) return true
      
      // Check if typed letter is adjacent to correct letter
      const adjacentKeys = getAdjacentKeys(correct)
      return adjacentKeys.includes(typed)
    }

    // Vibrate phone on wrong keypress
    const vibrate = (pattern = 100) => {
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern)
      }
    }

    // Calculate grade (0-5) based on accuracy
    // Grade 5 = perfect, 4 = excellent, 3 = good, 2 = hard, 1 = again, 0 = complete failure
    const calculateGrade = (totalWords, mistakes) => {
      if (totalWords === 0) return 0
      
      const accuracy = (totalWords - mistakes) / totalWords
      
      if (accuracy >= 1.0) return 5 // Perfect
      if (accuracy >= 0.9) return 4 // Excellent (90-99%)
      if (accuracy >= 0.7) return 3 // Good (70-89%)
      if (accuracy >= 0.5) return 2 // Hard (50-69%)
      if (accuracy >= 0.3) return 1 // Again (30-49%)
      return 0 // Complete failure (<30%)
    }

    // Update ease factor based on grade (SM-2 algorithm)
    const updateEaseFactor = (currentEF, grade) => {
      // EF starts at 2.5, adjusts based on performance
      // Formula: EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
      let newEF = currentEF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
      
      // Minimum ease factor is 1.3
      if (newEF < 1.3) newEF = 1.3
      
      return newEF
    }

    // Check if verse was reviewed today
    const wasReviewedToday = (verse) => {
      if (!verse.lastReviewed) return false
      const lastReviewed = new Date(verse.lastReviewed)
      const now = new Date()
      return lastReviewed.toDateString() === now.toDateString()
    }

    // Calculate next review date using SM-2-inspired algorithm with shorter intervals
    const calculateNextReviewDate = (verse, grade) => {
      const now = new Date()
      let interval = 0
      let newEF = verse.easeFactor || 2.5
      
      // If reviewed today, don't advance the interval - keep the same next review date
      if (wasReviewedToday(verse) && verse.nextReviewDate) {
        return {
          nextReviewDate: verse.nextReviewDate,
          easeFactor: newEF,
          interval: verse.interval || 0
        }
      }
      
      // Update ease factor based on grade
      newEF = updateEaseFactor(newEF, grade)
      
      // If grade < 3 (not good enough), reset to learning phase
      if (grade < 3) {
        // Learning phase: very short intervals (minutes/hours)
        const learningSteps = [10, 30, 60, 120] // minutes
        const stepIndex = Math.min(verse.reviewCount || 0, learningSteps.length - 1)
        interval = learningSteps[stepIndex] / (24 * 60) // Convert minutes to days
        // Reset ease factor slightly but don't go below 1.3
        newEF = Math.max(1.3, newEF * 0.8)
      } else {
        // Graduated phase: use ease factor to calculate interval
        if (verse.reviewCount === 0) {
          // First successful review: 1 day
          interval = 1
        } else if (verse.reviewCount === 1) {
          // Second review: 1 day
          interval = 1
        } else if (verse.reviewCount === 2) {
          // Third review: 2 days
          interval = 2
        } else if (verse.reviewCount === 3) {
          // Fourth review: 3 days
          interval = 3
        } else if (verse.reviewCount === 4) {
          // Fifth review: 4 days
          interval = 4
        } else {
          // Subsequent reviews: previous interval * ease factor
          const previousInterval = verse.interval || 1
          interval = previousInterval * newEF
          
          // Cap maximum interval at 90 days (3 months)
          if (interval > 90) interval = 90
        }
      }
      
      const nextDate = new Date(now)
      nextDate.setDate(nextDate.getDate() + interval)
      
      return {
        nextReviewDate: nextDate.toISOString(),
        easeFactor: newEF,
        interval: interval
      }
    }

    // Check if a verse is due for review (only for mastered verses)
    const isDueForReview = (verse) => {
      if (verse.memorizationStatus !== 'mastered') return false
      if (!verse.nextReviewDate) return true
      const now = new Date()
      const nextReview = new Date(verse.nextReviewDate)
      return now >= nextReview
    }

    // Get memorization status display
    const getMemorizationStatus = (verse) => {
      return verse.memorizationStatus || 'unmemorized'
    }

    // Get next memorization mode
    const getNextMemorizationMode = (status) => {
      const progression = {
        'unmemorized': 'learn',
        'learned': 'memorize',
        'memorized': 'master',
        'mastered': null
      }
      return progression[status] || null
    }

    // Handle verse click - route to memorization or review
    const handleVerseClick = (verse) => {
      if (verse.memorizationStatus !== 'mastered') {
        // Not mastered yet - start memorization
        const nextMode = getNextMemorizationMode(verse.memorizationStatus)
        if (nextMode) {
          startMemorization(verse, nextMode)
        }
      } else {
        // Mastered - start review
        startReview(verse)
      }
    }

    // Get time until review (or overdue) in a human-readable format
    const getTimeUntilReview = (verse) => {
      if (!verse.nextReviewDate) return 'Now'
      const now = new Date()
      const nextReview = new Date(verse.nextReviewDate)
      const diffTime = nextReview - now
      
      if (diffTime <= 0) return 'Due'
      
      const diffMinutes = Math.ceil(diffTime / (1000 * 60))
      const diffHours = Math.ceil(diffTime / (1000 * 60 * 60))
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffMinutes < 60) return `${diffMinutes}m`
      if (diffHours < 24) return `${diffHours}h`
      return `${diffDays}d`
    }

    // Get days until review (for sorting/display)
    const getDaysUntilReview = (verse) => {
      if (!verse.nextReviewDate) return 0
      const now = new Date()
      const nextReview = new Date(verse.nextReviewDate)
      const diffTime = nextReview - now
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    }

    // Add new verse
    const addVerse = () => {
      if (newVerse.value.reference && newVerse.value.content) {
        const now = new Date().toISOString()
        
        // If inside a collection (and not master-list), automatically add to that collection
        let collectionIds = newVerse.value.collectionIds || []
        if (currentCollectionId.value && currentCollectionId.value !== 'master-list') {
          // Ensure the current collection is included
          if (!collectionIds.includes(currentCollectionId.value)) {
            collectionIds = [...collectionIds, currentCollectionId.value]
          }
        }
        
        const verse = {
          id: Date.now().toString(),
          reference: newVerse.value.reference.trim(),
          content: newVerse.value.content.trim(),
          bibleVersion: newVerse.value.bibleVersion ? newVerse.value.bibleVersion.trim().toUpperCase() : '',
          createdAt: now,
          memorizationStatus: 'unmemorized', // unmemorized, learned, memorized, mastered
          reviewCount: 0,
          lastReviewed: null,
          nextReviewDate: null, // Not in spaced repetition until mastered
          easeFactor: 2.5, // Default ease factor (SM-2 standard)
          interval: 0,
          reviewHistory: [],
          collectionIds: collectionIds
        }
        verses.value.unshift(verse)
        saveVerses()
        closeForm()
      }
    }

    // Close form and reset
    const closeForm = () => {
      showForm.value = false
      newVerse.value = {
        reference: '',
        content: '',
        bibleVersion: '',
        collectionIds: []
      }
      fabMenuOpen.value = false
    }

    // Add new collection
    const addCollection = () => {
      if (newCollection.value.name.trim()) {
        const collection = {
          id: Date.now().toString(),
          name: newCollection.value.name.trim(),
          description: newCollection.value.description.trim(),
          createdAt: new Date().toISOString()
        }
        collections.value.push(collection)
        saveCollections()
        closeCollectionForm()
      }
    }

    // Close collection form
    const closeCollectionForm = () => {
      showCollectionForm.value = false
      newCollection.value = {
        name: '',
        description: ''
      }
      fabMenuOpen.value = false
    }

    // Handle FAB click
    const handleFabClick = () => {
      if (currentCollectionId.value) {
        // If viewing a collection, directly open verse form
        showForm.value = true
      } else {
        // If on collections screen, toggle menu
        fabMenuOpen.value = !fabMenuOpen.value
      }
    }

    // Open new verse from FAB menu
    const openNewVerse = () => {
      fabMenuOpen.value = false
      showForm.value = true
    }

    // Open new collection from FAB menu
    const openNewCollection = () => {
      fabMenuOpen.value = false
      showCollectionForm.value = true
    }

    // Delete collection
    const deleteCollection = (collectionId) => {
      if (confirm('Are you sure you want to delete this collection? Verses will not be deleted, but will be removed from this collection.')) {
        // Mark as deleted for sync
        markCollectionDeleted(collectionId)
        
        // Remove collection from all verses
        verses.value.forEach(verse => {
          if (verse.collectionIds) {
            verse.collectionIds = verse.collectionIds.filter(id => id !== collectionId)
          }
        })
        saveVerses()
        
        // Remove collection
        collections.value = collections.value.filter(c => c.id !== collectionId)
        saveCollections()
        
        // If viewing this collection, go back to all verses
        if (currentCollectionId.value === collectionId) {
          currentCollectionId.value = null
        }
      }
    }

    // Get verses for current view (all or filtered by collection)
    const getVersesForView = () => {
      if (currentCollectionId.value) {
        // Handle special "master-list" collection
        if (currentCollectionId.value === 'master-list') {
          return verses.value
        }
        return verses.value.filter(v => v.collectionIds && v.collectionIds.includes(currentCollectionId.value))
      }
      return []
    }

    // Get collection name by ID
    const getCollectionName = (collectionId) => {
      if (collectionId === 'master-list') {
        return 'Master List'
      }
      const collection = collections.value.find(c => c.id === collectionId)
      return collection ? collection.name : 'Unknown'
    }

    // Get verse count for a collection
    const getCollectionVerseCount = (collectionId) => {
      return verses.value.filter(v => v.collectionIds && v.collectionIds.includes(collectionId)).length
    }

    // Get count of verses due for review in a collection
    const getCollectionDueCount = (collectionId) => {
      return verses.value.filter(v => 
        v.collectionIds && 
        v.collectionIds.includes(collectionId) && 
        isDueForReview(v)
      ).length
    }

    // Edit verse
    const startEditVerse = (verse) => {
      editingVerse.value = {
        ...verse,
        collectionIds: verse.collectionIds ? [...verse.collectionIds] : []
      }
      showEditVerseForm.value = true
    }

    // Save edited verse
    const saveEditedVerse = () => {
      if (editingVerse.value && editingVerse.value.reference && editingVerse.value.content) {
        const verse = verses.value.find(v => v.id === editingVerse.value.id)
        if (verse) {
          verse.reference = editingVerse.value.reference.trim()
          verse.content = editingVerse.value.content.trim()
          verse.bibleVersion = editingVerse.value.bibleVersion ? editingVerse.value.bibleVersion.trim().toUpperCase() : ''
          verse.collectionIds = editingVerse.value.collectionIds || []
          saveVerses()
          closeEditVerseForm()
        }
      }
    }

    // Close edit verse form
    const closeEditVerseForm = () => {
      showEditVerseForm.value = false
      editingVerse.value = null
    }

    // Delete verse
    const deleteVerse = (verseId) => {
      if (confirm('Are you sure you want to delete this verse?')) {
        // Mark as deleted for sync
        markVerseDeleted(verseId)
        
        verses.value = verses.value.filter(v => v.id !== verseId)
        saveVerses()
      }
    }

    // View collection
    const viewCollection = (collectionId) => {
      currentCollectionId.value = collectionId
    }

    // View all verses
    const viewAllVerses = () => {
      currentCollectionId.value = null
    }

    // Start memorizing a verse
    const startMemorization = (verse, mode) => {
      memorizingVerse.value = verse
      memorizationMode.value = mode
      reviewMistakes.value = 0
      
      // Split verse content into words by whitespace
      const words = verse.content.split(/\s+/).filter(word => word.trim().length > 0)
      
      reviewWords.value = words.map((word, index) => {
        // Find the first alphabetic character (skip punctuation at the start)
        const firstLetterMatch = word.match(/[a-zA-Z]/)
        const firstLetter = firstLetterMatch ? firstLetterMatch[0].toLowerCase() : word.charAt(0).toLowerCase()
        
        let revealed = false
        let visible = false
        
        // Set initial state based on mode
        if (mode === 'learn') {
          // Learn mode: all words visible in grey, none revealed initially
          visible = true
          revealed = false
        } else if (mode === 'memorize') {
          // Memorize mode: every other word visible (odd indices), even indices hidden
          visible = index % 2 === 0
          revealed = false
        } else if (mode === 'master') {
          // Master mode: all words hidden
          visible = false
          revealed = false
        }
        
        return {
          text: word,
          revealed: revealed,
          visible: visible,
          firstLetter: firstLetter,
          index: index,
          incorrect: false
        }
      })
      
      typedLetter.value = ''
      
      // Focus input after DOM update
      nextTick(() => {
        if (reviewInput.value) {
          reviewInput.value.focus()
        }
      })
    }

    // Start reviewing a verse (only for mastered verses)
    const startReview = (verse) => {
      if (verse.memorizationStatus !== 'mastered') {
        // If not mastered, start memorization instead
        const nextMode = getNextMemorizationMode(verse.memorizationStatus)
        if (nextMode) {
          startMemorization(verse, nextMode)
        }
        return
      }
      
      reviewingVerse.value = verse
      reviewMistakes.value = 0 // Reset mistake counter
      // Split verse content into words by whitespace
      const words = verse.content.split(/\s+/).filter(word => word.trim().length > 0)
      reviewWords.value = words.map(word => {
        // Find the first alphabetic character (skip punctuation at the start)
        const firstLetterMatch = word.match(/[a-zA-Z]/)
        const firstLetter = firstLetterMatch ? firstLetterMatch[0].toLowerCase() : word.charAt(0).toLowerCase()
        
        return {
          text: word,
          revealed: false,
          firstLetter: firstLetter,
          incorrect: false
        }
      })
      typedLetter.value = ''
      
      // Focus input after DOM update
      nextTick(() => {
        if (reviewInput.value) {
          reviewInput.value.focus()
        }
      })
    }

    // Advance to next memorization mode
    const advanceToNextMode = () => {
      if (!memorizingVerse.value || !allWordsRevealed.value) return
      
      // Require 90% accuracy to advance
      if (!meetsAccuracyRequirement.value) return
      
      const verse = verses.value.find(v => v.id === memorizingVerse.value.id)
      if (verse) {
        const currentStatus = verse.memorizationStatus || 'unmemorized'
        let newStatus = currentStatus
        
        // Progress through memorization stages
        if (memorizationMode.value === 'learn' && currentStatus === 'unmemorized') {
          newStatus = 'learned'
        } else if (memorizationMode.value === 'memorize' && currentStatus === 'learned') {
          newStatus = 'memorized'
        }
        
        verse.memorizationStatus = newStatus
        saveVerses()
        
        // Start next mode
        const nextMode = getNextMemorizationMode(newStatus)
        if (nextMode) {
          startMemorization(verse, nextMode)
        } else {
          // If no next mode, exit
          exitMemorization()
        }
      }
    }

    // Exit memorization mode
    const exitMemorization = () => {
      // Update memorization status if all words were revealed and accuracy requirement is met
      if (memorizingVerse.value && allWordsRevealed.value && meetsAccuracyRequirement.value) {
        const verse = verses.value.find(v => v.id === memorizingVerse.value.id)
        if (verse) {
          const currentStatus = verse.memorizationStatus || 'unmemorized'
          
          // If completing master mode, mark as mastered
          if (memorizationMode.value === 'master' && currentStatus === 'memorized') {
            verse.memorizationStatus = 'mastered'
            // When mastered, set initial review date
            verse.nextReviewDate = new Date().toISOString()
            saveVerses()
          }
        }
      }
      
      memorizingVerse.value = null
      memorizationMode.value = null
      reviewWords.value = []
      typedLetter.value = ''
      reviewMistakes.value = 0
    }

    // Retry memorization (reset without saving)
    const retryMemorization = () => {
      if (memorizingVerse.value) {
        const verse = memorizingVerse.value
        const currentMode = memorizationMode.value
        startMemorization(verse, currentMode)
      }
    }

    // Retry current review
    const retryReview = () => {
      if (reviewingVerse.value) {
        // Reset the review without saving
        const verse = reviewingVerse.value
        startReview(verse)
      }
    }

    // Move to next verse for review
    const nextVerse = () => {
      if (reviewingVerse.value) {
        // Save current review first (only if accuracy requirement is met)
        const verse = verses.value.find(v => v.id === reviewingVerse.value.id)
        if (verse && allWordsRevealed.value && meetsAccuracyRequirement.value) {
          const totalWords = reviewWords.value.length
          const grade = calculateGrade(totalWords, reviewMistakes.value)
          
          // Calculate next review date and update ease factor
          const reviewData = calculateNextReviewDate(verse, grade)
          
          verse.reviewCount = (verse.reviewCount || 0) + 1
          verse.lastReviewed = new Date().toISOString()
          verse.nextReviewDate = reviewData.nextReviewDate
          verse.easeFactor = reviewData.easeFactor
          verse.interval = reviewData.interval
          verse.lastGrade = grade
          verse.lastAccuracy = ((totalWords - reviewMistakes.value) / totalWords * 100).toFixed(1)
          
          // Track review history
          if (!verse.reviewHistory) verse.reviewHistory = []
          verse.reviewHistory.push({
            date: new Date().toISOString(),
            grade: grade,
            accuracy: parseFloat(verse.lastAccuracy),
            mistakes: reviewMistakes.value
          })
          
          saveVerses()
        }
        
        // Find next verse due for review
        const dueVerses = verses.value.filter(v => isDueForReview(v))
        if (dueVerses.length > 0) {
          // Find current verse index in due verses
          const currentIndex = dueVerses.findIndex(v => v.id === reviewingVerse.value.id)
          const nextIndex = (currentIndex + 1) % dueVerses.length
          startReview(dueVerses[nextIndex])
        } else {
          // No more verses due, exit review
          exitReview()
        }
      }
    }

    // Exit review mode
    const exitReview = () => {
      // Mark verse as reviewed if all words were revealed and accuracy requirement is met
      if (reviewingVerse.value && allWordsRevealed.value && meetsAccuracyRequirement.value) {
        const verse = verses.value.find(v => v.id === reviewingVerse.value.id)
        if (verse) {
          const totalWords = reviewWords.value.length
          const grade = calculateGrade(totalWords, reviewMistakes.value)
          
          // Calculate next review date and update ease factor
          const reviewData = calculateNextReviewDate(verse, grade)
          
          verse.reviewCount = (verse.reviewCount || 0) + 1
          verse.lastReviewed = new Date().toISOString()
          verse.nextReviewDate = reviewData.nextReviewDate
          verse.easeFactor = reviewData.easeFactor
          verse.interval = reviewData.interval
          verse.lastGrade = grade
          verse.lastAccuracy = ((totalWords - reviewMistakes.value) / totalWords * 100).toFixed(1)
          
          // Track review history
          if (!verse.reviewHistory) verse.reviewHistory = []
          verse.reviewHistory.push({
            date: new Date().toISOString(),
            grade: grade,
            accuracy: parseFloat(verse.lastAccuracy),
            mistakes: reviewMistakes.value
          })
          
          saveVerses()
        }
      }
      
      reviewingVerse.value = null
      reviewWords.value = []
      typedLetter.value = ''
      reviewMistakes.value = 0
    }

    // Focus input when clicking on verse text
    const focusInput = () => {
      if (reviewInput.value) {
        reviewInput.value.focus()
      }
    }

    // Scroll to the next word to be typed if it's near the bottom
    const scrollToCurrentWord = () => {
      // Find the next unrevealed word index (the one we're about to type)
      const nextWordIndex = reviewWords.value.findIndex(w => !w.revealed)
      
      if (nextWordIndex === -1) return // All words revealed
      
      // Determine which container to use
      const container = memorizationMode.value ? memorizationScrollContainer.value : reviewTextContainer.value
      if (!container) return
      
      // Wait for DOM to update
      nextTick(() => {
        // Use double requestAnimationFrame to ensure DOM is fully updated
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Find the word element by ID
            const wordId = memorizationMode.value ? `memorize-word-${nextWordIndex}` : `review-word-${nextWordIndex}`
            let wordElement = document.getElementById(wordId)
            
            // Fallback: try querySelector if getElementById fails
            if (!wordElement) {
              const prefix = memorizationMode.value ? 'memorize-word-' : 'review-word-'
              wordElement = container.querySelector(`#${prefix}${nextWordIndex}`)
            }
            
            // Another fallback: find by index in all word elements
            if (!wordElement) {
              const allWords = container.querySelectorAll('[id^="' + (memorizationMode.value ? 'memorize-word-' : 'review-word-') + '"]')
              if (allWords[nextWordIndex]) {
                wordElement = allWords[nextWordIndex]
              }
            }
            
            if (wordElement) {
              scrollElementIntoView(wordElement, container)
            }
          })
        })
      })
    }
    
    // Helper function to scroll an element into view within a container
    const scrollElementIntoView = (element, container) => {
      if (!element || !container) return
      
      const containerRect = container.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      const containerHeight = containerRect.height
      const currentScrollTop = container.scrollTop
      
      // Calculate element position relative to container's scrollable content
      // elementRect is relative to viewport, containerRect is relative to viewport
      // The difference + scrollTop gives us position in scrollable content
      const elementTopInContent = elementRect.top - containerRect.top + currentScrollTop
      const elementBottomInContent = elementRect.bottom - containerRect.top + currentScrollTop
      
      // Visible area in content coordinates
      const visibleTop = currentScrollTop
      const visibleBottom = currentScrollTop + containerHeight
      
      // Check if element is in bottom portion of visible area
      const distanceFromVisibleBottom = visibleBottom - elementBottomInContent
      const threshold = containerHeight * 0.4 // Bottom 40%
      
      // Scroll if element is below visible area or in bottom 40%
      if (elementBottomInContent > visibleBottom || distanceFromVisibleBottom < threshold) {
        // Target: position element at 30% from top of visible area
        const targetScroll = elementTopInContent - (containerHeight * 0.3)
        
        container.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth'
        })
      }
    }

    // Handle key press events
    const handleKeyPress = (event) => {
      // Allow backspace, delete, arrow keys, etc.
      if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter'].includes(event.key)) {
        return
      }
      
      // For single character keys, manually update the value and check
      if (event.key.length === 1) {
        event.preventDefault()
        const letter = event.key.toLowerCase()
        typedLetter.value = letter
        checkLetter()
      }
    }

    // Check if typed letter matches next word's first letter
    const checkLetter = () => {
      if (!typedLetter.value || reviewWords.value.length === 0) return

      const letter = typedLetter.value.toLowerCase()
      
      // For memorization modes, find the next word that should be revealed
      // For review mode, find the first unrevealed word
      let nextWordIndex = -1
      
      if (memorizationMode.value) {
        // In memorization modes, find next word that needs to be revealed
        if (memorizationMode.value === 'learn') {
          // In learn mode, reveal words in order (all are visible but not revealed)
          nextWordIndex = reviewWords.value.findIndex(w => !w.revealed)
        } else if (memorizationMode.value === 'memorize') {
          // In memorize mode, type all words in order (both visible and hidden)
          nextWordIndex = reviewWords.value.findIndex(w => !w.revealed)
        } else if (memorizationMode.value === 'master') {
          // In master mode, reveal all words in order
          nextWordIndex = reviewWords.value.findIndex(w => !w.revealed)
        }
      } else {
        // Review mode: find first unrevealed word
        nextWordIndex = reviewWords.value.findIndex(w => !w.revealed)
      }
      
      if (nextWordIndex !== -1) {
        const nextWord = reviewWords.value[nextWordIndex]
        
        // Check if the letter matches the first letter of the next word (with fuzzy typing)
        if (isLetterMatch(letter, nextWord.firstLetter)) {
          // Correct letter (exact or adjacent) - reveal the word normally
          nextWord.revealed = true
          nextWord.incorrect = false
          if (memorizationMode.value === 'learn' || memorizationMode.value === 'memorize') {
            nextWord.visible = true // Make it visible in learn/memorize modes
          }
          typedLetter.value = ''
          
          // Auto-scroll to next word and focus input
          nextTick(() => {
            scrollToCurrentWord()
            if (reviewInput.value) {
              reviewInput.value.focus()
            }
          })
        } else {
          // Wrong letter (not correct and not adjacent) - reveal the word but mark it as incorrect
          nextWord.revealed = true
          nextWord.incorrect = true
          if (memorizationMode.value === 'learn' || memorizationMode.value === 'memorize') {
            nextWord.visible = true // Make it visible in learn/memorize modes
          }
          reviewMistakes.value++
          typedLetter.value = ''
          
          // Vibrate on wrong keypress
          vibrate(50)
          
          // Auto-scroll to next word and focus input
          nextTick(() => {
            scrollToCurrentWord()
            if (reviewInput.value) {
              reviewInput.value.focus()
            }
          })
        }
      }
    }

    // WebDAV sync functions
    const triggerSync = async (showFeedback = false) => {
      // Don't sync if already syncing or if WebDAV not configured
      if (syncing.value) return
      
      const settings = getWebDAVSettings()
      if (!settings || !settings.url || !settings.username || !settings.password) {
        if (showFeedback) {
          syncError.value = 'WebDAV not configured. Please configure it in settings.'
          setTimeout(() => { syncError.value = null }, 5000)
        }
        return
      }
      
      syncing.value = true
      syncSuccess.value = false
      syncError.value = null
      
      try {
        const result = await syncData(verses.value, collections.value)
        if (result.success) {
          // Update local data with merged data from sync
          if (result.verses) {
            verses.value = result.verses
            localStorage.setItem(STORAGE_KEY, JSON.stringify(verses.value))
          }
          if (result.collections) {
            collections.value = result.collections
            localStorage.setItem(COLLECTIONS_KEY, JSON.stringify(collections.value))
          }
          
          if (showFeedback) {
            // Show success feedback
            syncSuccess.value = true
            setTimeout(() => {
              syncSuccess.value = false
            }, 2000)
          }
        } else {
          // Sync failed
          const errorMsg = result.error || 'Sync failed'
          console.warn('Sync failed:', errorMsg)
          if (showFeedback) {
            syncError.value = errorMsg
            setTimeout(() => { syncError.value = null }, 5000)
          }
        }
      } catch (error) {
        // Sync failed
        const errorMsg = error.message || 'Sync error occurred'
        console.error('Sync error:', error)
        if (showFeedback) {
          syncError.value = errorMsg
          setTimeout(() => { syncError.value = null }, 5000)
        }
      } finally {
        syncing.value = false
      }
    }

    // Manual sync (with user feedback)
    const manualSync = () => {
      triggerSync(true)
    }

    // Load WebDAV settings
    const loadWebDAVSettings = () => {
      const settings = getWebDAVSettings()
      if (settings) {
        webdavSettings.value = {
          url: settings.url || '',
          folder: settings.folder || '',
          username: settings.username || '',
          password: settings.password || '', // Load password from storage
          useProxy: settings.useProxy || false,
          proxyUrl: settings.proxyUrl || 'http://localhost:3001'
        }
      } else {
        // Initialize with defaults if no settings exist
        webdavSettings.value = {
          url: '',
          folder: '',
          username: '',
          password: '',
          useProxy: false,
          proxyUrl: 'http://localhost:3001'
        }
      }
    }

    // Save WebDAV settings
    const saveWebDAVSettingsForm = async () => {
      if (!webdavSettings.value.url || !webdavSettings.value.username || !webdavSettings.value.password) {
        syncStatus.value = {
          type: 'error',
          message: 'Please fill in all required fields (URL, Username, Password)'
        }
        return
      }

      // Create a clean settings object with all fields
      const settingsToSave = {
        url: webdavSettings.value.url.trim(),
        folder: (webdavSettings.value.folder || '').trim(),
        username: webdavSettings.value.username.trim(),
        password: webdavSettings.value.password, // Keep password as-is
        useProxy: webdavSettings.value.useProxy || false,
        proxyUrl: (webdavSettings.value.proxyUrl || 'http://localhost:3001').trim()
      }

      // Save to localStorage
      saveWebDAVSettings(settingsToSave)
      
      // Update the reactive object to match what was saved
      webdavSettings.value = { ...settingsToSave }
      
      syncStatus.value = {
        type: 'success',
        message: 'Settings saved successfully!'
      }

      // Close the modal after a brief delay to show success message
      setTimeout(() => {
        closeSettings()
      }, 1000)

      // Trigger initial sync after saving settings (without user feedback since modal is closing)
      setTimeout(() => {
        triggerSync(false)
      }, 500)
    }

    // Test WebDAV connection
    const testWebDAVConnection = async () => {
      if (!webdavSettings.value.url || !webdavSettings.value.username || !webdavSettings.value.password) {
        syncStatus.value = {
          type: 'error',
          message: 'Please fill in all required fields first'
        }
        return
      }

      testingConnection.value = true
      syncStatus.value = null

      try {
        const result = await testConnection(webdavSettings.value)
        if (result.success) {
          syncStatus.value = {
            type: 'success',
            message: 'Connection successful!'
          }
        } else {
          syncStatus.value = {
            type: 'error',
            message: `Connection failed: ${result.error || 'Unknown error'}`
          }
        }
      } catch (error) {
        syncStatus.value = {
          type: 'error',
          message: `Connection failed: ${error.message || 'Unknown error'}`
        }
      } finally {
        testingConnection.value = false
      }
    }

    // Close settings modal
    const closeSettings = () => {
      showSettings.value = false
      syncStatus.value = null
      // Reload settings to show saved values (but don't reset password if user is editing)
      const saved = getWebDAVSettings()
      if (saved) {
        // Keep current password if user was editing (don't clear it)
        const currentPassword = webdavSettings.value.password
        loadWebDAVSettings()
        // If user had entered a password, keep it (they might want to save it)
        if (currentPassword && !saved.password) {
          webdavSettings.value.password = currentPassword
        }
      }
    }

    // Load verses on mount
    onMounted(async () => {
      loadCollections()
      loadVerses()
      loadWebDAVSettings()
      
      // Perform initial sync on app load
      await triggerSync()
    })

    return {
      verses,
      showForm,
      newVerse,
      addVerse,
      closeForm,
      reviewingVerse,
      reviewWords,
      typedLetter,
      reviewInput,
      revealedCount,
      allWordsRevealed,
      sortedVerses,
      dueVersesCount,
      isDueForReview,
      getDaysUntilReview,
      getTimeUntilReview,
      reviewMistakes,
      memorizingVerse,
      memorizationMode,
      getMemorizationStatus,
      getNextMemorizationMode,
      handleVerseClick,
      startMemorization,
      advanceToNextMode,
      exitMemorization,
      retryMemorization,
      startReview,
      retryReview,
      nextVerse,
      exitReview,
      focusInput,
      handleKeyPress,
      checkLetter,
      accuracy,
      meetsAccuracyRequirement,
      collections,
      currentCollectionId,
      showCollectionForm,
      showEditVerseForm,
      editingVerse,
      newCollection,
      addCollection,
      closeCollectionForm,
      handleFabClick,
      openNewVerse,
      openNewCollection,
      fabMenuOpen,
      deleteCollection,
      getCollectionName,
      getCollectionVerseCount,
      getCollectionDueCount,
      viewCollection,
      viewAllVerses,
      startEditVerse,
      saveEditedVerse,
      closeEditVerseForm,
      deleteVerse,
      showSettings,
      webdavSettings,
      saveWebDAVSettingsForm,
      testWebDAVConnection,
      closeSettings,
      testingConnection,
      syncStatus,
      manualSync,
      syncSuccess,
      syncError,
      syncing
    }
  }
}
</script>
