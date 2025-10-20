'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Star, Users, Calendar, Filter, Grid, List, Eye, CheckCircle, ArrowRight, Zap, Target, BarChart3, Code, Palette, TrendingUp, Building2, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ProjectTemplate, TemplateCategory, PREDEFINED_TEMPLATES, getTemplatesByCategory, searchTemplates, getPopularTemplates, getHighestRatedTemplates } from '@/lib/models/template'
import { cn } from '@/lib/utils'

interface ProjectTemplateSelectorProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (template: ProjectTemplate) => void
  className?: string
}

export function ProjectTemplateSelector({ 
  isOpen, 
  onClose, 
  onSelectTemplate, 
  className 
}: ProjectTemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState<'popular' | 'recent' | 'all'>('popular')

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    let templates = PREDEFINED_TEMPLATES

    // Filter by category
    if (selectedCategory !== 'all') {
      templates = getTemplatesByCategory(selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      templates = searchTemplates(searchQuery).filter(template => 
        selectedCategory === 'all' || template.category === selectedCategory
      )
    }

    return templates
  }, [searchQuery, selectedCategory])

  // Get templates for different tabs
  const getTemplatesForTab = (tab: string) => {
    switch (tab) {
      case 'popular':
        return getPopularTemplates(12)
      case 'recent':
        return getHighestRatedTemplates(12)
      case 'all':
        return filteredTemplates
      default:
        return filteredTemplates
    }
  }

  // Get category icon
  const getCategoryIcon = (category: TemplateCategory) => {
    switch (category) {
      case 'engineering': return <Code className="h-4 w-4" />
      case 'marketing': return <TrendingUp className="h-4 w-4" />
      case 'design': return <Palette className="h-4 w-4" />
      case 'sales': return <Building2 className="h-4 w-4" />
      case 'personal': return <Home className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  // Get category color
  const getCategoryColor = (category: TemplateCategory) => {
    switch (category) {
      case 'engineering': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
      case 'marketing': return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
      case 'design': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
      case 'sales': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300'
      case 'personal': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300'
    }
  }

  // Handle template selection
  const handleTemplateSelect = (template: ProjectTemplate) => {
    onSelectTemplate(template)
    onClose()
  }

  const categories: Array<{ value: TemplateCategory | 'all'; label: string; icon: React.ReactNode }> = [
    { value: 'all', label: 'All Templates', icon: <Grid className="h-4 w-4" /> },
    { value: 'engineering', label: 'Engineering', icon: <Code className="h-4 w-4" /> },
    { value: 'marketing', label: 'Marketing', icon: <TrendingUp className="h-4 w-4" /> },
    { value: 'design', label: 'Design', icon: <Palette className="h-4 w-4" /> },
    { value: 'sales', label: 'Sales', icon: <Building2 className="h-4 w-4" /> },
    { value: 'personal', label: 'Personal', icon: <Home className="h-4 w-4" /> },
    { value: 'general', label: 'General', icon: <Target className="h-4 w-4" /> }
  ]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Choose a Project Template
          </DialogTitle>
          <DialogDescription>
            Start your project quickly with a pre-built template. Each template includes tasks, milestones, and workflows tailored for your needs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as TemplateCategory | 'all')}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      <div className="flex items-center gap-2">
                        {category.icon}
                        {category.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="px-3"
              >
                {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'popular' | 'recent' | 'all')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="popular" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Popular
              </TabsTrigger>
              <TabsTrigger value="recent" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Top Rated
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Grid className="h-4 w-4" />
                All Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="popular" className="mt-6">
              <TemplateGrid 
                templates={getTemplatesForTab('popular')} 
                viewMode={viewMode}
                onSelectTemplate={handleTemplateSelect}
                getCategoryIcon={getCategoryIcon}
                getCategoryColor={getCategoryColor}
              />
            </TabsContent>

            <TabsContent value="recent" className="mt-6">
              <TemplateGrid 
                templates={getTemplatesForTab('recent')} 
                viewMode={viewMode}
                onSelectTemplate={handleTemplateSelect}
                getCategoryIcon={getCategoryIcon}
                getCategoryColor={getCategoryColor}
              />
            </TabsContent>

            <TabsContent value="all" className="mt-6">
              <TemplateGrid 
                templates={getTemplatesForTab('all')} 
                viewMode={viewMode}
                onSelectTemplate={handleTemplateSelect}
                getCategoryIcon={getCategoryIcon}
                getCategoryColor={getCategoryColor}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface TemplateGridProps {
  templates: ProjectTemplate[]
  viewMode: 'grid' | 'list'
  onSelectTemplate: (template: ProjectTemplate) => void
  getCategoryIcon: (category: TemplateCategory) => React.ReactNode
  getCategoryColor: (category: TemplateCategory) => string
}

function TemplateGrid({ templates, viewMode, onSelectTemplate, getCategoryIcon, getCategoryColor }: TemplateGridProps) {
  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">No templates found</p>
        <p className="text-sm">Try adjusting your search or category filters</p>
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-3">
        {templates.map((template) => (
          <TemplateListItem
            key={template.id}
            template={template}
            onSelectTemplate={onSelectTemplate}
            getCategoryIcon={getCategoryIcon}
            getCategoryColor={getCategoryColor}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onSelectTemplate={onSelectTemplate}
          getCategoryIcon={getCategoryIcon}
          getCategoryColor={getCategoryColor}
        />
      ))}
    </div>
  )
}

