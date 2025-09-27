'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, RefreshCw, Zap, Database, Cloud, Cpu } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface LoadingProps {
  variant?: 'spinner' | 'pulse' | 'dots' | 'bars' | 'wave' | 'progress'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  showText?: boolean
  className?: string
  progress?: number
  color?: 'primary' | 'secondary' | 'muted'
}

const LoadingSpinner: React.FC<{ size: string; color: string }> = ({ size, color }) => (
  <motion.div
    animate={{ rotate: 360 }}
    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    className={cn('rounded-full border-2 border-transparent', size)}
    style={{
      borderTopColor: color === 'primary' ? 'hsl(var(--primary))' :
                     color === 'secondary' ? 'hsl(var(--secondary))' :
                     'hsl(var(--muted-foreground))',
      borderRightColor: color === 'primary' ? 'hsl(var(--primary))' :
                       color === 'secondary' ? 'hsl(var(--secondary))' :
                       'hsl(var(--muted-foreground))'
    }}
  />
)

const LoadingPulse: React.FC<{ size: string; color: string }> = ({ size, color }) => (
  <motion.div
    animate={{ scale: [1, 1.2, 1] }}
    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    className={cn('rounded-full', size)}
    style={{
      backgroundColor: color === 'primary' ? 'hsl(var(--primary))' :
                      color === 'secondary' ? 'hsl(var(--secondary))' :
                      'hsl(var(--muted-foreground))'
    }}
  />
)

const LoadingDots: React.FC<{ size: string; color: string }> = ({ size, color }) => {
  const dotSize = size === 'sm' ? 'w-2 h-2' :
                 size === 'md' ? 'w-3 h-3' :
                 size === 'lg' ? 'w-4 h-4' : 'w-6 h-6'

  return (
    <div className="flex space-x-1">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          animate={{ y: [0, -10, 0] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: index * 0.2,
            ease: 'easeInOut'
          }}
          className={cn('rounded-full', dotSize)}
          style={{
            backgroundColor: color === 'primary' ? 'hsl(var(--primary))' :
                            color === 'secondary' ? 'hsl(var(--secondary))' :
                            'hsl(var(--muted-foreground))'
          }}
        />
      ))}
    </div>
  )
}

const LoadingBars: React.FC<{ size: string; color: string }> = ({ size, color }) => {
  const barHeight = size === 'sm' ? 'h-3' :
                   size === 'md' ? 'h-4' :
                   size === 'lg' ? 'h-6' : 'h-8'
  const barWidth = 'w-1'

  return (
    <div className="flex items-end space-x-1">
      {[0, 1, 2, 3, 4].map((index) => (
        <motion.div
          key={index}
          animate={{ height: ['20%', '100%', '20%'] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: index * 0.1,
            ease: 'easeInOut'
          }}
          className={cn('bg-current rounded-full', barWidth, barHeight)}
          style={{
            color: color === 'primary' ? 'hsl(var(--primary))' :
                  color === 'secondary' ? 'hsl(var(--secondary))' :
                  'hsl(var(--muted-foreground))'
          }}
        />
      ))}
    </div>
  )
}

const LoadingWave: React.FC<{ size: string; color: string }> = ({ size, color }) => {
  const waveWidth = size === 'sm' ? 'w-32' :
                   size === 'md' ? 'w-40' :
                   size === 'lg' ? 'w-48' : 'w-64'
  const waveHeight = size === 'sm' ? 'h-1' :
                    size === 'md' ? 'h-2' :
                    size === 'lg' ? 'h-3' : 'h-4'

  return (
    <div className={cn('relative overflow-hidden rounded-full', waveWidth, waveHeight)}>
      <motion.div
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        className={cn('absolute inset-0 rounded-full')}
        style={{
          background: `linear-gradient(90deg, transparent, ${
            color === 'primary' ? 'hsl(var(--primary))' :
            color === 'secondary' ? 'hsl(var(--secondary))' :
            'hsl(var(--muted-foreground))'
          }, transparent)`
        }}
      />
    </div>
  )
}

