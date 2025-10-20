'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Search, 
  Star, 
  Clock, 
  Users, 
  Zap, 
  CheckCircle, 
  AlertTriangle, 
  Calendar,
  Bell,
  Settings,
  Move,
  Plus,
  Globe,
  Code,
  Play,
  Info
} from 'lucide-react'
import { AutomationTemplate } from '@/lib/models/automation'
import { AutomationService } from '@/lib/services/automation-service'
import { useToast } from '@/components/ui/toast'
import { useTranslation } from '@/lib/i18n/context'
import { cn } from '@/lib/utils'

interface AutomationTemplatesProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  userId: string
  onTemplateSelected: (template: AutomationTemplate) => void
}

export function AutomationTemplates({
  isOpen,
  onClose,
  projectId,
  userId,
  onTemplateSelected
}: AutomationTemplatesProps) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [templates, setTemplates] = useState<AutomationTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<AutomationTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const categories = [
    { value: 'all', label: t('automation.allCategories') },
    { value: 'productivity', label: t('automation.productivity') },
    { value: 'workflow', label: t('automation.workflow') },
    { value: 'notifications', label: t('automation.notifications') },
    { value: 'time_management', label: t('automation.timeManagement') },
    { value: 'collaboration', label: t('automation.collaboration') },
    { value: 'custom', label: t('automation.custom') }
  ]

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
  }, [isOpen])

  useEffect(() => {
    filterTemplates()
  }, [templates, searchTerm, activeCategory])

  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      const templatesData = await AutomationService.getTemplates()
      setTemplates(templatesData)
    } catch (error: any) {
      console.error('Failed to load automation templates:', error)
      toast({
        title: t('common.error'),
        description: error.message || t('automation.loadTemplatesError'),
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const filterTemplates = () => {
    let filtered = templates

    if (activeCategory !== 'all') {
      filtered = filtered.filter(template => template.category === activeCategory)
    }

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase()
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        template.description.toLowerCase().includes(lowerCaseSearchTerm) ||
        template.tags.some(tag => tag.toLowerCase().includes(lowerCaseSearchTerm))
      )
    }

    setFilteredTemplates(filtered)
  }

  const handleSelectTemplate = async (template: AutomationTemplate) => {
    try {
      await AutomationService.createRuleFromTemplate(template.id, projectId, userId)
      toast({
        title: t('common.success'),
        description: t('automation.templateApplied')
      })
      onTemplateSelected(template)
      onClose()
    } catch (error: any) {
      console.error('Failed to apply template:', error)
      toast({
        title: t('common.error'),
        description: error.message || t('automation.applyTemplateError'),
        variant: 'destructive'
      })
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'productivity': return <Zap className="h-4 w-4" />
      case 'workflow': return <Settings className="h-4 w-4" />
      case 'notifications': return <Bell className="h-4 w-4" />
      case 'time_management': return <Clock className="h-4 w-4" />
      case 'collaboration': return <Users className="h-4 w-4" />
      case 'custom': return <Code className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
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

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'update_task': return <Settings className="h-4 w-4" />
      case 'create_task': return <Plus className="h-4 w-4" />
      case 'assign_user': return <Users className="h-4 w-4" />
      case 'set_due_date': return <Calendar className="h-4 w-4" />
      case 'send_notification': return <Bell className="h-4 w-4" />
      case 'move_to_column': return <Move className="h-4 w-4" />
      case 'archive_task': return <CheckCircle className="h-4 w-4" />
      default: return <Play className="h-4 w-4" />
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
      case 'intermediate': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            {t('automation.templates')}
          </DialogTitle>
          <DialogDescription>
            {t('automation.templatesDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search and Filters */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('automation.searchTemplates')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Categories Sidebar */}
            <div className="w-64 border-r p-4 overflow-y-auto">
              <h3 className="text-lg font-semibold mb-3">{t('automation.categories')}</h3>
              <div className="space-y-1">
                {categories.map(category => (
                  <Button
                    key={category.value}
                    variant={activeCategory === category.value ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-base h-10"
                    onClick={() => setActiveCategory(category.value)}
                  >
                    {getCategoryIcon(category.value)}
                    <span className="ml-2">{category.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Templates Grid */}
            <div className="flex-1 p-4 overflow-y-auto">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="p-4">
                      <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-muted rounded w-3/4"></div>
                        <div className="h-3 bg-muted rounded w-1/2"></div>
                        <div className="h-3 bg-muted rounded w-2/3"></div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">{t('automation.noTemplatesFound')}</p>
                  <p className="text-sm">{t('automation.tryAdjustingFilters')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTemplates.map(template => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                              {template.name}
                              {template.is_featured && (
                                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                              )}
                              {template.is_official && (
                                <Badge variant="secondary" className="text-xs">
                                  {t('automation.official')}
                                </Badge>
                              )}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {template.description}
                            </p>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        {/* Category and Difficulty */}
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            {getCategoryIcon(template.category)}
                            {t(`automation.${template.category}`)}
                          </Badge>
                          <Badge className={cn("text-xs", getDifficultyColor(template.difficulty))}>
                            {t(`automation.${template.difficulty}`)}
                          </Badge>
                        </div>

                        {/* Trigger and Actions */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            {getTriggerIcon(template.trigger.type)}
                            <span>{t('automation.trigger')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Play className="h-3 w-3" />
                            <span>{template.actions.length} {t('automation.actions')}</span>
                          </div>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1">
                          {template.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {template.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.tags.length - 3}
                            </Badge>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-3">
                            <span>{t('automation.estimatedTime')}: {template.estimated_time}m</span>
                            <span>{t('automation.usage')}: {template.usage_count}</span>
                          </div>
                          {template.rating > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                              <span>{template.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

