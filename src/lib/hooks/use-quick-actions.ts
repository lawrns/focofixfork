'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'

export interface QuickAction {
  id: string
  title: string
  description?: string
  category: 'create' | 'navigate' | 'edit' | 'view' | 'settings'
  shortcut?: string
  icon?: string
  action: () => void
  keywords?: string[]
}

export interface QuickActionsState {
  isOpen: boolean
  query: string
  selectedIndex: number
  recentActions: string[]
}

export function useQuickActions() {
  const [state, setState] = useState<QuickActionsState>({
    isOpen: false,
    query: '',
    selectedIndex: 0,
    recentActions: []
  })

  const router = useRouter()

  // Load recent actions from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('foco-recent-actions')
      if (saved) {
        try {
          setState(prev => ({
            ...prev,
            recentActions: JSON.parse(saved)
          }))
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [])

  // Save recent actions to localStorage
  const saveRecentAction = useCallback((actionId: string) => {
    if (typeof window === 'undefined') return

    setState(prev => {
      const newRecent = [actionId, ...prev.recentActions.filter(id => id !== actionId)].slice(0, 10)
      
      try {
        localStorage.setItem('foco-recent-actions', JSON.stringify(newRecent))
      } catch {
        // Ignore storage errors
      }

      return {
        ...prev,
        recentActions: newRecent
      }
    })
  }, [])

  // Define all available actions
  const allActions = useMemo((): QuickAction[] => [
    // Create actions
    {
      id: 'create-project',
      title: 'Create Project',
      description: 'Start a new project',
      category: 'create',
      shortcut: 'Cmd+Shift+N',
      icon: '📁',
      action: () => {
        router.push('/dashboard')
        // Trigger project creation modal
        setTimeout(() => {
          const event = new CustomEvent('open-create-project')
          window.dispatchEvent(event)
        }, 100)
      },
      keywords: ['new', 'project', 'create']
    },
    {
      id: 'create-task',
      title: 'Create Task',
      description: 'Add a new task',
      category: 'create',
      shortcut: 'Cmd+N',
      icon: '✅',
      action: () => {
        router.push('/dashboard')
        setTimeout(() => {
          const event = new CustomEvent('open-create-task')
          window.dispatchEvent(event)
        }, 100)
      },
      keywords: ['new', 'task', 'todo', 'create']
    },
    {
      id: 'create-organization',
      title: 'Create Organization',
      description: 'Start a new organization',
      category: 'create',
      icon: '🏢',
      action: () => {
        router.push('/organizations')
        setTimeout(() => {
          const event = new CustomEvent('open-create-organization')
          window.dispatchEvent(event)
        }, 100)
      },
      keywords: ['new', 'org', 'organization', 'team', 'create']
    },

    // Navigate actions
    {
      id: 'go-dashboard',
      title: 'Go to Dashboard',
      description: 'View your projects',
      category: 'navigate',
      shortcut: 'Cmd+D',
      icon: '🏠',
      action: () => router.push('/dashboard'),
      keywords: ['dashboard', 'home', 'projects', 'go']
    },
    {
      id: 'go-organizations',
      title: 'Go to Organizations',
      description: 'Manage organizations',
      category: 'navigate',
      shortcut: 'Cmd+O',
      icon: '🏢',
      action: () => router.push('/organizations'),
      keywords: ['organizations', 'orgs', 'teams', 'go']
    },
    {
      id: 'go-reports',
      title: 'Go to Reports',
      description: 'View analytics and reports',
      category: 'navigate',
      shortcut: 'Cmd+R',
      icon: '📊',
      action: () => router.push('/reports'),
      keywords: ['reports', 'analytics', 'stats', 'go']
    },
    {
      id: 'go-settings',
      title: 'Go to Settings',
      description: 'Account and preferences',
      category: 'navigate',
      shortcut: 'Cmd+,',
      icon: '⚙️',
      action: () => router.push('/dashboard/settings'),
      keywords: ['settings', 'preferences', 'account', 'go']
    },

    // Edit actions
    {
      id: 'search',
      title: 'Search',
      description: 'Search projects and tasks',
      category: 'edit',
      shortcut: 'Cmd+K',
      icon: '🔍',
      action: () => {
        const event = new CustomEvent('open-search')
        window.dispatchEvent(event)
      },
      keywords: ['search', 'find', 'look']
    },
    {
      id: 'toggle-board-view',
      title: 'Toggle Board View',
      description: 'Switch to kanban board',
      category: 'view',
      shortcut: 'Cmd+B',
      icon: '📋',
      action: () => {
        const event = new CustomEvent('toggle-view', { detail: { view: 'board' } })
        window.dispatchEvent(event)
      },
      keywords: ['board', 'kanban', 'view', 'toggle']
    },
    {
      id: 'toggle-table-view',
      title: 'Toggle Table View',
      description: 'Switch to table view',
      category: 'view',
      shortcut: 'Cmd+T',
      icon: '📊',
      action: () => {
        const event = new CustomEvent('toggle-view', { detail: { view: 'table' } })
        window.dispatchEvent(event)
      },
      keywords: ['table', 'list', 'view', 'toggle']
    },

    // Settings actions
    {
      id: 'toggle-theme',
      title: 'Toggle Theme',
      description: 'Switch between light and dark mode',
      category: 'settings',
      shortcut: 'Cmd+Shift+T',
      icon: '🌙',
      action: () => {
        const event = new CustomEvent('toggle-theme')
        window.dispatchEvent(event)
      },
      keywords: ['theme', 'dark', 'light', 'toggle']
    },
    {
      id: 'show-shortcuts',
      title: 'Show Keyboard Shortcuts',
      description: 'View all available shortcuts',
      category: 'settings',
      shortcut: '?',
      icon: '⌨️',
      action: () => {
        const event = new CustomEvent('show-shortcuts')
        window.dispatchEvent(event)
      },
      keywords: ['shortcuts', 'keyboard', 'help', 'keys']
    }
  ], [router])

  // Filter actions based on query
  const filteredActions = useMemo(() => {
    if (!state.query.trim()) {
      // Show recent actions first, then all actions
      const recentActions = allActions.filter(action => 
        state.recentActions.includes(action.id)
      )
      const otherActions = allActions.filter(action => 
        !state.recentActions.includes(action.id)
      )
      return [...recentActions, ...otherActions]
    }

    const query = state.query.toLowerCase()
    return allActions.filter(action => {
      const searchText = [
        action.title,
        action.description,
        ...(action.keywords || [])
      ].join(' ').toLowerCase()

      return searchText.includes(query)
    })
  }, [allActions, state.query, state.recentActions])

  // Group actions by category
  const groupedActions = useMemo(() => {
    const groups: Record<string, QuickAction[]> = {}
    
    filteredActions.forEach(action => {
      if (!groups[action.category]) {
        groups[action.category] = []
      }
      groups[action.category].push(action)
    })

    return groups
  }, [filteredActions])

  const open = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: true,
      query: '',
      selectedIndex: 0
    }))
  }, [])

  const close = useCallback(() => {
    setState(prev => ({
      ...prev,
      isOpen: false,
      query: '',
      selectedIndex: 0
    }))
  }, [])

  const setQuery = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      query,
      selectedIndex: 0
    }))
  }, [])

  const selectNext = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedIndex: Math.min(prev.selectedIndex + 1, filteredActions.length - 1)
    }))
  }, [filteredActions.length])

  const selectPrevious = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedIndex: Math.max(prev.selectedIndex - 1, 0)
    }))
  }, [])

  const executeSelected = useCallback(() => {
    const selectedAction = filteredActions[state.selectedIndex]
    if (selectedAction) {
      selectedAction.action()
      saveRecentAction(selectedAction.id)
      close()
    }
  }, [filteredActions, state.selectedIndex, saveRecentAction, close])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!state.isOpen) {
      // Open quick actions with "/" key
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          open()
        }
      }
      return
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        close()
        break
      case 'ArrowDown':
        e.preventDefault()
        selectNext()
        break
      case 'ArrowUp':
        e.preventDefault()
        selectPrevious()
        break
      case 'Enter':
        e.preventDefault()
        executeSelected()
        break
    }
  }, [state.isOpen, open, close, selectNext, selectPrevious, executeSelected])

  // Global keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return {
    ...state,
    allActions,
    filteredActions,
    groupedActions,
    open,
    close,
    setQuery,
    selectNext,
    selectPrevious,
    executeSelected
  }
}
