import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useKeyboardShortcuts } from '../use-keyboard-shortcuts'

describe('useKeyboardShortcuts', () => {
  it('should register keyboard shortcuts', () => {
    const mockAction = vi.fn()
    const shortcuts = [
      {
        key: 'k',
        meta: true,
        description: 'Search',
        action: mockAction,
      },
    ]

    renderHook(() => useKeyboardShortcuts({ shortcuts }))

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
    })
    window.dispatchEvent(event)

    expect(mockAction).toHaveBeenCalled()
  })

  it('should not trigger when disabled', () => {
    const mockAction = vi.fn()
    const shortcuts = [
      {
        key: 'k',
        meta: true,
        description: 'Search',
        action: mockAction,
      },
    ]

    renderHook(() => useKeyboardShortcuts({ shortcuts, enabled: false }))

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
    })
    window.dispatchEvent(event)

    expect(mockAction).not.toHaveBeenCalled()
  })
})
