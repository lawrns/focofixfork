'use client'

import { useState, useEffect } from 'react'
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
  EyeOff
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'

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

  useEffect(() => {
    loadSettings()
  }, [user])

  const loadSettings = async () => {
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

    setIsLoading(false)
  }

  const saveUserSettings = async () => {
    if (!user) return

    setSaving(true)
    try {
      // For demo purposes, just simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Show success message
    } catch (error) {
      console.error('Error saving user settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const saveOrgSettings = async () => {
    setSaving(true)
    try {
      // For demo purposes, just simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Show success message
    } catch (error) {
      console.error('Error saving organization settings:', error)
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
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
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
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and preferences.
              </CardDescription>
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
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified about project updates and activities.
              </CardDescription>
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
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize how Foco looks and feels for you.
              </CardDescription>
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
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Theme'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>
                Manage your organization&apos;s settings and preferences.
              </CardDescription>
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
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Organization Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
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
                    <Download className="h-4 w-4 mr-2" />
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
                    <Upload className="h-4 w-4 mr-2" />
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
    </div>
  )
}
