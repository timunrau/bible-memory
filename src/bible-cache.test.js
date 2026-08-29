import { describe, expect, it, vi } from 'vitest'
import {
  BibleCacheMissError,
  createBibleCacheService,
  resolveBibleTranslationId,
} from './bible-cache.js'

const MANIFEST_URL = 'https://v1.fetch.bible/manifest.json'
const TRANSLATION_CACHE_PREFIX = 'rum1n8-bible-text-v1-'

class MemoryCache {
  constructor() {
    this.responses = new Map()
  }

  async match(request) {
    const response = this.responses.get(typeof request === 'string' ? request : request.url)
    return response?.clone()
  }

  async put(request, response) {
    this.responses.set(typeof request === 'string' ? request : request.url, response.clone())
  }

  async keys() {
    return [...this.responses.keys()].map(url => new Request(url))
  }
}

class MemoryCacheStorage {
  constructor() {
    this.caches = new Map()
  }

  async open(name) {
    if (!this.caches.has(name)) this.caches.set(name, new MemoryCache())
    return this.caches.get(name)
  }

  async keys() {
    return [...this.caches.keys()]
  }

  async delete(name) {
    return this.caches.delete(name)
  }
}

const createManifest = (translations) => {
  const books = [...new Set(Object.values(translations).flat())]
  const bibles = Object.fromEntries(
    Object.entries(translations).map(([id, translationBooks]) => [
      id,
      {
        name: {
          local: id,
          local_abbrev: id.replace(/^eng_/, '').toUpperCase(),
          english: id,
          english_abbrev: id.replace(/^eng_/, '').toUpperCase(),
        },
        year: 2026,
        books_ot: translationBooks.filter(book => book !== 'jhn'),
        books_nt: translationBooks.filter(book => book === 'jhn'),
        copyright: {
          attribution: 'Mock Bible',
          attribution_url: 'https://example.com/mock-bible',
          licenses: [{ license: 'mock-open', url: 'https://example.com/mock-license' }],
        },
        direction: 'ltr',
        tags: ['recommended'],
      },
    ])
  )

  return {
    bibles,
    glosses: {},
    notes: {},
    languages: {
      eng: {
        local: 'English',
        english: 'English',
        pop: 400000000,
        direction: 'ltr',
      },
    },
    language2to3: { en: 'eng' },
    languages_most_spoken: ['eng'],
    books_ordered: books,
    book_names_english: Object.fromEntries(books.map(book => [book, book.toUpperCase()])),
    licenses: {
      'mock-open': {
        name: 'Mock Open License',
        restrictions: {
          forbid_limitless: false,
          forbid_commercial: false,
          forbid_derivatives: false,
          forbid_attributionless: false,
          forbid_other: false,
        },
      },
    },
  }
}

const createBookResponse = (url) => {
  const parsed = new URL(url)
  const parts = parsed.pathname.split('/')
  const translationId = parts[2]
  const bookId = parts.at(-1).replace('.json', '')
  return new Response(JSON.stringify({
    book: bookId,
    name: { normal: bookId, long: bookId, abbrev: bookId },
    contents: [[], [[], [`${translationId}:${bookId}`]]],
  }), { status: 200 })
}

const createFetch = (manifest, onBookRequest = null) => vi.fn(async (url, options = {}) => {
  if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  if (url === MANIFEST_URL) {
    return new Response(JSON.stringify(manifest), { status: 200 })
  }
  if (url.includes('/bibles/')) {
    await onBookRequest?.(url, options)
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    return createBookResponse(url)
  }
  throw new Error(`Unexpected URL: ${url}`)
})

const translationCacheNames = async cacheStorage => (
  (await cacheStorage.keys()).filter(name => name.startsWith(TRANSLATION_CACHE_PREFIX))
)

