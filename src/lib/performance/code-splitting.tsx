'use client'

import { ComponentType, lazy, Suspense } from 'react'
import { ErrorBoundary } from '@/components/error-boundary'

// Code Splitting Types
interface LazyComponentOptions {
  fallback?: React.ReactNode
  errorBoundary?: boolean
  preload?: boolean
  timeout?: number
}

interface PreloadOptions {
  priority?: 'high' | 'low'
  timeout?: number
}

export interface BundleAnalysis {
  name: string
  size: number
  loadTime: number
  dependencies: string[]
  chunks: string[]
}

// Lazy Component Wrapper
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyComponentOptions = {}
) {
  const LazyComponent = lazy(importFn)

  return function WrappedLazyComponent(props: React.ComponentProps<T>) {
    const { fallback, errorBoundary = true, preload = false, timeout = 10000 } = options

    // Preload component if requested
    if (preload && typeof window !== 'undefined') {
      importFn().catch(() => {
        // Silently fail preload
      })
    }

    const component = (
      <Suspense fallback={fallback || <DefaultFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    )

    if (errorBoundary) {
      return (
        <ErrorBoundary fallback={ErrorFallback}>
          {component}
        </ErrorBoundary>
      )
    }

    return component
  }
}

// Default fallback component
function DefaultFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
      <span className="text-gray-600">Loading...</span>
    </div>
  )
}

// Error fallback component
function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="flex items-center justify-center p-8 bg-red-50 rounded-lg">
      <div className="text-red-600 text-center">
        <div className="text-lg font-semibold mb-2">Failed to load component</div>
        <div className="text-sm mb-4">Please refresh the page to try again</div>
        <button 
          onClick={resetError}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    </div>
  )
}

// Preload utility
export function preloadComponent(importFn: () => Promise<any>, options: PreloadOptions = {}) {
  const { priority = 'low', timeout = 5000 } = options

  if (typeof window === 'undefined') return Promise.resolve()

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Preload timeout'))
    }, timeout)

    importFn()
      .then((module) => {
        clearTimeout(timeoutId)
        resolve(module)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

// Route-based code splitting
export function createLazyRoute(importFn: () => Promise<any>, options: LazyComponentOptions = {}) {
  return createLazyComponent(importFn, {
    fallback: <RouteFallback />,
    errorBoundary: true,
    preload: true,
    ...options
  })
}

// Route fallback component
function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <div className="text-lg font-semibold text-gray-700">Loading page...</div>
        <div className="text-sm text-gray-500 mt-2">Please wait while we load the content</div>
      </div>
    </div>
  )
}

// Feature-based code splitting
export function createLazyFeature(importFn: () => Promise<any>, options: LazyComponentOptions = {}) {
  return createLazyComponent(importFn, {
    fallback: <FeatureFallback />,
    errorBoundary: true,
    preload: false,
    ...options
  })
}

// Feature fallback component
function FeatureFallback() {
  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        <span className="text-gray-600">Loading feature...</span>
      </div>
    </div>
  )
}

// Modal-based code splitting
export function createLazyModal(importFn: () => Promise<any>, options: LazyComponentOptions = {}) {
  return createLazyComponent(importFn, {
    fallback: <ModalFallback />,
    errorBoundary: true,
    preload: false,
    ...options
  })
}

// Modal fallback component
function ModalFallback() {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          <span className="text-gray-600">Loading modal...</span>
        </div>
      </div>
    </div>
  )
}

// Bundle analyzer
export class BundleAnalyzer {
  private bundles: Map<string, BundleAnalysis> = new Map()

  // Analyze current bundles
  analyzeBundles(): BundleAnalysis[] {
    const bundles: BundleAnalysis[] = []

    if (typeof window === 'undefined') return bundles

    // Get all script resources
    const scripts = performance.getEntriesByType('resource').filter(
      (entry: any) => entry.name.includes('.js')
    ) as PerformanceResourceTiming[]

    for (const script of scripts) {
      const bundle: BundleAnalysis = {
        name: script.name.split('/').pop() || 'unknown',
        size: script.transferSize || 0,
        loadTime: script.duration,
        dependencies: [],
        chunks: [],
      }

      bundles.push(bundle)
      this.bundles.set(bundle.name, bundle)
    }

    return bundles
  }

  // Get bundle by name
  getBundle(name: string): BundleAnalysis | null {
    return this.bundles.get(name) || null
  }

  // Get all bundles
  getAllBundles(): BundleAnalysis[] {
    return Array.from(this.bundles.values())
  }

  // Get total bundle size
  getTotalSize(): number {
    return Array.from(this.bundles.values()).reduce((sum, bundle) => sum + bundle.size, 0)
  }