interface TemplateCardProps {
  template: ProjectTemplate
  onSelectTemplate: (template: ProjectTemplate) => void
  getCategoryIcon: (category: TemplateCategory) => React.ReactNode
  getCategoryColor: (category: TemplateCategory) => string
}

function TemplateCard({ template, onSelectTemplate, getCategoryIcon, getCategoryColor }: TemplateCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="h-full cursor-pointer hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold leading-tight truncate">
                {template.name}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {template.description}
              </p>
            </div>
            <Badge className={cn('text-xs flex-shrink-0', getCategoryColor(template.category))}>
              <div className="flex items-center gap-1">
                {getCategoryIcon(template.category)}
                {template.category}
              </div>
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-4">
          {/* Template Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{template.data.cards.length} tasks</span>
            </div>
            <div className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              <span>{template.data.columns.length} columns</span>
            </div>
            {template.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span>{template.rating}</span>
              </div>
            )}
          </div>

          {/* Sample Tasks Preview */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Sample Tasks
            </h4>
            <div className="space-y-1">
              {template.data.cards.slice(0, 3).map((card) => (
                <div key={card.id} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full flex-shrink-0" />
                  <span className="text-muted-foreground truncate">{card.title}</span>
                </div>
              ))}
              {template.data.cards.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{template.data.cards.length - 3} more tasks
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {template.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {template.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{template.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={() => onSelectTemplate(template)}
            className="w-full"
            size="sm"
          >
            Use This Template
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

interface TemplateListItemProps {
  template: ProjectTemplate
  onSelectTemplate: (template: ProjectTemplate) => void
  getCategoryIcon: (category: TemplateCategory) => React.ReactNode
  getCategoryColor: (category: TemplateCategory) => string
}

function TemplateListItem({ template, onSelectTemplate, getCategoryIcon, getCategoryColor }: TemplateListItemProps) {
  return (
    <motion.div
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card className="cursor-pointer hover:shadow-md transition-all duration-200 border-border/50 hover:border-primary/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div className={cn('p-2 rounded-lg', getCategoryColor(template.category))}>
                    {getCategoryIcon(template.category)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">
                    {template.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {template.description}
                  </p>
                  
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{template.data.cards.length} tasks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      <span>{template.data.columns.length} columns</span>
                    </div>
                    {template.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{template.rating}</span>
                      </div>
                    )}
                  </div>

                  {template.tags && template.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.tags.slice(0, 4).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.tags.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-shrink-0">
              <Button
                onClick={() => onSelectTemplate(template)}
                size="sm"
              >
                Use Template
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default ProjectTemplateSelector

