'use client'

import React, { Component, ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, RefreshCw, Home, Bug, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ErrorInfo {
  componentStack: string
  errorBoundary?: string
  errorBoundaryStack?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorId: string
  timestamp: Date
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: React.ComponentType<{
    error: Error
    errorInfo: ErrorInfo | null
    resetError: () => void
    errorId: string
  }>
  onError?: (error: Error, errorInfo: ErrorInfo | null, errorId: string) => void
  showErrorId?: boolean
  enableRetry?: boolean
  className?: string
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = []

  constructor(props: ErrorBoundaryProps) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      timestamp: new Date()
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: ErrorBoundary.generateErrorId(),
      timestamp: new Date()
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)

    this.setState({
      error,
      errorInfo
    })

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo, this.state.errorId)

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo)
    }
  }

  componentWillUnmount() {
    // Clear any pending timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
  }

  private logErrorToService = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // In a real app, you would send this to your error reporting service
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId,
        timestamp: this.state.timestamp.toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: 'anonymous' // In real app, get from auth context
      }

      console.log('Error report:', errorReport)

      // Example: Send to error reporting service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }
  }

  private handleRetry = () => {
    // Add a small delay before retrying to prevent rapid retries
    const timeout = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: '',
        timestamp: new Date()
      })
    }, 100)

    this.retryTimeouts.push(timeout)
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  private copyErrorDetails = async () => {
    const errorDetails = {
      errorId: this.state.errorId,
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: this.state.timestamp.toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      // You could show a toast notification here
      console.log('Error details copied to clipboard')
    } catch (err) {
      console.error('Failed to copy error details:', err)
    }
  }


  static generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return (
          <FallbackComponent
            error={this.state.error!}
            errorInfo={this.state.errorInfo}
            resetError={this.handleRetry}
            errorId={this.state.errorId}
          />
        )
      }

      return <DefaultErrorFallback {...this.state} {...this.props} onRetry={this.handleRetry} />
    }

    return this.props.children
  }
}

interface DefaultErrorFallbackProps extends ErrorBoundaryState, ErrorBoundaryProps {
  onRetry: () => void
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  timestamp,
  showErrorId = true,
  enableRetry = true,
  className,
  onRetry
}) => {
  return (
    <div className={cn('min-h-screen flex items-center justify-center p-4 bg-background', className)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-2xl"
      >
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <CardTitle className="text-2xl text-red-900 dark:text-red-100">
              Something went wrong
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              An unexpected error occurred. Our team has been notified.
            </p>

            {showErrorId && (
              <div className="flex items-center justify-center gap-2 mt-3">
                <Badge variant="outline" className="font-mono text-xs">
                  {errorId}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyErrorDetails}
                  className="h-6 px-2 text-xs"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy Details
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Error occurred at {timestamp.toLocaleString()}
              </p>
            </div>

            {/* Error details */}
            <div className="mt-4">
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div>
                  <h4 className="font-medium text-sm mb-1 flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    Error Message
                  </h4>
                  <p className="text-sm font-mono bg-background p-2 rounded border text-red-600 dark:text-red-400">
                    {error?.message || 'Unknown error'}
                  </p>
                </div>

                {error?.stack && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Stack Trace</h4>
                    <pre className="text-xs font-mono bg-background p-2 rounded border overflow-x-auto max-h-32 text-red-600 dark:text-red-400">
                      {error.stack}
                    </pre>
                  </div>
                )}

                {errorInfo?.componentStack && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Component Stack</h4>
                    <pre className="text-xs font-mono bg-background p-2 rounded border overflow-x-auto max-h-32 text-muted-foreground">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {enableRetry && (
                <Button onClick={onRetry} className="flex-1">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              )}

              <Button variant="outline" onClick={() => window.location.href = '/'} className="flex-1">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </div>

            <div className="text-center pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                If this problem persists, please contact support with the error ID above.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

// Utility function to copy error details (defined outside component for access)
const copyErrorDetails = async () => {
  // This would be implemented by the component
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Hook for handling errors in functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: { componentStack?: string }) => {
    console.error('Error handled by hook:', error, errorInfo)

    // In a real app, you might want to report this to an error tracking service
    // or show a toast notification

    // For now, we'll just re-throw to let the error boundary catch it
    throw error
  }
}

export default ErrorBoundary