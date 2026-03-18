'use client'

import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface HeroSectionProps {
  metric?: string | number
  metricLabel?: string
  title: string
  subtitle?: string
  badge?: ReactNode
  actions?: ReactNode
  className?: string
}

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
}
const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}
const metricPop = {
  initial: { opacity: 0, scale: 0.85 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 200, damping: 20, mass: 1.2 },
  },
}

export function HeroSection({
  metric,
  metricLabel,
  title,
  subtitle,
  badge,
  actions,
  className,
}: HeroSectionProps) {
  return (
    <motion.div
      variants={stagger}
      initial="initial"
      animate="animate"
      className={cn(
        'signal-field relative rounded-2xl border border-zinc-800/60 p-5',
        'bg-[radial-gradient(circle_at_top_left,rgba(var(--foco-teal-rgb),0.14),transparent_36%),linear-gradient(180deg,#111214,#0c0d0f)]',
        className,
      )}
    >
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {metric != null && (
            <motion.div variants={metricPop} className="flex items-baseline gap-3">
              <span className="text-4xl font-bold tracking-tight text-zinc-50">
                {metric}
              </span>
              {metricLabel && (
                <span className="text-sm font-medium text-zinc-400">{metricLabel}</span>
              )}
            </motion.div>
          )}
          <motion.h1
            variants={fadeUp}
            className={cn(
              'text-xl font-semibold text-zinc-50',
              metric != null && 'mt-2',
            )}
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p variants={fadeUp} className="mt-1.5 max-w-2xl text-sm text-zinc-400">
              {subtitle}
            </motion.p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {badge}
          {actions}
        </div>
      </div>
    </motion.div>
  )
}
