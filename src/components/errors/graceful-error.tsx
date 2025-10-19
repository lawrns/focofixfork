'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/design-system'
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  MessageCircle, 
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { uxMetrics } from '@/lib/monitoring/ux-metrics'

interface GracefulErrorProps {
  error?: Error
  errorInfo?: React.ErrorInfo
  fallback?: React.ReactNode
  onRetry?: () => void
  onReport?: (error: Error, errorInfo?: React.ErrorInfo) => void
  className?: string
}

interface ErrorState {
  type: 'network' | 'javascript' | 'permission' | 'not_found' | 'server' | 'unknown'
  title: string
  description: string
  icon: React.ReactNode
  actions: Array<{
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive'
    icon?: React.ReactNode
  }>
  showReportButton: boolean
}

export function GracefulError({
  error,
  errorInfo,
  fallback,
  onRetry,
  onReport,
  className
}: GracefulErrorProps) {
  const [isOnline, setIsOnline] = useState(true)
  const [isReporting, setIsReporting] = useState(false)
  const [reportSent, setReportSent] = useState(false)

  useEffect(() => {
    // Track online/offline status
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial check
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const getErrorState = (): ErrorState => {
    if (!isOnline) {
      return {
        type: 'network',
        title: 'You\'re Offline',
        description: 'It looks like you\'ve lost your internet connection. Please check your network and try again.',
        icon: <WifiOff className="w-12 h-12 text-red-500" />,
        actions: [
          {
            label: 'Try Again',
            onClick: () => window.location.reload(),
            variant: 'default',
            icon: <RefreshCw className="w-4 h-4" />
          }
        ],
        showReportButton: false
      }
    }

    if (!error) {
      return {
        type: 'unknown',
        title: 'Something Went Wrong',
        description: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
        icon: <AlertTriangle className="w-12 h-12 text-yellow-500" />,
        actions: [
          {
            label: 'Try Again',
            onClick: () => window.location.reload(),
            variant: 'default',
            icon: <RefreshCw className="w-4 h-4" />
          },
          {
            label: 'Go Home',
            onClick: () => window.location.href = '/',
            variant: 'outline',
            icon: <Home className="w-4 h-4" />
          }
        ],
        showReportButton: true
      }
    }

    const errorMessage = error.message.toLowerCase()
    const errorStack = error.stack?.toLowerCase() || ''

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('timeout')) {
      return {
        type: 'network',
        title: 'Connection Problem',
        description: 'We\'re having trouble connecting to our servers. Please check your internet connection and try again.',
        icon: <Wifi className="w-12 h-12 text-red-500" />,
        actions: [
          {
            label: 'Retry',
            onClick: () => {
              if (onRetry) {
                onRetry()
              } else {
                window.location.reload()
              }
            },
            variant: 'default',
            icon: <RefreshCw className="w-4 h-4" />
          },
          {
            label: 'Go Home',
            onClick: () => window.location.href = '/',
            variant: 'outline',
            icon: <Home className="w-4 h-4" />
          }
        ],
        showReportButton: false
      }
    }

    // Permission errors
    if (errorMessage.includes('permission') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      return {
        type: 'permission',
        title: 'Access Denied',
        description: 'You don\'t have permission to access this resource. Please log in or contact your administrator.',
        icon: <XCircle className="w-12 h-12 text-red-500" />,
        actions: [
          {
            label: 'Log In',
            onClick: () => window.location.href = '/login',
            variant: 'default',
            icon: <CheckCircle className="w-4 h-4" />
          },
          {
            label: 'Go Home',
            onClick: () => window.location.href = '/',
            variant: 'outline',
            icon: <Home className="w-4 h-4" />
          }
        ],
        showReportButton: false
      }
    }

    // Not found errors
    if (errorMessage.includes('not found') || errorMessage.includes('404')) {
      return {
        type: 'not_found',
        title: 'Page Not Found',
        description: 'The page you\'re looking for doesn\'t exist or has been moved. Let\'s get you back on track.',
        icon: <AlertTriangle className="w-12 h-12 text-yellow-500" />,
        actions: [
          {
            label: 'Go Home',
            onClick: () => window.location.href = '/',
            variant: 'default',
            icon: <Home className="w-4 h-4" />
          },
          {
            label: 'Go Back',
            onClick: () => window.history.back(),
            variant: 'outline',
            icon: <RefreshCw className="w-4 h-4" />
          }
        ],
        showReportButton: false
      }
    }

    // Server errors
    if (errorMessage.includes('server') || errorMessage.includes('500') || errorMessage.includes('internal')) {
      return {
        type: 'server',
        title: 'Server Error',
        description: 'Our servers are experiencing issues. We\'re working to fix this. Please try again in a few minutes.',
        icon: <AlertTriangle className="w-12 h-12 text-red-500" />,
        actions: [
          {
            label: 'Try Again',
            onClick: () => {
              if (onRetry) {
                onRetry()
              } else {
                window.location.reload()
              }
            },
            variant: 'default',
            icon: <RefreshCw className="w-4 h-4" />
          },
          {
            label: 'Go Home',
            onClick: () => window.location.href = '/',
            variant: 'outline',
            icon: <Home className="w-4 h-4" />
          }
        ],
        showReportButton: true
      }
    }

    // JavaScript errors
    return {
      type: 'javascript',
      title: 'Something Went Wrong',
      description: 'An unexpected error occurred. Our team has been notified and is working to fix this issue.',
      icon: <AlertTriangle className="w-12 h-12 text-red-500" />,
      actions: [
          {
            label: 'Try Again',
            onClick: () => {
              if (onRetry) {
                onRetry()
              } else {
                window.location.reload()
              }
            },
            variant: 'default',
            icon: <RefreshCw className="w-4 h-4" />
          },
        {
          label: 'Go Home',
          onClick: () => window.location.href = '/',
          variant: 'outline',
          icon: <Home className="w-4 h-4" />
        }
      ],
      showReportButton: true
    }
  }

  const handleReportError = async () => {
    if (!error || isReporting) return

    setIsReporting(true)

    try {
      // Track error report
      uxMetrics.trackCustomMetric('error_reported', 1, 'count', {
        errorType: error.name,
        errorMessage: error.message,
        errorStack: error.stack?.slice(0, 500) // Limit stack trace size
      })

      // Send error report
      if (onReport) {
        await onReport(error, errorInfo)
      } else {
        // Default error reporting
        await fetch('/api/errors/report', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack
            },
            errorInfo,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: Date.now()
          }),
        })
      }

      setReportSent(true)
    } catch (reportError) {
      console.error('Failed to report error:', reportError)
    } finally {
      setIsReporting(false)
    }
  }

  const errorState = getErrorState()

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <div className={cn('min-h-screen flex items-center justify-center p-4 bg-gray-50', className)}>
      <Card className="max-w-md w-full text-center">
        <div className="p-8">
          <div className="mb-6">
            {errorState.icon}
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {errorState.title}
          </h1>
          
          <p className="text-gray-600 mb-6">
            {errorState.description}
          </p>

          {/* Online/Offline Status */}
          <div className="flex items-center justify-center mb-6">
            <div className={cn(
              'flex items-center space-x-2 px-3 py-1 rounded-full text-sm',
              isOnline 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            )}>
              {isOnline ? (
                <>
                  <Wifi className="w-4 h-4" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4" />
                  <span>Offline</span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {errorState.actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'default'}
                onClick={action.onClick}
                className="w-full"
              >
                {action.icon && <span className="mr-2">{action.icon}</span>}
                {action.label}
              </Button>
            ))}

            {/* Report Error Button */}
            {errorState.showReportButton && (
              <Button
                variant="ghost"
                onClick={handleReportError}
                disabled={isReporting || reportSent}
                className="w-full text-gray-600 hover:text-gray-800"
              >
                {isReporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Reporting...
                  </>
                ) : reportSent ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    Error Reported
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Report This Error
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                Error Details (Development)
              </summary>
              <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 overflow-auto">
                <div><strong>Name:</strong> {error.name}</div>
                <div><strong>Message:</strong> {error.message}</div>
                {error.stack && (
                  <div><strong>Stack:</strong><pre className="whitespace-pre-wrap">{error.stack}</pre></div>
                )}
                {errorInfo && (
                  <div><strong>Component Stack:</strong><pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre></div>
                )}
              </div>
            </details>
          )}
        </div>
      </Card>
    </div>
  )
}
