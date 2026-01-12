import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'recent-items'
const MAX_ITEMS = 10
const MAX_PER_TYPE = 3

export interface RecentItem {
  type: 'task' | 'project'
  id: string
  name: string
  timestamp: string
}

export interface GroupedRecentItems {
  tasks: RecentItem[]
  projects: RecentItem[]
}

interface UseRecentItemsResult {
  items: RecentItem[]
  addItem: (item: Omit<RecentItem, 'timestamp'>) => void
  removeItem: (id: string) => void
  clearAll: () => void
  getGrouped: () => GroupedRecentItems
}

/**
 * Hook for managing recently viewed items (tasks and projects)
 * Stores up to 10 items in localStorage, with FIFO eviction
 */
export function useRecentItems(): UseRecentItemsResult {
  const [items, setItems] = useState<RecentItem[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setItems(parsed)
        }
      }
    } catch (error) {
      console.error('Failed to load recent items from localStorage:', error)
    }
    setIsInitialized(true)
  }, [])

  // Persist to localStorage when items change
  useEffect(() => {
    if (!isInitialized) return

    try {
      if (items.length === 0) {
        localStorage.removeItem(STORAGE_KEY)
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
      }
    } catch (error) {
      console.error('Failed to persist recent items to localStorage:', error)
    }
  }, [items, isInitialized])

  const addItem = useCallback((item: Omit<RecentItem, 'timestamp'>) => {
    setItems((prevItems) => {
      // Remove item if it already exists
      const filtered = prevItems.filter((i) => !(i.id === item.id && i.type === item.type))

      // Create new item with current timestamp
      const newItem: RecentItem = {
        ...item,
        timestamp: new Date().toISOString(),
      }

      // Add to front and limit to MAX_ITEMS
      const updated = [newItem, ...filtered].slice(0, MAX_ITEMS)

      return updated
    })
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setItems([])
  }, [])

  const getGrouped = useCallback((): GroupedRecentItems => {
    const tasks: RecentItem[] = []
    const projects: RecentItem[] = []

    for (const item of items) {
      if (item.type === 'task' && tasks.length < MAX_PER_TYPE) {
        tasks.push(item)
      } else if (item.type === 'project' && projects.length < MAX_PER_TYPE) {
        projects.push(item)
      }

      if (tasks.length === MAX_PER_TYPE && projects.length === MAX_PER_TYPE) {
        break
      }
    }

    return { tasks, projects }
  }, [items])

  return {
    items,
    addItem,
    removeItem,
    clearAll,
    getGrouped,
  }
}
