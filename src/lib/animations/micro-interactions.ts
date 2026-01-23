'use client'

// Micro-interaction utilities for enterprise-grade UI polish

export const microInteractions = {
  // Button hover effects
  buttonHover: {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.2s ease-in-out'
  },

  // Card hover effects
  cardHover: {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    transition: 'all 0.2s ease-in-out'
  },

  // Success animation
  success: {
    keyframes: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(1.1)', opacity: 0.8 },
      { transform: 'scale(1)', opacity: 1 }
    ],
    duration: '0.3s',
    easing: 'ease-in-out'
  },

  // Loading shimmer
  shimmer: {
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite'
  },

  // Form validation shake
  shake: {
    keyframes: [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(0)' }
    ],
    duration: '0.5s',
    easing: 'ease-in-out'
  },

  // Drag and drop ghost
  dragGhost: {
    opacity: 0.5,
    transform: 'rotate(5deg)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.2s ease-in-out'
  },

  // Drop zone highlight
  dropZone: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.5)',
    borderStyle: 'dashed',
    transition: 'all 0.2s ease-in-out'
  },

  // Focus ring
  focusRing: {
    outline: '2px solid rgba(59, 130, 246, 0.5)',
    outlineOffset: '2px',
    transition: 'all 0.2s ease-in-out'
  },

  // Smooth transitions for all interactive elements
  smoothTransition: 'transition-all duration-200 ease-in-out',

  // Staggered animation delays
  staggerDelay: (index: number) => `${index * 50}ms`,

  // Fade in animation
  fadeIn: {
    keyframes: [
      { opacity: 0, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ],
    duration: '0.3s',
    easing: 'ease-out'
  },

  // Slide in from left
  slideInLeft: {
    keyframes: [
      { opacity: 0, transform: 'translateX(-20px)' },
      { opacity: 1, transform: 'translateX(0)' }
    ],
    duration: '0.3s',
    easing: 'ease-out'
  },

  // Slide in from right
  slideInRight: {
    keyframes: [
      { opacity: 0, transform: 'translateX(20px)' },
      { opacity: 1, transform: 'translateX(0)' }
    ],
    duration: '0.3s',
    easing: 'ease-out'
  },

  // Scale in animation
  scaleIn: {
    keyframes: [
      { opacity: 0, transform: 'scale(0.9)' },
      { opacity: 1, transform: 'scale(1)' }
    ],
    duration: '0.2s',
    easing: 'ease-out'
  }
}

// CSS classes for micro-interactions
export const microInteractionClasses = {
  buttonHover: 'hover:transform hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200 ease-in-out',
  cardHover: 'hover:transform hover:-translate-y-1 hover:shadow-xl hover:border-blue-300 transition-all duration-200 ease-in-out',
  smoothTransition: 'transition-all duration-200 ease-in-out',
  focusRing: 'focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2',
  fadeIn: 'animate-fade-in',
  slideInLeft: 'animate-slide-in-left',
  slideInRight: 'animate-slide-in-right',
  scaleIn: 'animate-scale-in'
}

// Utility function to apply micro-interactions
export function applyMicroInteraction(element: HTMLElement, interaction: keyof typeof microInteractions) {
  const config = microInteractions[interaction]
  
  if (typeof config === 'string') {
    element.style.transition = config
  } else if ('keyframes' in config) {
    // Apply keyframe animation
    element.style.animation = `${interaction} ${config.duration} ${config.easing}`
  } else {
    // Apply CSS properties
    Object.assign(element.style, config)
  }
}

// Hook for micro-interactions in React components
export function useMicroInteraction(interaction: keyof typeof microInteractions) {
  return (microInteractionClasses as Record<string, string>)[interaction] || microInteractions.smoothTransition
}
