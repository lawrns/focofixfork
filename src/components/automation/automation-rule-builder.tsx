'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  Settings, 
  Zap, 
  Clock, 
  User, 
  Calendar,
  Bell,
  Mail,
  Move,
  Archive,
  Globe,
  Code,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react'
import { AutomationRule, AutomationTrigger, AutomationCondition, AutomationAction } from '@/lib/models/automation'
import { AutomationService } from '@/lib/services/automation-service'
import { useToast } from '@/components/ui/toast'
import { useTranslation } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

interface AutomationRuleBuilderProps {
  isOpen: boolean
  onClose: () => void
  rule?: AutomationRule
  projectId: string
  userId: string
  onRuleSaved: (rule: AutomationRule) => void
}

export function AutomationRuleBuilder({
  isOpen,
  onClose,
  rule,
  projectId,
  userId,
  onRuleSaved
}: AutomationRuleBuilderProps) {
  const { t } = useTranslation()
  const { addToast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    priority: 'medium' as 'low' | 'medium' | 'high',
    tags: [] as string[]
  })

  const [trigger, setTrigger] = useState<AutomationTrigger>({
    type: 'task_created'
  })

  const [conditions, setConditions] = useState<AutomationCondition[]>([])
  const [actions, setActions] = useState<AutomationAction[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('trigger')

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description || '',
        is_active: rule.is_active,
        priority: rule.priority,
        tags: rule.tags || []
      })
      setTrigger(rule.trigger)
      setConditions(rule.conditions)
      setActions(rule.actions)
    } else {
      // Reset form for new rule
      setFormData({
        name: '',
        description: '',
        is_active: true,
        priority: 'medium',
        tags: []
      })
      setTrigger({ type: 'task_created' })
      setConditions([])
      setActions([])
    }
  }, [rule, isOpen])

  const handleSave = async () => {
    if (!formData.name.trim()) {
      addToast({
        type: 'error',
        title: t('common.error'),
        description: t('automation.ruleNameRequired')
      })
      return
    }

    if (actions.length === 0) {
      addToast({
        type: 'error',
        title: t('common.error'),
        description: t('automation.atLeastOneActionRequired')
      })
      return
    }

    setIsLoading(true)
    try {
      const ruleData = {
        ...formData,
        project_id: projectId,
        created_by: userId,
        trigger,
        conditions,
        actions
      }

      let savedRule: AutomationRule
      if (rule) {
        savedRule = await AutomationService.updateRule(rule.id, ruleData)
      } else {
        savedRule = await AutomationService.createRule(ruleData)
      }

      addToast({
        type: 'success',
        title: t('common.success'),
        description: t('automation.ruleSaved')
      })

      onRuleSaved(savedRule)
      onClose()
    } catch (error: any) {
      console.error('Failed to save automation rule:', error)
      addToast({
        type: 'error',
        title: t('common.error'),
        description: error.message || t('automation.saveError')
      })
    } finally {
      setIsLoading(false)
    }
  }

  const addCondition = () => {
    const newCondition: AutomationCondition = {
      id: `condition_${Date.now()}`,
      type: 'field_equals',
      field: 'status',
      value: 'todo',
      operator: 'equals'
    }
    setConditions([...conditions, newCondition])
  }

  const updateCondition = (index: number, updates: Partial<AutomationCondition>) => {
    const updated = [...conditions]
    updated[index] = { ...updated[index], ...updates }
    setConditions(updated)
  }

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index))
  }

  const addAction = () => {
    const newAction: AutomationAction = {
      id: `action_${Date.now()}`,
      type: 'update_task',
      task_updates: {
        status: 'in_progress'
      }
    }
    setActions([...actions, newAction])
  }

  const updateAction = (index: number, updates: Partial<AutomationAction>) => {
    const updated = [...actions]
    updated[index] = { ...updated[index], ...updates }
    setActions(updated)
  }

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index))
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

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'update_task': return <Settings className="h-4 w-4" />
      case 'create_task': return <Plus className="h-4 w-4" />
      case 'assign_user': return <User className="h-4 w-4" />
      case 'set_due_date': return <Calendar className="h-4 w-4" />
      case 'add_label': return <Plus className="h-4 w-4" />
      case 'remove_label': return <Trash2 className="h-4 w-4" />
      case 'send_notification': return <Bell className="h-4 w-4" />
      case 'send_email': return <Mail className="h-4 w-4" />
      case 'move_to_column': return <Move className="h-4 w-4" />
      case 'archive_task': return <Archive className="h-4 w-4" />
      case 'webhook_call': return <Globe className="h-4 w-4" />
      case 'custom': return <Code className="h-4 w-4" />
      default: return <Zap className="h-4 w-4" />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {rule ? t('automation.editRule') : t('automation.createRule')}
          </DialogTitle>
          <DialogDescription>
            {t('automation.ruleBuilderDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full">
          {/* Basic Information */}
          <div className="space-y-4 p-4 border-b">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('automation.ruleName')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('automation.ruleNamePlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">{t('automation.priority')}</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: 'low' | 'medium' | 'high') => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('priority.low')}</SelectItem>
                    <SelectItem value="medium">{t('priority.medium')}</SelectItem>
                    <SelectItem value="high">{t('priority.high')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('automation.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('automation.descriptionPlaceholder')}
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">{t('automation.active')}</Label>
              </div>
            </div>
          </div>

          {/* Rule Configuration */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="trigger" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                {t('automation.trigger')}
              </TabsTrigger>
              <TabsTrigger value="conditions" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                {t('automation.conditions')}
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                {t('automation.actions')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trigger" className="flex-1 p-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getTriggerIcon(trigger.type)}
                    {t('automation.triggerSettings')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('automation.triggerType')}</Label>
                    <Select
                      value={trigger.type}
                      onValueChange={(value) => setTrigger(prev => ({ ...prev, type: value as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="task_created">{t('automation.triggerTaskCreated')}</SelectItem>
                        <SelectItem value="task_updated">{t('automation.triggerTaskUpdated')}</SelectItem>
                        <SelectItem value="task_moved">{t('automation.triggerTaskMoved')}</SelectItem>
                        <SelectItem value="task_due_soon">{t('automation.triggerTaskDueSoon')}</SelectItem>
                        <SelectItem value="task_overdue">{t('automation.triggerTaskOverdue')}</SelectItem>
                        <SelectItem value="milestone_reached">{t('automation.triggerMilestoneReached')}</SelectItem>
                        <SelectItem value="project_updated">{t('automation.triggerProjectUpdated')}</SelectItem>
                        <SelectItem value="schedule">{t('automation.triggerSchedule')}</SelectItem>
                        <SelectItem value="webhook">{t('automation.triggerWebhook')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Trigger-specific settings */}
                  {trigger.type === 'task_created' && (
                    <div className="space-y-2">
                      <Label>{t('automation.taskPriority')}</Label>
                      <Select
                        value={trigger.task_priority?.[0] || ''}
                        onValueChange={(value) => setTrigger(prev => ({ 
                          ...prev, 
                          task_priority: value ? [value] : undefined 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('automation.anyPriority')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">{t('automation.anyPriority')}</SelectItem>
                          <SelectItem value="low">{t('priority.low')}</SelectItem>
                          <SelectItem value="medium">{t('priority.medium')}</SelectItem>
                          <SelectItem value="high">{t('priority.high')}</SelectItem>
                          <SelectItem value="urgent">{t('priority.urgent')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {trigger.type === 'schedule' && (
                    <div className="space-y-2">
                      <Label>{t('automation.scheduleType')}</Label>
                      <Select
                        value={trigger.schedule_type || 'daily'}
                        onValueChange={(value) => setTrigger(prev => ({ 
                          ...prev, 
                          schedule_type: value as any 
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">{t('automation.daily')}</SelectItem>
                          <SelectItem value="weekly">{t('automation.weekly')}</SelectItem>
                          <SelectItem value="monthly">{t('automation.monthly')}</SelectItem>
                          <SelectItem value="custom">{t('automation.custom')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="conditions" className="flex-1 p-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      {t('automation.conditions')}
                    </div>
                    <Button onClick={addCondition} size="sm">
                      <Plus className="h-4 w-4" />
                      {t('automation.addCondition')}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {conditions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t('automation.noConditions')}</p>
                      <p className="text-sm">{t('automation.addConditionToFilter')}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {conditions.map((condition, index) => (
                        <Card key={condition.id} className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium">{t('automation.condition')} {index + 1}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCondition(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>{t('automation.conditionType')}</Label>
                              <Select
                                value={condition.type}
                                onValueChange={(value) => updateCondition(index, { type: value as any })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="field_equals">{t('automation.fieldEquals')}</SelectItem>
                                  <SelectItem value="field_contains">{t('automation.fieldContains')}</SelectItem>
                                  <SelectItem value="field_greater_than">{t('automation.fieldGreaterThan')}</SelectItem>
                                  <SelectItem value="field_less_than">{t('automation.fieldLessThan')}</SelectItem>
                                  <SelectItem value="field_exists">{t('automation.fieldExists')}</SelectItem>
                                  <SelectItem value="field_missing">{t('automation.fieldMissing')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>{t('automation.field')}</Label>
                              <Select
                                value={condition.field || ''}
                                onValueChange={(value) => updateCondition(index, { field: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={t('automation.selectField')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="status">{t('task.status')}</SelectItem>
                                  <SelectItem value="priority">{t('task.priority')}</SelectItem>
                                  <SelectItem value="assignee_id">{t('task.assignee')}</SelectItem>
                                  <SelectItem value="due_date">{t('task.dueDate')}</SelectItem>
                                  <SelectItem value="project_id">{t('task.project')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>{t('automation.value')}</Label>
                              <Input
                                value={condition.value || ''}
                                onChange={(e) => updateCondition(index, { value: e.target.value })}
                                placeholder={t('automation.enterValue')}
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="actions" className="flex-1 p-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      {t('automation.actions')}
                    </div>
                    <Button onClick={addAction} size="sm">
                      <Plus className="h-4 w-4" />
                      {t('automation.addAction')}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {actions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t('automation.noActions')}</p>
                      <p className="text-sm">{t('automation.addActionToExecute')}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {actions.map((action, index) => (
                        <Card key={action.id} className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h4 className="font-medium flex items-center gap-2">
                              {getActionIcon(action.type)}
                              {t('automation.action')} {index + 1}
                            </h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAction(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>{t('automation.actionType')}</Label>
                              <Select
                                value={action.type}
                                onValueChange={(value) => updateAction(index, { type: value as any })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="update_task">{t('automation.updateTask')}</SelectItem>
                                  <SelectItem value="create_task">{t('automation.createTask')}</SelectItem>
                                  <SelectItem value="assign_user">{t('automation.assignUser')}</SelectItem>
                                  <SelectItem value="set_due_date">{t('automation.setDueDate')}</SelectItem>
                                  <SelectItem value="add_label">{t('automation.addLabel')}</SelectItem>
                                  <SelectItem value="remove_label">{t('automation.removeLabel')}</SelectItem>
                                  <SelectItem value="send_notification">{t('automation.sendNotification')}</SelectItem>
                                  <SelectItem value="send_email">{t('automation.sendEmail')}</SelectItem>
                                  <SelectItem value="move_to_column">{t('automation.moveToColumn')}</SelectItem>
                                  <SelectItem value="archive_task">{t('automation.archiveTask')}</SelectItem>
                                  <SelectItem value="webhook_call">{t('automation.webhookCall')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>{t('automation.delay')}</Label>
                              <Input
                                type="number"
                                value={action.delay_seconds || 0}
                                onChange={(e) => updateAction(index, { delay_seconds: parseInt(e.target.value) || 0 })}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end gap-3 p-4 border-t">
            <Button variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

