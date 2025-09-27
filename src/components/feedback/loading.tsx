import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const loadingVariants = cva(
  'animate-spin rounded-full border-2 border-gray-300 border-t-primary',
  {
    variants: {
      size: {
        xs: 'h-3 w-3',
        sm: 'h-4 w-4',
        default: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12'
      }
    },
    defaultVariants: {
      size: 'default'
    }
  }
)

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof loadingVariants> {
  show?: boolean
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ className, size, show = true, ...props }, ref) => {
    if (!show) return null

    return (
      <div
        ref={ref}
        className={cn(loadingVariants({ size, className }))}
        {...props}
      />
    )
  }
)
LoadingSpinner.displayName = 'LoadingSpinner'

interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  show?: boolean
  message?: string
  spinnerSize?: 'xs' | 'sm' | 'default' | 'lg' | 'xl'
}

const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ className, show = true, message, spinnerSize = 'default', ...props }, ref) => {
    if (!show) return null

    return (
      <div
        ref={ref}
        className={cn(
          'absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
          className
        )}
        {...props}
      >
        <div className="flex flex-col items-center gap-3 rounded-lg bg-background p-6 shadow-lg">
          <LoadingSpinner size={spinnerSize} />
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
        </div>
      </div>
    )
  }
)
LoadingOverlay.displayName = 'LoadingOverlay'

interface LoadingPageProps extends React.HTMLAttributes<HTMLDivElement> {
  message?: string
  spinnerSize?: 'xs' | 'sm' | 'default' | 'lg' | 'xl'
}

const LoadingPage = React.forwardRef<HTMLDivElement, LoadingPageProps>(
  ({ className, message = 'Loading...', spinnerSize = 'lg', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex min-h-[200px] flex-col items-center justify-center gap-4',
        className
      )}
      {...props}
    >
      <LoadingSpinner size={spinnerSize} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
)
LoadingPage.displayName = 'LoadingPage'

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  spinnerSize?: 'xs' | 'sm' | 'default'
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ className, loading, loadingText, spinnerSize = 'sm', children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn('relative', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size={spinnerSize} className="border-white border-t-transparent" />
        </div>
      )}
      <span className={loading ? 'invisible' : ''}>
        {loading && loadingText ? loadingText : children}
      </span>
    </button>
  )
)
LoadingButton.displayName = 'LoadingButton'

export { LoadingSpinner, LoadingOverlay, LoadingPage, LoadingButton }


