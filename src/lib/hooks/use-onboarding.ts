'use client'

import { useState, useEffect } from 'react'

interface OnboardingState {
  tourCompleted: boolean
  setupCompleted: boolean
  onboardingDismissed: boolean
  tourCompletedAt?: string
  setupCompletedAt?: string
}

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>({
    tourCompleted: false,
    setupCompleted: false,
    onboardingDismissed: false
  })

  useEffect(() => {
    // Load onboarding state from localStorage
    const savedState = localStorage.getItem('foco-onboarding-state')
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        setState(parsed)
      } catch (error) {
        console.error('Failed to parse onboarding state:', error)
      }
    }
  }, [])

  const updateState = (updates: Partial<OnboardingState>) => {
    const newState = { ...state, ...updates }
    setState(newState)
    localStorage.setItem('foco-onboarding-state', JSON.stringify(newState))
  }

  const hasCompletedTour = () => {
    return state.tourCompleted
  }

  const hasCompletedSetup = () => {
    return state.setupCompleted
  }

  const markTourComplete = () => {
    updateState({
      tourCompleted: true,
      tourCompletedAt: new Date().toISOString()
    })
  }

  const markSetupComplete = () => {
    updateState({
      setupCompleted: true,
      setupCompletedAt: new Date().toISOString()
    })
  }

  const dismissOnboarding = () => {
    updateState({
      onboardingDismissed: true
    })
  }

  const resetOnboarding = () => {
    const resetState: OnboardingState = {
      tourCompleted: false,
      setupCompleted: false,
      onboardingDismissed: false
    }
    setState(resetState)
    localStorage.removeItem('foco-onboarding-state')
  }

  const shouldShowTour = () => {
    return !state.tourCompleted && !state.onboardingDismissed
  }

  const shouldShowSetup = () => {
    return !state.setupCompleted && !state.onboardingDismissed
  }

  const isOnboardingComplete = () => {
    return state.tourCompleted && state.setupCompleted
  }

  const getOnboardingProgress = () => {
    let completed = 0
    let total = 2

    if (state.tourCompleted) completed++
    if (state.setupCompleted) completed++

    return {
      completed,
      total,
      percentage: (completed / total) * 100
    }
  }

  return {
    state,
    hasCompletedTour,
    hasCompletedSetup,
    markTourComplete,
    markSetupComplete,
    dismissOnboarding,
    resetOnboarding,
    shouldShowTour,
    shouldShowSetup,
    isOnboardingComplete,
    getOnboardingProgress
  }
}
