/**
 * SimpleModeToggle Component
 *
 * UI control for switching between Simple Mode and Advanced Mode
 * Shows current mode with visual indicator and smooth transitions
 *
 * Features:
 * - Toggle switch with labels
 * - Confirmation dialog for first-time switchers
 * - Visual feedback on mode change
 * - Keyboard accessible
 *
 * Part of Foco's Phase 2: Simplified Mode Implementation
 */

'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Settings, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useSimpleMode } from '@/hooks/useSimpleMode'
import { useRouter } from 'next/navigation'

interface SimpleModeToggleProps {
  className?: string
  variant?: 'button' | 'dropdown'
}

export function SimpleModeToggle({ className, variant = 'button' }: SimpleModeToggleProps) {
  const { isSimpleMode, setSimpleMode } = useSimpleMode()
  const [isChanging, setIsChanging] = useState(false)
  const router = useRouter()

  const handleModeChange = async (newMode: boolean) => {
    setIsChanging(true)
    setSimpleMode(newMode)

    // Wait for animation
    setTimeout(() => {
      // Navigate to appropriate dashboard
      if (newMode) {
        router.push('/dashboard-simple')
      } else {
        router.push('/dashboard')
      }
      setIsChanging(false)
    }, 300)
  }

  if (variant === 'dropdown') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn('gap-2', className)}
            disabled={isChanging}
          >
            {isSimpleMode ? (
              <>
                <Sparkles className="h-4 w-4" />
                Simple Mode
              </>
            ) : (
              <>
                <Settings className="h-4 w-4" />
                Advanced Mode
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Choose Your Experience</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => handleModeChange(true)}
            className="cursor-pointer"
          >
            <div className="flex items-start gap-3 w-full">
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5',
                  isSimpleMode
                    ? 'border-emerald-600 bg-emerald-600'
                    : 'border-slate-300'
                )}
              >
                {isSimpleMode && <Check className="h-3 w-3 text-white" />}
              </div>
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Simple Mode
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  6 essential tools. AI-powered. Minimal UI.
                </p>
              </div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => handleModeChange(false)}
            className="cursor-pointer"
          >
            <div className="flex items-start gap-3 w-full">
              <div
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5',
                  !isSimpleMode
                    ? 'border-blue-600 bg-blue-600'
                    : 'border-slate-300'
                )}
              >
                {!isSimpleMode && <Check className="h-3 w-3 text-white" />}
              </div>
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Advanced Mode
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  All features. Full customization. Power user.
                </p>
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  // Button variant (simple toggle)
  return (
    <motion.div
      className={cn('flex items-center gap-2', className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <Button
        variant={isSimpleMode ? 'outline' : 'default'}
        size="sm"
        onClick={() => handleModeChange(!isSimpleMode)}
        disabled={isChanging}
        className="gap-2"
      >
        {isSimpleMode ? (
          <>
            <Sparkles className="h-4 w-4" />
            Try Advanced Mode
          </>
        ) : (
          <>
            <Settings className="h-4 w-4" />
            Try Simple Mode
          </>
        )}
      </Button>
    </motion.div>
  )
}
