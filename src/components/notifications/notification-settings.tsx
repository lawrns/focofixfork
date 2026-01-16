'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Bell, BellOff, Settings, TestTube } from 'lucide-react'
import { pushManager } from '@/lib/notifications/push-manager'
import { useAuth } from '@/lib/contexts/auth-context'

interface NotificationSettingsProps {
  className?: string
}

export function NotificationSettings({ className }: NotificationSettingsProps) {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default')
  const [isLoading, setIsLoading] = useState(false)
  const [preferences, setPreferences] = useState({
    taskAssignments: true,
    mentions: true,
    projectUpdates: true,
    deadlines: true,
    teamMembers: false
  })
  const { user } = useAuth()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsSubscribed(pushManager.isSubscribed())
      setPermissionStatus(pushManager.getPermissionStatus())
    }
  }, [])

  const handleToggleSubscription = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      if (isSubscribed) {
        await pushManager.unsubscribe()
        setIsSubscribed(false)
      } else {
        const permission = await pushManager.requestPermission()
        if (permission === 'granted') {
          await pushManager.subscribe(user.id)
          setIsSubscribed(true)
        }
        setPermissionStatus(permission)
      }
    } catch (error) {
      console.error('[NotificationSettings] Failed to toggle subscription:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestNotification = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          title: 'Test Notification',
          body: 'This is a test notification from Foco!',
          icon: '/icons/manifest-icon-192.maskable.png',
          tag: 'test-notification'
        }),
      })

      if (response.ok) {
        console.log('Test notification sent')
      }
    } catch (error) {
      console.error('Failed to send test notification:', error)
    }
  }

  const handlePreferenceChange = async (key: string, value: boolean) => {
    const newPreferences = {
      ...preferences,
      [key]: value
    }
    setPreferences(newPreferences)
    
    // Map UI preference keys to API field names
    const fieldMap: Record<string, string> = {
      taskAssignments: 'notify_task_assignments',
      mentions: 'notify_mentions',
      projectUpdates: 'notify_project_updates',
      deadlines: 'notify_deadlines',
      teamMembers: 'notify_team_members'
    }
    
    const apiField = fieldMap[key]
    if (!apiField) return
    
    try {
      await fetch('/api/user/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [apiField]: value })
      })
    } catch (error) {
      console.error('[NotificationSettings] Failed to save preference:', error)
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="w-5 h-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Manage your notification preferences and test your setup
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Subscription Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Enable Notifications</Label>
              <p className="text-sm text-gray-600">
                {permissionStatus === 'granted' 
                  ? 'Notifications are enabled and working'
                  : permissionStatus === 'denied'
                  ? 'Notifications are blocked in your browser'
                  : 'Click to enable push notifications'
                }
              </p>
            </div>
            <Switch
              checked={isSubscribed}
              onCheckedChange={handleToggleSubscription}
              disabled={isLoading || permissionStatus === 'denied'}
            />
          </div>

          {permissionStatus === 'denied' && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Notifications are blocked. To enable them, click the notification icon in your browser&apos;s address bar and allow notifications for this site.
              </p>
            </div>
          )}
        </div>

        {/* Notification Preferences */}
        {isSubscribed && (
          <div className="space-y-4">
            <h4 className="font-medium">Notification Types</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Task Assignments</Label>
                  <p className="text-sm text-gray-600">When someone assigns you a task</p>
                </div>
                <Switch
                  checked={preferences.taskAssignments}
                  onCheckedChange={(value) => handlePreferenceChange('taskAssignments', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Mentions</Label>
                  <p className="text-sm text-gray-600">When someone mentions you in comments</p>
                </div>
                <Switch
                  checked={preferences.mentions}
                  onCheckedChange={(value) => handlePreferenceChange('mentions', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Project Updates</Label>
                  <p className="text-sm text-gray-600">When projects you&apos;re part of are updated</p>
                </div>
                <Switch
                  checked={preferences.projectUpdates}
                  onCheckedChange={(value) => handlePreferenceChange('projectUpdates', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Deadline Reminders</Label>
                  <p className="text-sm text-gray-600">When deadlines are approaching</p>
                </div>
                <Switch
                  checked={preferences.deadlines}
                  onCheckedChange={(value) => handlePreferenceChange('deadlines', value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Team Members</Label>
                  <p className="text-sm text-gray-600">When new members join your projects</p>
                </div>
                <Switch
                  checked={preferences.teamMembers}
                  onCheckedChange={(value) => handlePreferenceChange('teamMembers', value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Test Notification */}
        {isSubscribed && (
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleTestNotification}
              className="w-full"
            >
              <TestTube className="w-4 h-4" />
              Send Test Notification
            </Button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Test if notifications are working properly
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
