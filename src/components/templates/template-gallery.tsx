'use client'

import { useState, useMemo } from 'react'
import { Search, Star, Users, Calendar, Filter, Grid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProjectTemplate, TemplateCategory, PREDEFINED_TEMPLATES, getTemplatesByCategory, searchTemplates, getPopularTemplates, getHighestRatedTemplates } from '@/lib/models/template'
import { cn } from '@/lib/utils'

interface TemplateGalleryProps {
  onSelectTemplate: (template: ProjectTemplate) => void
  className?: string
}

export function TemplateGallery({ onSelectTemplate, className }: TemplateGalleryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest'>('popular')

  const filteredTemplates = useMemo(() => {
    let templates = PREDEFINED_TEMPLATES

    // Filter by category
    if (selectedCategory !== 'all') {
      templates = getTemplatesByCategory(selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      templates = searchTemplates(searchQuery)
    }

    // Sort templates
    switch (sortBy) {
      case 'popular':
        templates = templates.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0))
        break
      case 'rating':
        templates = templates.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      case 'newest':
        templates = templates.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
    }

    return templates
  }, [searchQuery, selectedCategory, sortBy])

  const categories: Array<{ value: TemplateCategory | 'all'; label: string }> = [
    { value: 'all', label: 'All Templates' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'design', label: 'Design' },
    { value: 'sales', label: 'Sales' },
    { value: 'personal', label: 'Personal' },
    { value: 'general', label: 'General' }
  ]

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Choose a Template
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Start with a pre-built template or create your own project from scratch
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Search and view controls */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Category and sort filters */}
        <div className="flex items-center gap-4">
          <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as any)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick categories */}
      <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as any)}>
        <TabsList className="grid w-full grid-cols-7">
          {categories.map((category) => (
            <TabsTrigger key={category.value} value={category.value}>
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {/* Templates grid/list */}
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No templates found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <div className={cn(
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            )}>
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  viewMode={viewMode}
                  onSelect={() => onSelectTemplate(template)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Popular templates section */}
      {selectedCategory === 'all' && !searchQuery && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Popular Templates
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getPopularTemplates(3).map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                viewMode="grid"
                onSelect={() => onSelectTemplate(template)}
                compact
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface TemplateCardProps {
  template: ProjectTemplate
  viewMode: 'grid' | 'list'
  onSelect: () => void
  compact?: boolean
}

function TemplateCard({ template, viewMode, onSelect, compact = false }: TemplateCardProps) {
  const getCategoryColor = (category: TemplateCategory) => {
    const colors = {
      marketing: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300',
      engineering: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      design: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
      sales: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
      personal: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      general: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
    return colors[category] || colors.general
  }

  if (viewMode === 'list') {
    return (
      <div
        className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors"
        onClick={onSelect}
      >
        {/* Thumbnail */}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
          {template.name.charAt(0)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {template.name}
            </h3>
            <Badge className={getCategoryColor(template.category)}>
              {template.category}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {template.description}
          </p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {template.rating?.toFixed(1)}
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {template.usage_count || 0}
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(template.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Action */}
        <Button onClick={onSelect} size="sm">
          Use Template
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-all hover:shadow-md',
        compact ? 'p-4' : 'p-6'
      )}
      onClick={onSelect}
    >
      {/* Thumbnail */}
      <div className="w-full h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mb-4 flex items-center justify-center text-white font-bold text-2xl">
        {template.name.charAt(0)}
      </div>

      {/* Content */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
            {template.name}
          </h3>
          <Badge className={getCategoryColor(template.category)}>
            {template.category}
          </Badge>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
          {template.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3" />
            {template.rating?.toFixed(1)}
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {template.usage_count || 0} uses
          </div>
        </div>

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag) => (
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
        )}

        {/* Action */}
        <Button onClick={onSelect} className="w-full" size="sm">
          Use Template
        </Button>
      </div>
    </div>
  )
}
