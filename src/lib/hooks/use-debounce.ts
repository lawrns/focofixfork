'use client'

import React, { useEffect, useRef } from 'react'

/**
 * Custom hook for debouncing values and callbacks
 * Useful for search inputs, auto-save fields, and other operations
 * that should not be triggered on every keystroke
 *
 * @param value - The value to debounce
 * @param callback - Function to call after debounce delay (receives the debounced value)
 * @param delay - Debounce delay in milliseconds (default: 300ms for search, 500ms for auto-save)
 *
 * @example
 * // For search fields (300ms)
 * useDebounce(searchQuery, (query) => {
 *   if (query.trim()) {
 *     fetchSearchResults(query)
 *   }
 * }, 300)
 *
 * // For auto-save fields (500ms)
 * useDebounce(formValue, (value) => {
 *   saveFormData(value)
 * }, 500)
 */
export function useDebounce<T>(
  value: T,
  callback: (value: T) => void | Promise<void>,
  delay: number = 300
): void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Clear the previous timeout when value changes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Set a new timeout for the debounced callback
    timeoutRef.current = setTimeout(() => {
      callback(value)
    }, delay)

    // Cleanup function to clear timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, callback, delay])
}

/**
 * Custom hook for debouncing values and returning the debounced value
 * Useful when you need the debounced value to update other state/effects
 *
 * @param value - The value to debounce
 * @param delay - Debounce delay in milliseconds (default: 300)
 * @returns The debounced value
 *
 * @example
 * const debouncedQuery = useDebouncedValue(searchQuery, 300)
 * useEffect(() => {
 *   if (debouncedQuery) {
 *     performSearch(debouncedQuery)
 *   }
 * }, [debouncedQuery])
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Custom hook for debouncing async operations like API calls
 * Automatically cancels pending calls when new values arrive
 *
 * @param value - The value to debounce
 * @param asyncFn - Async function to call with debounced value
 * @param delay - Debounce delay in milliseconds (default: 300)
 *
 * @example
 * useDebouncedAsync(searchQuery, async (query) => {
 *   const results = await fetchSearchResults(query)
 *   setResults(results)
 * }, 300)
 */
export function useDebouncedAsync<T>(
  value: T,
  asyncFn: (value: T) => Promise<void>,
  delay: number = 300
): void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Cancel previous async operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Set new timeout for async operation
    timeoutRef.current = setTimeout(async () => {
      abortControllerRef.current = new AbortController()
      try {
        await asyncFn(value)
      } catch (error) {
        // Only log if not aborted
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Debounced async operation failed:', error)
        }
      }
    }, delay)

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [value, asyncFn, delay])
}
