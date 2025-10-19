'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export interface TransitionConfig {
  duration: number
  easing: string
  delay?: number
}

export const TRANSITION_PRESETS = {
  fade: {
    duration: 200,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  },
  slide: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  },
  scale: {
    duration: 250,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  },
  slideUp: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  },
  slideDown: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
  }
}

export function usePageTransition(config: TransitionConfig = TRANSITION_PRESETS.fade) {
  const pathname = usePathname()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [displayPathname, setDisplayPathname] = useState(pathname)

  useEffect(() => {
    if (pathname !== displayPathname) {
      setIsTransitioning(true)
      
      const timer = setTimeout(() => {
        setDisplayPathname(pathname)
        setIsTransitioning(false)
      }, config.duration)

      return () => clearTimeout(timer)
    }
  }, [pathname, displayPathname, config.duration])

  return {
    isTransitioning,
    displayPathname,
    transitionStyle: {
      transition: `opacity ${config.duration}ms ${config.easing}`,
      opacity: isTransitioning ? 0 : 1
    }
  }
}

export function useRouteTransition() {
  const pathname = usePathname()
  const [previousPathname, setPreviousPathname] = useState<string | null>(null)
  const [direction, setDirection] = useState<'forward' | 'backward' | null>(null)

  useEffect(() => {
    if (previousPathname && previousPathname !== pathname) {
      // Determine direction based on route hierarchy
      const currentDepth = pathname.split('/').length
      const previousDepth = previousPathname.split('/').length
      
      if (currentDepth > previousDepth) {
        setDirection('forward')
      } else if (currentDepth < previousDepth) {
        setDirection('backward')
      } else {
        setDirection('forward') // Default to forward
      }
    }
    
    setPreviousPathname(pathname)
  }, [pathname, previousPathname])

  return {
    direction,
    isTransitioning: direction !== null,
    transitionClass: direction === 'forward' ? 'slide-in-right' : 'slide-in-left'
  }
}

export function useModalTransition(isOpen: boolean) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setIsAnimating(true)
      
      // Trigger enter animation
      const timer = setTimeout(() => {
        setIsAnimating(false)
      }, 50) // Small delay to ensure DOM is ready

      return () => clearTimeout(timer)
    } else {
      setIsAnimating(true)
      
      // Wait for exit animation to complete
      const timer = setTimeout(() => {
        setIsVisible(false)
        setIsAnimating(false)
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [isOpen])

  return {
    isVisible,
    isAnimating,
    modalStyle: {
      transform: isAnimating ? 'translateX(100%)' : 'translateX(0)',
      transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)'
    },
    backdropStyle: {
      opacity: isVisible ? 1 : 0,
      transition: 'opacity 200ms ease-in-out'
    }
  }
}

export function useStaggeredAnimation(
  items: any[],
  delay: number = 50
) {
  const [visibleItems, setVisibleItems] = useState<number[]>([])

  useEffect(() => {
    const timers: NodeJS.Timeout[] = []
    
    items.forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisibleItems(prev => [...prev, index])
      }, index * delay)
      
      timers.push(timer)
    })

    return () => {
      timers.forEach(timer => clearTimeout(timer))
    }
  }, [items, delay])

  const getItemStyle = (index: number) => ({
    opacity: visibleItems.includes(index) ? 1 : 0,
    transform: visibleItems.includes(index) ? 'translateY(0)' : 'translateY(20px)',
    transition: 'opacity 300ms ease-out, transform 300ms ease-out'
  })

  return { getItemStyle }
}

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

export function getTransitionStyle(
  type: 'fade' | 'slide' | 'scale' | 'slideUp' | 'slideDown',
  isEntering: boolean,
  reducedMotion: boolean = false
): React.CSSProperties {
  if (reducedMotion) {
    return {
      transition: 'none'
    }
  }

  const config = TRANSITION_PRESETS[type]
  
  switch (type) {
    case 'fade':
      return {
        opacity: isEntering ? 1 : 0,
        transition: `opacity ${config.duration}ms ${config.easing}`
      }
    
    case 'slide':
      return {
        transform: isEntering ? 'translateX(0)' : 'translateX(100%)',
        transition: `transform ${config.duration}ms ${config.easing}`
      }
    
    case 'scale':
      return {
        transform: isEntering ? 'scale(1)' : 'scale(0.95)',
        opacity: isEntering ? 1 : 0,
        transition: `transform ${config.duration}ms ${config.easing}, opacity ${config.duration}ms ${config.easing}`
      }
    
    case 'slideUp':
      return {
        transform: isEntering ? 'translateY(0)' : 'translateY(20px)',
        opacity: isEntering ? 1 : 0,
        transition: `transform ${config.duration}ms ${config.easing}, opacity ${config.duration}ms ${config.easing}`
      }
    
    case 'slideDown':
      return {
        transform: isEntering ? 'translateY(0)' : 'translateY(-20px)',
        opacity: isEntering ? 1 : 0,
        transition: `transform ${config.duration}ms ${config.easing}, opacity ${config.duration}ms ${config.easing}`
      }
    
    default:
      return {}
  }
}

export function createTransitionComponent(
  Component: React.ComponentType<any>,
  transitionType: 'fade' | 'slide' | 'scale' | 'slideUp' | 'slideDown' = 'fade'
) {
  return function TransitionWrapper(props: any) {
    const [isVisible, setIsVisible] = useState(false)
    const reducedMotion = useReducedMotion()

    useEffect(() => {
      setIsVisible(true)
    }, [])

    const transitionStyle = getTransitionStyle(transitionType, isVisible, reducedMotion)

    return (
      <div style={transitionStyle}>
        <Component {...props} />
      </div>
    )
  }
}

// CSS classes for transitions
export const transitionClasses = {
  fadeIn: 'animate-fade-in',
  slideInLeft: 'animate-slide-in-left',
  slideInRight: 'animate-slide-in-right',
  slideUp: 'animate-slide-up',
  scaleIn: 'animate-scale-in'
}

// Utility function to add transition classes
export function addTransitionClass(
  element: HTMLElement,
  className: string,
  duration: number = 300
): void {
  element.classList.add(className)
  
  setTimeout(() => {
    element.classList.remove(className)
  }, duration)
}
