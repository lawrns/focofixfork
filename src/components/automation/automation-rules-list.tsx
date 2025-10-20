'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { 
  MoreVertical, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Copy, 
  BarChart3, 
  Zap, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Info,
  Plus,
  Settings,
  Move,
  Calendar,
  Globe,
  Bell,
  Mail,
  Archive,
  Code
} from 'lucide-react'
import { AutomationRule } from '@/lib/models/automation'
import { AutomationService } from '@/lib/services/automation-service'
import { AutomationRuleBuilder } from './automation-rule-builder'
import { useToast } from '@/components/ui/toast'
import { useTranslation } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

interface AutomationRulesListProps {
  projectId: string
  userId: string
  className?: string
}

export function AutomationRulesList({ projectId, userId, className }: AutomationRulesListProps) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [rules, setRules] = useState<AutomationRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showRuleBuilder, setShowRuleBuilder] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)

  useEffect(() => {
    loadRules()
  }, [projectId])

  const loadRules = async () => {
    try {
      setIsLoading(true)
      const rulesData = await AutomationService.getRules(projectId)
      setRules(rulesData)
    } catch (error: any) {
      console.error('Failed to load automation rules:', error)
      toast({
        title: t('common.error'),
        description: error.message || t('automation.loadError'),
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      await AutomationService.toggleRule(ruleId, isActive)
      setRules(prev => prev.map(rule => 
        rule.id === ruleId ? { ...rule, is_active: isActive } : rule
      ))
      toast({
        title: t('common.success'),
        description: isActive ? t('automation.ruleActivated') : t('automation.ruleDeactivated')
      })
    } catch (error: any) {
      console.error('Failed to toggle rule:', error)
      toast({
        title: t('common.error'),
        description: error.message || t('automation.toggleError'),
        variant: 'destructive'
      })
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    try {
      await AutomationService.deleteRule(ruleId)
      setRules(prev => prev.filter(rule => rule.id !== ruleId))
      setShowDeleteDialog(null)
      toast({
        title: t('common.success'),
        description: t('automation.ruleDeleted')
      })
    } catch (error: any) {
      console.error('Failed to delete rule:', error)
      toast({
        title: t('common.error'),
        description: error.message || t('automation.deleteError'),
        variant: 'destructive'
      })
    }
  }

  const handleRuleSaved = (savedRule: AutomationRule) => {
    if (editingRule) {
      setRules(prev => prev.map(rule => 
        rule.id === savedRule.id ? savedRule : rule
      ))
    } else {
      setRules(prev => [savedRule, ...prev])
    }
    setEditingRule(null)
    setShowRuleBuilder(false)
  }

  const handleEditRule = (rule: AutomationRule) => {
    setEditingRule(rule)
    setShowRuleBuilder(true)
  }

  const handleDuplicateRule = async (rule: AutomationRule) => {
    try {
      const duplicatedRule = await AutomationService.createRule({
        ...rule,
        name: `${rule.name} (Copy)`,
        execution_count: 0,
        last_executed_at: undefined,
        next_execution_at: undefined
      })
      setRules(prev => [duplicatedRule, ...prev])
      toast({
        title: t('common.success'),
        description: t('automation.ruleDuplicated')
      })
    } catch (error: any) {
      console.error('Failed to duplicate rule:', error)
      toast({
        title: t('common.error'),
        description: error.message || t('automation.duplicateError'),
        variant: 'destructive'
      })
    }
  }

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'task_created': return <Plus className="h-4 w-4" />
      case 'task_updated': return <Settings className="h-4 w-4" />
      case 'task_moved': return <Move className="h-4 w-4" />
      case 'task_due_soon': return <Clock className="h-4 w-4" />
      case 'task_overdue': return <AlertTriangle className="h-4 w-4" />
      case 'milestone_reached': return <CheckCircle className="h-4 w-4" />
      case 'project_updated': return <Settings className="h-4 w-4" />
      case 'schedule': return <Calendar className="h-4 w-4" />
      case 'webhook': return <Globe className="h-4 w-4" />
      default: return <Zap className="h-4 w-4" />
    }
  }

  const getTriggerLabel = (trigger: any) => {
    switch (trigger.type) {
      case 'task_created': return t('automation.triggerTaskCreated')
      case 'task_updated': return t('automation.triggerTaskUpdated')
      case 'task_moved': return t('automation.triggerTaskMoved')
      case 'task_due_soon': return t('automation.triggerTaskDueSoon')
      case 'task_overdue': return t('automation.triggerTaskOverdue')
      case 'milestone_reached': return t('automation.triggerMilestoneReached')
      case 'project_updated': return t('automation.triggerProjectUpdated')
      case 'schedule': return t('automation.triggerSchedule')
      case 'webhook': return t('automation.triggerWebhook')
      default: return trigger.type
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
      case 'medium': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
      case 'high': return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    }
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{t('automation.rules')}</h2>
        </div>
        <div className="grid gap-4">
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
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('automation.rules')}</h2>
          <p className="text-muted-foreground">{t('automation.rulesDescription')}</p>
        </div>
        <Button onClick={() => setShowRuleBuilder(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('automation.createRule')}
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card className="p-8 text-center">
          <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">{t('automation.noRules')}</h3>
          <p className="text-muted-foreground mb-4">{t('automation.noRulesDescription')}</p>
          <Button onClick={() => setShowRuleBuilder(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('automation.createFirstRule')}
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map(rule => (
            <Card key={rule.id} className={cn(
              "transition-all duration-200 hover:shadow-md",
              !rule.is_active && "opacity-60"
            )}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-1">
                      {getTriggerIcon(rule.trigger.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        {rule.name}
                        {!rule.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            {t('automation.inactive')}
                          </Badge>
                        )}
                      </CardTitle>
                      {rule.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {rule.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">{t('common.openMenu')}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditRule(rule)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateRule(rule)}>
                          <Copy className="mr-2 h-4 w-4" />
                          {t('common.duplicate')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setShowDeleteDialog(rule.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('common.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Trigger and Priority */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t('automation.trigger')}:</span>
                    <Badge variant="outline" className="text-xs">
                      {getTriggerLabel(rule.trigger)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t('automation.priority')}:</span>
                    <Badge className={cn("text-xs", getPriorityColor(rule.priority))}>
                      {t(`priority.${rule.priority}`)}
                    </Badge>
                  </div>
                </div>

                {/* Conditions and Actions */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    <span>{rule.conditions.length} {t('automation.conditions')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Play className="h-3 w-3" />
                    <span>{rule.actions.length} {t('automation.actions')}</span>
                  </div>
                </div>

                {/* Execution Stats */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{t('automation.executions')}: {rule.execution_count}</span>
                    {rule.last_executed_at && (
                      <span>{t('automation.lastExecuted')}: {format(new Date(rule.last_executed_at), 'MMM d, yyyy')}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {rule.tags?.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rule Builder Dialog */}
      <AutomationRuleBuilder
        isOpen={showRuleBuilder}
        onClose={() => {
          setShowRuleBuilder(false)
          setEditingRule(null)
        }}
        rule={editingRule}
        projectId={projectId}
        userId={userId}
        onRuleSaved={handleRuleSaved}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('automation.deleteRule')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('automation.deleteRuleConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteDialog && handleDeleteRule(showDeleteDialog)}
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

