'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Download,
  Upload,
  Save,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/hooks/use-auth'
import { useSyncStatus } from '@/lib/hooks/useSyncStatus'
import { SyncIndicator } from '@/components/ui/sync-indicator'
import { RoleManagement } from './role-management'
import { ExportDialog } from '@/components/deprecation/ExportDialog'

interface UserSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  emailNotifications: boolean
  pushNotifications: boolean
  weeklyReports: boolean
  marketingEmails: boolean
}

interface OrganizationSettings {
  name: string
  description: string
  allowPublicProjects: boolean
  requireApproval: boolean
  defaultVisibility: 'private' | 'public'
}

export function SettingsDashboard() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'profile'

  const [isSaving, setIsSaving] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  const [userSettings, setUserSettings] = useState<UserSettings>({
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    emailNotifications: true,
    pushNotifications: true,
    weeklyReports: false,
    marketingEmails: false
  })

  const [orgSettings, setOrgSettings] = useState<OrganizationSettings>({
    name: 'My Organization',
    description: '',
    allowPublicProjects: false,
    requireApproval: true,
    defaultVisibility: 'private'
  })

  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Auto-save sync status tracking
  const userSyncStatus = useSyncStatus({ syncedResetMs: 2000, errorResetMs: 4000 })
  const orgSyncStatus = useSyncStatus({ syncedResetMs: 2000, errorResetMs: 4000 })
  const autoSaveDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const loadSettings = useCallback(async () => {
    if (!user) return

    // For demo purposes, just show sample data
    setUserSettings({
      theme: 'dark',
      language: 'en',
      timezone: 'America/New_York',
      emailNotifications: true,
      pushNotifications: true,
      weeklyReports: true,
      marketingEmails: false
    })

    setOrgSettings({
      name: 'Fyves',
      description: 'Leading technology solutions and project management',
      allowPublicProjects: true,
      requireApproval: false,
      defaultVisibility: 'private'
    })

    setIsLoading(false);
  }, [user])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (autoSaveDebounceRef.current) {
        clearTimeout(autoSaveDebounceRef.current)
      }
    }
  }, [])

  // Auto-save user settings with debouncing
  useEffect(() => {
    if (autoSaveDebounceRef.current) {
      clearTimeout(autoSaveDebounceRef.current)
    }

    autoSaveDebounceRef.current = setTimeout(() => {
      performSaveUserSettings()
    }, 500) // 500ms debounce

    return () => {
      if (autoSaveDebounceRef.current) {
        clearTimeout(autoSaveDebounceRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSettings])

  const performSaveUserSettings = async () => {
    if (!user) return

    userSyncStatus.startSync()
    try {
      console.log('[Settings] Auto-saving user settings:', {
        full_name: user.user_metadata?.full_name || user.email,
        timezone: userSettings.timezone,
        language: userSettings.language
      })

      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: user.user_metadata?.full_name || user.email,
          timezone: userSettings.timezone,
          language: userSettings.language
        })
      })

      const responseData = await response.json()
      console.log('[Settings] Profile update response:', response.status, responseData)

      if (!response.ok) {
        console.error('[Settings] Profile update failed:', response.status, responseData)
        throw new Error(responseData.error || 'Failed to save settings')
      }

      console.log('[Settings] Profile updated successfully')

      // Also save notification settings
      const notifResponse = await fetch('/api/user/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_notifications: userSettings.emailNotifications,
          push_notifications: userSettings.pushNotifications,
          weekly_reports: userSettings.weeklyReports,
          marketing_emails: userSettings.marketingEmails
        })
      })

      if (!notifResponse.ok) {
        throw new Error('Failed to save notification settings')
      }

      userSyncStatus.completeSync()
    } catch (error) {
      console.error('[Settings] Error saving user settings:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings'
      userSyncStatus.setSyncError(errorMessage)
      toast.error(errorMessage, {
        action: {
          label: 'Retry',
          onClick: () => performSaveUserSettings()
        }
      })
    }
  }

  const saveUserSettings = async () => {
    if (!user) return

    setSaving(true)
    try {
      console.log('[Settings] Saving user settings:', {
        full_name: user.user_metadata?.full_name || user.email,
        timezone: userSettings.timezone,
        language: userSettings.language
      })

      const response = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: user.user_metadata?.full_name || user.email,
          timezone: userSettings.timezone,
          language: userSettings.language
        })
      })

      const responseData = await response.json()
      console.log('[Settings] Profile update response:', response.status, responseData)

      if (!response.ok) {
        console.error('[Settings] Profile update failed:', response.status, responseData)
        throw new Error(responseData.error || 'Failed to save settings')
      }

      console.log('[Settings] Profile updated successfully')

      // Also save notification settings
      await fetch('/api/user/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_notifications: userSettings.emailNotifications,
          push_notifications: userSettings.pushNotifications,
          weekly_reports: userSettings.weeklyReports,
          marketing_emails: userSettings.marketingEmails
        })
      })

      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('[Settings] Error saving user settings:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Failed to save settings: ' + errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const saveOrgSettings = async () => {
    orgSyncStatus.startSync()
    setSaving(true)
    try {
      // Get organization ID first
      const orgResponse = await fetch('/api/user/organization')
      if (!orgResponse.ok) throw new Error('Failed to get organization')
      const orgData = await orgResponse.json()
      const orgId = orgData.organization_id

      const response = await fetch(`/api/organizations/${orgId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgSettings.name,
          description: orgSettings.description,
          allowPublicProjects: orgSettings.allowPublicProjects,
          requireApproval: orgSettings.requireApproval,
          defaultVisibility: orgSettings.defaultVisibility
        })
      })

      if (!response.ok) throw new Error('Failed to save organization settings')
      orgSyncStatus.completeSync()
      toast.success('Organization settings saved')
    } catch (error) {
      console.error('Error saving organization settings:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings'
      orgSyncStatus.setSyncError(errorMessage)
      toast.error(errorMessage, {
        action: {
          label: 'Retry',
          onClick: () => saveOrgSettings()
        }
      })
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = async () => {
    if (!user) return

    try {
      // For demo purposes, simulate export
      await new Promise(resolve => setTimeout(resolve, 2000))
      // Show download link
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="organization" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and preferences.
                  </CardDescription>
                </div>
                <SyncIndicator
                  status={userSyncStatus.syncStatus}
                  errorMessage={userSyncStatus.syncErrorMessage}
                  showLabel
                  compact={false}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={user?.user_metadata?.full_name || ''}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                  />
                  <p className="text-sm text-muted-foreground">
                    Email cannot be changed here. Contact support if needed.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select value={userSettings.language} onValueChange={(value) =>
                    setUserSettings({...userSettings, language: value})
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={userSettings.timezone} onValueChange={(value) =>
                    setUserSettings({...userSettings, timezone: value})
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveUserSettings} disabled={saving}>
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose how you want to be notified about project updates and activities.
                  </CardDescription>
                </div>
                <SyncIndicator
                  status={userSyncStatus.syncStatus}
                  errorMessage={userSyncStatus.syncErrorMessage}
                  showLabel
                  compact={false}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email notifications for important updates
                    </p>
                  </div>
                  <Switch
                    checked={userSettings.emailNotifications}
                    onCheckedChange={(checked) =>
                      setUserSettings({...userSettings, emailNotifications: checked})
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications in your browser
                    </p>
                  </div>
                  <Switch
                    checked={userSettings.pushNotifications}
                    onCheckedChange={(checked) =>
                      setUserSettings({...userSettings, pushNotifications: checked})
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekly Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Get weekly summary reports of your projects
                    </p>
                  </div>
                  <Switch
                    checked={userSettings.weeklyReports}
                    onCheckedChange={(checked) =>
                      setUserSettings({...userSettings, weeklyReports: checked})
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Marketing Emails</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive emails about new features and updates
                    </p>
                  </div>
                  <Switch
                    checked={userSettings.marketingEmails}
                    onCheckedChange={(checked) =>
                      setUserSettings({...userSettings, marketingEmails: checked})
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveUserSettings} disabled={saving}>
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Appearance Settings</CardTitle>
                  <CardDescription>
                    Customize how Foco looks and feels for you.
                  </CardDescription>
                </div>
                <SyncIndicator
                  status={userSyncStatus.syncStatus}
                  errorMessage={userSyncStatus.syncErrorMessage}
                  showLabel
                  compact={false}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={userSettings.theme} onValueChange={(value: any) =>
                  setUserSettings({...userSettings, theme: value})
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Choose your preferred theme or follow your system setting.
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveUserSettings} disabled={saving}>
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Theme'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Organization Settings</CardTitle>
                  <CardDescription>
                    Manage your organization&apos;s settings and preferences.
                  </CardDescription>
                </div>
                <SyncIndicator
                  status={orgSyncStatus.syncStatus}
                  errorMessage={orgSyncStatus.syncErrorMessage}
                  showLabel
                  compact={false}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    value={orgSettings.name}
                    onChange={(e) => setOrgSettings({...orgSettings, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-description">Description</Label>
                  <Input
                    id="org-description"
                    value={orgSettings.description}
                    onChange={(e) => setOrgSettings({...orgSettings, description: e.target.value})}
                    placeholder="Brief description of your organization"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Public Projects</Label>
                    <p className="text-sm text-muted-foreground">
                      Let team members create public projects visible to all users
                    </p>
                  </div>
                  <Switch
                    checked={orgSettings.allowPublicProjects}
                    onCheckedChange={(checked) =>
                      setOrgSettings({...orgSettings, allowPublicProjects: checked})
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      Require admin approval for new projects and team changes
                    </p>
                  </div>
                  <Switch
                    checked={orgSettings.requireApproval}
                    onCheckedChange={(checked) =>
                      setOrgSettings({...orgSettings, requireApproval: checked})
                    }
                  />
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Default Project Visibility</Label>
                  <Select value={orgSettings.defaultVisibility} onValueChange={(value: any) =>
                    setOrgSettings({...orgSettings, defaultVisibility: value})
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="public">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveOrgSettings} disabled={saving}>
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Organization Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <RoleManagement />
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <CardTitle>Deprecated Features - Export Your Data</CardTitle>
              </div>
              <CardDescription className="text-amber-800 dark:text-amber-200">
                Some features will be removed in Phase 3. Export your data before they&apos;re discontinued.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium">Backup Deprecated Features</h4>
                      <p className="text-sm text-muted-foreground">
                        Export data from Gantt charts, custom fields, time tracking, and goals before removal.
                      </p>
                    </div>
                    <Button
                      onClick={() => setExportDialogOpen(true)}
                      className="gap-2 bg-amber-600 hover:bg-amber-700"
                    >
                      <Download className="h-4 w-4" />
                      Export Deprecated Data
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Important:</strong> These features will be removed on February 15, 2026. Export your data now to preserve it.
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <CardDescription>
                Export your data or manage your account data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Export Your Data</h4>
                    <p className="text-sm text-muted-foreground">
                      Download a copy of all your data including projects, tasks, and settings.
                    </p>
                  </div>
                  <Button onClick={handleExportData} variant="outline">
                    <Download className="h-4 w-4" />
                    Export Data
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <h4 className="font-medium">Import Data</h4>
                    <p className="text-sm text-muted-foreground">
                      Import data from another project management tool.
                    </p>
                  </div>
                  <Button variant="outline">
                    <Upload className="h-4 w-4" />
                    Import Data
                  </Button>
                </div>

                <div className="p-4 border rounded-lg border-destructive/50 bg-destructive/5">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="font-medium text-destructive">Delete Account</h4>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all associated data.
                      </p>
                    </div>
                    <Button variant="destructive">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Dialog for Deprecated Features */}
      {user && (
        <ExportDialog
          userId={user.id}
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
        />
      )}
    </div>
  )
}
