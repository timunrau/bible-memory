import { FetchClient } from '@gracious.tech/fetch-client'

const CACHE_VERSION = 'v1'
const MANIFEST_CACHE_NAME = `rum1n8-bible-manifest-${CACHE_VERSION}`
const TRANSLATION_CACHE_PREFIX = `rum1n8-bible-text-${CACHE_VERSION}-`
const DOWNLOAD_CONCURRENCY = 4
const MANIFEST_PATH = '/manifest.json'
const TEXT_BOOK_PATH = /\/bibles\/([^/]+)\/txt\/[^/]+\.json$/

const idleStatus = () => ({
  kind: 'idle',
  version: '',
  translationId: null,
  completed: 0,
  total: 0,
  error: null,
})

const normalizeVersion = (version) => (
  typeof version === 'string' ? version.trim().toUpperCase() : ''
)

const getTranslationCacheName = (translationId) => (
  `${TRANSLATION_CACHE_PREFIX}${encodeURIComponent(translationId)}`
)

const isAbortError = (error) => error?.name === 'AbortError'

const createAbortError = () => {
  if (typeof DOMException === 'function') {
    return new DOMException('The operation was aborted.', 'AbortError')
  }
  const error = new Error('The operation was aborted.')
  error.name = 'AbortError'
  return error
}

export class BibleCacheMissError extends Error {
  constructor(url, cause = null) {
    super('The requested Bible content is not available offline.')
    this.name = 'BibleCacheMissError'
    this.url = url
    this.cause = cause
  }
}

export const resolveBibleTranslationId = (collection, version) => {
  const normalized = normalizeVersion(version).toLowerCase()
  if (!normalized || !collection?.bibles) return null

  const variants = [
    normalized,
    `eng_${normalized}`,
    normalized.replace(/^eng_/, ''),
  ]

  return variants.find(variant => collection.bibles.has_resource(variant)) || null
}

