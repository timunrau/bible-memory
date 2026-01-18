import { createClient } from 'webdav'

const STORAGE_KEY = 'bible-memory-verses'
const COLLECTIONS_KEY = 'bible-memory-collections'
const WEBDAV_SETTINGS_KEY = 'bible-memory-webdav-settings'
const SYNC_STATE_KEY = 'bible-memory-sync-state'
const DELETED_VERSES_KEY = 'bible-memory-deleted-verses'
const DELETED_COLLECTIONS_KEY = 'bible-memory-deleted-collections'

// Default filename for synced data
const SYNC_FILENAME = 'bible-memory-data.json'

/**
 * Get WebDAV settings from localStorage
 */
export function getWebDAVSettings() {
  const stored = localStorage.getItem(WEBDAV_SETTINGS_KEY)
  if (stored) {
    return JSON.parse(stored)
  }
  return null
}

/**
 * Save WebDAV settings to localStorage
 */
export function saveWebDAVSettings(settings) {
  localStorage.setItem(WEBDAV_SETTINGS_KEY, JSON.stringify(settings))
}

/**
 * Get sync state (last sync timestamp, etc.)
 */
function getSyncState() {
  const stored = localStorage.getItem(SYNC_STATE_KEY)
  if (stored) {
    return JSON.parse(stored)
  }
  return { lastSync: null }
}

/**
 * Save sync state
 */
function saveSyncState(state) {
  localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state))
}

/**
 * Get deleted verse IDs
 */
export function getDeletedVerses() {
  const stored = localStorage.getItem(DELETED_VERSES_KEY)
  if (stored) {
    return JSON.parse(stored)
  }
  return []
}

/**
 * Get deleted collection IDs
 */
export function getDeletedCollections() {
  const stored = localStorage.getItem(DELETED_COLLECTIONS_KEY)
  if (stored) {
    return JSON.parse(stored)
  }
  return []
}

/**
 * Add verse ID to deleted list
 */
export function markVerseDeleted(verseId) {
  const deleted = getDeletedVerses()
  if (!deleted.includes(verseId)) {
    deleted.push(verseId)
    localStorage.setItem(DELETED_VERSES_KEY, JSON.stringify(deleted))
  }
}

/**
 * Add collection ID to deleted list
 */
export function markCollectionDeleted(collectionId) {
  const deleted = getDeletedCollections()
  if (!deleted.includes(collectionId)) {
    deleted.push(collectionId)
    localStorage.setItem(DELETED_COLLECTIONS_KEY, JSON.stringify(deleted))
  }
}

/**
 * Clear deleted IDs that are no longer in remote data (they've been synced)
 * Note: This is now handled in mergeData, but keeping for backward compatibility
 */
function clearSyncedDeletions(remoteVerses, remoteCollections) {
  // Deletion cleanup is now handled in mergeData
  // This function is kept for backward compatibility but does nothing
}

/**
 * Detect if we're in production
 */
function isProduction() {
  if (typeof window === 'undefined') return false
  const hostname = window.location.hostname
  // Check if we're on the production domain
  return hostname === 'bible-memory.unrau.xyz' || hostname.includes('unrau.xyz')
}

/**
 * Create WebDAV client from settings
 */
