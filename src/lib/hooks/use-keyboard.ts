import React, { useEffect, useCallback, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  preventDefault?: boolean
  description?: string
}

export interface UseKeyboardOptions {
  enabled?: boolean
  target?: HTMLElement | Document
  preventDefault?: boolean
}

export interface KeyboardShortcutHandler {
  (event: KeyboardEvent): void
}

export function useKeyboard(
  shortcuts: Record<string, KeyboardShortcutHandler>,
  options: UseKeyboardOptions = {}
) {
  const { enabled = true, target = document, preventDefault = true } = options
  const shortcutsRef = useRef(shortcuts)

  // Keep shortcuts reference updated
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    const { key, ctrlKey, shiftKey, altKey, metaKey } = event

    // Find matching shortcut
    for (const [shortcutKey, handler] of Object.entries(shortcutsRef.current)) {
      const shortcut = parseShortcut(shortcutKey)

      if (
        key.toLowerCase() === shortcut.key.toLowerCase() &&
        !!ctrlKey === !!shortcut.ctrl &&
        !!shiftKey === !!shortcut.shift &&
        !!altKey === !!shortcut.alt &&
        !!metaKey === !!shortcut.meta
      ) {
        if (preventDefault || shortcut.preventDefault) {
          event.preventDefault()
          event.stopPropagation()
        }

        handler(event)
        break
      }
    }
  }, [enabled, preventDefault])

  useEffect(() => {
    const element = target as any

    if (enabled && element) {
      element.addEventListener('keydown', handleKeyDown)
      return () => element.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown, target, enabled])

  return { handleKeyDown }
}

// Parse shortcut string like "ctrl+s" or "cmd+shift+k"
function parseShortcut(shortcut: string): KeyboardShortcut {
  const parts = shortcut.toLowerCase().split('+')
  const key = parts[parts.length - 1]

  return {
    key,
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('command'),
    preventDefault: true
  }
}

// Predefined shortcuts for common actions
export const COMMON_SHORTCUTS = {
  // Navigation
  DASHBOARD: 'g+d',
  PROJECTS: 'g+p',
  TASKS: 'g+t',
  MILESTONES: 'g+m',
  ORGANIZATIONS: 'g+o',
  SETTINGS: 'g+s',

  // Actions
  NEW_PROJECT: 'ctrl+n',
  NEW_TASK: 'ctrl+shift+n',
  SAVE: 'ctrl+s',
  SEARCH: 'ctrl+k',
  HELP: 'f1',

  // Views
  TABLE_VIEW: 'ctrl+1',
  KANBAN_VIEW: 'ctrl+2',
  GANTT_VIEW: 'ctrl+3',

  // Editing
  UNDO: 'ctrl+z',
  REDO: 'ctrl+y',
  COPY: 'ctrl+c',
  PASTE: 'ctrl+v',
  CUT: 'ctrl+x',
  SELECT_ALL: 'ctrl+a',

  // Modal/Overlay
  CLOSE_MODAL: 'escape',
  CONFIRM: 'enter'
} as const

// Keyboard shortcuts manager for global app shortcuts
export class KeyboardShortcutsManager {
  private static instance: KeyboardShortcutsManager
  private shortcuts = new Map<string, KeyboardShortcutHandler>()
  private categories = new Map<string, Set<string>>()
  private descriptions = new Map<string, string>()

  private constructor() {
    this.initDefaultShortcuts()
  }

  static getInstance(): KeyboardShortcutsManager {
    if (!KeyboardShortcutsManager.instance) {
      KeyboardShortcutsManager.instance = new KeyboardShortcutsManager()
    }
    return KeyboardShortcutsManager.instance
  }

  private initDefaultShortcuts() {
    // Register default shortcuts
    this.register('help', 'f1', () => {
      // Show help dialog
      console.log('Help dialog should open')
    }, 'Show keyboard shortcuts help')

    this.register('search', 'ctrl+k', () => {
      // Focus search input
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLInputElement
      if (searchInput) {
        searchInput.focus()
      }
    }, 'Focus search input')
  }

  register(
    id: string,
    shortcut: string,
    handler: KeyboardShortcutHandler,
    description?: string,
    category = 'general'
  ) {
    this.shortcuts.set(id, handler)
    this.descriptions.set(id, description || '')

    if (!this.categories.has(category)) {
      this.categories.set(category, new Set())
    }
    this.categories.get(category)!.add(id)
  }

  unregister(id: string) {
    this.shortcuts.delete(id)
    this.descriptions.delete(id)

    // Remove from categories
    for (const categorySet of this.categories.values()) {
      categorySet.delete(id)
    }
  }

  getShortcut(id: string): KeyboardShortcutHandler | undefined {
    return this.shortcuts.get(id)
  }

  getDescription(id: string): string {
    return this.descriptions.get(id) || ''
  }

  getAllShortcuts(): Record<string, { shortcut: string; description: string; category: string }> {
    const result: Record<string, { shortcut: string; description: string; category: string }> = {}

    for (const [category, ids] of this.categories.entries()) {
      for (const id of ids) {
        // Note: We need to reverse-map the shortcut, this is a simplified version
        result[id] = {
          shortcut: id, // In a real implementation, you'd store the reverse mapping
          description: this.getDescription(id),
          category
        }
      }
    }

    return result
  }

