'use client'

import { forwardRef, type ReactNode } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

const GLOW_COLORS = {
  teal: 'hover:shadow-[0_0_32px_rgba(0,212,170,0.12)]',
  amber: 'hover:shadow-[0_0_32px_rgba(245,158,11,0.12)]',
  crimson: 'hover:shadow-[0_0_32px_rgba(239,68,68,0.12)]',
  emerald: 'hover:shadow-[0_0_32px_rgba(16,185,129,0.12)]',
  none: '',
} as const

export type GlowColor = keyof typeof GLOW_COLORS

export interface GlassCardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  children: ReactNode
  glowColor?: GlowColor
  delay?: number
  hover?: boolean
  className?: string
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  function GlassCard({ children, glowColor = 'teal', delay = 0, hover = true, className, ...rest }, ref) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay, ease: [0.16, 1, 0.3, 1] }}
        whileHover={hover ? { y: -3, scale: 1.008 } : undefined}
        className={cn(
          'rounded-2xl border border-zinc-800/60 bg-[#0e0f11]',
          'glass transition-shadow duration-300',
          GLOW_COLORS[glowColor],
          className,
        )}
        {...rest}
      >
        {children}
      </motion.div>
    )
  },
)
