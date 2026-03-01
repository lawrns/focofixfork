'use client'

import { ReactNode, forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const cardVariants = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.98 },
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
}

interface UnifiedCardProps {
  children: ReactNode
  className?: string
  animate?: boolean
  hover?: boolean
  onClick?: () => void
}

export const UnifiedCard = forwardRef<HTMLDivElement, UnifiedCardProps>(
  ({ children, className, animate = true, hover = false, onClick }, ref) => {
    const baseClasses = cn(
      'rounded-lg border border-border bg-card p-4',
      hover && 'transition-all duration-200 hover:border-primary/30 hover:shadow-md cursor-pointer',
      onClick && 'cursor-pointer',
      className
    )

    if (!animate) {
      return (
        <div ref={ref} className={baseClasses} onClick={onClick}>
          {children}
        </div>
      )
    }

    return (
      <motion.div
        ref={ref}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        whileHover={hover ? { y: -2 } : undefined}
        className={baseClasses}
        onClick={onClick}
      >
        {children}
      </motion.div>
    )
  }
)

UnifiedCard.displayName = 'UnifiedCard'

interface UnifiedCardListProps {
  children: ReactNode
  className?: string
}

export function UnifiedCardList({ children, className }: UnifiedCardListProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn('space-y-3', className)}
    >
      {children}
    </motion.div>
  )
}
