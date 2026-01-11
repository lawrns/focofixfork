'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TourStep {
  id: string
  title: string
  description: string
  target: string // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  action?: {
    label: string
    onClick: () => void
  }
}

interface ProductTourProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  steps: TourStep[]
  currentStep?: number
}

export function ProductTour({ 
  isOpen, 
  onClose, 
  onComplete, 
  steps, 
  currentStep = 0 
}: ProductTourProps) {
  const [activeStep, setActiveStep] = useState(currentStep)
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  const currentStepData = steps[activeStep]

  // Find and highlight target element
  useEffect(() => {
    if (!isOpen || !currentStepData) return

    const element = document.querySelector(currentStepData.target) as HTMLElement
    if (element) {
      setTargetElement(element)
      setSpotlightRect(element.getBoundingClientRect())
    } else {
      setTargetElement(null)
      setSpotlightRect(null)
    }
  }, [isOpen, activeStep, currentStepData])

  // Update spotlight position on scroll/resize
  useEffect(() => {
    if (!targetElement) return

    const updatePosition = () => {
      const rect = targetElement.getBoundingClientRect()
      setSpotlightRect(rect)
    }

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [targetElement])

  // Handle escape key to close tour
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1)
    } else {
      onComplete()
    }
  }

  const handlePrevious = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1)
    }
  }

  const handleSkip = () => {
    onClose()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Only close if clicking directly on the backdrop, not on child elements
    if (e.target === e.currentTarget) {
      handleSkip()
    }
  }

  if (!isOpen || typeof window === 'undefined') {
    return null
  }

  const progress = ((activeStep + 1) / steps.length) * 100

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm z-30"
        onClick={handleOverlayClick}
      />

      {/* Spotlight */}
      {spotlightRect && (
        <div
          className="absolute border-2 border-blue-500 rounded-lg shadow-lg pointer-events-none transition-all duration-300 z-40"
          style={{
            left: spotlightRect.left - 8,
            top: spotlightRect.top - 8,
            width: spotlightRect.width + 16,
            height: spotlightRect.height + 16,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
          }}
        />
      )}

      {/* Tour Card */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none z-50">
        <div className="relative pointer-events-auto bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <Play className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Product Tour</h3>
                <p className="text-sm text-gray-500">
                  Step {activeStep + 1} of {steps.length}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="p-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Content */}
          {currentStepData && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">
                {currentStepData.title}
              </h4>
              <p className="text-gray-600 leading-relaxed">
                {currentStepData.description}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {activeStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSkip}
              >
                Skip Tour
              </Button>
              <Button
                size="sm"
                onClick={handleNext}
              >
                {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
                {activeStep < steps.length - 1 && (
                  <ChevronRight className="w-4 h-4 ml-1" />
                )}
              </Button>
            </div>
          </div>

          {/* Step Action */}
          {currentStepData?.action && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                size="sm"
                onClick={currentStepData.action.onClick}
                className="w-full"
              >
                {currentStepData.action.label}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

// Hook for managing tour state
export function useProductTour() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasCompleted, setHasCompleted] = useState(false)

  useEffect(() => {
    // Check if user has completed tour
    const completed = localStorage.getItem('foco-tour-completed')
    setHasCompleted(completed === 'true')
  }, [])

  const startTour = () => {
    setIsOpen(true)
  }

  const closeTour = () => {
    setIsOpen(false)
  }

  const completeTour = () => {
    setIsOpen(false)
    setHasCompleted(true)
    localStorage.setItem('foco-tour-completed', 'true')
  }

  const resetTour = () => {
    setHasCompleted(false)
    localStorage.removeItem('foco-tour-completed')
  }

  return {
    isOpen,
    hasCompleted,
    startTour,
    closeTour,
    completeTour,
    resetTour
  }
}

// Default tour steps
export const defaultTourSteps: TourStep[] = [
  {
    id: 'dashboard-overview',
    title: 'Welcome to Foco!',
    description: 'This is your dashboard where you can see all your projects at a glance. Let\'s explore the key features.',
    target: '[data-tour="dashboard-header"]',
    position: 'bottom'
  },
  {
    id: 'create-project',
    title: 'Create Your First Project',
    description: 'Click here to create a new project. You can also use AI to generate a complete project structure.',
    target: '[data-tour="create-project-button"]',
    position: 'bottom',
    action: {
      label: 'Try Creating a Project',
      onClick: () => {
        // Trigger project creation modal
        console.log('Opening project creation modal')
      }
    }
  },
  {
    id: 'project-views',
    title: 'Multiple View Options',
    description: 'Switch between different views: Table for detailed lists, Kanban for visual workflow, and Gantt for timeline planning.',
    target: '[data-tour="view-tabs"]',
    position: 'bottom'
  },
  {
    id: 'ai-features',
    title: 'AI-Powered Features',
    description: 'Use AI to automatically break down projects into tasks, suggest timelines, and optimize your workflow.',
    target: '[data-tour="ai-button"]',
    position: 'bottom'
  },
  {
    id: 'team-collaboration',
    title: 'Team Collaboration',
    description: 'Invite team members, assign tasks, and collaborate in real-time. Everyone stays in sync with project updates.',
    target: '[data-tour="team-section"]',
    position: 'bottom'
  },
  {
    id: 'filters-and-search',
    title: 'Smart Filtering',
    description: 'Use filters and search to quickly find projects. Save custom views for easy access to your most important work.',
    target: '[data-tour="filters"]',
    position: 'bottom'
  },
  {
    id: 'mobile-app',
    title: 'Mobile Experience',
    description: 'Foco works great on mobile! Install the app for offline access and push notifications.',
    target: '[data-tour="mobile-hint"]',
    position: 'bottom'
  },
  {
    id: 'settings',
    title: 'Customize Your Experience',
    description: 'Access settings to customize notifications, themes, and preferences. Make Foco work exactly how you want.',
    target: '[data-tour="settings"]',
    position: 'bottom'
  }
]
