import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  variant?: 'error' | 'offline' | 'not-found' | 'unauthorized'
  className?: string
}

export function ErrorState({
  title,
  message,
  onRetry,
  variant = 'error',
  className
}: ErrorStateProps) {
  const getVariantConfig = () => {
    switch (variant) {
      case 'offline':
        return {
          icon: WifiOff,
          defaultTitle: 'You\'re offline',
          defaultMessage: 'Please check your internet connection and try again.',
          iconColor: 'text-yellow-500'
        }
      case 'not-found':
        return {
          icon: AlertTriangle,
          defaultTitle: 'Not found',
          defaultMessage: 'The requested resource could not be found.',
          iconColor: 'text-muted-foreground'
        }
      case 'unauthorized':
        return {
          icon: AlertTriangle,
          defaultTitle: 'Access denied',
          defaultMessage: 'You don\'t have permission to access this resource.',
          iconColor: 'text-red-500'
        }
      default:
        return {
          icon: AlertTriangle,
          defaultTitle: 'Something went wrong',
          defaultMessage: 'An unexpected error occurred. Please try again.',
          iconColor: 'text-red-500'
        }
    }
  }

  const config = getVariantConfig()
  const Icon = config.icon

  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className={`h-12 w-12 mb-4 ${config.iconColor}`} />
        <h3 className="text-lg font-semibold mb-2">
          {title || config.defaultTitle}
        </h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          {message || config.defaultMessage}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function EmptyState({
  title,
  message,
  action,
  icon: Icon,
  className
}: {
  title: string
  message: string
  action?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {Icon && <Icon className="h-12 w-12 mb-4 text-muted-foreground" />}
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">{message}</p>
        {action}
      </CardContent>
    </Card>
  )
}