  // Get recommendations
  getRecommendations(): string[] {
    const recommendations: string[] = []
    const bundles = this.getAllBundles()

    // Check for large bundles
    const largeBundles = bundles.filter(b => b.size > 250000)
    if (largeBundles.length > 0) {
      recommendations.push('Consider splitting large bundles into smaller chunks')
      recommendations.push('Implement lazy loading for non-critical components')
    }

    // Check for slow loading bundles
    const slowBundles = bundles.filter(b => b.loadTime > 1000)
    if (slowBundles.length > 0) {
      recommendations.push('Optimize bundle loading with preloading')
      recommendations.push('Consider using a CDN for static assets')
    }

    // Check for duplicate bundles
    const bundleNames = bundles.map(b => b.name)
    const duplicates = bundleNames.filter((name, index) => bundleNames.indexOf(name) !== index)
    if (duplicates.length > 0) {
      recommendations.push('Remove duplicate bundle imports')
      recommendations.push('Consolidate shared dependencies')
    }

    return recommendations
  }
}

// Export bundle analyzer instance
export const bundleAnalyzer = new BundleAnalyzer()

// Dynamic import utility
export function dynamicImport<T = any>(
  modulePath: string,
  options: { timeout?: number; retries?: number } = {}
): Promise<T> {
  const { timeout = 10000, retries = 3 } = options

  return new Promise((resolve, reject) => {
    let attempts = 0

    const attemptImport = () => {
      attempts++
      
      const timeoutId = setTimeout(() => {
        if (attempts < retries) {
          attemptImport()
        } else {
          reject(new Error(`Failed to import ${modulePath} after ${retries} attempts`))
        }
      }, timeout)

      import(/* webpackChunkName: "[request]" */ modulePath)
        .then((module) => {
          clearTimeout(timeoutId)
          resolve(module as T)
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          if (attempts < retries) {
            attemptImport()
          } else {
            reject(error)
          }
        })
    }

    attemptImport()
  })
}

// Route preloader
export class RoutePreloader {
  private preloadedRoutes: Set<string> = new Set()
  private preloadQueue: string[] = []

  // Preload route
  preloadRoute(route: string, importFn: () => Promise<any>): Promise<void> {
    if (this.preloadedRoutes.has(route)) {
      return Promise.resolve()
    }

    this.preloadedRoutes.add(route)
    this.preloadQueue.push(route)

    return preloadComponent(importFn, { priority: 'low' })
      .then(() => {
        console.log(`[RoutePreloader] Preloaded route: ${route}`)
      })
      .catch((error) => {
        console.warn(`[RoutePreloader] Failed to preload route ${route}:`, error)
        this.preloadedRoutes.delete(route)
      })
  }

  // Preload multiple routes
  preloadRoutes(routes: Array<{ route: string; importFn: () => Promise<any> }>): Promise<void[]> {
    return Promise.all(routes.map(({ route, importFn }) => this.preloadRoute(route, importFn)))
  }

  // Check if route is preloaded
  isPreloaded(route: string): boolean {
    return this.preloadedRoutes.has(route)
  }

  // Get preloaded routes
  getPreloadedRoutes(): string[] {
    return Array.from(this.preloadedRoutes)
  }

  // Clear preloaded routes
  clearPreloadedRoutes(): void {
    this.preloadedRoutes.clear()
    this.preloadQueue = []
  }
}

// Export route preloader instance
export const routePreloader = new RoutePreloader()

// Component preloader
export class ComponentPreloader {
  private preloadedComponents: Set<string> = new Set()

  // Preload component
  preloadComponent(name: string, importFn: () => Promise<any>): Promise<void> {
    if (this.preloadedComponents.has(name)) {
      return Promise.resolve()
    }

    this.preloadedComponents.add(name)

    return preloadComponent(importFn, { priority: 'low' })
      .then(() => {
        console.log(`[ComponentPreloader] Preloaded component: ${name}`)
      })
      .catch((error) => {
        console.warn(`[ComponentPreloader] Failed to preload component ${name}:`, error)
        this.preloadedComponents.delete(name)
      })
  }

  // Check if component is preloaded
  isPreloaded(name: string): boolean {
    return this.preloadedComponents.has(name)
  }

  // Get preloaded components
  getPreloadedComponents(): string[] {
    return Array.from(this.preloadedComponents)
  }

  // Clear preloaded components
  clearPreloadedComponents(): void {
    this.preloadedComponents.clear()
  }
}

// Export component preloader instance
export const componentPreloader = new ComponentPreloader()

// Performance-optimized lazy loading hook
export function useLazyLoading<T>(
  importFn: () => Promise<T>,
  options: {
    threshold?: number
    rootMargin?: string
    preload?: boolean
  } = {}
) {
  const { threshold = 0.1, rootMargin = '50px', preload = false } = options

  const [isLoaded, setIsLoaded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<T | null>(null)

  const elementRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (preload) {
      importFn()
        .then(setData)
        .catch(setError)
        .finally(() => setIsLoaded(true))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && !isLoaded && !isLoading) {
          setIsLoading(true)
          importFn()
            .then(setData)
            .catch(setError)
            .finally(() => {
              setIsLoaded(true)
              setIsLoading(false)
            })
        }
      },
      { threshold, rootMargin }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [importFn, threshold, rootMargin, preload, isLoaded, isLoading])

  return {
    ref: elementRef,
    isLoaded,
    isLoading,
    error,
    data
  }
}

// Import React hooks
import { useState, useEffect, useRef } from 'react'
