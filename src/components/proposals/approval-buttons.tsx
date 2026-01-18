'use client'

import { useState, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export type ApprovalAction = 'approve' | 'reject' | 'discuss'

interface ApprovalButtonsProps {
  onApprove: (notes?: string) => void
  onReject: (notes?: string) => void
  onDiscuss: () => void
  isReviewer: boolean
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  currentStatus?: 'pending' | 'approved' | 'rejected' | 'needs_discussion'
  className?: string
}

const sizeConfig = {
  sm: {
    button: 'h-8 w-8',
    icon: 'h-4 w-4',
  },
  md: {
    button: 'h-10 w-10',
    icon: 'h-5 w-5',
  },
  lg: {
    button: 'h-12 w-12',
    icon: 'h-6 w-6',
  },
}

function ApprovalButtonsComponent({
  onApprove,
  onReject,
  onDiscuss,
  isReviewer,
  disabled = false,
  size = 'md',
  currentStatus = 'pending',
  className,
}: ApprovalButtonsProps) {
  const [hoveredAction, setHoveredAction] = useState<ApprovalAction | null>(null)
  const [clickedAction, setClickedAction] = useState<ApprovalAction | null>(null)

  const sizeStyles = sizeConfig[size]

  const handleApprove = () => {
    if (!isReviewer || disabled) return
    setClickedAction('approve')
    onApprove()
    // Reset after animation
    setTimeout(() => setClickedAction(null), 600)
  }

  const handleReject = () => {
    if (!isReviewer || disabled) return
    setClickedAction('reject')
    onReject()
    setTimeout(() => setClickedAction(null), 600)
  }

  const handleDiscuss = () => {
    if (disabled) return
    setClickedAction('discuss')
    onDiscuss()
    setTimeout(() => setClickedAction(null), 600)
  }

  const isActionDisabled = !isReviewer || disabled

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn('flex items-center gap-2', className)}>
        {/* Approve Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileTap={isActionDisabled ? {} : { scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleApprove}
                disabled={isActionDisabled}
                onMouseEnter={() => setHoveredAction('approve')}
                onMouseLeave={() => setHoveredAction(null)}
                className={cn(
                  sizeStyles.button,
                  'relative overflow-hidden rounded-full transition-all duration-200',
                  currentStatus === 'approved'
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
                    : 'hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-400',
                  isActionDisabled && 'opacity-50 cursor-not-allowed'
                )}
                aria-label="Approve this item"
              >
                {/* Animated checkmark draw-in effect */}
                <AnimatePresence mode="wait">
                  {clickedAction === 'approve' ? (
                    <motion.div
                      key="checkmark-animated"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Check className={cn(sizeStyles.icon, 'text-emerald-500')} strokeWidth={3} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="checkmark-static"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Check className={sizeStyles.icon} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Pulse ring on click */}
                {clickedAction === 'approve' && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-emerald-400"
                    initial={{ scale: 0.5, opacity: 0.4 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                )}
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isReviewer ? 'Approve' : 'Only reviewers can approve'}
          </TooltipContent>
        </Tooltip>

        {/* Reject Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              whileTap={isActionDisabled ? {} : { scale: 0.95 }}
              animate={clickedAction === 'reject' ? { x: [0, -3, 3, -3, 3, 0] } : {}}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={handleReject}
                disabled={isActionDisabled}
                onMouseEnter={() => setHoveredAction('reject')}
                onMouseLeave={() => setHoveredAction(null)}
                className={cn(
                  sizeStyles.button,
                  'relative overflow-hidden rounded-full transition-all duration-200',
                  currentStatus === 'rejected'
                    ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
                    : 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400',
                  isActionDisabled && 'opacity-50 cursor-not-allowed'
                )}
                aria-label="Reject this item"
              >
                {/* Cross-fade X icon */}
                <AnimatePresence mode="wait">
                  {clickedAction === 'reject' ? (
                    <motion.div
                      key="x-animated"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    >
                      <X className={cn(sizeStyles.icon, 'text-red-500')} strokeWidth={3} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="x-static"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <X className={sizeStyles.icon} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isReviewer ? 'Reject' : 'Only reviewers can reject'}
          </TooltipContent>
        </Tooltip>

        {/* Discuss Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div whileTap={disabled ? {} : { scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDiscuss}
                disabled={disabled}
                onMouseEnter={() => setHoveredAction('discuss')}
                onMouseLeave={() => setHoveredAction(null)}
                className={cn(
                  sizeStyles.button,
                  'relative overflow-hidden rounded-full transition-all duration-200',
                  currentStatus === 'needs_discussion'
                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                    : 'hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/50 dark:hover:text-amber-400',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                aria-label="Start discussion about this item"
              >
                {/* Bouncing chat icon */}
                <motion.div
                  animate={
                    clickedAction === 'discuss'
                      ? { y: [0, -4, 0, -2, 0] }
                      : {}
                  }
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <MessageCircle
                    className={cn(
                      sizeStyles.icon,
                      clickedAction === 'discuss' && 'text-amber-500'
                    )}
                  />
                </motion.div>

                {/* Yellow highlight pulse on click */}
                {clickedAction === 'discuss' && (
                  <motion.span
                    className="absolute inset-0 rounded-full bg-amber-300"
                    initial={{ scale: 0.5, opacity: 0.5 }}
                    animate={{ scale: 1.5, opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                )}
              </Button>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Discuss
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

export const ApprovalButtons = memo(ApprovalButtonsComponent)
