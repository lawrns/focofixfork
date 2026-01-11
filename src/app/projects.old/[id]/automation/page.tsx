'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { AutomationRulesList } from '@/components/automation/automation-rules-list'
import { AutomationTemplates } from '@/components/automation/automation-templates'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Zap, 
  FileText, 
  BarChart3, 
  Settings, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertTriangle,
  Clock,
  Users,
  Calendar,
  Bell,
  Info
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useTranslation } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

export default function ProjectAutomationPage() {
  const params = useParams()
  const { user } = useAuth()
  const { t } = useTranslation()
  
  const projectId = params.id as string
  const [activeTab, setActiveTab] = useState('rules')
  const [showTemplates, setShowTemplates] = useState(false)

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
    <ProtectedRoute>
      <MainLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Zap className="h-8 w-8 text-primary" />
                {t('automation.title')}
              </h1>
              <p className="text-muted-foreground mt-2">
                {t('automation.description')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTemplates(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                {t('automation.browseTemplates')}
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('automation.activeRules')}</CardTitle>
                <Play className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  {t('automation.rulesRunning')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('automation.totalExecutions')}</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  {t('automation.thisMonth')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('automation.successRate')}</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0%</div>
                <p className="text-xs text-muted-foreground">
                  {t('automation.executionSuccess')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('automation.avgResponseTime')}</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0ms</div>
                <p className="text-xs text-muted-foreground">
                  {t('automation.perExecution')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="rules" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                {t('automation.rules')}
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {t('automation.templates')}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                {t('automation.analytics')}
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {t('automation.settings')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rules" className="space-y-4">
              <AutomationRulesList
                projectId={projectId}
                userId={user.id}
              />
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">{t('automation.templatesComingSoon')}</h3>
                <p className="text-muted-foreground mb-4">{t('automation.templatesDescription')}</p>
                <Button onClick={() => setShowTemplates(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  {t('automation.browseTemplates')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">{t('automation.analyticsComingSoon')}</h3>
                <p className="text-muted-foreground">{t('automation.analyticsDescription')}</p>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    {t('automation.automationSettings')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">{t('automation.settingsComingSoon')}</p>
                    <p className="text-sm">{t('automation.settingsDescription')}</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Templates Dialog */}
        <AutomationTemplates
          isOpen={showTemplates}
          onClose={() => setShowTemplates(false)}
          projectId={projectId}
          userId={user.id}
          onTemplateSelected={(template) => {
            console.log('Template selected:', template)
            // Handle template selection
          }}
        />
      </MainLayout>
    </ProtectedRoute>
  )
}

