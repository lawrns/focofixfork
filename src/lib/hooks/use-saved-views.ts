'use client'

import { useState, useEffect, useCallback } from 'react'

export interface ViewConfig {
  id: string
  name: string
  type: 'table' | 'kanban' | 'gantt' | 'ai' | 'team'
  filters?: {
    status?: string[]
    priority?: string[]
    organization_id?: string
    assignee_id?: string
    dateRange?: {
      start: string
      end: string
    }
  }
  sorting?: {
    field: string
    direction: 'asc' | 'desc'
  }
  columns?: string[] // For table views
  groupBy?: string // For kanban views
  createdAt: string
  updatedAt: string
}

export interface SavedViewsState {
  views: ViewConfig[]
  activeViewId: string | null
  isLoading: boolean
}

const STORAGE_KEY = 'foco-saved-views'
const DEFAULT_VIEWS: ViewConfig[] = [
  {
    id: 'default-table',
    name: 'All Projects',
    type: 'table',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'active-projects',
    name: 'Active Projects',
    type: 'table',
    filters: {
      status: ['active', 'planning'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'high-priority',
    name: 'High Priority',
    type: 'table',
    filters: {
      priority: ['high', 'urgent'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export function useSavedViews() {
  const [state, setState] = useState<SavedViewsState>({
    views: [],
    activeViewId: null,
    isLoading: true,
  })

  // Load views from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsedViews = JSON.parse(stored)
        setState(prev => ({
          ...prev,
          views: [...DEFAULT_VIEWS, ...parsedViews],
          isLoading: false,
        }))
      } else {
        setState(prev => ({
          ...prev,
          views: DEFAULT_VIEWS,
          isLoading: false,
        }))
      }
    } catch (error) {
      console.error('Failed to load saved views:', error)
      setState(prev => ({
        ...prev,
        views: DEFAULT_VIEWS,
        isLoading: false,
      }))
    }
  }, [])

  // Save views to localStorage
  const saveViewsToStorage = useCallback((views: ViewConfig[]) => {
    try {
      const customViews = views.filter(view => !DEFAULT_VIEWS.find(defaultView => defaultView.id === view.id))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customViews))
    } catch (error) {
      console.error('Failed to save views:', error)
    }
  }, [])

  // Create a new saved view
  const createView = useCallback((config: Omit<ViewConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newView: ViewConfig = {
      ...config,
      id: `view-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setState(prev => {
      const newViews = [...prev.views, newView]
      saveViewsToStorage(newViews)
      return {
        ...prev,
        views: newViews,
      }
    })

    return newView.id
  }, [saveViewsToStorage])

  // Update an existing view
  const updateView = useCallback((id: string, updates: Partial<Omit<ViewConfig, 'id' | 'createdAt'>>) => {
    setState(prev => {
      const newViews = prev.views.map(view =>
        view.id === id
          ? { ...view, ...updates, updatedAt: new Date().toISOString() }
          : view
      )
      saveViewsToStorage(newViews)
      return {
        ...prev,
        views: newViews,
      }
    })
  }, [saveViewsToStorage])

  // Delete a view
  const deleteView = useCallback((id: string) => {
    // Don't allow deleting default views
    const isDefaultView = DEFAULT_VIEWS.some(defaultView => defaultView.id === id)
    if (isDefaultView) return

    setState(prev => {
      const newViews = prev.views.filter(view => view.id !== id)
      saveViewsToStorage(newViews)

      // If the deleted view was active, clear active view
      const newActiveViewId = prev.activeViewId === id ? null : prev.activeViewId

      return {
        ...prev,
        views: newViews,
        activeViewId: newActiveViewId,
      }
    })
  }, [saveViewsToStorage])

  // Set active view
  const setActiveView = useCallback((viewId: string | null) => {
    setState(prev => ({
      ...prev,
      activeViewId: viewId,
    }))
  }, [])

  // Get active view configuration
  const getActiveView = useCallback(() => {
    if (!state.activeViewId) return null
    return state.views.find(view => view.id === state.activeViewId) || null
  }, [state.activeViewId, state.views])

  // Save current view configuration as a new saved view
  const saveCurrentView = useCallback((name: string, config: Omit<ViewConfig, 'id' | 'name' | 'createdAt' | 'updatedAt'>) => {
    return createView({
      ...config,
      name,
    })
  }, [createView])

  return {
    ...state,
    createView,
    updateView,
    deleteView,
    setActiveView,
    getActiveView,
    saveCurrentView,
  }
}
