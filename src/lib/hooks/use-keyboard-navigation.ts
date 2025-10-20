'use client'

import { useEffect, useCallback, useRef } from 'react'

export interface KeyboardNavigationOptions {
  onEnter?: () => void
  onEscape?: () => void
  onArrowUp?: () => void
  onArrowDown?: () => void
  onArrowLeft?: () => void
  onArrowRight?: () => void
  onTab?: () => void
  onShiftTab?: () => void
  preventDefault?: boolean
  stopPropagation?: boolean
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions = {}) {
  const {
    onEnter,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    onShiftTab,
    preventDefault = true,
    stopPropagation = false
  } = options

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (stopPropagation) {
      event.stopPropagation()
    }

    switch (event.key) {
      case 'Enter':
        if (onEnter) {
          if (preventDefault) event.preventDefault()
          onEnter()
        }
        break
      case 'Escape':
        if (onEscape) {
          if (preventDefault) event.preventDefault()
          onEscape()
        }
        break
      case 'ArrowUp':
        if (onArrowUp) {
          if (preventDefault) event.preventDefault()
          onArrowUp()
        }
        break
      case 'ArrowDown':
        if (onArrowDown) {
          if (preventDefault) event.preventDefault()
          onArrowDown()
        }
        break
      case 'ArrowLeft':
        if (onArrowLeft) {
          if (preventDefault) event.preventDefault()
          onArrowLeft()
        }
        break
      case 'ArrowRight':
        if (onArrowRight) {
          if (preventDefault) event.preventDefault()
          onArrowRight()
        }
        break
      case 'Tab':
        if (event.shiftKey && onShiftTab) {
          if (preventDefault) event.preventDefault()
          onShiftTab()
        } else if (onTab) {
          if (preventDefault) event.preventDefault()
          onTab()
        }
        break
    }
  }, [
    onEnter,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    onShiftTab,
    preventDefault,
    stopPropagation
  ])

  return { handleKeyDown }
}

export function useFocusManagement() {
  const focusableElementsRef = useRef<HTMLElement[]>([])
  const currentIndexRef = useRef(0)

  const updateFocusableElements = useCallback((container: HTMLElement) => {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')

    focusableElementsRef.current = Array.from(
      container.querySelectorAll(focusableSelectors)
    ) as HTMLElement[]
  }, [])

  const focusNext = useCallback(() => {
    const elements = focusableElementsRef.current
    if (elements.length === 0) return

    currentIndexRef.current = (currentIndexRef.current + 1) % elements.length
    elements[currentIndexRef.current]?.focus()
  }, [])

  const focusPrevious = useCallback(() => {
    const elements = focusableElementsRef.current
    if (elements.length === 0) return

    currentIndexRef.current = 
      currentIndexRef.current === 0 
        ? elements.length - 1 
        : currentIndexRef.current - 1
    elements[currentIndexRef.current]?.focus()
  }, [])

  const focusFirst = useCallback(() => {
    const elements = focusableElementsRef.current
    if (elements.length === 0) return

    currentIndexRef.current = 0
    elements[0]?.focus()
  }, [])

  const focusLast = useCallback(() => {
    const elements = focusableElementsRef.current
    if (elements.length === 0) return

    currentIndexRef.current = elements.length - 1
    elements[elements.length - 1]?.focus()
  }, [])

  return {
    updateFocusableElements,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast
  }
}

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      const modifiers = []
      
      if (event.ctrlKey) modifiers.push('ctrl')
      if (event.metaKey) modifiers.push('meta')
      if (event.altKey) modifiers.push('alt')
      if (event.shiftKey) modifiers.push('shift')

      const shortcutKey = modifiers.length > 0 
        ? `${modifiers.join('+')}+${key}`
        : key

      const handler = shortcuts[shortcutKey]
      if (handler) {
        event.preventDefault()
        handler()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
