import { cn } from "@/lib/utils"

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  animation?: 'pulse' | 'wave' | 'none'
}

function Skeleton({
  className,
  variant = 'rectangular',
  animation = 'pulse',
  ...props
}: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'h-12 w-12 rounded-full',
    rectangular: 'h-12 rounded-lg',
    rounded: 'h-12 rounded-xl',
  }

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'relative overflow-hidden bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 animate-shimmer',
    none: '',
  }

  return (
    <div
      className={cn(
        'bg-gray-200 dark:bg-gray-800',
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }