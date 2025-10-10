'use client'

import { useState, useEffect, useCallback } from 'react'
import { projectStore } from '@/lib/stores/project-store'
import { useRouter } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import DashboardLayout from '@/components/dashboard/layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Plus,
  Search,
  Filter,
  Target,
  Calendar,
  User,
  CheckCircle,
  Clock,
  AlertTriangle,
  MoreHorizontal
} from 'lucide-react'
import Link from 'next/link'

export default function MilestonesPage() {
  return (
    <ProtectedRoute>
      <MilestonesContent />
    </ProtectedRoute>
  )
}

function MilestonesContent() {
  const [milestones, setMilestones] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const router = useRouter()

  const loadData = useCallback(async () => {
    try {
      // Load projects first to get project names
      const projectsResponse = await fetch('/api/projects')
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json()
        console.log('Milestones page: loaded projects:', projectsData.data?.length || 0)
        projectStore.setProjects(projectsData.data || [])
        setProjects(projectsData.data || [])
      }

      // Try to load milestones from API
      try {
        const milestonesResponse = await fetch('/api/milestones')
        if (milestonesResponse.ok) {
          const milestonesData = await milestonesResponse.json()
          setMilestones(milestonesData.data || [])
        } else {
          // API endpoint doesn't exist yet, show empty state
          setMilestones([])
        }
      } catch (error) {
        console.log('Milestones API not available yet:', error)
        setMilestones([])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      setMilestones([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Subscribe to global project store
  useEffect(() => {
    console.log('Milestones page: subscribing to project store')
    const unsubscribe = projectStore.subscribe((storeProjects) => {
      console.log('Milestones page: received projects from store:', storeProjects.length)
      setProjects(storeProjects)
    })

    return unsubscribe
  }, [])

  const filteredMilestones = milestones.filter(milestone => {
    const matchesSearch = milestone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         milestone.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || milestone.status === filterStatus
    const matchesPriority = filterPriority === 'all' || milestone.priority === filterPriority
    return matchesSearch && matchesStatus && matchesPriority
  })

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { label: 'Completed', color: 'text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-300', icon: CheckCircle }
      case 'in-progress':
        return { label: 'In Progress', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300', icon: Clock }
      case 'review':
        return { label: 'In Review', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300', icon: AlertTriangle }
      case 'todo':
        return { label: 'To Do', color: 'text-gray-600 bg-gray-100 dark:bg-gray-700/40 dark:text-gray-300', icon: Target }
      default:
        return { label: status, color: 'text-gray-600 bg-gray-100', icon: Target }
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-300'
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300'
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-300'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    return project?.name || 'Unknown Project'
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="animate-pulse">
              <div className="h-8 bg-muted rounded w-64 mb-2"></div>
              <div className="h-4 bg-muted rounded w-96"></div>
            </div>
            <div className="animate-pulse">
              <div className="h-10 bg-muted rounded w-32"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-6 bg-muted rounded w-3/4"></div>
                      <div className="h-6 bg-muted rounded w-16"></div>
                    </div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Milestones</h1>
            <p className="text-muted-foreground mt-2">
              Track and manage all your project milestones
            </p>
          </div>
          <Button size="lg">
            <Plus className="w-4 h-4 mr-2" />
            New Milestone
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search milestones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background text-sm"
            >
              <option value="all">All Status</option>
              <option value="todo">To Do</option>
              <option value="in-progress">In Progress</option>
              <option value="review">In Review</option>
              <option value="completed">Completed</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background text-sm"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Milestones Grid */}
        {filteredMilestones.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Target className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm || filterStatus !== 'all' || filterPriority !== 'all'
                  ? 'No milestones found'
                  : 'No milestones yet'
                }
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || filterStatus !== 'all' || filterPriority !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Create your first milestone to start tracking progress.'
                }
              </p>
              {!searchTerm && filterStatus === 'all' && filterPriority === 'all' && (
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Milestone
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMilestones.map((milestone) => {
              const statusInfo = getStatusInfo(milestone.status)
              const StatusIcon = statusInfo.icon

              return (
                <Card key={milestone.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => router.push(`/milestones/${milestone.id}`)}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg line-clamp-2 pr-2">
                          {milestone.name}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {getProjectName(milestone.project_id)}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="ml-2">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {milestone.description && (
                      <p className="text-muted-foreground text-sm line-clamp-2">
                        {milestone.description}
                      </p>
                    )}

                    {/* Status and Priority */}
                    <div className="flex items-center justify-between">
                      <Badge className={statusInfo.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </Badge>

                      <Badge variant="outline" className={getPriorityColor(milestone.priority)}>
                        {milestone.priority}
                      </Badge>
                    </div>

                    {/* Due Date */}
                    {milestone.due_date && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-2" />
                        Due {new Date(milestone.due_date).toLocaleDateString()}
                      </div>
                    )}

                    {/* Assigned User */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <User className="w-4 h-4 mr-2" />
                        <span>Assigned to</span>
                      </div>
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {milestone.assigned_to?.slice(-2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{milestones.length}</p>
                  <p className="text-sm text-muted-foreground">Total Milestones</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {milestones.filter(m => m.status === 'completed').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {milestones.filter(m => m.status === 'in-progress').length}
                  </p>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">
                    {milestones.filter(m => new Date(m.due_date) < new Date() && m.status !== 'completed').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}


