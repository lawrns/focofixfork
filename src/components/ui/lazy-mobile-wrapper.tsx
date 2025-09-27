'use client'

import React, { useState, useEffect, useRef, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface LazyMobileWrapperProps {
  children: ReactNode
  fallback?: ReactNode
  rootMargin?: string
  threshold?: number
  className?: string
  priority?: boolean // Load immediately on mobile for critical content
  mobileBreakpoint?: number
}

/**
 * Lazy loading wrapper optimized for mobile devices
 * - Automatically detects mobile devices
 * - Uses Intersection Observer for efficient loading
 * - Provides loading states and animations
 * - Can prioritize loading for critical mobile content
 */
export function LazyMobileWrapper({
  children,
  fallback,
  rootMargin = '50px',
  threshold = 0.1,
  className,
  priority = false,
  mobileBreakpoint = 768
}: LazyMobileWrapperProps) {
  const [isVisible, setIsVisible] = useState(priority)
  const [isMobile, setIsMobile] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [mobileBreakpoint])

  // Set up intersection observer
  useEffect(() => {
    if (priority || isVisible) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          setHasLoaded(true)
          observer.disconnect()
        }
      },
      {
        rootMargin: isMobile ? '100px' : rootMargin, // Larger margin on mobile for earlier loading
        threshold
      }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [isVisible, priority, rootMargin, threshold, isMobile])

  // Default loading fallback
  const defaultFallback = (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )

  const loadingFallback = fallback || defaultFallback

  return (
    <div ref={elementRef} className={className}>
      <AnimatePresence mode="wait">
        {!isVisible ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {loadingFallback}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              ease: 'easeOut',
              delay: hasLoaded ? 0 : 0.1 // Small delay for non-priority loads
            }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Higher-order component for easy wrapping
export function withLazyMobile<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<LazyMobileWrapperProps, 'children'> = {}
) {
  return React.forwardRef<any, P>((props, ref) => (
    <LazyMobileWrapper {...options}>
      <Component {...props} ref={ref} />
    </LazyMobileWrapper>
  ))
}

export default LazyMobileWrapper
