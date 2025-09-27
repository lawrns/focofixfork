'use client'

import { useEffect, useCallback, useRef, useState, useMemo } from 'react'

export type KeyCombination = {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
}

export type KeyboardShortcut = {
  id: string
  keys: KeyCombination[]
  action: () => void
  description: string
  category?: string
  enabled?: boolean
}

export interface KeyboardShortcutsConfig {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboard(config: KeyboardShortcutsConfig) {
  const shortcutsRef = useRef(config.shortcuts)
  const enabledRef = useRef(config.enabled ?? true)

  // Update refs when config changes
  useEffect(() => {
    shortcutsRef.current = config.shortcuts
    enabledRef.current = config.enabled ?? true
  }, [config.shortcuts, config.enabled])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabledRef.current) return

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      // Allow escape key and some navigation shortcuts
      if (event.key !== 'Escape' && !event.ctrlKey && !event.metaKey) {
        return
      }
    }

    const pressedKeys: KeyCombination = {
      key: event.key.toLowerCase(),
      ctrl: event.ctrlKey,
      meta: event.metaKey,
      shift: event.shiftKey,
      alt: event.altKey
    }

    // Find matching shortcut
    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      if (!shortcut.enabled && shortcut.enabled !== undefined) return false

      return shortcut.keys.some(shortcutKeys => {
        return (
          shortcutKeys.key.toLowerCase() === pressedKeys.key &&
          !!shortcutKeys.ctrl === !!pressedKeys.ctrl &&
          !!shortcutKeys.meta === !!pressedKeys.meta &&
          !!shortcutKeys.shift === !!pressedKeys.shift &&
          !!shortcutKeys.alt === !!pressedKeys.alt
        )
      })
    })

    if (matchingShortcut) {
      event.preventDefault()
      event.stopPropagation()
      matchingShortcut.action()
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [handleKeyDown])

  return {
    isEnabled: enabledRef.current,
    shortcuts: shortcutsRef.current
  }
}

// Predefined keyboard shortcuts for Foco
export const FOCO_KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  // Global shortcuts
  {
    id: 'search',
    keys: [{ key: 'k', meta: true }],
    action: () => {
      // Trigger global search
      const searchEvent = new CustomEvent('foco:open-search')
      document.dispatchEvent(searchEvent)
    },
    description: 'Open global search',
    category: 'Global'
  },
  {
    id: 'new-project',
    keys: [{ key: 'n', meta: true, shift: true }],
    action: () => {
      const event = new CustomEvent('foco:new-project')
      document.dispatchEvent(event)
    },
    description: 'Create new project',
    category: 'Projects'
  },
  {
    id: 'new-milestone',
    keys: [{ key: 'm', meta: true, shift: true }],
    action: () => {
      const event = new CustomEvent('foco:new-milestone')
      document.dispatchEvent(event)
    },
    description: 'Create new milestone',
    category: 'Milestones'
  },
  {
    id: 'dashboard',
    keys: [{ key: 'd', meta: true }],
    action: () => {
      window.location.href = '/'
    },
    description: 'Go to dashboard',
    category: 'Navigation'
  },
  {
    id: 'projects',
    keys: [{ key: 'p', meta: true }],
    action: () => {
      window.location.href = '/projects'
    },
    description: 'Go to projects',
    category: 'Navigation'
  },

  // View shortcuts
  {
    id: 'table-view',
    keys: [{ key: '1', meta: true }],
    action: () => {
      const event = new CustomEvent('foco:view-change', { detail: 'table' })
      document.dispatchEvent(event)
    },
    description: 'Switch to table view',
    category: 'Views'
  },
  {
    id: 'kanban-view',
    keys: [{ key: '2', meta: true }],
    action: () => {
      const event = new CustomEvent('foco:view-change', { detail: 'kanban' })
      document.dispatchEvent(event)
    },
    description: 'Switch to kanban view',
    category: 'Views'
  },
  {
    id: 'gantt-view',
    keys: [{ key: '3', meta: true }],
    action: () => {
      const event = new CustomEvent('foco:view-change', { detail: 'gantt' })
      document.dispatchEvent(event)
    },
    description: 'Switch to gantt view',
    category: 'Views'
  },

  // Action shortcuts
  {
    id: 'save',
    keys: [{ key: 's', meta: true }],
    action: () => {
      const event = new CustomEvent('foco:save')
      document.dispatchEvent(event)
    },
    description: 'Save current work',
    category: 'Actions'
  },
  {
    id: 'undo',
    keys: [{ key: 'z', meta: true }],
    action: () => {
      const event = new CustomEvent('foco:undo')
      document.dispatchEvent(event)
    },
    description: 'Undo last action',
    category: 'Actions'
  },
  {
    id: 'help',
    keys: [{ key: '/', meta: true }],
    action: () => {
      const event = new CustomEvent('foco:help')
      document.dispatchEvent(event)
    },
    description: 'Show keyboard shortcuts',
    category: 'Help'
  }
]

