import { AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sanitizeErrorMessage } from '@/lib/api-security'

interface SecureErrorProps {
  error: string | Error | any
  title?: string
  variant?: 'error' | 'warning' | 'info'
  className?: string
  showDetails?: boolean
}

// Secure error display component that sanitizes error messages
export function SecureError({
  error,
  title,
  variant = 'error',
  className,
  showDetails = false
}: SecureErrorProps) {
  const safeMessage = sanitizeErrorMessage(error)

  const icons = {
    error: AlertTriangle,
    warning: AlertCircle,
    info: Info
  }

  const colors = {
    error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
    info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200'
  }

  const Icon = icons[variant]

  return (
    <div className={cn(
      'flex items-start gap-3 p-4 rounded-lg border',
      colors[variant],
      className
    )}>
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-medium mb-1">{title}</h4>
        )}
        <p className="text-sm">{safeMessage}</p>

        {showDetails && process.env.NODE_ENV === 'development' && (
          <details className="mt-2">
            <summary className="text-xs cursor-pointer hover:underline">
              Show technical details
            </summary>
            <pre className="text-xs mt-2 p-2 bg-black/10 rounded overflow-x-auto">
              {typeof error === 'string' ? error : JSON.stringify(error, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

// Hook for secure error handling
export function useSecureError() {
  return {
    displayError: (error: any, options?: {
      title?: string
      variant?: 'error' | 'warning' | 'info'
      showDetails?: boolean
    }) => (
      <SecureError
        error={error}
        title={options?.title}
        variant={options?.variant || 'error'}
        showDetails={options?.showDetails}
      />
    ),

    sanitizeError: sanitizeErrorMessage
  }
}

// Higher-order component for secure error boundaries
export function withSecureErrorBoundary<P extends object>(
  Component: React.ComponentType<P>
) {
  return function SecureErrorBoundaryComponent(props: P) {
    try {
      return <Component {...props} />
    } catch (error) {
      console.error('Component error caught by secure boundary:', error)
      return (
        <SecureError
          error={error}
          title="Component Error"
          variant="error"
          showDetails={process.env.NODE_ENV === 'development'}
        />
      )
    }
  }
}
