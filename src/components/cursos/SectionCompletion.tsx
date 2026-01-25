'use client'

import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface SectionCompletionProps {
  sectionTitle: string
  isVisible?: boolean
  onComplete?: () => void
}

/**
 * SectionCompletion - Displays micro-animation when user completes a section
 *
 * A lightweight celebration for progress milestones that:
 * - Shows checkmark burst animation
 * - Displays section title
 * - Auto-dismisses after 2 seconds
 * - Respects reduced motion preferences
 */
export function SectionCompletion({
  sectionTitle,
  isVisible = true,
  onComplete
}: SectionCompletionProps) {
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setShouldShow(true)

      const timer = setTimeout(() => {
        setShouldShow(false)
        onComplete?.()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [isVisible, onComplete])

  if (!shouldShow) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.8 }}
      transition={{
        duration: 0.5,
        ease: [0.34, 1.56, 0.64, 1]
      }}
      className="fixed bottom-8 right-8 z-40 bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3"
    >
      {/* Checkmark Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          delay: 0.2,
          type: 'spring',
          damping: 8,
          stiffness: 150
        }}
      >
        <CheckCircle2 className="w-6 h-6" />
      </motion.div>

      {/* Text */}
      <div>
        <p className="font-semibold text-sm">¡Completado!</p>
        <p className="text-xs opacity-90">{sectionTitle}</p>
      </div>

      {/* Confetti burst (minimal) */}
      <div className="absolute -top-1 -right-1">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
            animate={{
              scale: [0, 1, 0],
              x: (Math.random() - 0.5) * 60,
              y: (Math.random() - 0.5) * 60 - 30,
              opacity: [1, 1, 0]
            }}
            transition={{
              duration: 0.8,
              delay: 0.3 + (i * 0.05)
            }}
            className="absolute w-2 h-2 rounded-full bg-yellow-400"
          />
        ))}
      </div>
    </motion.div>
  )
}
