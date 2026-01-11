import { useEffect, useCallback, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  action: () => void
  global?: boolean
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const shortcutsRef = useRef(shortcuts)

  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Allow Cmd+K even in inputs
      if (!(event.key === 'k' && (event.metaKey || event.ctrlKey))) {
        return
      }
    }

    for (const shortcut of shortcutsRef.current) {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
      const ctrlMatches = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey
      const metaMatches = shortcut.meta ? event.metaKey : !event.metaKey
      const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey
      const altMatches = shortcut.alt ? event.altKey : !event.altKey

      if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
        event.preventDefault()
        shortcut.action()
        break
      }
    }
  }, [enabled])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Global shortcuts registry
const globalShortcuts: KeyboardShortcut[] = []

export function registerGlobalShortcut(shortcut: KeyboardShortcut) {
  globalShortcuts.push(shortcut)
  return () => {
    const index = globalShortcuts.indexOf(shortcut)
    if (index > -1) {
      globalShortcuts.splice(index, 1)
    }
  }
}

export function getGlobalShortcuts() {
  return globalShortcuts
}

// Common shortcuts
export const commonShortcuts = {
  search: { key: 'k', meta: true, description: 'Open search' },
  newTask: { key: 'n', meta: true, description: 'Create new task' },
  newProject: { key: 'p', meta: true, shift: true, description: 'Create new project' },
  goHome: { key: 'h', meta: true, shift: true, description: 'Go to home' },
  goInbox: { key: 'i', meta: true, shift: true, description: 'Go to inbox' },
  goMyWork: { key: 'm', meta: true, shift: true, description: 'Go to my work' },
  goProjects: { key: 'p', meta: true, description: 'Go to projects' },
  save: { key: 's', meta: true, description: 'Save' },
  undo: { key: 'z', meta: true, description: 'Undo' },
  redo: { key: 'z', meta: true, shift: true, description: 'Redo' },
}
