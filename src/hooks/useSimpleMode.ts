/**
 * useSimpleMode Hook
 *
 * Manages user preference for Simple Mode vs Advanced Mode
 * Stores preference in localStorage for quick access
 *
 * Simple Mode:
 * - 6 essential tools only
 * - AI-powered Smart Inbox
 * - Contextual insights instead of analytics
 * - Minimal UI, no customization
 *
 * Advanced Mode:
 * - All features (Gantt, table view, custom fields, etc.)
 * - Traditional dashboard with analytics
 * - Full customization options
 *
 * Part of Foco's Phase 2: Simplified Mode Implementation
 */

'use client'

import { useState, useEffect } from 'react'

const SIMPLE_MODE_KEY = 'foco_simple_mode_preference'
const DEFAULT_MODE = true // Simple Mode is default for new users

export interface SimpleModePreference {
  isSimpleMode: boolean
  toggleMode: () => void
  setSimpleMode: (enabled: boolean) => void
  lastChanged?: Date
}

export function useSimpleMode(): SimpleModePreference {
  const [isSimpleMode, setIsSimpleModeState] = useState<boolean>(DEFAULT_MODE)
  const [isInitialized, setIsInitialized] = useState(false)

  // Load preference from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIMPLE_MODE_KEY)
      if (stored !== null) {
        const parsed = JSON.parse(stored)
        setIsSimpleModeState(parsed.enabled)
      }
    } catch (error) {
      console.warn('Failed to load Simple Mode preference:', error)
      // Use default if loading fails
      setIsSimpleModeState(DEFAULT_MODE)
    } finally {
      setIsInitialized(true)
    }
  }, [])

  // Save preference to localStorage whenever it changes
  const setSimpleMode = (enabled: boolean) => {
    try {
      const preference = {
        enabled,
        lastChanged: new Date().toISOString(),
      }
      localStorage.setItem(SIMPLE_MODE_KEY, JSON.stringify(preference))
      setIsSimpleModeState(enabled)

      // Track mode change (for analytics if needed)
      if (typeof window !== 'undefined' && (window as any).gtag) {
        ;(window as any).gtag('event', 'mode_change', {
          mode: enabled ? 'simple' : 'advanced',
        })
      }
    } catch (error) {
      console.error('Failed to save Simple Mode preference:', error)
    }
  }

  const toggleMode = () => {
    setSimpleMode(!isSimpleMode)
  }

  return {
    isSimpleMode: isInitialized ? isSimpleMode : DEFAULT_MODE,
    toggleMode,
    setSimpleMode,
  }
}

/**
 * Get current mode preference without hook (for server components)
 */
export function getSimpleModePreference(): boolean {
  if (typeof window === 'undefined') {
    return DEFAULT_MODE
  }

  try {
    const stored = localStorage.getItem(SIMPLE_MODE_KEY)
    if (stored !== null) {
      const parsed = JSON.parse(stored)
      return parsed.enabled
    }
  } catch (error) {
    console.warn('Failed to read Simple Mode preference:', error)
  }

  return DEFAULT_MODE
}
