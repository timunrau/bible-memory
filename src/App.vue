<template>
  <!-- Memorization Screen -->
  <div
    v-if="memorizingVerse"
    class="fixed inset-0 bg-gray-50 z-50 overflow-y-auto"
  >
    <div class="max-w-4xl mx-auto py-8 px-4">
      <div class="mb-6">
        <button
          @click="exitMemorization"
          class="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Verses
        </button>
        <h2 class="text-3xl font-bold text-gray-900 mb-2">
          {{ memorizingVerse.reference }}
        </h2>
        
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
        
        <p class="text-gray-600">
          <span v-if="memorizationMode === 'learn'">Type the first letter of each word to turn it black</span>
          <span v-else-if="memorizationMode === 'memorize'">Type the first letter of each hidden word to reveal it</span>
          <span v-else-if="memorizationMode === 'master'">Type the first letter of each word to reveal it</span>
        </p>
      </div>

      <div class="bg-white rounded-lg shadow-xl p-8 mb-6">
        <div
          class="text-2xl leading-relaxed text-gray-900 font-serif min-h-[200px]"
          @click="focusInput"
        >
          <span
            v-for="(word, index) in reviewWords"
            :key="index"
            class="inline-block mr-2"
          >
            <span
              v-if="memorizationMode === 'learn'"
              :class="word.revealed ? 'text-gray-900 font-semibold' : 'text-gray-300'"
            >
              {{ word.text }}
            </span>
            <span
              v-else-if="memorizationMode === 'memorize'"
            >
              <span v-if="word.visible && !word.revealed" class="text-gray-300">
                {{ word.text }}
              </span>
              <span v-else-if="word.revealed" class="text-gray-900">
                {{ word.text }}
              </span>
              <span v-else class="text-gray-300">
                {{ '_'.repeat(word.text.length) }}
              </span>
            </span>
            <span
              v-else-if="memorizationMode === 'master'"
            >
              <span v-if="word.revealed" class="text-gray-900">
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
          class="w-full max-w-md mx-auto px-4 py-3 text-2xl text-center border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase tracking-widest"
          placeholder="Type here..."
        />
        <p class="text-sm text-gray-500 mt-2">Type the first letter of the next word</p>
      </div>

      <!-- Completion Modal for Memorization -->
      <div
        v-if="allWordsRevealed && memorizationMode"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
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
      </div>
    </div>
  </div>

  <!-- Review Screen -->
  <div
    v-if="reviewingVerse"
    class="fixed inset-0 bg-gray-50 z-50 overflow-y-auto"
  >
        <div class="max-w-4xl mx-auto py-8 px-4">
          <div class="mb-6">
            <button
              @click="exitReview"
              class="text-gray-600 hover:text-gray-900 mb-4 flex items-center"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Verses
            </button>
            <h2 class="text-3xl font-bold text-gray-900 mb-2">
              {{ reviewingVerse.reference }}
            </h2>
            <p class="text-gray-600">Type the first letter of each word to reveal it</p>
          </div>

          <div class="bg-white rounded-lg shadow-xl p-8 mb-6">
            <div
              class="text-2xl leading-relaxed text-gray-900 font-serif min-h-[200px]"
              @click="focusInput"
            >
              <span
                v-for="(word, index) in reviewWords"
                :key="index"
                class="inline-block mr-2"
              >
                <span v-if="word.revealed" class="text-gray-900">
                  {{ word.text }}
                </span>
                <span v-else class="text-gray-300">
                  {{ '_'.repeat(word.text.length) }}
                </span>
              </span>
            </div>
          </div>

          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
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
              class="w-full max-w-md mx-auto px-4 py-3 text-2xl text-center border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase tracking-widest"
              placeholder="Type here..."
            />
            <p class="text-sm text-gray-500 mt-2">Type the first letter of the next word</p>
          </div>

          <!-- Completion Modal for Review -->
          <div
            v-if="allWordsRevealed && reviewingVerse"
            class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <p class="text-2xl font-bold text-green-800 mb-2 text-center">🎉 Great job!</p>
              <p class="text-green-700 text-center mb-6">You've revealed all the words in this verse.</p>
              <div class="flex justify-center gap-3">
                <button
                  @click="retryReview"
                  class="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-colors duration-200"
                >
                  Retry
                </button>
                <button
                  @click="nextVerse"
                  class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors duration-200"
                >
                  Next Verse
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

  <!-- Main Content -->
  <div v-else class="min-h-screen bg-gray-50 py-8 px-4">
    <div class="max-w-4xl mx-auto">
      <header class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h1 class="text-4xl font-bold text-gray-900 mb-2">Bible Memory</h1>
            <p class="text-gray-600">Your personal collection of verses</p>
          </div>
          <div v-if="currentCollectionId" class="flex items-center gap-2">
            <button
              @click.stop="viewAllVerses"
              class="text-gray-600 hover:text-gray-900"
            >
              ← Collections
            </button>
          </div>
        </div>
        <div v-if="verses.length > 0" class="mt-4">
          <div
            :class="[
              'inline-flex items-center px-4 py-2 rounded-lg',
              dueVersesCount > 0 
                ? 'bg-red-100 text-red-800' 
                : 'bg-green-100 text-green-800'
            ]"
          >
            <span class="font-semibold">
              {{ dueVersesCount }} verse{{ dueVersesCount !== 1 ? 's' : '' }} due for review
            </span>
          </div>
        </div>
      </header>

      <!-- Collections View -->
      <div v-if="!currentCollectionId" class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-bold text-gray-900">Collections</h2>
          <button
            @click="showCollectionForm = true"
            class="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 text-sm"
          >
            + New Collection
          </button>
        </div>
        
        <div class="space-y-4 mb-8">
          <!-- Master List Collection -->
          <div
            @click="viewCollection('master-list')"
            class="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200 border-l-4 border-blue-500"
          >
            <div class="flex items-start justify-between mb-2">
              <h3 class="text-xl font-semibold text-gray-800 flex-1">Master List</h3>
            </div>
            <p class="text-gray-600 text-sm mb-3">All your verses in one place</p>
            <div class="flex items-center justify-between">
              <div class="text-xs text-gray-500">
                {{ verses.length }} verse{{ verses.length !== 1 ? 's' : '' }}
                <span v-if="dueVersesCount > 0" class="ml-2">
                  • {{ dueVersesCount }} due for review
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  v-if="dueVersesCount > 0"
                  class="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full"
                >
                  {{ dueVersesCount }} Due
                </span>
                <span
                  v-else-if="verses.length > 0"
                  class="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full"
                >
                  All caught up
                </span>
              </div>
            </div>
          </div>

          <!-- User Collections -->
          <div
            v-for="collection in collections"
            :key="collection.id"
            @click="viewCollection(collection.id)"
            class="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200 border-l-4 border-green-500"
          >
            <div class="flex items-start justify-between mb-2">
              <h3 class="text-xl font-semibold text-gray-800 flex-1">{{ collection.name }}</h3>
              <button
                @click.stop="deleteCollection(collection.id)"
                class="text-red-600 hover:text-red-800 text-sm px-2 py-1"
                title="Delete collection"
              >
                ×
              </button>
            </div>
            <p v-if="collection.description" class="text-gray-600 text-sm mb-3">{{ collection.description }}</p>
            <div class="flex items-center justify-between">
              <div class="text-xs text-gray-500">
                {{ getCollectionVerseCount(collection.id) }} verse{{ getCollectionVerseCount(collection.id) !== 1 ? 's' : '' }}
                <span v-if="getCollectionDueCount(collection.id) > 0" class="ml-2">
                  • {{ getCollectionDueCount(collection.id) }} due for review
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  v-if="getCollectionDueCount(collection.id) > 0"
                  class="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full"
                >
                  {{ getCollectionDueCount(collection.id) }} Due
                </span>
                <span
                  v-else-if="getCollectionVerseCount(collection.id) > 0"
                  class="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full"
                >
                  All caught up
                </span>
              </div>
            </div>
          </div>

          <!-- Empty state when no verses exist -->
          <div v-if="verses.length === 0 && collections.length === 0" class="bg-white rounded-lg shadow-md p-12 text-center">
            <p class="text-gray-500 text-lg mb-4">No verses yet. Add your first verse to get started!</p>
          </div>
        </div>
      </div>

      <!-- Collection View -->
      <div v-if="currentCollectionId">
        <h2 class="text-2xl font-bold text-gray-900 mb-4">
          {{ getCollectionName(currentCollectionId) }}
        </h2>

        <div class="mb-6 flex gap-2">
          <button
            @click="showForm = true"
            class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-colors duration-200"
          >
            + Add New Verse
          </button>
        </div>

        <!-- Verse List -->
        <div class="space-y-4">
        <div
          v-for="verse in sortedVerses"
          :key="verse.id"
          :class="[
            'bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200',
            verse.memorizationStatus === 'mastered' && isDueForReview(verse)
              ? 'border-l-4 border-red-500'
              : verse.memorizationStatus === 'mastered'
              ? 'border-l-4 border-blue-500'
              : 'border-l-4 border-yellow-500'
          ]"
        >
          <div class="flex items-start justify-between mb-2">
            <h3
              @click="handleVerseClick(verse)"
              class="text-xl font-semibold text-gray-800 cursor-pointer flex-1"
            >
              {{ verse.reference }}
            </h3>
            <div class="flex items-center gap-2">
              <button
                @click.stop="startEditVerse(verse)"
                class="text-gray-600 hover:text-gray-900 text-sm px-2 py-1"
                title="Edit verse"
              >
                ✎
              </button>
              <button
                @click.stop="deleteVerse(verse.id)"
                class="text-red-600 hover:text-red-800 text-sm px-2 py-1"
                title="Delete verse"
              >
                ×
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
                  'px-2 py-1 text-xs font-semibold rounded-full',
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
                class="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full"
              >
                Due
              </span>
              <span
                v-else
                class="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full"
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

          <div v-if="sortedVerses.length === 0" class="bg-white rounded-lg shadow-md p-12 text-center">
            <p class="text-gray-500 text-lg">No verses in this collection yet.</p>
          </div>
        </div>
      </div>
    </div>
  </div>

      <!-- Add Verse Form Modal -->
      <div
        v-if="showForm"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        @click.self="closeForm"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
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
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
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
                class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors duration-200"
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
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        @click.self="closeEditVerseForm"
      >
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
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
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
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
                class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors duration-200"
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
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
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
                class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors duration-200"
              >
                Create Collection
              </button>
            </div>
          </form>
        </div>
      </div>
