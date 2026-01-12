'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Search, 
  Download, 
  Star, 
  Users, 
  Calendar,
  Filter,
  Grid,
  List,
  ExternalLink,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { ExtensionManifest } from '@/lib/extensions/extension-api'

interface MarketplaceExtension extends ExtensionManifest {
  downloads: number
  rating: number
  reviews: number
  lastUpdated: string
  category: string
  tags: string[]
  featured: boolean
  price: 'free' | 'paid'
  priceAmount?: number
}

interface ExtensionMarketplaceProps {
  onInstallExtension?: (extension: MarketplaceExtension) => void
  onPreviewExtension?: (extension: MarketplaceExtension) => void
}

export function ExtensionMarketplace({ 
  onInstallExtension, 
  onPreviewExtension 
}: ExtensionMarketplaceProps) {
  const [extensions, setExtensions] = useState<MarketplaceExtension[]>([])
  const [filteredExtensions, setFilteredExtensions] = useState<MarketplaceExtension[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState('popular')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all')

  // Mock marketplace data
  const mockExtensions: MarketplaceExtension[] = useMemo(() => [
    {
      id: 'github-integration',
      name: 'GitHub Integration',
      version: '1.2.0',
      description: 'Connect your GitHub repositories to track issues and pull requests directly in your project cards.',
      author: 'Foco Team',
      icon: '/icons/github.svg',
      permissions: [
        { type: 'read', resource: 'projects', description: 'Read project data' },
        { type: 'network', resource: 'github.com', description: 'Access GitHub API' }
      ],
      entryPoints: [
        { type: 'card', component: 'GitHubCard', position: 'bottom' },
        { type: 'board', component: 'GitHubBoard', position: 'right' }
      ],
      downloads: 15420,
      rating: 4.8,
      reviews: 324,
      lastUpdated: '2024-01-15',
      category: 'development',
      tags: ['github', 'git', 'issues', 'pull-requests'],
      featured: true,
      price: 'free'
    },
    {
      id: 'time-tracking',
      name: 'Time Tracking Pro',
      version: '2.1.0',
      description: 'Advanced time tracking with detailed reports, team analytics, and integration with popular tools.',
      author: 'TimeTrack Inc',
      icon: '/icons/time.svg',
      permissions: [
        { type: 'read', resource: 'tasks', description: 'Read task data' },
        { type: 'write', resource: 'tasks', description: 'Update task data' },
        { type: 'storage', resource: 'time-data', description: 'Store time tracking data' }
      ],
      entryPoints: [
        { type: 'card', component: 'TimeTracker', position: 'bottom' },
        { type: 'project', component: 'TimeReports', position: 'right' }
      ],
      downloads: 8930,
      rating: 4.6,
      reviews: 156,
      lastUpdated: '2024-01-10',
      category: 'productivity',
      tags: ['time', 'tracking', 'reports', 'analytics'],
      featured: false,
      price: 'paid',
      priceAmount: 9.99
    },
    {
      id: 'calendar-sync',
      name: 'Calendar Sync',
      version: '1.0.5',
      description: 'Sync your project deadlines with Google Calendar, Outlook, and other calendar applications.',
      author: 'CalendarSync',
      icon: '/icons/calendar.svg',
      permissions: [
        { type: 'read', resource: 'projects', description: 'Read project data' },
        { type: 'network', resource: 'calendar.google.com', description: 'Access Google Calendar' }
      ],
      entryPoints: [
        { type: 'project', component: 'CalendarSync', position: 'right' },
        { type: 'global', component: 'CalendarWidget', position: 'top' }
      ],
      downloads: 6780,
      rating: 4.4,
      reviews: 89,
      lastUpdated: '2024-01-08',
      category: 'productivity',
      tags: ['calendar', 'sync', 'deadlines', 'google'],
      featured: false,
      price: 'free'
    },
    {
      id: 'custom-fields',
      name: 'Custom Fields',
      version: '1.5.2',
      description: 'Add custom fields to your projects and tasks for better organization and tracking.',
      author: 'CustomFields Team',
      icon: '/icons/fields.svg',
      permissions: [
        { type: 'read', resource: 'projects', description: 'Read project data' },
        { type: 'write', resource: 'projects', description: 'Update project data' },
        { type: 'storage', resource: 'custom-fields', description: 'Store custom field definitions' }
      ],
      entryPoints: [
        { type: 'card', component: 'CustomFields', position: 'bottom' },
        { type: 'project', component: 'FieldManager', position: 'right' }
      ],
      downloads: 12340,
      rating: 4.7,
      reviews: 245,
      lastUpdated: '2024-01-12',
      category: 'customization',
      tags: ['fields', 'custom', 'organization', 'data'],
      featured: true,
      price: 'free'
    },
    {
      id: 'slack-notifications',
      name: 'Slack Notifications',
      version: '1.3.1',
      description: 'Get real-time notifications in Slack when tasks are updated, assigned, or completed.',
      author: 'SlackTeam',
      icon: '/icons/slack.svg',
      permissions: [
        { type: 'read', resource: 'tasks', description: 'Read task data' },
        { type: 'network', resource: 'slack.com', description: 'Send Slack messages' },
        { type: 'notifications', resource: 'slack', description: 'Send notifications' }
      ],
      entryPoints: [
        { type: 'global', component: 'SlackSettings', position: 'top' }
      ],
      downloads: 9870,
      rating: 4.5,
      reviews: 178,
      lastUpdated: '2024-01-14',
      category: 'communication',
      tags: ['slack', 'notifications', 'real-time', 'team'],
      featured: false,
      price: 'free'
    }
  ], [])

  const categories = [
    'all',
    'development',
    'productivity',
    'customization',
    'communication',
    'analytics',
    'integration'
  ]

  // Load extensions
  const loadExtensions = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setExtensions(mockExtensions)
      setFilteredExtensions(mockExtensions)
    } catch (err) {
      setError(`Failed to load extensions: ${err}`)
    } finally {
      setLoading(false)
    }
  }, [mockExtensions])

  // Filter extensions
  const filterExtensions = useCallback(() => {
    let filtered = extensions

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(ext => 
        ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ext.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ext.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(ext => ext.category === selectedCategory)
    }

    // Price filter
    if (priceFilter !== 'all') {
      filtered = filtered.filter(ext => ext.price === priceFilter)
    }

    // Sort
    switch (sortBy) {
      case 'popular':
        filtered = filtered.sort((a, b) => b.downloads - a.downloads)
        break
      case 'rating':
        filtered = filtered.sort((a, b) => b.rating - a.rating)
        break
      case 'newest':
        filtered = filtered.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
        break
      case 'name':
        filtered = filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
    }

    setFilteredExtensions(filtered)
  }, [extensions, searchQuery, selectedCategory, sortBy, priceFilter])

  // Load extensions on mount
  useEffect(() => {
    loadExtensions()
  }, [loadExtensions])

  // Filter when dependencies change
  useEffect(() => {
    filterExtensions()
  }, [filterExtensions])

  // Handle install
  const handleInstall = useCallback((extension: MarketplaceExtension) => {
    onInstallExtension?.(extension)
  }, [onInstallExtension])

  // Handle preview
  const handlePreview = useCallback((extension: MarketplaceExtension) => {
    onPreviewExtension?.(extension)
  }, [onPreviewExtension])

  // Format number
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`
    }
    return num.toString()
  }

  // Format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString()
  }

  // Render stars
  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 fill-yellow-400 text-yellow-400" />)
    }

    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />)
    }

    return stars
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3" />
          <span>Loading marketplace...</span>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Extension Marketplace</h2>
          <p className="text-gray-600">Discover and install powerful extensions for Foco</p>
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

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search extensions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={priceFilter} onValueChange={(value) => setPriceFilter(value as 'all' | 'free' | 'paid')}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">Most Popular</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Extensions Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {filteredExtensions.map((extension) => (
          <Card key={extension.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {extension.icon && (
                    <img 
                      src={extension.icon} 
                      alt={extension.name}
                      className="w-10 h-10 rounded-lg"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{extension.name}</h3>
                    <p className="text-sm text-gray-600">by {extension.author}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {extension.featured && (
                    <Badge variant="default" className="bg-yellow-500">
                      Featured
                    </Badge>
                  )}
                  <Badge variant={extension.price === 'free' ? 'secondary' : 'default'}>
                    {extension.price === 'free' ? 'Free' : `$${extension.priceAmount}`}
                  </Badge>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-700">{extension.description}</p>

              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  {formatNumber(extension.downloads)}
                </div>
                <div className="flex items-center gap-1">
                  {renderStars(extension.rating)}
                  <span>{extension.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {extension.reviews}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {formatDate(extension.lastUpdated)}
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {extension.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  onClick={() => handleInstall(extension)}
                  className="flex-1"
                >
                  <Download className="w-4 h-4" />
                  Install
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePreview(extension)}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredExtensions.length === 0 && !loading && (
        <Card className="p-12 text-center">
          <div className="text-gray-500">
            <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No extensions found</h3>
            <p>Try adjusting your search criteria or browse all extensions</p>
          </div>
        </Card>
      )}
    </div>
  )
}
