'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import MainLayout from '@/components/layout/MainLayout'
import { ProjectCard } from '@/components/projects/project-card'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Star, Folder, Target, CheckSquare } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'

interface FavoriteItem {
  id: string
  item_id: string
  item_type: 'project' | 'task' | 'milestone'
  item_name: string
  item_description?: string
  item_status: string
  item_priority?: string
  created_at: string
}

export default function FavoritesPage() {
  return (
    <ProtectedRoute>
      <FavoritesContent />
    </ProtectedRoute>
  )
}

function FavoritesContent() {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    loadFavorites()
  }, [user])

  const loadFavorites = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      // Mock favorites for now - in production, this would fetch from API
      const mockFavorites: FavoriteItem[] = [
        {
          id: '1',
          item_id: 'proj-1',
          item_type: 'project',
          item_name: 'Mobile Application',
          item_description: 'Development of mobile app for iOS and Android',
          item_status: 'active',
          item_priority: 'high',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          item_id: 'proj-2',
          item_type: 'project',
          item_name: 'API Backend',
          item_description: 'RESTful API development',
          item_status: 'active',
          item_priority: 'medium',
          created_at: new Date(Date.now() - 86400000).toISOString()
        },
        {
          id: '3',
          item_id: 'task-1',
          item_type: 'task',
          item_name: 'Implement authentication',
          item_description: 'Add JWT authentication to API',
          item_status: 'in_progress',
          item_priority: 'urgent',
          created_at: new Date(Date.now() - 172800000).toISOString()
        },
        {
          id: '4',
          item_id: 'milestone-1',
          item_type: 'milestone',
          item_name: 'Phase 1 Complete',
          item_description: 'Complete all phase 1 deliverables',
          item_status: 'active',
          created_at: new Date(Date.now() - 259200000).toISOString()
        }
      ]

      setFavorites(mockFavorites)
    } catch (error) {
      console.error('Failed to load favorites:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const removeFavorite = async (favoriteId: string) => {
    setFavorites(prev => prev.filter(f => f.id !== favoriteId))
  }

  const filteredFavorites = activeTab === 'all'
    ? favorites
    : favorites.filter(f => f.item_type === activeTab)

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <Folder className="h-5 w-5" />
      case 'task':
        return <CheckSquare className="h-5 w-5" />
      case 'milestone':
        return <Target className="h-5 w-5" />
      default:
        return <Star className="h-5 w-5" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'completed':
      case 'done':
        return 'bg-green-100 text-green-800'
      case 'on_hold':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority?: string) => {
    if (!priority) return 'bg-gray-100 text-gray-800'
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <MainLayout>
      <div className="flex-1 space-y-6 p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Favorites</h2>
            <p className="text-muted-foreground">
              Quick access to your favorite projects, tasks, and milestones
            </p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Star className="h-4 w-4 mr-2 fill-yellow-500 text-yellow-500" />
            {favorites.length} favorites
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-2">{favorites.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="project">
              Projects
              <Badge variant="secondary" className="ml-2">
                {favorites.filter(f => f.item_type === 'project').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="task">
              Tasks
              <Badge variant="secondary" className="ml-2">
                {favorites.filter(f => f.item_type === 'task').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="milestone">
              Milestones
              <Badge variant="secondary" className="ml-2">
                {favorites.filter(f => f.item_type === 'milestone').length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {isLoading ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading favorites...</p>
                </CardContent>
              </Card>
            ) : filteredFavorites.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No favorites yet
                  </h3>
                  <p className="text-muted-foreground">
                    Star your favorite items to access them quickly from here
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredFavorites.map((favorite) => (
                  <Card
                    key={favorite.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getItemIcon(favorite.item_type)}
                          <Badge variant="outline" className="capitalize">
                            {favorite.item_type}
                          </Badge>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeFavorite(favorite.id)
                          }}
                          className="text-yellow-500 hover:text-yellow-600 transition-colors"
                        >
                          <Star className="h-5 w-5 fill-current" />
                        </button>
                      </div>

                      <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                        {favorite.item_name}
                      </h3>

                      {favorite.item_description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {favorite.item_description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getStatusColor(favorite.item_status)}>
                          {favorite.item_status.replace('_', ' ')}
                        </Badge>
                        {favorite.item_priority && (
                          <Badge className={getPriorityColor(favorite.item_priority)}>
                            {favorite.item_priority}
                          </Badge>
                        )}
                      </div>

                      <div className="mt-3 text-xs text-muted-foreground">
                        Favorited {new Date(favorite.created_at).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  )
}
