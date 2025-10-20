'use client'

import React, { useState } from 'react'
import MainLayout from '@/components/layout/MainLayout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { CalendarView } from '@/components/calendar/calendar-view'
import { CalendarIntegrations } from '@/components/calendar/calendar-integrations'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar, 
  Settings, 
  BarChart3, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  Activity
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useTranslation } from '@/lib/i18n/context'
import { CalendarService } from '@/lib/services/calendar-service'
import { useEffect, useState as useStateEffect } from 'react'

export default function CalendarPage() {
  return (
    <ProtectedRoute>
      <CalendarPageContent />
    </ProtectedRoute>
  )
}

function CalendarPageContent() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('calendar')
  const [analytics, setAnalytics] = useStateEffect<any>(null)

  useEffect(() => {
    if (user) {
      loadAnalytics()
    }
  }, [user])

  const loadAnalytics = async () => {
    if (!user) return

    try {
      const analyticsData = await CalendarService.getAnalytics(user.id, 'month')
      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Failed to load calendar analytics:', error)
    }
  }

  if (!user) {
    return (
      <MainLayout>
        <div className="p-6">
          <p>{t('auth.notAuthenticated')}</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Calendar className="h-8 w-8 text-primary" />
              {t('calendar.title')}
            </h1>
            <p className="text-muted-foreground mt-2">
              {t('calendar.description')}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('calendar.totalEvents')}</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalEvents}</div>
                <p className="text-xs text-muted-foreground">
                  {t('calendar.thisMonth')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('calendar.syncSuccessRate')}</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.syncSuccessRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  {t('calendar.successfulSyncs')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('calendar.activeIntegrations')}</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.activeIntegrations}</div>
                <p className="text-xs text-muted-foreground">
                  {t('calendar.connectedCalendars')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('calendar.avgSyncTime')}</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(analytics.averageSyncTime / 1000).toFixed(1)}s</div>
                <p className="text-xs text-muted-foreground">
                  {t('calendar.perSync')}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('calendar.calendar')}
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              {t('calendar.integrations')}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('calendar.analytics')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4">
            <CalendarView />
          </TabsContent>

          <TabsContent value="integrations" className="space-y-4">
            <CalendarIntegrations />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">{t('calendar.analyticsComingSoon')}</h3>
              <p className="text-muted-foreground">{t('calendar.analyticsDescription')}</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}