function createWebDAVClient(settings) {
  if (!settings || !settings.url || !settings.username || !settings.password) {
    throw new Error('WebDAV settings incomplete')
  }

  let baseUrl = settings.url.trim()
  let proxyUrl = null
  let customHeaders = {}
  
  // In production, always use the proxy to avoid CORS issues
  // In development, use proxy if explicitly enabled
  const shouldUseProxy = isProduction() || settings.useProxy
  
  console.log('[WebDAV] isProduction:', isProduction())
  console.log('[WebDAV] shouldUseProxy:', shouldUseProxy)
  console.log('[WebDAV] Original baseUrl:', baseUrl)
  
  if (shouldUseProxy) {
    // In production, use the nginx proxy endpoint (absolute URL needed for webdav library)
    if (isProduction()) {
      // Use absolute URL so webdav library doesn't try to resolve relative paths
      proxyUrl = window.location.origin + '/api/webdav'
    } else {
      // In development, use the explicit proxy URL or default
      proxyUrl = (settings.proxyUrl || 'http://localhost:3001').trim()
    }
    
    // Parse the Nextcloud URL to get the path
    try {
      const nextcloudUrl = new URL(baseUrl)
      const nextcloudPath = nextcloudUrl.pathname
      
      // For production proxy, pass the target URL via custom header
      // and use the proxy endpoint with the Nextcloud path
      if (isProduction()) {
        // Store the original target URL in a header for the proxy to use
        const originalTargetUrl = baseUrl
        customHeaders['X-WebDAV-Target'] = originalTargetUrl
        // Use proxy endpoint with the Nextcloud path
        baseUrl = proxyUrl + nextcloudPath
        console.log('[WebDAV] Production mode - using proxy:', proxyUrl)
        console.log('[WebDAV] Setting X-WebDAV-Target header to:', originalTargetUrl)
        console.log('[WebDAV] Final baseUrl for client:', baseUrl)
      } else {
        // Use proxy URL as base, but we need to prepend the Nextcloud path to all requests
        // The webdav library will append paths to the base URL, so we need to include
        // the Nextcloud path in the base URL when using proxy
        baseUrl = proxyUrl + nextcloudPath
        console.log('[WebDAV] Development mode - using proxy:', baseUrl)
      }
    } catch (e) {
      // If URL parsing fails, just use proxy URL
      if (isProduction()) {
        customHeaders['X-WebDAV-Target'] = baseUrl
        baseUrl = proxyUrl
        console.log('[WebDAV] URL parse error in production, using proxy:', baseUrl)
      } else {
        baseUrl = proxyUrl
        console.log('[WebDAV] URL parse error, using proxy:', baseUrl)
      }
    }
  }

  // Ensure URL ends with /
  if (!baseUrl.endsWith('/')) {
    baseUrl += '/'
  }

  // Add folder path if specified
  let path = baseUrl
  if (settings.folder && settings.folder.trim()) {
    const folder = settings.folder.trim().replace(/^\//, '').replace(/\/$/, '')
    if (folder) {
      path = baseUrl + folder + '/'
    }
  }

  // Build client options
  const clientOptions = {
    username: settings.username,
    password: settings.password
  }
  
  // Add custom headers if using proxy in production
  if (Object.keys(customHeaders).length > 0) {
    clientOptions.headers = customHeaders
  }

  return createClient(path, clientOptions)
}

/**
 * Get full file path for sync file
 * Note: The folder is already included in the client's baseUrl, so we just return the filename
 */
function getSyncFilePath(settings) {
  // The folder is already included in the baseUrl when creating the client,
  // so we just need to return the filename
  return SYNC_FILENAME
}

/**
 * Download data from WebDAV
 */
export async function downloadFromWebDAV() {
  const settings = getWebDAVSettings()
  if (!settings) {
    throw new Error('WebDAV not configured')
  }

  try {
    const client = createWebDAVClient(settings)
    const filePath = getSyncFilePath(settings)
    
    // Check if file exists
    try {
      const fileInfo = await client.stat(filePath)
      if (!fileInfo) {
        console.log('[WebDAV] File does not exist on server, will upload local data')
        return null // No file on server yet
      }
    } catch (err) {
      // File doesn't exist (404 or other error)
      // Check if it's a 404 or similar "not found" error
      if (err.status === 404 || err.message?.includes('404') || err.message?.includes('Not Found') || err.message?.includes('not found')) {
        console.log('[WebDAV] File does not exist on server (404), will upload local data')
        return null
      }
      // For other errors, still return null but log them
      console.warn('[WebDAV] Error checking file existence:', err.message || err)
      return null
    }

    // Read file content
    try {
      const content = await client.getFileContents(filePath, { format: 'text' })
      const data = JSON.parse(content)
      console.log('[WebDAV] Successfully downloaded data from server')
      return data
    } catch (err) {
      // If reading fails, treat as if file doesn't exist
      if (err.status === 404 || err.message?.includes('404') || err.message?.includes('Not Found')) {
        console.log('[WebDAV] File does not exist on server (404), will upload local data')
        return null
      }
      throw err
    }
  } catch (error) {
    // Only throw if it's not a "file not found" error
    if (error.status === 404 || error.message?.includes('404') || error.message?.includes('Not Found')) {
      console.log('[WebDAV] File does not exist on server, will upload local data')
      return null
    }
    console.error('Error downloading from WebDAV:', error)
    throw error
  }
}

/**
 * Upload data to WebDAV
 */
export async function uploadToWebDAV(verses, collections) {
  const settings = getWebDAVSettings()
  if (!settings) {
    throw new Error('WebDAV not configured')
  }

  try {
    const client = createWebDAVClient(settings)
    const filePath = getSyncFilePath(settings)
    
    console.log(`[WebDAV] Uploading data to: ${filePath}`)
    
    // Get deleted IDs to include in sync data
    const deletedVerses = getDeletedVerses()
    const deletedCollections = getDeletedCollections()
    
    // Prepare data to upload
    const data = {
      verses: verses || [],
      collections: collections || [],
      deletedVerses: deletedVerses || [],
      deletedCollections: deletedCollections || [],
      syncedAt: new Date().toISOString()
    }
    
    const content = JSON.stringify(data, null, 2)
    console.log(`[WebDAV] Uploading ${data.verses.length} verses and ${data.collections.length} collections`)
    
    // Ensure directory exists (for folder option, though Nextcloud paths usually don't need this)
    if (settings.folder && settings.folder.trim()) {
      const folder = settings.folder.trim().replace(/^\//, '').replace(/\/$/, '')
      if (folder) {
        const folderPath = folder.split('/')
        let currentPath = ''
        for (const segment of folderPath) {
          currentPath += '/' + segment
          try {
            await client.createDirectory(currentPath)
            console.log(`[WebDAV] Created directory: ${currentPath}`)
          } catch (err) {
            // Directory might already exist, ignore
            if (!err.message?.includes('405') && !err.message?.includes('Method Not Allowed')) {
              console.log(`[WebDAV] Directory ${currentPath} already exists or cannot be created`)
            }
          }
        }
      }
    }
    
    // Upload file
    await client.putFileContents(filePath, content, { overwrite: true })
    console.log(`[WebDAV] Successfully uploaded data to ${filePath}`)
    
    // Update sync state
    saveSyncState({ lastSync: new Date().toISOString() })
    
    return true
  } catch (error) {
    console.error('[WebDAV] Error uploading to WebDAV:', error)
    throw error
  }
}

/**
 * Merge local and remote data intelligently
 * Strategy: 
 * - Items with same ID: keep the one with more recent lastModified or lastReviewed
 * - New items: add both
 * - Deleted items: merge deletion lists from remote and local, exclude deleted items
 */
function mergeData(localVerses, localCollections, remoteData) {
  if (!remoteData || (!remoteData.verses && !remoteData.collections)) {
    // No remote data, return local
    return {
      verses: localVerses || [],
      collections: localCollections || []
    }
  }

  const remoteVerses = remoteData.verses || []
  const remoteCollections = remoteData.collections || []
  
  // Merge deletion lists from remote and local
  const remoteDeletedVerses = new Set(remoteData.deletedVerses || [])
  const remoteDeletedCollections = new Set(remoteData.deletedCollections || [])
  const localDeletedVerses = new Set(getDeletedVerses())
  const localDeletedCollections = new Set(getDeletedCollections())
  
  // Combine deletions from both sources
  const allDeletedVerseIds = new Set([...remoteDeletedVerses, ...localDeletedVerses])
  const allDeletedCollectionIds = new Set([...remoteDeletedCollections, ...localDeletedCollections])
  
  // Remove from deleted list if item exists locally (was re-added)
  const localVerseIds = new Set((localVerses || []).map(v => v.id))
  const localCollectionIds = new Set((localCollections || []).map(c => c.id))
  
  const finalDeletedVerseIds = new Set([...allDeletedVerseIds].filter(id => !localVerseIds.has(id)))
  const finalDeletedCollectionIds = new Set([...allDeletedCollectionIds].filter(id => !localCollectionIds.has(id)))
  
  // Update localStorage with merged deletion lists
  localStorage.setItem(DELETED_VERSES_KEY, JSON.stringify([...finalDeletedVerseIds]))
  localStorage.setItem(DELETED_COLLECTIONS_KEY, JSON.stringify([...finalDeletedCollectionIds]))

  // Merge verses
  const verseMap = new Map()
  
  // Add all local verses (excluding deleted ones)
  ;(localVerses || []).forEach(verse => {
    // Skip if this verse was deleted (locally or remotely)
    if (finalDeletedVerseIds.has(verse.id)) {
      return
    }
    verseMap.set(verse.id, { ...verse, source: 'local' })
  })
  
  // Merge remote verses (excluding deleted ones)
  remoteVerses.forEach(verse => {
    // Skip if this verse was deleted (locally or remotely)
    if (finalDeletedVerseIds.has(verse.id)) {
      return
    }
    
    const existing = verseMap.get(verse.id)
    if (!existing) {
      // New verse from remote
      verseMap.set(verse.id, { ...verse, source: 'remote' })
    } else {
      // Conflict: choose the one with more recent activity
      // Prefer lastReviewed, then createdAt, fallback to empty string for comparison
      const localLastModified = existing.lastReviewed || existing.createdAt || ''
      const remoteLastModified = verse.lastReviewed || verse.createdAt || ''
      
      // If both have timestamps, compare them
      if (remoteLastModified && localLastModified) {
        if (remoteLastModified > localLastModified) {
          // Remote is newer, use it
          verseMap.set(verse.id, { ...verse, source: 'merged' })
        }
        // Otherwise keep local (already in map)
      } else if (remoteLastModified && !localLastModified) {
        // Remote has timestamp but local doesn't, use remote
        verseMap.set(verse.id, { ...verse, source: 'merged' })
      }
      // Otherwise keep local (either local has timestamp or neither has one)
    }
  })
  
  const mergedVerses = Array.from(verseMap.values())

  // Merge collections
  const collectionMap = new Map()
  
  // Add all local collections (excluding deleted ones)
  ;(localCollections || []).forEach(collection => {
    // Skip if this collection was deleted (locally or remotely)
    if (finalDeletedCollectionIds.has(collection.id)) {
      return
    }
    collectionMap.set(collection.id, { ...collection, source: 'local' })
  })
  
  // Merge remote collections (excluding deleted ones)
  remoteCollections.forEach(collection => {
    // Skip if this collection was deleted (locally or remotely)
    if (finalDeletedCollectionIds.has(collection.id)) {
      return
    }
    
    const existing = collectionMap.get(collection.id)
    if (!existing) {
      // New collection from remote
      collectionMap.set(collection.id, { ...collection, source: 'remote' })
    } else {
      // Conflict: use the one with more recent createdAt
      const localTime = existing.createdAt || ''
      const remoteTime = collection.createdAt || ''
      
      if (remoteTime && localTime) {
        if (remoteTime > localTime) {
          collectionMap.set(collection.id, { ...collection, source: 'merged' })
        }
      } else if (remoteTime && !localTime) {
        collectionMap.set(collection.id, { ...collection, source: 'merged' })
      }
      // Otherwise keep local
    }
  })
  
  const mergedCollections = Array.from(collectionMap.values())

  return {
    verses: mergedVerses,
    collections: mergedCollections
  }
}

/**
 * Perform two-way sync
 */
export async function syncData(localVerses, localCollections) {
  const settings = getWebDAVSettings()
  if (!settings) {
    return { success: false, error: 'WebDAV not configured' }
  }

  try {
    // Download from WebDAV
    console.log('[WebDAV] Starting sync...')
    const remoteData = await downloadFromWebDAV()
    
    // If no remote data exists, just upload local data
    if (!remoteData) {
      console.log('[WebDAV] No remote data found, uploading local data')
      await uploadToWebDAV(localVerses, localCollections)
      console.log('[WebDAV] Sync complete: uploaded local data')
      return { 
        success: true, 
        action: 'uploaded',
        verses: localVerses,
        collections: localCollections
      }
    }
    
    // Apply remote deletions to local data before merging
    // This ensures that items deleted on other devices are removed locally
    const remoteDeletedVerses = new Set(remoteData.deletedVerses || [])
    const remoteDeletedCollections = new Set(remoteData.deletedCollections || [])
    
    // Filter out locally deleted items from local arrays
    let cleanedLocalVerses = (localVerses || []).filter(v => !remoteDeletedVerses.has(v.id))
    let cleanedLocalCollections = (localCollections || []).filter(c => !remoteDeletedCollections.has(c.id))
    
    // Remove deleted collection IDs from verses
    cleanedLocalVerses = cleanedLocalVerses.map(verse => {
      if (verse.collectionIds && verse.collectionIds.length > 0) {
        const cleanedCollectionIds = verse.collectionIds.filter(id => !remoteDeletedCollections.has(id))
        return { ...verse, collectionIds: cleanedCollectionIds }
      }
      return verse
    })
    
    // Merge data (using cleaned local data)
    const merged = mergeData(cleanedLocalVerses, cleanedLocalCollections, remoteData)
    
    // Upload merged data
    await uploadToWebDAV(merged.verses, merged.collections)
    
    // Clear deletions that have been synced (no longer in remote data)
    clearSyncedDeletions(remoteData.verses, remoteData.collections)
    
    return {
      success: true,
      action: 'synced',
      verses: merged.verses,
      collections: merged.collections
    }
  } catch (error) {
    console.error('Sync error:', error)
    return {
      success: false,
      error: error.message || 'Sync failed'
    }
  }
}

/**
 * Test WebDAV connection
 */
export async function testWebDAVConnection(settings) {
  try {
    const client = createWebDAVClient(settings)
    const filePath = getSyncFilePath(settings)
    
    // Try to list directory (this tests authentication)
    const parentDir = filePath.substring(0, filePath.lastIndexOf('/') || 0) || '/'
    await client.getDirectoryContents(parentDir || '/')
    
    return { success: true }
  } catch (error) {
    let errorMessage = error.message || String(error) || 'Connection failed'
    const errorString = errorMessage.toLowerCase()
    
    // Check for CORS/fetch errors (most common issue)
    if (errorString.includes('failed to fetch') || 
        errorString.includes('fetch') ||
        errorString.includes('cors') ||
        errorString.includes('networkerror') ||
        (error.name && error.name === 'TypeError' && errorString.includes('fetch'))) {
      errorMessage = 'CORS Error: The WebDAV server is blocking requests from your browser.\n\n' +
        'Possible solutions:\n' +
        '• Configure your WebDAV server to allow CORS (add CORS headers)\n' +
        '• Use a CORS proxy service\n' +
        '• Verify the URL is correct and accessible\n' +
        '• Some servers (Nextcloud, ownCloud) may need special configuration for browser access'
    } else if (errorString.includes('401') || errorString.includes('unauthorized')) {
      errorMessage = 'Authentication failed: Check your username and password are correct.'
    } else if (errorString.includes('404') || errorString.includes('not found')) {
      errorMessage = 'Server not found: Check that the URL is correct and the server is accessible.'
    } else if (errorString.includes('403') || errorString.includes('forbidden')) {
      errorMessage = 'Access forbidden: Check your credentials and folder permissions.'
    } else if (errorString.includes('networkerror') || errorString.includes('network')) {
      errorMessage = 'Network error: Check your internet connection and that the server URL is correct.'
    } else if (errorString.includes('timeout')) {
      errorMessage = 'Connection timeout: The server took too long to respond. Check the URL and try again.'
    }
    
    return {
      success: false,
      error: errorMessage
    }
  }
}
