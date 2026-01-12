'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, X, CheckCircle, AlertCircle } from 'lucide-react'
import { pushManager } from '@/lib/notifications/push-manager'
import { useAuth } from '@/lib/contexts/auth-context'

interface PushPermissionPromptProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  trigger?: 'first-task' | 'team-mention' | 'deadline' | 'manual'
}

export function PushPermissionPrompt({ 
  isOpen, 
  onClose, 
  onSuccess,
  trigger = 'manual' 
}: PushPermissionPromptProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (isOpen && pushManager.isPermissionGranted()) {
      onClose()
    }
  }, [isOpen, onClose])

  const handleAllow = async () => {
    if (!user) {
      setError('Please log in to enable notifications')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const permission = await pushManager.requestPermission()
      
      if (permission === 'granted') {
        await pushManager.subscribe(user.id)
        onSuccess?.()
        onClose()
      } else if (permission === 'denied') {
        setError('Notifications were blocked. You can enable them later in your browser settings.')
      } else {
        setError('Notification permission was not granted.')
      }
    } catch (error) {
      console.error('[PushPermissionPrompt] Failed to enable notifications:', error)
      setError('Failed to enable notifications. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeny = () => {
    onClose()
  }

  const handleLater = () => {
    onClose()
  }

  if (!isOpen) return null

  const getContent = () => {
    switch (trigger) {
      case 'first-task':
        return {
          title: 'Stay updated on your tasks',
          description: 'Get notified when teammates mention you, update shared projects, or when deadlines are approaching.',
          benefits: [
            'Task assignments and mentions',
            'Project updates and changes',
            'Deadline reminders',
            'Team collaboration alerts'
          ]
        }
      case 'team-mention':
        return {
          title: 'Never miss team mentions',
          description: 'Get instant notifications when someone mentions you in comments or assigns you tasks.',
          benefits: [
            'Direct mentions in comments',
            'Task assignments',
            'Project invitations',
            'Important updates'
          ]
        }
      case 'deadline':
        return {
          title: 'Never miss a deadline',
          description: 'Get timely reminders about upcoming deadlines and milestone completions.',
          benefits: [
            'Deadline reminders',
            'Milestone notifications',
            'Overdue task alerts',
            'Project timeline updates'
          ]
        }
      default:
        return {
          title: 'Enable notifications',
          description: 'Stay updated on your projects and team collaboration with push notifications.',
          benefits: [
            'Task assignments and mentions',
            'Project updates',
            'Deadline reminders',
            'Team collaboration'
          ]
        }
    }
  }

  const content = getContent()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Bell className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl">{content.title}</CardTitle>
          <CardDescription className="text-sm text-gray-600">
            {content.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {content.benefits.map((benefit, index) => (
              <div key={index} className="flex items-center text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                {benefit}
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          <div className="flex flex-col space-y-2">
            <Button
              onClick={handleAllow}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Enabling...' : 'Enable Notifications'}
            </Button>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={handleLater}
                disabled={isLoading}
                className="flex-1"
              >
                Maybe Later
              </Button>
              <Button
                variant="ghost"
                onClick={handleDeny}
                disabled={isLoading}
                className="flex-1"
              >
                Don&apos;t Ask Again
              </Button>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center">
            You can change notification settings anytime in your browser or app settings.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
