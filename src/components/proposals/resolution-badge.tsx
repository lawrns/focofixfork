'use client'

import { memo, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResolutionBadgeProps {
  isResolved: boolean
  resolvedAt?: string
  resolvedBy?: string
  animate?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Particle configuration for confetti burst
const PARTICLE_COUNT = 12
const PARTICLE_COLORS = [
  'bg-emerald-400',
  'bg-green-400',
  'bg-teal-400',
  'bg-cyan-400',
  'bg-lime-400',
]

/**
 * Animated resolution indicator with confetti-style micro-burst effect
 */
function ResolutionBadgeComponent({
  isResolved,
  resolvedAt,
  resolvedBy,
  animate = true,
  size = 'md',
  className,
}: ResolutionBadgeProps) {
  const [showConfetti, setShowConfetti] = useState(false)
  const [wasResolved, setWasResolved] = useState(isResolved)

  // Trigger confetti when transitioning to resolved state
  useEffect(() => {
    if (isResolved && !wasResolved && animate) {
      setShowConfetti(true)
      const timer = setTimeout(() => setShowConfetti(false), 1000)
      return () => clearTimeout(timer)
    }
    setWasResolved(isResolved)
  }, [isResolved, wasResolved, animate])

  // Generate random particle properties
  const generateParticles = () => {
    return Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (i / PARTICLE_COUNT) * 360
      const distance = 20 + Math.random() * 15
      const x = Math.cos((angle * Math.PI) / 180) * distance
      const y = Math.sin((angle * Math.PI) / 180) * distance
      const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)]
      const size = 3 + Math.random() * 3
      const delay = Math.random() * 0.1

      return { x, y, color, size, delay, id: i }
    })
  }

  const particles = generateParticles()

  const sizeConfig = {
    sm: {
      badge: 'text-xs py-0.5 px-2',
      icon: 'h-3 w-3',
      gap: 'gap-1',
    },
    md: {
      badge: 'text-xs py-1 px-2.5',
      icon: 'h-3.5 w-3.5',
      gap: 'gap-1.5',
    },
    lg: {
      badge: 'text-sm py-1.5 px-3',
      icon: 'h-4 w-4',
      gap: 'gap-2',
    },
  }

  const config = sizeConfig[size]

  // Format resolved time
  const formatResolvedTime = (dateString?: string): string => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
  }

  return (
    <AnimatePresence>
      {isResolved && (
        <motion.div
          initial={animate ? { scale: 0, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 20,
          }}
          className={cn('relative inline-flex', className)}
        >
          {/* Confetti Particles */}
          <AnimatePresence>
            {showConfetti && (
              <div className="absolute inset-0 pointer-events-none">
                {particles.map((particle) => (
                  <motion.div
                    key={particle.id}
                    initial={{
                      scale: 0,
                      x: 0,
                      y: 0,
                      opacity: 1,
                    }}
                    animate={{
                      scale: [0, 1, 1, 0],
                      x: particle.x,
                      y: particle.y,
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                      duration: 0.6,
                      delay: particle.delay,
                      ease: 'easeOut',
                    }}
                    className={cn(
                      'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full',
                      particle.color
                    )}
                    style={{
                      width: particle.size,
                      height: particle.size,
                    }}
                  />
                ))}
              </div>
            )}
          </AnimatePresence>

          {/* Badge */}
          <Badge
            variant="outline"
            className={cn(
              'relative inline-flex items-center font-medium border transition-all duration-200',
              'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
              'border-emerald-200 dark:border-emerald-800',
              config.badge,
              config.gap
            )}
          >
            {/* Sparkle effect on initial animation */}
            {showConfetti && (
              <motion.span
                initial={{ rotate: 0, scale: 0 }}
                animate={{ rotate: 360, scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute -right-1 -top-1"
              >
                <Sparkles className="h-3 w-3 text-yellow-500" />
              </motion.span>
            )}

            <motion.span
              initial={animate ? { rotate: -180 } : false}
              animate={{ rotate: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <CheckCircle2 className={cn(config.icon, 'flex-shrink-0')} />
            </motion.span>

            <span>Resolved</span>

            {/* Resolved timestamp on hover */}
            {resolvedAt && (
              <motion.span
                initial={{ width: 0, opacity: 0 }}
                whileHover={{ width: 'auto', opacity: 1 }}
                className="overflow-hidden text-emerald-600 dark:text-emerald-400"
              >
                <span className="ml-1 text-xs whitespace-nowrap">
                  {formatResolvedTime(resolvedAt)}
                </span>
              </motion.span>
            )}
          </Badge>

          {/* Glow effect */}
          {showConfetti && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 0.5, 0], scale: [0.8, 1.5, 1.8] }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 bg-emerald-400/20 rounded-full blur-md -z-10"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export const ResolutionBadge = memo(ResolutionBadgeComponent)

/**
 * Compact resolution indicator for inline use
 */
export function ResolutionIndicator({
  isResolved,
  className,
}: {
  isResolved: boolean
  className?: string
}) {
  return (
    <AnimatePresence>
      {isResolved && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className={cn(
            'inline-flex items-center justify-center w-5 h-5 rounded-full',
            'bg-emerald-100 dark:bg-emerald-900/50',
            className
          )}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
