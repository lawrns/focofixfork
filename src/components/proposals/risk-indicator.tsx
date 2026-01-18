'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, ShieldCheck, Shield, ShieldX } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical'

interface RiskIndicatorProps {
  /** Risk score from 0-100 */
  score: number
  /** Optional label to display */
  label?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Show score number */
  showScore?: boolean
  /** Show risk level label */
  showLevel?: boolean
  /** Enable animations */
  animate?: boolean
  /** Additional class names */
  className?: string
}

const getRiskLevel = (score: number): RiskLevel => {
  if (score <= 25) return 'low'
  if (score <= 50) return 'moderate'
  if (score <= 75) return 'high'
  return 'critical'
}

const riskConfig: Record<RiskLevel, {
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  ringColor: string
  label: string
}> = {
  low: {
    icon: ShieldCheck,
    color: 'text-success',
    bgColor: 'bg-success/10',
    ringColor: 'ring-success/30',
    label: 'Low Risk',
  },
  moderate: {
    icon: Shield,
    color: 'text-info',
    bgColor: 'bg-info/10',
    ringColor: 'ring-info/30',
    label: 'Moderate Risk',
  },
  high: {
    icon: ShieldAlert,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    ringColor: 'ring-warning/30',
    label: 'High Risk',
  },
  critical: {
    icon: ShieldX,
    color: 'text-error',
    bgColor: 'bg-error/10',
    ringColor: 'ring-error/30',
    label: 'Critical Risk',
  },
}

const sizeConfig = {
  sm: {
    container: 'w-10 h-10',
    icon: 'w-4 h-4',
    ring: 'ring-2',
    strokeWidth: 3,
    radius: 16,
    fontSize: 'text-[10px]',
  },
  md: {
    container: 'w-14 h-14',
    icon: 'w-5 h-5',
    ring: 'ring-2',
    strokeWidth: 3,
    radius: 23,
    fontSize: 'text-xs',
  },
  lg: {
    container: 'w-20 h-20',
    icon: 'w-7 h-7',
    ring: 'ring-3',
    strokeWidth: 4,
    radius: 34,
    fontSize: 'text-sm',
  },
}

export function RiskIndicator({
  score,
  label,
  size = 'md',
  showScore = true,
  showLevel = true,
  animate = true,
  className,
}: RiskIndicatorProps) {
  const [mounted, setMounted] = useState(false)
  const clampedScore = Math.max(0, Math.min(100, score))
  const riskLevel = getRiskLevel(clampedScore)
  const config = riskConfig[riskLevel]
  const sizeStyles = sizeConfig[size]

  useEffect(() => {
    setMounted(true)
  }, [])

  const Icon = config.icon
  const circumference = 2 * Math.PI * sizeStyles.radius
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col items-center gap-2', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              {/* Background circle */}
              <svg
                className={cn(sizeStyles.container)}
                viewBox="0 0 80 80"
              >
                {/* Track */}
                <circle
                  cx="40"
                  cy="40"
                  r={sizeStyles.radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={sizeStyles.strokeWidth}
                  className="text-gray-200 dark:text-gray-700"
                />
                {/* Progress arc */}
                <motion.circle
                  cx="40"
                  cy="40"
                  r={sizeStyles.radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={sizeStyles.strokeWidth}
                  strokeLinecap="round"
                  className={config.color}
                  strokeDasharray={circumference}
                  initial={animate ? { strokeDashoffset: circumference } : false}
                  animate={mounted ? { strokeDashoffset } : false}
                  transition={{
                    duration: 1.2,
                    ease: [0.16, 1, 0.3, 1],
                    delay: 0.2,
                  }}
                  transform="rotate(-90 40 40)"
                />
              </svg>

              {/* Center icon/score */}
              <motion.div
                className={cn(
                  'absolute inset-0 flex flex-col items-center justify-center',
                  sizeStyles.fontSize
                )}
                initial={animate ? { scale: 0.5, opacity: 0 } : false}
                animate={mounted ? { scale: 1, opacity: 1 } : false}
                transition={{
                  delay: 0.5,
                  type: 'spring',
                  stiffness: 400,
                  damping: 25,
                }}
              >
                {showScore ? (
                  <span className={cn('font-bold tabular-nums', config.color)}>
                    {Math.round(clampedScore)}
                  </span>
                ) : (
                  <Icon className={cn(sizeStyles.icon, config.color)} />
                )}
              </motion.div>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1 text-xs">
              <p className="font-medium">{config.label}</p>
              <p className="text-muted-foreground">Risk Score: {Math.round(clampedScore)}/100</p>
            </div>
          </TooltipContent>
        </Tooltip>

        {(showLevel || label) && (
          <motion.div
            className="text-center"
            initial={animate ? { opacity: 0, y: 5 } : false}
            animate={mounted ? { opacity: 1, y: 0 } : false}
            transition={{ delay: 0.7 }}
          >
            {showLevel && (
              <p className={cn('text-xs font-medium', config.color)}>
                {config.label}
              </p>
            )}
            {label && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {label}
              </p>
            )}
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  )
}

export default RiskIndicator