describe('Bible cache service', () => {
  it('resolves shorthand and resource IDs with the importer rules', async () => {
    const cacheStorage = new MemoryCacheStorage()
    const service = createBibleCacheService({
      cacheStorage,
      fetchImpl: createFetch(createManifest({ eng_bsb: ['jhn'] })),
    })
    const collection = await service.fetchCollection()

    expect(resolveBibleTranslationId(collection, 'BSB')).toBe('eng_bsb')
    expect(resolveBibleTranslationId(collection, 'eng_bsb')).toBe('eng_bsb')
    expect(resolveBibleTranslationId(collection, 'NIV')).toBeNull()
  })

  it('downloads every available book with at most four concurrent requests', async () => {
    const cacheStorage = new MemoryCacheStorage()
    const statuses = []
    let activeRequests = 0
    let maxActiveRequests = 0
    const books = ['gen', 'exo', 'lev', 'num', 'deu', 'jos']
    const fetchImpl = createFetch(createManifest({ eng_bsb: books }), async () => {
      activeRequests += 1
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests)
      await new Promise(resolve => setTimeout(resolve, 5))
      activeRequests -= 1
    })
    const service = createBibleCacheService({
      cacheStorage,
      fetchImpl,
      onStatus: status => statuses.push(status),
    })

    await service.reconcile('BSB')

    expect(maxActiveRequests).toBe(4)
    expect(statuses.at(-1)).toMatchObject({
      kind: 'ready',
      translationId: 'eng_bsb',
      completed: books.length,
      total: books.length,
    })
    expect(await translationCacheNames(cacheStorage)).toEqual([
      `${TRANSLATION_CACHE_PREFIX}eng_bsb`,
    ])
  })

  it('keeps the complete old translation until its replacement finishes, then evicts it', async () => {
    const cacheStorage = new MemoryCacheStorage()
    let releaseWebDownload
    const webDownloadStarted = new Promise(resolve => {
      releaseWebDownload = resolve
    })
    let allowWebDownload
    const webDownloadAllowed = new Promise(resolve => {
      allowWebDownload = resolve
    })
    const fetchImpl = createFetch(
      createManifest({ eng_bsb: ['jhn'], eng_web: ['jhn'] }),
      async (url) => {
        if (!url.includes('/eng_web/')) return
        releaseWebDownload()
        await webDownloadAllowed
      }
    )
    const service = createBibleCacheService({ cacheStorage, fetchImpl })

    await service.reconcile('BSB')
    const replacement = service.reconcile('WEB')
    await webDownloadStarted

    expect((await translationCacheNames(cacheStorage)).sort()).toEqual([
      `${TRANSLATION_CACHE_PREFIX}eng_bsb`,
      `${TRANSLATION_CACHE_PREFIX}eng_web`,
    ])

    allowWebDownload()
    await replacement

    expect(await translationCacheNames(cacheStorage)).toEqual([
      `${TRANSLATION_CACHE_PREFIX}eng_web`,
    ])
  })

  it('restores a complete translation from Cache Storage without a network connection', async () => {
    const cacheStorage = new MemoryCacheStorage()
    const manifest = createManifest({ eng_bsb: ['jhn'] })
    const onlineService = createBibleCacheService({
      cacheStorage,
      fetchImpl: createFetch(manifest),
    })
    await onlineService.reconcile('BSB')
    onlineService.dispose()

    const offlineService = createBibleCacheService({
      cacheStorage,
      fetchImpl: vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    })

    await offlineService.reconcile('BSB', { online: false, refreshManifest: false })
    const collection = await offlineService.fetchCollection()
    const book = await collection.bibles.fetch_book('eng_bsb', 'jhn', 'txt')

    expect(offlineService.getStatus()).toMatchObject({ kind: 'ready', completed: 1, total: 1 })
    expect(book.get_verse(1, 1, { attribute: false })).toBe('eng_bsb:jhn')
  })

  it('evicts old in-memory book responses together with the old persistent cache', async () => {
    const cacheStorage = new MemoryCacheStorage()
    let networkAvailable = true
    const onlineFetch = createFetch(createManifest({ eng_bsb: ['jhn'], eng_web: ['jhn'] }))
    const fetchImpl = vi.fn((url, options) => {
      if (!networkAvailable) return Promise.reject(new TypeError('Failed to fetch'))
      return onlineFetch(url, options)
    })
    const service = createBibleCacheService({ cacheStorage, fetchImpl })

    await service.reconcile('BSB')
    const collection = await service.fetchCollection()
    await collection.bibles.fetch_book('eng_bsb', 'jhn', 'txt')
    await service.reconcile('WEB')
    networkAvailable = false

    await expect(
      collection.bibles.fetch_book('eng_bsb', 'jhn', 'txt')
    ).rejects.toBeInstanceOf(BibleCacheMissError)
  })

  it('clears translation data when the committed default is unsupported', async () => {
    const cacheStorage = new MemoryCacheStorage()
    const service = createBibleCacheService({
      cacheStorage,
      fetchImpl: createFetch(createManifest({ eng_bsb: ['jhn'] })),
    })

    await service.reconcile('BSB')
    await service.reconcile('NIV')

    expect(service.getStatus()).toMatchObject({ kind: 'unsupported', version: 'NIV' })
    expect(await translationCacheNames(cacheStorage)).toEqual([])
  })
})