export const Loading: React.FC<LoadingProps> = ({
  variant = 'spinner',
  size = 'md',
  text,
  showText = true,
  className,
  progress,
  color = 'primary'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const sizeClass = sizeClasses[size]

  const renderLoader = () => {
    switch (variant) {
      case 'spinner':
        return <Loader2 className={cn('animate-spin', sizeClass)} />
      case 'pulse':
        return <LoadingPulse size={sizeClass} color={color} />
      case 'dots':
        return <LoadingDots size={size} color={color} />
      case 'bars':
        return <LoadingBars size={size} color={color} />
      case 'wave':
        return <LoadingWave size={size} color={color} />
      case 'progress':
        return progress !== undefined ? (
          <div className="w-full space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">
              {progress}% complete
            </p>
          </div>
        ) : (
          <LoadingSpinner size={sizeClass} color={color} />
        )
      default:
        return <LoadingSpinner size={sizeClass} color={color} />
    }
  }

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-2', className)}>
      {renderLoader()}
      {showText && text && (
        <p className="text-sm text-muted-foreground text-center">{text}</p>
      )}
    </div>
  )
}

// Specialized loading components for different contexts

export const PageLoading: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="min-h-screen flex items-center justify-center">
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col items-center justify-center p-8">
        <Loading variant="spinner" size="lg" text={text} />
      </CardContent>
    </Card>
  </div>
)

export const InlineLoading: React.FC<{ text?: string; className?: string }> = ({
  text = 'Loading...',
  className
}) => (
  <div className={cn('flex items-center justify-center py-8', className)}>
    <Loading variant="dots" size="md" text={text} />
  </div>
)

export const ButtonLoading: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="flex items-center space-x-2">
    <Loading variant="spinner" size="sm" showText={false} />
    <span className="text-sm">{text}</span>
  </div>
)

export const CardLoading: React.FC<{ title?: string; rows?: number }> = ({
  title = 'Loading...',
  rows = 3
}) => (
  <Card>
    <CardContent className="p-6">
      <div className="space-y-4">
        <div className="h-6 bg-muted rounded animate-pulse" />
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)

export const Skeleton: React.FC<{ className?: string; variant?: 'text' | 'circular' | 'rectangular' }> = ({
  className,
  variant = 'rectangular'
}) => {
  const baseClasses = 'animate-pulse bg-muted'

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded'
  }

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)} />
  )
}

// Skeleton components for specific content types
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 1,
  className
}) => (
  <div className={cn('space-y-2', className)}>
    {[...Array(lines)].map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        className={i === lines - 1 ? 'w-3/4' : 'w-full'}
      />
    ))}
  </div>
)

export const SkeletonAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  }

  return <Skeleton variant="circular" className={sizeClasses[size]} />
}

export const SkeletonCard: React.FC<{ hasAvatar?: boolean; lines?: number }> = ({
  hasAvatar = false,
  lines = 2
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start space-x-3">
        {hasAvatar && <SkeletonAvatar />}
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-3/4" />
          <SkeletonText lines={lines} />
        </div>
      </div>
    </CardContent>
  </Card>
)

// Loading states with context
export const LoadingStates = {
  // Data loading states
  projects: () => <CardLoading title="Loading projects..." rows={4} />,
  tasks: () => <CardLoading title="Loading tasks..." rows={3} />,
  milestones: () => <CardLoading title="Loading milestones..." rows={3} />,

  // Action loading states
  saving: () => <ButtonLoading text="Saving..." />,
  creating: () => <ButtonLoading text="Creating..." />,
  deleting: () => <ButtonLoading text="Deleting..." />,
  updating: () => <ButtonLoading text="Updating..." />,

  // Page loading states
  dashboard: () => <PageLoading text="Loading dashboard..." />,
  project: () => <PageLoading text="Loading project..." />,
  settings: () => <PageLoading text="Loading settings..." />,

  // AI loading states
  aiThinking: () => (
    <div className="flex items-center space-x-3 p-4">
      <div className="flex space-x-1">
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="w-2 h-2 bg-primary rounded-full"
        />
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
          className="w-2 h-2 bg-primary rounded-full"
        />
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
          className="w-2 h-2 bg-primary rounded-full"
        />
      </div>
      <span className="text-sm text-muted-foreground">AI is thinking...</span>
    </div>
  ),

  aiGenerating: () => (
    <div className="flex items-center space-x-3 p-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
      />
      <span className="text-sm text-muted-foreground">Generating suggestions...</span>
    </div>
  )
}

// Hook for managing loading states
export function useLoading(initialState = false) {
  const [isLoading, setIsLoading] = React.useState(initialState)
  const [loadingText, setLoadingText] = React.useState<string>()

  const startLoading = React.useCallback((text?: string) => {
    setIsLoading(true)
    setLoadingText(text)
  }, [])

  const stopLoading = React.useCallback(() => {
    setIsLoading(false)
    setLoadingText(undefined)
  }, [])

  return {
    isLoading,
    loadingText,
    startLoading,
    stopLoading,
    LoadingComponent: isLoading ? (
      <Loading text={loadingText} />
    ) : null
  }
}

export default Loading
