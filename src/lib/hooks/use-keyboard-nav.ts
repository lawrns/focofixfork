'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

export interface KeyboardNavOptions {
  items: any[]
  columns?: number
  onSelect?: (item: any, index: number) => void
  onActivate?: (item: any, index: number) => void
  onMultiSelect?: (items: any[], indices: number[]) => void
  selectable?: boolean
  multiSelect?: boolean
}

export interface KeyboardNavState {
  focusedIndex: number
  selectedIndices: Set<number>
  isActive: boolean
}

export function useKeyboardNav({
  items,
  columns = 1,
  onSelect,
  onActivate,
  onMultiSelect,
  selectable = true,
  multiSelect = false
}: KeyboardNavOptions) {
  const [state, setState] = useState<KeyboardNavState>({
    focusedIndex: 0,
    selectedIndices: new Set(),
    isActive: false
  })

  const containerRef = useRef<HTMLElement>(null)

  const rows = Math.ceil(items.length / columns)

  const updateFocus = useCallback((newIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(newIndex, items.length - 1))
    setState(prev => ({
      ...prev,
      focusedIndex: clampedIndex
    }))
  }, [items.length])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!state.isActive) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        updateFocus(state.focusedIndex + columns)
        break
      case 'ArrowUp':
        e.preventDefault()
        updateFocus(state.focusedIndex - columns)
        break
      case 'ArrowLeft':
        e.preventDefault()
        updateFocus(state.focusedIndex - 1)
        break
      case 'ArrowRight':
        e.preventDefault()
        updateFocus(state.focusedIndex + 1)
        break
      case 'Home':
        e.preventDefault()
        updateFocus(0)
        break
      case 'End':
        e.preventDefault()
        updateFocus(items.length - 1)
        break
      case 'Enter':
        e.preventDefault()
        if (onActivate && items[state.focusedIndex]) {
          onActivate(items[state.focusedIndex], state.focusedIndex)
        }
        break
      case ' ':
        e.preventDefault()
        if (selectable && items[state.focusedIndex]) {
          if (multiSelect) {
            setState(prev => {
              const newSelected = new Set(prev.selectedIndices)
              if (newSelected.has(state.focusedIndex)) {
                newSelected.delete(state.focusedIndex)
              } else {
                newSelected.add(state.focusedIndex)
              }
              
              const selectedItems = Array.from(newSelected).map(i => items[i])
              onMultiSelect?.(selectedItems, Array.from(newSelected))
              
              return {
                ...prev,
                selectedIndices: newSelected
              }
            })
          } else {
            setState(prev => ({
              ...prev,
              selectedIndices: new Set([state.focusedIndex])
            }))
            onSelect?.(items[state.focusedIndex], state.focusedIndex)
          }
        }
        break
      case 'Escape':
        e.preventDefault()
        setState(prev => ({
          ...prev,
          isActive: false,
          selectedIndices: new Set()
        }))
        break
    }
  }, [
    state.isActive,
    state.focusedIndex,
    columns,
    items,
    onActivate,
    onSelect,
    onMultiSelect,
    selectable,
    multiSelect,
    updateFocus
  ])

  const activate = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: true
    }))
  }, [])

  const deactivate = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: false,
      selectedIndices: new Set()
    }))
  }, [])

  const setFocus = useCallback((index: number) => {
    updateFocus(index)
  }, [updateFocus])

  const clearSelection = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedIndices: new Set()
    }))
  }, [])

  const selectAll = useCallback(() => {
    if (multiSelect) {
      const allIndices = new Set(items.map((_, index) => index))
      setState(prev => ({
        ...prev,
        selectedIndices: allIndices
      }))
      onMultiSelect?.(items, Array.from(allIndices))
    }
  }, [multiSelect, items, onMultiSelect])

  // Global keyboard listener
  useEffect(() => {
    if (state.isActive) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [state.isActive, handleKeyDown])

  // Focus management
  useEffect(() => {
    if (state.isActive && containerRef.current) {
      const focusedElement = containerRef.current.querySelector(`[data-nav-index="${state.focusedIndex}"]`) as HTMLElement
      if (focusedElement) {
        focusedElement.focus()
      }
    }
  }, [state.isActive, state.focusedIndex])

  return {
    ...state,
    containerRef,
    activate,
    deactivate,
    setFocus,
    clearSelection,
    selectAll,
    rows,
    columns
  }
}