// Hook for Foco-specific keyboard shortcuts
export function useFocoKeyboard() {
  const [showHelp, setShowHelp] = useState(false)

  const shortcuts = useMemo(() => {
    return FOCO_KEYBOARD_SHORTCUTS.map(shortcut => ({
      ...shortcut,
      action: () => {
        switch (shortcut.id) {
          case 'help':
            setShowHelp(true)
            break
          default:
            shortcut.action()
        }
      }
    }))
  }, [])

  useKeyboard({ shortcuts })

  // Listen for help event
  useEffect(() => {
    const handleHelp = () => setShowHelp(true)
    document.addEventListener('foco:help', handleHelp)
    return () => document.removeEventListener('foco:help', handleHelp)
  }, [])

  return {
    showHelp,
    setShowHelp,
    shortcuts: FOCO_KEYBOARD_SHORTCUTS
  }
}

// Utility function to format key combination for display
export function formatKeyCombination(keys: KeyCombination[]): string {
  return keys.map(keyCombo => {
    const parts: string[] = []

    if (keyCombo.meta) parts.push('⌘')
    if (keyCombo.ctrl) parts.push('Ctrl')
    if (keyCombo.alt) parts.push('Alt')
    if (keyCombo.shift) parts.push('Shift')

    parts.push(keyCombo.key.toUpperCase())

    return parts.join(' + ')
  }).join(' or ')
}

// Hook for custom keyboard shortcuts
export function useCustomKeyboard(shortcuts: KeyboardShortcut[]) {
  return useKeyboard({ shortcuts })
}

// Hook for modal keyboard handling
export function useModalKeyboard(onClose: () => void, onConfirm?: () => void) {
  const shortcuts: KeyboardShortcut[] = [
    {
      id: 'modal-close',
      keys: [{ key: 'escape' }],
      action: onClose,
      description: 'Close modal',
      category: 'Modal'
    }
  ]

  if (onConfirm) {
    shortcuts.push({
      id: 'modal-confirm',
      keys: [{ key: 'enter', meta: true }],
      action: onConfirm,
      description: 'Confirm action',
      category: 'Modal'
    })
  }

  useKeyboard({ shortcuts })

  return shortcuts
}

// Hook for form keyboard handling
export function useFormKeyboard(onSubmit: () => void, onCancel?: () => void) {
  const shortcuts: KeyboardShortcut[] = [
    {
      id: 'form-submit',
      keys: [{ key: 'enter', meta: true }],
      action: onSubmit,
      description: 'Submit form',
      category: 'Form'
    }
  ]

  if (onCancel) {
    shortcuts.push({
      id: 'form-cancel',
      keys: [{ key: 'escape' }],
      action: onCancel,
      description: 'Cancel form',
      category: 'Form'
    })
  }

  useKeyboard({ shortcuts })

  return shortcuts
}