</template>

<script>
import { ref, onMounted, computed, nextTick } from 'vue'

export default {
  name: 'App',
  setup() {
    const verses = ref([])
    const collections = ref([])
    const showForm = ref(false)
    const showCollectionForm = ref(false)
    const showEditVerseForm = ref(false)
    const editingVerse = ref(null)
    const currentCollectionId = ref(null) // null = all verses, string = specific collection
    const reviewingVerse = ref(null)
    const memorizingVerse = ref(null)
    const memorizationMode = ref(null) // 'learn', 'memorize', 'master'
    const reviewWords = ref([])
    const typedLetter = ref('')
    const reviewInput = ref(null)
    const reviewMistakes = ref(0) // Track mistakes during review

    const newVerse = ref({
      reference: '',
      content: '',
      collectionIds: []
    })

    const newCollection = ref({
      name: '',
      description: ''
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
          return verse
        })
        saveVerses() // Save migrated data
      }
    }

    // Save verses to local storage
    const saveVerses = () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(verses.value))
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
        // Graduated phase: use ease factor to calculate interval with much shorter intervals
        if (verse.reviewCount === 0) {
          // First successful review: 4 hours
          interval = 4 / 24 // 4 hours in days
        } else if (verse.reviewCount === 1) {
          // Second review: 1 day
          interval = 1
        } else if (verse.reviewCount === 2) {
          // Third review: 2 days
          interval = 2
        } else if (verse.reviewCount === 3) {
          // Fourth review: 4 days
          interval = 4
        } else if (verse.reviewCount === 4) {
          // Fifth review: 7 days
          interval = 7
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
        const verse = {
          id: Date.now().toString(),
          reference: newVerse.value.reference.trim(),
          content: newVerse.value.content.trim(),
          createdAt: now,
          memorizationStatus: 'unmemorized', // unmemorized, learned, memorized, mastered
          reviewCount: 0,
          lastReviewed: null,
          nextReviewDate: null, // Not in spaced repetition until mastered
          easeFactor: 2.5, // Default ease factor (SM-2 standard)
          interval: 0,
          reviewHistory: [],
          collectionIds: newVerse.value.collectionIds || []
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
        collectionIds: []
      }
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
    }

    // Delete collection
    const deleteCollection = (collectionId) => {
      if (confirm('Are you sure you want to delete this collection? Verses will not be deleted, but will be removed from this collection.')) {
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
          index: index
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
          firstLetter: firstLetter
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
      // Update memorization status if all words were revealed
      if (memorizingVerse.value && allWordsRevealed.value) {
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
        // Save current review first
        const verse = verses.value.find(v => v.id === reviewingVerse.value.id)
        if (verse && allWordsRevealed.value) {
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
      // Mark verse as reviewed if all words were revealed
      if (reviewingVerse.value && allWordsRevealed.value) {
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
        
        // Check if the letter matches the first letter of the next word
        if (letter === nextWord.firstLetter) {
          // Reveal the word
          nextWord.revealed = true
          if (memorizationMode.value === 'learn' || memorizationMode.value === 'memorize') {
            nextWord.visible = true // Make it visible in learn/memorize modes
          }
          typedLetter.value = ''
          
          // Auto-focus input for next word
          nextTick(() => {
            if (reviewInput.value) {
              reviewInput.value.focus()
            }
          })
        } else {
          // Wrong letter - increment mistake counter and clear input
          reviewMistakes.value++
          typedLetter.value = ''
        }
      }
    }

    // Load verses on mount
    onMounted(() => {
      loadCollections()
      loadVerses()
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
      startReview,
      retryReview,
      nextVerse,
      exitReview,
      focusInput,
      handleKeyPress,
      checkLetter,
      collections,
      currentCollectionId,
      showCollectionForm,
      showEditVerseForm,
      editingVerse,
      newCollection,
      addCollection,
      closeCollectionForm,
      deleteCollection,
      getCollectionName,
      getCollectionVerseCount,
      getCollectionDueCount,
      viewCollection,
      viewAllVerses,
      startEditVerse,
      saveEditedVerse,
      closeEditVerseForm,
      deleteVerse
    }
  }
}
</script>
