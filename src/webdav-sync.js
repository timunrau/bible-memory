import { createClient } from 'webdav'

const STORAGE_KEY = 'bible-memory-verses'
const COLLECTIONS_KEY = 'bible-memory-collections'
const WEBDAV_SETTINGS_KEY = 'bible-memory-webdav-settings'
const SYNC_STATE_KEY = 'bible-memory-sync-state'

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
 * Create WebDAV client from settings
 */
function createWebDAVClient(settings) {
  if (!settings || !settings.url || !settings.username || !settings.password) {
    throw new Error('WebDAV settings incomplete')
  }

  let baseUrl = settings.url.trim()
  let proxyUrl = null
  
  // If using proxy, extract the Nextcloud path and use proxy as base
  if (settings.useProxy) {
    proxyUrl = (settings.proxyUrl || 'http://localhost:3001').trim()
    
    // Parse the Nextcloud URL to get the path
    try {
      const nextcloudUrl = new URL(baseUrl)
      const nextcloudPath = nextcloudUrl.pathname
      
      // Use proxy URL as base, but we need to prepend the Nextcloud path to all requests
      // The webdav library will append paths to the base URL, so we need to include
      // the Nextcloud path in the base URL when using proxy
      baseUrl = proxyUrl + nextcloudPath
    } catch (e) {
      // If URL parsing fails, just use proxy URL
      baseUrl = proxyUrl
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

  return createClient(path, {
    username: settings.username,
    password: settings.password
  })
}

/**
 * Get full file path for sync file
 */
function getSyncFilePath(settings) {
  let url = settings.url.trim()
  if (!url.endsWith('/')) {
    url += '/'
  }
  
  if (settings.folder && settings.folder.trim()) {
    const folder = settings.folder.trim().replace(/^\//, '').replace(/\/$/, '')
    if (folder) {
      return folder + '/' + SYNC_FILENAME
    }
  }
  
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
    
    // Prepare data to upload
    const data = {
      verses: verses || [],
      collections: collections || [],
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
 * - Deleted items: if local has it but remote doesn't, keep local (might be new)
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

  // Merge verses
  const verseMap = new Map()
  
  // Add all local verses
  ;(localVerses || []).forEach(verse => {
    verseMap.set(verse.id, { ...verse, source: 'local' })
  })
  
  // Merge remote verses
  remoteVerses.forEach(verse => {
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
  
  // Add all local collections
  ;(localCollections || []).forEach(collection => {
    collectionMap.set(collection.id, { ...collection, source: 'local' })
  })
  
  // Merge remote collections
  remoteCollections.forEach(collection => {
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
    
    // Merge data
    const merged = mergeData(localVerses, localCollections, remoteData)
    
    // Upload merged data
    await uploadToWebDAV(merged.verses, merged.collections)
    
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