  getShortcutsByCategory(category: string): string[] {
    return Array.from(this.categories.get(category) || [])
  }

  getCategories(): string[] {
    return Array.from(this.categories.keys())
  }
}

// Global keyboard shortcuts hook
export function useGlobalKeyboard() {
  const manager = KeyboardShortcutsManager.getInstance()

  const registerShortcut = useCallback((
    id: string,
    shortcut: string,
    handler: KeyboardShortcutHandler,
    description?: string,
    category = 'general'
  ) => {
    manager.register(id, shortcut, handler, description, category)
  }, [manager])

  const unregisterShortcut = useCallback((id: string) => {
    manager.unregister(id)
  }, [manager])

  return {
    registerShortcut,
    unregisterShortcut,
    getAllShortcuts: () => manager.getAllShortcuts(),
    getCategories: () => manager.getCategories()
  }
}

// Hook for handling keyboard shortcuts in a specific component
export function useKeyboardShortcuts(
  shortcuts: Record<string, { shortcut: string; handler: KeyboardShortcutHandler; description?: string }>,
  options: UseKeyboardOptions = {}
) {
  const handlers = Object.fromEntries(
    Object.entries(shortcuts).map(([key, value]) => [
      value.shortcut,
      value.handler
    ])
  )

  return useKeyboard(handlers, options)
}

// Hook for detecting key combinations
export function useKeyCombination(
  keys: string[],
  callback: () => void,
  options: { enabled?: boolean; preventDefault?: boolean } = {}
) {
  const { enabled = true, preventDefault = true } = options
  const pressedKeys = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      pressedKeys.current.add(event.key.toLowerCase())

      // Check if all required keys are pressed
      const allPressed = keys.every(key =>
        pressedKeys.current.has(key.toLowerCase())
      )

      if (allPressed) {
        if (preventDefault) {
          event.preventDefault()
        }
        callback()
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.key.toLowerCase())
    }

    const handleBlur = () => {
      pressedKeys.current.clear()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [keys, callback, enabled, preventDefault])
}

// Hook for focus management with keyboard navigation
export function useKeyboardNavigation(
  items: any[],
  onSelect: (item: any, index: number) => void,
  options: {
    enabled?: boolean
    loop?: boolean
    vertical?: boolean
    horizontal?: boolean
  } = {}
) {
  const {
    enabled = true,
    loop = true,
    vertical = true,
    horizontal = false
  } = options

  const [focusedIndex, setFocusedIndex] = React.useState(-1)

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled || items.length === 0) return

    let newIndex = focusedIndex

    switch (event.key) {
      case 'ArrowDown':
        if (vertical) {
          event.preventDefault()
          newIndex = loop ? (focusedIndex + 1) % items.length : Math.min(focusedIndex + 1, items.length - 1)
        }
        break
      case 'ArrowUp':
        if (vertical) {
          event.preventDefault()
          newIndex = loop ? (focusedIndex - 1 + items.length) % items.length : Math.max(focusedIndex - 1, 0)
        }
        break
      case 'ArrowRight':
        if (horizontal) {
          event.preventDefault()
          newIndex = loop ? (focusedIndex + 1) % items.length : Math.min(focusedIndex + 1, items.length - 1)
        }
        break
      case 'ArrowLeft':
        if (horizontal) {
          event.preventDefault()
          newIndex = loop ? (focusedIndex - 1 + items.length) % items.length : Math.max(focusedIndex - 1, 0)
        }
        break
      case 'Enter':
      case ' ':
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          event.preventDefault()
          onSelect(items[focusedIndex], focusedIndex)
        }
        break
      case 'Home':
        event.preventDefault()
        newIndex = 0
        break
      case 'End':
        event.preventDefault()
        newIndex = items.length - 1
        break
    }

    if (newIndex !== focusedIndex) {
      setFocusedIndex(newIndex)
    }
  }, [enabled, items, focusedIndex, loop, vertical, horizontal, onSelect])

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])

  return {
    focusedIndex,
    setFocusedIndex
  }
}

// Utility function to format shortcut for display
export function formatShortcut(shortcut: string): string {
  return shortcut
    .split('+')
    .map(part => {
      switch (part.toLowerCase()) {
        case 'ctrl':
        case 'control':
          return 'Ctrl'
        case 'shift':
          return 'Shift'
        case 'alt':
          return 'Alt'
        case 'meta':
        case 'cmd':
        case 'command':
          return navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'
        case 'enter':
          return '↵'
        case 'escape':
          return 'Esc'
        default:
          return part.toUpperCase()
      }
    })
    .join(' + ')
}

// Hook for showing keyboard shortcuts help
export function useKeyboardHelp() {
  const [showHelp, setShowHelp] = React.useState(false)

  useKeyboard({
    'f1': () => setShowHelp(true),
    'escape': () => setShowHelp(false)
  }, { enabled: showHelp })

  return {
    showHelp,
    setShowHelp
  }
}
