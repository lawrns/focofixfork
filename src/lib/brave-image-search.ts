const BRAVE_IMAGE_SEARCH_URL = 'https://api.search.brave.com/res/v1/images/search'
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000

type CacheValue = {
  url: string
  expiresAt: number
}

const imageCache = new Map<string, CacheValue>()

function getCachedImage(query: string): string | undefined {
  const cached = imageCache.get(query)
  if (!cached) return undefined
  if (cached.expiresAt <= Date.now()) {
    imageCache.delete(query)
    return undefined
  }
  return cached.url
}

function rememberImage(query: string, url: string): string {
  imageCache.set(query, { url, expiresAt: Date.now() + DEFAULT_CACHE_TTL_MS })
  return url
}

function coerceImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  if (!value.startsWith('http://') && !value.startsWith('https://')) return undefined
  return value
}

function extractFirstImageUrl(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const results = (payload as { results?: unknown }).results
  if (!Array.isArray(results) || results.length === 0) return undefined

  const first = results[0] as {
    thumbnail?: { src?: unknown }
    properties?: { url?: unknown; placeholder?: unknown }
    url?: unknown
  }

  return (
    coerceImageUrl(first.thumbnail?.src) ??
    coerceImageUrl(first.properties?.url) ??
    coerceImageUrl(first.properties?.placeholder) ??
    coerceImageUrl(first.url)
  )
}

export async function searchBraveImage(query: string): Promise<string | undefined> {
  const trimmed = query.trim()
  if (!trimmed) return undefined

  const cached = getCachedImage(trimmed)
  if (cached) return cached

  const apiKey = process.env.BRAVE_SEARCH_API_KEY
  if (!apiKey) return undefined

  try {
    const url = new URL(BRAVE_IMAGE_SEARCH_URL)
    url.searchParams.set('q', trimmed)
    url.searchParams.set('count', '1')
    url.searchParams.set('search_lang', 'en')
    url.searchParams.set('country', 'us')
    url.searchParams.set('safesearch', 'off')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': apiKey,
      },
      next: { revalidate: 60 * 60 * 24 },
    })

    if (!response.ok) return undefined

    const payload = await response.json()
    const firstImage = extractFirstImageUrl(payload)
    return firstImage ? rememberImage(trimmed, firstImage) : undefined
  } catch {
    return undefined
  }
}
