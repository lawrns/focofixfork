'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/toast/toast'
import { Loader2, Settings, Bell, Shield, Archive } from 'lucide-react'
import { type Project } from '@/lib/validation/schemas/project.schema'

interface ProjectSettings {
  allowGuestComments: boolean
  requireApprovalForChanges: boolean
  autoArchiveCompletedTasks: boolean
  notificationSettings: {
    emailOnTaskAssignment: boolean
    emailOnMilestoneCompletion: boolean
    emailOnProjectChanges: boolean
  }
  visibility: 'private' | 'organization' | 'public'
}

interface ProjectSettingsDialogProps {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (projectId: string, settings: ProjectSettings) => Promise<void>
}

export default function ProjectSettingsDialog({
  project,
  open,
  onOpenChange,
  onSave
}: ProjectSettingsDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [settings, setSettings] = useState<ProjectSettings>({
    allowGuestComments: false,
    requireApprovalForChanges: false,
    autoArchiveCompletedTasks: true,
    notificationSettings: {
      emailOnTaskAssignment: true,
      emailOnMilestoneCompletion: true,
      emailOnProjectChanges: false,
    },
    visibility: 'organization'
  })
  const { toast } = useToast()

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave(project.id, settings)
      toast({
        title: 'Success',
        description: 'Project settings updated successfully',
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update settings. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateSetting = (key: keyof ProjectSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const updateNotificationSetting = (key: keyof ProjectSettings['notificationSettings'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notificationSettings: {
        ...prev.notificationSettings,
        [key]: value
      }
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Project Settings</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure settings for {project.name}
              </p>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">General Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Auto-archive completed tasks</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically archive tasks when marked as completed
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoArchiveCompletedTasks}
                    onCheckedChange={(checked) => updateSetting('autoArchiveCompletedTasks', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Project Visibility</Label>
                  <Select
                    value={settings.visibility}
                    onValueChange={(value: ProjectSettings['visibility']) => updateSetting('visibility', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private - Only team members</SelectItem>
                      <SelectItem value="organization">Organization - All org members</SelectItem>
                      <SelectItem value="public">Public - Anyone with link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Email Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Task assignments</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when tasks are assigned to team members
                    </p>
                  </div>
                  <Switch
                    checked={settings.notificationSettings.emailOnTaskAssignment}
                    onCheckedChange={(checked) => updateNotificationSetting('emailOnTaskAssignment', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Milestone completion</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify when milestones are marked as completed
                    </p>
                  </div>
                  <Switch
                    checked={settings.notificationSettings.emailOnMilestoneCompletion}
                    onCheckedChange={(checked) => updateNotificationSetting('emailOnMilestoneCompletion', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Project changes</Label>
                    <p className="text-sm text-muted-foreground">
                      Notify on major project updates and changes
                    </p>
                  </div>
                  <Switch
                    checked={settings.notificationSettings.emailOnProjectChanges}
                    onCheckedChange={(checked) => updateNotificationSetting('emailOnProjectChanges', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Permissions & Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require approval for changes</Label>
                    <p className="text-sm text-muted-foreground">
                      Changes need admin approval before taking effect
                    </p>
                  </div>
                  <Switch
                    checked={settings.requireApprovalForChanges}
                    onCheckedChange={(checked) => updateSetting('requireApprovalForChanges', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow guest comments</Label>
                    <p className="text-sm text-muted-foreground">
                      Guests can add comments to tasks and milestones
                    </p>
                  </div>
                  <Switch
                    checked={settings.allowGuestComments}
                    onCheckedChange={(checked) => updateSetting('allowGuestComments', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  Advanced Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Advanced settings will be available in future updates.
                  This includes data export, backup configurations, and integration settings.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

