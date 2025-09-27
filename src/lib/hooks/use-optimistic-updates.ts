import { useState, useCallback, useRef, useEffect } from 'react'

export interface OptimisticUpdateOptions<T> {
  onRevert?: (data: T) => void
  onConflict?: (serverData: T, localData: T) => void
  timeout?: number
  enabled?: boolean
}

export interface OptimisticUpdateResult<T> {
  optimisticData: T | null
  isOptimistic: boolean
  updateOptimistically: (updater: (current: T) => T, serverUpdate: Promise<T>) => Promise<T>
  revert: () => void
  clear: () => void
}

/**
 * Hook for implementing optimistic updates with conflict resolution
 * Provides immediate UI feedback while handling server synchronization
 */
export function useOptimisticUpdate<T>(
  initialData: T,
  options: OptimisticUpdateOptions<T> = {}
): OptimisticUpdateResult<T> {
  const {
    onRevert,
    onConflict,
    timeout = 10000,
    enabled = true
  } = options

  const [optimisticData, setOptimisticData] = useState<T | null>(null)
  const [isOptimistic, setIsOptimistic] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const lastServerDataRef = useRef<T>(initialData)

  // Clear optimistic state
  const clear = useCallback(() => {
    setOptimisticData(null)
    setIsOptimistic(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  // Revert to server data
  const revert = useCallback(() => {
    setOptimisticData(null)
    setIsOptimistic(false)
    onRevert?.(lastServerDataRef.current)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [onRevert])

  // Apply optimistic update
  const updateOptimistically = useCallback(
    async (updater: (current: T) => T, serverUpdate: Promise<T>): Promise<T> => {
      if (!enabled) {
        return serverUpdate
      }

      // Get current data (either optimistic or server data)
      const currentData = optimisticData ?? lastServerDataRef.current
      const optimisticUpdate = updater(currentData)

      // Apply optimistic update immediately
      setOptimisticData(optimisticUpdate)
      setIsOptimistic(true)

      // Set timeout for automatic revert
      timeoutRef.current = setTimeout(() => {
        console.warn('Optimistic update timed out, reverting...')
        revert()
      }, timeout)

      try {
        // Wait for server response
        const serverData = await serverUpdate

        // Clear timeout since we got a response
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        // Check for conflicts
        const hasConflict = JSON.stringify(serverData) !== JSON.stringify(optimisticUpdate)

        if (hasConflict && onConflict) {
          // Let the conflict handler decide what to do
          onConflict(serverData, optimisticUpdate)
        } else {
          // No conflict or no conflict handler, accept server data
          lastServerDataRef.current = serverData
        }

        // Clear optimistic state
        clear()

        return serverData
      } catch (error) {
        // Server update failed, revert optimistic update
        console.error('Server update failed, reverting optimistic update:', error)
        revert()
        throw error
      }
    },
    [optimisticData, enabled, timeout, revert, clear, onConflict]
  )

  // Update server data reference when initial data changes
  useEffect(() => {
    lastServerDataRef.current = initialData
  }, [initialData])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    optimisticData,
    isOptimistic,
    updateOptimistically,
    revert,
    clear
  }
}

/**
 * Specialized hook for optimistic list updates (add, remove, update items)
 */
export function useOptimisticList<T extends { id: string }>(
  initialList: T[],
  options: OptimisticUpdateOptions<T[]> = {}
) {
  const {
    optimisticData: optimisticList,
    isOptimistic,
    updateOptimistically
  } = useOptimisticUpdate(initialList, options)

  const currentList = optimisticList ?? initialList

  const addItem = useCallback(
    (item: T, serverAdd: Promise<T>) => {
      return updateOptimistically(
        (list) => [...list, item],
        serverAdd.then((addedItem) => {
          // Replace the optimistic item with the real server item
          return currentList.map(i => i.id === item.id ? addedItem : i)
        })
      )
    },
    [updateOptimistically, currentList]
  )

  const updateItem = useCallback(
    (id: string, updates: Partial<T>, serverUpdate: Promise<T>) => {
      return updateOptimistically(
        (list) => list.map(item =>
          item.id === id ? { ...item, ...updates } : item
        ),
        serverUpdate.then((updatedItem) => {
          // Replace with server data
          return currentList.map(item =>
            item.id === id ? updatedItem : item
          )
        })
      )
    },
    [updateOptimistically, currentList]
  )

  const removeItem = useCallback(
    (id: string, serverRemove: Promise<void>) => {
      return updateOptimistically(
        (list) => list.filter(item => item.id !== id),
        serverRemove.then(() => {
          // Return the list without the item
          return currentList.filter(item => item.id !== id)
        })
      )
    },
    [updateOptimistically, currentList]
  )

  return {
    list: currentList,
    isOptimistic,
    addItem,
    updateItem,
    removeItem
  }
}

/**
 * Hook for optimistic form updates with validation
 */
export function useOptimisticForm<T extends Record<string, any>>(
  initialData: T,
  options: OptimisticUpdateOptions<T> & {
    validate?: (data: T) => boolean | string
  } = {}
) {
  const { validate, ...updateOptions } = options

  const {
    optimisticData,
    isOptimistic,
    updateOptimistically
  } = useOptimisticUpdate(initialData, updateOptions)

  const currentData = optimisticData ?? initialData

  const updateField = useCallback(
    (field: keyof T, value: any) => {
      const newData = { ...currentData, [field]: value }

      // Client-side validation
      if (validate) {
        const validationResult = validate(newData)
        if (validationResult !== true) {
          console.warn('Validation failed:', validationResult)
          return
        }
      }

      // Apply optimistic update
      updateOptimistically(
        () => newData,
        Promise.resolve(newData) // No server call for field updates
      )
    },
    [currentData, validate, updateOptimistically]
  )

  const updateMultipleFields = useCallback(
    (updates: Partial<T>) => {
      const newData = { ...currentData, ...updates }

      if (validate) {
        const validationResult = validate(newData)
        if (validationResult !== true) {
          console.warn('Validation failed:', validationResult)
          return
        }
      }

      updateOptimistically(
        () => newData,
        Promise.resolve(newData)
      )
    },
    [currentData, validate, updateOptimistically]
  )

  const submitForm = useCallback(
    (serverSubmit: Promise<T>) => {
      return updateOptimistically(
        () => currentData,
        serverSubmit
      )
    },
    [currentData, updateOptimistically]
  )

  return {
    data: currentData,
    isOptimistic,
    updateField,
    updateMultipleFields,
    submitForm
  }
}

/**
 * Hook for optimistic counter updates (likes, votes, etc.)
 */
export function useOptimisticCounter(
  initialCount: number,
  options: OptimisticUpdateOptions<number> = {}
) {
  const {
    optimisticData,
    isOptimistic,
    updateOptimistically
  } = useOptimisticUpdate(initialCount, options)

  const currentCount = optimisticData ?? initialCount

  const increment = useCallback(
    (serverIncrement: Promise<number>) => {
      return updateOptimistically(
        (count) => count + 1,
        serverIncrement
      )
    },
    [updateOptimistically]
  )

  const decrement = useCallback(
    (serverDecrement: Promise<number>) => {
      return updateOptimistically(
        (count) => Math.max(0, count - 1),
        serverDecrement
      )
    },
    [updateOptimistically]
  )

  const setCount = useCallback(
    (newCount: number, serverUpdate: Promise<number>) => {
      return updateOptimistically(
        () => newCount,
        serverUpdate
      )
    },
    [updateOptimistically]
  )

  return {
    count: currentCount,
    isOptimistic,
    increment,
    decrement,
    setCount
  }
}
