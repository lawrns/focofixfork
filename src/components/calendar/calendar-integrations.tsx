'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { 
  Calendar, 
  Plus, 
  Settings, 
  Trash2, 
  RefreshCw as Sync, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  ExternalLink,
  Shield,
  RefreshCw,
  Globe,
  Mail,
  Smartphone,
  Monitor
} from 'lucide-react'
import { CalendarIntegration, ExternalCalendar } from '@/lib/models/calendar'
import { CalendarService } from '@/lib/services/calendar-service'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/components/ui/toast'
import { useTranslation } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface CalendarIntegrationsProps {
  className?: string
}

export function CalendarIntegrations({ className }: CalendarIntegrationsProps) {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { addToast } = useToast()

  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [syncingIntegrations, setSyncingIntegrations] = useState<Set<string>>(new Set())

  const loadIntegrations = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)
      const integrationsData = await CalendarService.getIntegrations(user.id)
      setIntegrations(integrationsData)
    } catch (error: any) {
      console.error('Failed to load calendar integrations:', error)
      addToast({
        type: 'error',
        title: t('common.error'),
        description: error.message || t('calendar.loadIntegrationsError'),
      })
    } finally {
      setIsLoading(false)
    }
  }, [user, addToast, t])

  useEffect(() => {
    if (user) {
      loadIntegrations()
    }
  }, [user, loadIntegrations])

  const handleToggleSync = async (integrationId: string, enabled: boolean) => {
    try {
      await CalendarService.updateIntegration(integrationId, { syncEnabled: enabled })
      setIntegrations(prev => prev.map(integration => 
        integration.id === integrationId 
          ? { ...integration, syncEnabled: enabled }
          : integration
      ))
      addToast({
        type: 'success',
        title: t('common.success'),
        description: enabled ? t('calendar.syncEnabled') : t('calendar.syncDisabled')
      })
    } catch (error: any) {
      console.error('Failed to toggle sync:', error)
      addToast({
        type: 'error',
        title: t('common.error'),
        description: error.message || t('calendar.toggleSyncError'),
      })
    }
  }

  const handleSyncNow = async (integrationId: string) => {
    try {
      setSyncingIntegrations(prev => new Set(prev).add(integrationId))
      await CalendarService.startSync(integrationId, 'manual')
      addToast({
        type: 'success',
        title: t('common.success'),
        description: t('calendar.syncStarted')
      })
    } catch (error: any) {
      console.error('Failed to start sync:', error)
      addToast({
        type: 'error',
        title: t('common.error'),
        description: error.message || t('calendar.syncStartError'),
      })
    } finally {
      setSyncingIntegrations(prev => {
        const newSet = new Set(prev)
        newSet.delete(integrationId)
        return newSet
      })
    }
  }

  const handleDeleteIntegration = async (integrationId: string) => {
    try {
      await CalendarService.deleteIntegration(integrationId)
      setIntegrations(prev => prev.filter(integration => integration.id !== integrationId))
      setShowDeleteDialog(null)
      addToast({
        type: 'success',
        title: t('common.success'),
        description: t('calendar.integrationDeleted')
      })
    } catch (error: any) {
      console.error('Failed to delete integration:', error)
      addToast({
        type: 'error',
        title: t('common.error'),
        description: error.message || t('calendar.deleteIntegrationError'),
      })
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return <Globe className="h-5 w-5 text-blue-500" />
      case 'outlook':
        return <Mail className="h-5 w-5 text-blue-600" />
      case 'apple':
        return <Smartphone className="h-5 w-5 text-gray-600" />
      case 'caldav':
        return <Monitor className="h-5 w-5 text-green-500" />
      default:
        return <Calendar className="h-5 w-5 text-gray-500" />
    }
  }

  const getProviderName = (provider: string) => {
    switch (provider) {
      case 'google':
        return 'Google Calendar'
      case 'outlook':
        return 'Outlook Calendar'
      case 'apple':
        return 'Apple Calendar'
      case 'caldav':
        return 'CalDAV'
      default:
        return provider
    }
  }

  const getSyncStatus = (integration: CalendarIntegration) => {
    if (!integration.syncEnabled) {
      return {
        status: 'disabled',
        label: t('calendar.disabled'),
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
        icon: AlertTriangle
      }
    }

    if (integration.lastError) {
      return {
        status: 'error',
        label: t('calendar.error'),
        color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
        icon: AlertTriangle
      }
    }

    if (integration.lastSyncAt) {
      const lastSync = new Date(integration.lastSyncAt)
      const now = new Date()
      const diffHours = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)

      if (diffHours < 1) {
        return {
          status: 'synced',
          label: t('calendar.synced'),
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
          icon: CheckCircle
        }
      } else if (diffHours < 24) {
        return {
          status: 'stale',
          label: t('calendar.stale'),
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
          icon: Clock
        }
      } else {
        return {
          status: 'outdated',
          label: t('calendar.outdated'),
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
          icon: AlertTriangle
        }
      }
    }

    return {
      status: 'never',
      label: t('calendar.neverSynced'),
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
      icon: Clock
    }
  }

  const getSyncDirectionLabel = (direction: string) => {
    switch (direction) {
      case 'foco_to_external':
        return t('calendar.focoToExternal')
      case 'external_to_foco':
        return t('calendar.externalToFoco')
      case 'bidirectional':
        return t('calendar.bidirectional')
      default:
        return direction
    }
  }

  const getSyncFrequencyLabel = (frequency: string) => {
    switch (frequency) {
      case 'realtime':
        return t('calendar.realtime')
      case 'hourly':
        return t('calendar.hourly')
      case 'daily':
        return t('calendar.daily')
      default:
        return frequency
    }
  }

  const handleAddIntegration = useCallback(() => {
    addToast({
      type: 'info',
      title: t('calendar.addIntegration'),
      description: 'Calendar integration setup coming soon. Choose a provider below to get started.',
    })
  }, [addToast, t])

  const handleConnectProvider = useCallback((provider: string, name: string) => {
    addToast({
      type: 'info',
      title: `Connect ${name}`,
      description: `${name} integration coming soon. This will allow you to sync events bidirectionally with your ${name}.`,
    })
  }, [addToast])

  if (!user) {
    return (
      <div className={cn("p-6", className)}>
        <p>{t('auth.notAuthenticated')}</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            {t('calendar.integrations')}
          </h2>
          <p className="text-muted-foreground mt-2">
            {t('calendar.integrationsDescription')}
          </p>
        </div>
        
        <Button onClick={handleAddIntegration}>
          <Plus className="h-4 w-4" />
          {t('calendar.addIntegration')}
        </Button>
      </div>

      {/* Available Providers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            {t('calendar.availableProviders')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { provider: 'google', name: 'Google Calendar', description: 'Sync with Google Calendar' },
              { provider: 'outlook', name: 'Outlook Calendar', description: 'Sync with Microsoft Outlook' },
              { provider: 'apple', name: 'Apple Calendar', description: 'Sync with Apple Calendar' },
              { provider: 'caldav', name: 'CalDAV', description: 'Sync with CalDAV servers' }
            ].map(({ provider, name, description }) => (
              <Card key={provider} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    {getProviderIcon(provider)}
                    <div>
                      <h3 className="font-semibold">{name}</h3>
                      <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  <Button className="w-full" size="sm" onClick={() => handleConnectProvider(provider, name)}>
                    <Plus className="h-4 w-4" />
                    {t('calendar.connect')}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Connected Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('calendar.connectedIntegrations')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="p-4">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-1/3"></div>
                  </div>
                </Card>
              ))}
            </div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">{t('calendar.noIntegrations')}</p>
              <p className="text-sm">{t('calendar.noIntegrationsDescription')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {integrations.map(integration => {
                const syncStatus = getSyncStatus(integration)
                const StatusIcon = syncStatus.icon
                const isSyncing = syncingIntegrations.has(integration.id)

                return (
                  <Card key={integration.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {getProviderIcon(integration.provider)}
                        <div>
                          <h3 className="font-semibold">{integration.providerName}</h3>
                          <p className="text-sm text-muted-foreground">{integration.providerEmail}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <StatusIcon className="h-4 w-4" />
                            <Badge className={cn("text-xs", syncStatus.color)}>
                              {syncStatus.label}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('calendar.syncDirection')}: {getSyncDirectionLabel(integration.syncDirection)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('calendar.syncFrequency')}: {getSyncFrequencyLabel(integration.syncFrequency)}
                          </div>
                          {integration.lastSyncAt && (
                            <div className="text-xs text-muted-foreground">
                              {t('calendar.lastSync')}: {format(new Date(integration.lastSyncAt), 'MMM d, HH:mm')}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={integration.syncEnabled}
                              onCheckedChange={(checked) => handleToggleSync(integration.id, checked)}
                            />
                            <Label className="text-sm">{t('calendar.enabled')}</Label>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncNow(integration.id)}
                            disabled={isSyncing || !integration.syncEnabled}
                          >
                            {isSyncing ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Sync className="h-4 w-4" />
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDeleteDialog(integration.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {integration.lastError && (
                      <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                        <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-medium">{t('calendar.lastError')}</span>
                        </div>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          {integration.lastError}
                        </p>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('calendar.deleteIntegration')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('calendar.deleteIntegrationConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteDialog && handleDeleteIntegration(showDeleteDialog)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
