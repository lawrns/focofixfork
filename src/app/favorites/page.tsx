'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import MainLayout from '@/components/layout/MainLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Star, Clock, FolderOpen, CheckSquare, Target } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface RecentItem {
  id: string
  name: string
  type: 'project' | 'task' | 'milestone'
  description?: string
  status?: string
  priority?: string
  updated_at: string
}

export default function FavoritesPage() {
  return (
    <ProtectedRoute>
      <FavoritesContent />
    </ProtectedRoute>
  )
}

function FavoritesContent() {
  const router = useRouter()
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadRecentItems = async () => {
      try {
        // Load recent projects
        const projectsResponse = await fetch('/api/projects?limit=5')
        const projectsData = projectsResponse.ok ? await projectsResponse.json() : { data: [] }

        // Load recent tasks
        const tasksResponse = await fetch('/api/tasks?limit=5')
        const tasksData = tasksResponse.ok ? await tasksResponse.json() : { data: [] }

        // Combine and sort by updated_at
        const items: RecentItem[] = [
          ...projectsData.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            type: 'project' as const,
            description: p.description,
            status: p.status,
            updated_at: p.updated_at
          })),
          ...tasksData.data.map((t: any) => ({
            id: t.id,
            name: t.title,
            type: 'task' as const,
            description: t.description,
            status: t.status,
            priority: t.priority,
            updated_at: t.updated_at
          }))
        ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

        setRecentItems(items.slice(0, 10)) // Show top 10 recent items
      } catch (error) {
        console.error('Failed to load recent items:', error)
        toast.error('Failed to load recent items')
      } finally {
        setIsLoading(false)
      }
    }

    loadRecentItems()
  }, [])

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'project': return <FolderOpen className="w-5 h-5" />
      case 'task': return <CheckSquare className="w-5 h-5" />
      case 'milestone': return <Target className="w-5 h-5" />
      default: return <Star className="w-5 h-5" />
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-600'
      case 'in_progress': return 'bg-blue-500/10 text-blue-600'
      case 'active': return 'bg-blue-500/10 text-blue-600'
      case 'planning': return 'bg-yellow-500/10 text-yellow-600'
      case 'review': return 'bg-purple-500/10 text-purple-600'
      default: return 'bg-gray-500/10 text-gray-600'
    }
  }

  const handleItemClick = (item: RecentItem) => {
    switch (item.type) {
      case 'project':
        router.push(`/projects/${item.id}`)
        break
      case 'task':
        router.push(`/tasks/${item.id}`)
        break
      case 'milestone':
        router.push(`/milestones/${item.id}`)
        break
    }
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>

            <div className="grid gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded" />
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-48" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Recently Accessed</h1>
              <p className="text-muted-foreground">
                Your most recently accessed projects and tasks
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="px-3 py-1">
                <Clock className="w-4 h-4 mr-2" />
                Last 30 days
              </Badge>
            </div>
          </div>

          {/* Content */}
          {recentItems.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No recent items</h3>
                <p className="text-muted-foreground mb-4">
                  Start working on projects and tasks to see them appear here.
                </p>
                <Button onClick={() => router.push('/projects')}>
                  Browse Projects
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recentItems.map((item) => (
                <Card key={`${item.type}-${item.id}`} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleItemClick(item)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${item.type === 'project' ? 'bg-blue-500/10' : item.type === 'task' ? 'bg-green-500/10' : 'bg-purple-500/10'}`}>
                          {getItemIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate">{item.name}</h3>
                            <Badge className={getStatusColor(item.status)} variant="secondary">
                              {item.status?.replace('_', ' ') || 'unknown'}
                            </Badge>
                            {item.priority && (
                              <Badge variant="outline" className="text-xs">
                                {item.priority}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-muted-foreground truncate mb-2">
                              {item.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Updated {new Date(item.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {item.type}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Star className="w-5 h-5 text-blue-600" />
                <div>
                  <h4 className="font-medium text-blue-900">Favorites Coming Soon</h4>
                  <p className="text-sm text-blue-700">
                    A dedicated favorites system is in development. For now, this page shows your recently accessed items.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
