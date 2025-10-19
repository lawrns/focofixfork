'use client'

import { useEffect, useRef, useState } from 'react'

// Skip to main content link for keyboard navigation
export function SkipToMainContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    >
      Saltar al contenido principal
    </a>
  )
}

// Focus trap for modals and dialogs
interface FocusTrapProps {
  children: React.ReactNode
  isActive: boolean
  onEscape?: () => void
}

export function FocusTrap({ children, isActive, onEscape }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const firstFocusableRef = useRef<HTMLElement | null>(null)
  const lastFocusableRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    if (focusableElements.length === 0) return

    firstFocusableRef.current = focusableElements[0]
    lastFocusableRef.current = focusableElements[focusableElements.length - 1]

    // Focus first element
    firstFocusableRef.current.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape()
        return
      }

      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab (backwards)
          if (document.activeElement === firstFocusableRef.current) {
            e.preventDefault()
            lastFocusableRef.current?.focus()
          }
        } else {
          // Tab (forwards)
          if (document.activeElement === lastFocusableRef.current) {
            e.preventDefault()
            firstFocusableRef.current?.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isActive, onEscape])

  return (
    <div ref={containerRef} className="focus-trap">
      {children}
    </div>
  )
}

// Screen reader only text
interface SrOnlyProps {
  children: React.ReactNode
}

export function SrOnly({ children }: SrOnlyProps) {
  return (
    <span className="sr-only">
      {children}
    </span>
  )
}

// Announce changes to screen readers
export function useScreenReaderAnnouncement() {
  const announceRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!announceRef.current) {
      announceRef.current = document.createElement('div')
      announceRef.current.setAttribute('aria-live', 'polite')
      announceRef.current.setAttribute('aria-atomic', 'true')
      announceRef.current.className = 'sr-only'
      document.body.appendChild(announceRef.current)
    }

    return () => {
      if (announceRef.current) {
        document.body.removeChild(announceRef.current)
      }
    }
  }, [])

  const announce = (message: string) => {
    if (announceRef.current) {
      announceRef.current.textContent = message
    }
  }

  return announce
}

// High contrast mode detection
export function useHighContrastMode() {
  const [isHighContrast, setIsHighContrast] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    setIsHighContrast(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return isHighContrast
}

// Reduced motion detection
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReducedMotion
}

// Keyboard navigation hook
export function useKeyboardNavigation() {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setIsKeyboardUser(true)
      }
    }

    const handleMouseDown = () => {
      setIsKeyboardUser(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [])

  return isKeyboardUser
}

// ARIA live region for dynamic content updates
interface LiveRegionProps {
  children: React.ReactNode
  politeness?: 'polite' | 'assertive'
}

export function LiveRegion({ children, politeness = 'polite' }: LiveRegionProps) {
  return (
    <div
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {children}
    </div>
  )
}

// Enhanced button with proper ARIA attributes
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  ariaLabel?: string
  ariaDescribedBy?: string
}

export function AccessibleButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  ariaLabel,
  ariaDescribedBy,
  className = '',
  ...props
}: AccessibleButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
  }
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  )
}
