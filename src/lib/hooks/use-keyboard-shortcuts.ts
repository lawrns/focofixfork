'use client'

/**
 * Consolidated keyboard hook — replaces the previous 4 separate files:
 *   use-keyboard.ts, use-keyboard-nav.ts, use-keyboard-navigation.ts,
 *   and the old use-keyboard-shortcuts.ts.
 *
 * Actual global shortcuts live in global-keyboard-shortcuts.tsx (component).
 * This file provides re-usable primitives for component-level shortcuts,
 * list/grid keyboard navigation, and the format helper.
 */

import React, { useEffect, useCallback, useRef } from 'react'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  description: string
  action: () => void
}

// ─── useKeyboardShortcuts ───────────────────────────────────────────────────
// Register an array of shortcuts on the window. Skips inputs unless Cmd+K.

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

    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      if (!(event.key === 'k' && (event.metaKey || event.ctrlKey))) return
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

// ─── useKeyboardNavigation ──────────────────────────────────────────────────
// Arrow-key list/grid navigation with selection support.

export interface KeyboardNavOptions {
  items: any[]
  columns?: number
  loop?: boolean
  onSelect?: (item: any, index: number) => void
  onActivate?: (item: any, index: number) => void
  enabled?: boolean
}

export function useKeyboardNavigation({
  items,
  columns = 1,
  loop = true,
  onSelect,
  onActivate,
  enabled = true,
}: KeyboardNavOptions) {
  const [focusedIndex, setFocusedIndex] = React.useState(-1)
  const containerRef = useRef<HTMLElement>(null)

  const clamp = useCallback(
    (n: number) => {
      if (items.length === 0) return -1
      if (loop) return ((n % items.length) + items.length) % items.length
      return Math.max(0, Math.min(n, items.length - 1))
    },
    [items.length, loop]
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || items.length === 0) return

      let newIndex = focusedIndex
      let handled = true

      switch (event.key) {
        case 'ArrowDown':
          newIndex = clamp(focusedIndex + columns)
          break
        case 'ArrowUp':
          newIndex = clamp(focusedIndex - columns)
          break
        case 'ArrowRight':
          if (columns > 1) newIndex = clamp(focusedIndex + 1)
          else handled = false
          break
        case 'ArrowLeft':
          if (columns > 1) newIndex = clamp(focusedIndex - 1)
          else handled = false
          break
        case 'Home':
          newIndex = 0
          break
        case 'End':
          newIndex = items.length - 1
          break
        case 'Enter':
          if (focusedIndex >= 0) onActivate?.(items[focusedIndex], focusedIndex)
          break
        case ' ':
          if (focusedIndex >= 0) onSelect?.(items[focusedIndex], focusedIndex)
          break
        default:
          handled = false
      }

      if (handled) {
        event.preventDefault()
        if (newIndex !== focusedIndex) setFocusedIndex(newIndex)
      }
    },
    [enabled, items, focusedIndex, columns, clamp, onActivate, onSelect]
  )

  useEffect(() => {
    if (!enabled) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])

  // Auto-focus the DOM element matching [data-nav-index]
  useEffect(() => {
    if (focusedIndex >= 0 && containerRef.current) {
      const el = containerRef.current.querySelector(
        `[data-nav-index="${focusedIndex}"]`
      ) as HTMLElement | null
      el?.focus()
    }
  }, [focusedIndex])

  return { focusedIndex, setFocusedIndex, containerRef }
}

// ─── formatShortcut ─────────────────────────────────────────────────────────

export function formatShortcut(shortcut: string): string {
  return shortcut
    .split('+')
    .map((part) => {
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
          return typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'
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

// ─── commonShortcuts (static definitions for reference) ─────────────────────

export const commonShortcuts = {
  search: { key: 'k', meta: true, description: 'Open search' },
  newTask: { key: 'n', meta: true, description: 'Create new task' },
  newProject: { key: 'p', meta: true, shift: true, description: 'Create new project' },
  save: { key: 's', meta: true, description: 'Save' },
  undo: { key: 'z', meta: true, description: 'Undo' },
  redo: { key: 'z', meta: true, shift: true, description: 'Redo' },
}