export function createBibleCacheService({
  onStatus = () => {},
  cacheStorage = globalThis.caches,
  fetchImpl = globalThis.fetch?.bind(globalThis),
} = {}) {
  const client = new FetchClient({ remember_fetches: false })
  const memoryRequests = new Map()
  let collectionPromise = null
  let activeController = null
  let activeGeneration = 0
  let incompleteTranslationId = null
  let disposed = false
  let currentStatus = idleStatus()

  const hasPersistentCache = () => (
    Boolean(cacheStorage?.open && cacheStorage?.keys && cacheStorage?.delete)
  )

  const emitStatus = (status) => {
    if (disposed) return
    currentStatus = { ...idleStatus(), ...status }
    onStatus(currentStatus)
  }

  const fetchResponse = async (url, signal) => {
    if (!fetchImpl) throw new Error('Network requests are unavailable in this browser.')
    const response = await fetchImpl(url, { mode: 'cors', signal })
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${url}`)
    }
    return response
  }

  const readCachedText = async (cacheName, url) => {
    if (!hasPersistentCache()) return null
    const cache = await cacheStorage.open(cacheName)
    const response = await cache.match(url)
    return response ? response.text() : null
  }

  const storeResponse = async (cacheName, url, response) => {
    const cache = await cacheStorage.open(cacheName)
    await cache.put(url, response)
  }

  const requestManifest = async (url) => {
    try {
      const response = await fetchResponse(url)
      const text = await response.clone().text()
      if (hasPersistentCache()) {
        await storeResponse(MANIFEST_CACHE_NAME, url, response.clone())
      }
      return text
    } catch (error) {
      const cached = await readCachedText(MANIFEST_CACHE_NAME, url)
      if (cached !== null) return cached
      throw new BibleCacheMissError(url, error)
    }
  }

  const requestBook = async (url, translationId) => {
    const cacheName = getTranslationCacheName(translationId)
    const cached = await readCachedText(cacheName, url)
    if (cached !== null) return cached

    try {
      const response = await fetchResponse(url)
      return response.text()
    } catch (error) {
      throw new BibleCacheMissError(url, error)
    }
  }

  const requestText = (url) => {
    if (memoryRequests.has(url)) return memoryRequests.get(url)

    let parsedUrl = null
    try {
      parsedUrl = new URL(url)
    } catch {
      // The fetch client normally supplies absolute URLs; let fetch report malformed ones.
    }

    let request
    const bookMatch = parsedUrl?.pathname.match(TEXT_BOOK_PATH)
    if (parsedUrl?.pathname === MANIFEST_PATH) {
      request = requestManifest(url)
    } else if (bookMatch) {
      request = requestBook(url, decodeURIComponent(bookMatch[1]))
    } else {
      request = fetchResponse(url).then(response => response.text())
    }

    memoryRequests.set(url, request)
    request.catch(() => memoryRequests.delete(url))
    return request
  }

  client.requester.request = requestText

  const clearManifestMemory = () => {
    for (const endpoint of client._endpoints) {
      memoryRequests.delete(`${endpoint}manifest.json`)
    }
  }

  const fetchCollection = async ({ refresh = false } = {}) => {
    if (refresh) {
      clearManifestMemory()
      collectionPromise = null
    }
    if (!collectionPromise) {
      collectionPromise = client.fetch_collection().catch((error) => {
        collectionPromise = null
        throw error
      })
    }
    return collectionPromise
  }

  const listTranslationCacheNames = async () => {
    if (!hasPersistentCache()) return []
    const names = await cacheStorage.keys()
    return names.filter(name => name.startsWith(TRANSLATION_CACHE_PREFIX))
  }

  const clearTranslationMemory = (translationId) => {
    for (const url of memoryRequests.keys()) {
      try {
        const bookMatch = new URL(url).pathname.match(TEXT_BOOK_PATH)
        if (bookMatch && decodeURIComponent(bookMatch[1]) === translationId) {
          memoryRequests.delete(url)
        }
      } catch {
        // Ignore malformed URLs from callers outside the fetch(bible) client.
      }
    }
  }

  const clearTranslationCaches = async ({ except = null, generation = null } = {}) => {
    const names = await listTranslationCacheNames()
    if (generation !== null && generation !== activeGeneration) return false

    const namesToDelete = names.filter(name => name !== except)
    const translationIdToKeep = except
      ? decodeURIComponent(except.slice(TRANSLATION_CACHE_PREFIX.length))
      : null
    const memoryTranslationIds = new Set()
    for (const url of memoryRequests.keys()) {
      try {
        const bookMatch = new URL(url).pathname.match(TEXT_BOOK_PATH)
        if (bookMatch) memoryTranslationIds.add(decodeURIComponent(bookMatch[1]))
      } catch {
        // Ignore malformed URLs from callers outside the fetch(bible) client.
      }
    }
    memoryTranslationIds.forEach((translationId) => {
      if (translationId !== translationIdToKeep) clearTranslationMemory(translationId)
    })
    await Promise.all(namesToDelete.map(name => cacheStorage.delete(name)))
    return true
  }

  const getBookUrls = (collection, translationId) => (
    collection.bibles
      .get_books(translationId)
      .map(book => collection.bibles.get_book_url(translationId, book.id, 'txt'))
  )

  const getCachedBookUrls = async (cacheName) => {
    const cache = await cacheStorage.open(cacheName)
    const requests = await cache.keys()
    return new Set(requests.map(request => request.url))
  }

  const downloadBook = async (cache, url, signal) => {
    if (signal.aborted) throw createAbortError()
    const response = await fetchResponse(url, signal)
    if (signal.aborted) throw createAbortError()
    await cache.put(url, response)
    if (signal.aborted) throw createAbortError()
  }

  const cancelActiveDownload = () => {
    if (!activeController) return

    activeController.abort()
    activeController = null
  }

  const reconcile = async (version, { online = true, refreshManifest = online } = {}) => {
    const normalizedVersion = normalizeVersion(version)
    const generation = ++activeGeneration

    if (!normalizedVersion) {
      cancelActiveDownload()
      if (hasPersistentCache()) await clearTranslationCaches({ generation })
      if (generation !== activeGeneration || disposed) return currentStatus
      incompleteTranslationId = null
      emitStatus(idleStatus())
      return currentStatus
    }

    if (!hasPersistentCache()) {
      cancelActiveDownload()
      emitStatus({
        kind: 'error',
        version: normalizedVersion,
        error: 'Offline Bible storage is not available in this browser.',
      })
      return currentStatus
    }

    cancelActiveDownload()
    if (generation !== activeGeneration || disposed) return currentStatus

    emitStatus({ kind: 'checking', version: normalizedVersion })

    let collection
    try {
      collection = await fetchCollection({ refresh: refreshManifest })
    } catch (error) {
      if (generation !== activeGeneration || disposed) return currentStatus
      emitStatus({
        kind: online ? 'error' : 'waiting',
        version: normalizedVersion,
        error: online ? 'Could not check this translation.' : null,
      })
      return currentStatus
    }

    if (generation !== activeGeneration || disposed) return currentStatus

    const translationId = resolveBibleTranslationId(collection, normalizedVersion)
    if (!translationId) {
      await clearTranslationCaches({ generation })
      if (generation !== activeGeneration || disposed) return currentStatus
      incompleteTranslationId = null
      emitStatus({ kind: 'unsupported', version: normalizedVersion })
      return currentStatus
    }

    if (incompleteTranslationId && incompleteTranslationId !== translationId) {
      if (generation !== activeGeneration || disposed) return currentStatus
      await cacheStorage.delete(getTranslationCacheName(incompleteTranslationId))
      clearTranslationMemory(incompleteTranslationId)
      incompleteTranslationId = null
    }

    const cacheName = getTranslationCacheName(translationId)
    const bookUrls = getBookUrls(collection, translationId)
    const cachedUrls = await getCachedBookUrls(cacheName)
    const missingUrls = bookUrls.filter(url => !cachedUrls.has(url))
    const completed = bookUrls.length - missingUrls.length

    if (generation !== activeGeneration || disposed) return currentStatus

    if (missingUrls.length === 0) {
      if (incompleteTranslationId === translationId) incompleteTranslationId = null
      await clearTranslationCaches({ except: cacheName, generation })
      if (generation !== activeGeneration || disposed) return currentStatus
      emitStatus({
        kind: 'ready',
        version: normalizedVersion,
        translationId,
        completed: bookUrls.length,
        total: bookUrls.length,
      })
      return currentStatus
    }

    if (!online) {
      incompleteTranslationId = translationId
      emitStatus({
        kind: 'waiting',
        version: normalizedVersion,
        translationId,
        completed,
        total: bookUrls.length,
      })
      return currentStatus
    }

    const controller = new AbortController()
    activeController = controller
    incompleteTranslationId = translationId
    const cache = await cacheStorage.open(cacheName)
    let downloaded = completed
    let nextIndex = 0

    emitStatus({
      kind: 'downloading',
      version: normalizedVersion,
      translationId,
      completed: downloaded,
      total: bookUrls.length,
    })

    const worker = async () => {
      while (nextIndex < missingUrls.length) {
        const index = nextIndex
        nextIndex += 1
        await downloadBook(cache, missingUrls[index], controller.signal)
        downloaded += 1
        if (generation === activeGeneration && !disposed) {
          emitStatus({
            kind: 'downloading',
            version: normalizedVersion,
            translationId,
            completed: downloaded,
            total: bookUrls.length,
          })
        }
      }
    }

    try {
      await Promise.all(
        Array.from({ length: Math.min(DOWNLOAD_CONCURRENCY, missingUrls.length) }, worker)
      )
      if (generation !== activeGeneration || disposed) return currentStatus

      await clearTranslationCaches({ except: cacheName, generation })
      incompleteTranslationId = null
      if (generation !== activeGeneration || disposed) return currentStatus

      emitStatus({
        kind: 'ready',
        version: normalizedVersion,
        translationId,
        completed: bookUrls.length,
        total: bookUrls.length,
      })
    } catch (error) {
      controller.abort()
      if (generation !== activeGeneration || disposed || isAbortError(error)) return currentStatus
      emitStatus({
        kind: online ? 'error' : 'waiting',
        version: normalizedVersion,
        translationId,
        completed: downloaded,
        total: bookUrls.length,
        error: online ? 'Could not finish downloading this translation.' : null,
      })
    } finally {
      if (activeController === controller) {
        activeController = null
      }
    }

    return currentStatus
  }

  const dispose = () => {
    disposed = true
    activeGeneration += 1
    activeController?.abort()
    activeController = null
    memoryRequests.clear()
  }

  return {
    client,
    fetchCollection,
    getStatus: () => currentStatus,
    reconcile,
    dispose,
  }
}
