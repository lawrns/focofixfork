'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

// Performance monitoring hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<{
    fcp?: number
    lcp?: number
    fid?: number
    cls?: number
    ttfb?: number
  }>({})

  useEffect(() => {
    if (typeof window === 'undefined') return

    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint')
      if (fcpEntry) {
        setMetrics(prev => ({ ...prev, fcp: fcpEntry.startTime }))
      }
    })
    fcpObserver.observe({ entryTypes: ['paint'] })

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      if (lastEntry) {
        setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }))
      }
    })
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const fidEntry = entries[0] as PerformanceEventTiming
      if (fidEntry) {
        setMetrics(prev => ({ ...prev, fid: fidEntry.processingStart - fidEntry.startTime }))
      }
    })
    fidObserver.observe({ entryTypes: ['first-input'] })

    // Cumulative Layout Shift
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value
        }
      }
      setMetrics(prev => ({ ...prev, cls: clsValue }))
    })
    clsObserver.observe({ entryTypes: ['layout-shift'] })

    // Time to First Byte
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigationEntry) {
      setMetrics(prev => ({ ...prev, ttfb: navigationEntry.responseStart - navigationEntry.requestStart }))
    }

    return () => {
      fcpObserver.disconnect()
      lcpObserver.disconnect()
      fidObserver.disconnect()
      clsObserver.disconnect()
    }
  }, [])

  return metrics
}

// Resource loading optimization
export function useResourceOptimization() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const checkLoadState = () => {
      if (document.readyState === 'complete') {
        setIsLoaded(true)
      }
    }

    if (document.readyState === 'complete') {
      setIsLoaded(true)
    } else {
      window.addEventListener('load', checkLoadState)
      return () => window.removeEventListener('load', checkLoadState)
    }
  }, [])

  return isLoaded
}

// Image lazy loading component
interface LazyImageProps {
  src: string
  alt: string
  className?: string
  placeholder?: string
  onLoad?: () => void
  onError?: () => void
}

export function LazyImage({ 
  src, 
  alt, 
  className = '', 
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PC9zdmc+',
  onLoad,
  onError
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    const img = document.createElement('img')
    observer.observe(img)

    return () => observer.disconnect()
  }, [])

  const handleLoad = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!isLoaded && !hasError && (
        <Image
          src={placeholder}
          alt=""
          fill
          className="object-cover blur-sm"
          priority={false}
        />
      )}
      
      {isInView && (
        <Image
          src={src}
          alt={alt}
          fill
          className={`object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}
      
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
          <span className="text-sm">Error loading image</span>
        </div>
      )}
    </div>
  )
}

// Virtual scrolling hook for large lists
export function useVirtualScroll({
  itemHeight,
  containerHeight,
  itemCount,
  overscan = 5
}: {
  itemHeight: number
  containerHeight: number
  itemCount: number
  overscan?: number
}) {
  const [scrollTop, setScrollTop] = useState(0)

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    itemCount - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  )

  const visibleItems = Array.from({ length: endIndex - startIndex + 1 }, (_, i) => ({
    index: startIndex + i,
    top: (startIndex + i) * itemHeight
  }))

  const totalHeight = itemCount * itemHeight

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }

  return {
    visibleItems,
    totalHeight,
    handleScroll
  }
}

// Debounced search hook
export function useDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T[]>,
  delay: number = 300
) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    const timeoutId = setTimeout(async () => {
      try {
        const searchResults = await searchFn(query)
        setResults(searchResults)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed')
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [query, searchFn, delay])

  return {
    query,
    setQuery,
    results,
    isLoading,
    error
  }
}

// Memory usage monitoring
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<{
    usedJSHeapSize?: number
    totalJSHeapSize?: number
    jsHeapSizeLimit?: number
  }>({})

  useEffect(() => {
    if (typeof window === 'undefined' || !('memory' in performance)) return

    const updateMemoryInfo = () => {
      const memory = (performance as any).memory
      if (memory) {
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit
        })
      }
    }

    updateMemoryInfo()
    const interval = setInterval(updateMemoryInfo, 5000)

    return () => clearInterval(interval)
  }, [])

  return memoryInfo
}

