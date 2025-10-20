'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { useTranslation } from '@/lib/i18n/context'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingCard } from '@/components/ui/loading'
import { SkipToMainContent } from '@/components/ui/accessibility'
import { 
  StatsOverviewWidget, 
  RecentTasksWidget, 
  UpcomingDeadlinesWidget, 
  ActiveProjectsWidget, 
  QuickActionsWidget,
  type Task,
  type Project,
  type DashboardStats
} from '@/components/dashboard/widgets/dashboard-widgets'
import { toast } from 'sonner'

// Disable static generation for this page since it requires authentication
noStore()

function PersonalizedDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <SkipToMainContent />
      <main id="main-content" className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        {/* Stats cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <LoadingCard key={i} />
          ))}
        </div>
        
        {/* Main content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LoadingCard />
          </div>
          <div className="space-y-4">
            <LoadingCard />
            <LoadingCard />
          </div>
        </div>
      </main>
    </div>
  )
}

export default function PersonalizedDashboardPage() {
  console.log('PersonalizedDashboardPage render')

  // Hooks
  const router = useRouter()
  const { user, loading } = useAuth()
  const { t } = useTranslation()

  // State
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  // Set page title
  useEffect(() => {
    document.title = 'Personalized Dashboard | Foco'
  }, [])

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    if (!user) return

    try {
      setIsLoading(true)

      // Fetch tasks
      const tasksResponse = await fetch('/api/tasks')
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        let tasksList: Task[] = []
        
        // Handle wrapped response structure
        if (tasksData.success && tasksData.data) {
          if (Array.isArray(tasksData.data.data)) {
            tasksList = tasksData.data.data
          } else if (Array.isArray(tasksData.data)) {
            tasksList = tasksData.data
          }
        } else if (Array.isArray(tasksData.data)) {
          tasksList = tasksData.data
        } else if (Array.isArray(tasksData)) {
          tasksList = tasksData
        }

        setTasks(tasksList)
      }

      // Fetch projects
      const projectsResponse = await fetch('/api/projects')
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json()
        let projectsList: Project[] = []
        
        // Handle wrapped response structure
        if (projectsData.success && projectsData.data) {
          if (Array.isArray(projectsData.data.data)) {
            projectsList = projectsData.data.data
          } else if (Array.isArray(projectsData.data)) {
            projectsList = projectsData.data
          }
        } else if (Array.isArray(projectsData.data)) {
          projectsList = projectsData.data
        } else if (Array.isArray(projectsData)) {
          projectsList = projectsData
        }

        setProjects(projectsList)
      }

      // Calculate stats
      const now = new Date()
      const totalTasks = tasks.length
      const completedTasks = tasks.filter(t => t.status === 'done').length
      const overdueTasks = tasks.filter(t => 
        t.due_date && new Date(t.due_date) < now && t.status !== 'done'
      ).length

      const totalProjects = projects.length
      const activeProjects = projects.filter(p => p.status === 'active').length
      const completedProjects = projects.filter(p => p.status === 'completed').length

      setStats({
        totalTasks,
        completedTasks,
        overdueTasks,
        totalProjects,
        activeProjects,
        completedProjects
      })

    } catch (error) {
      console.error('Failed to fetch user data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  // Load data on mount
  useEffect(() => {
    if (user && !loading) {
      fetchUserData()
    }
  }, [user, loading, fetchUserData])

  // Event handlers
  const handleViewTask = (taskId: string) => {
    router.push(`/tasks/${taskId}`)
  }

  const handleEditTask = (taskId: string) => {
    router.push(`/tasks/${taskId}`)
  }

  const handleViewProject = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  const handleEditProject = (projectId: string) => {
    router.push(`/projects/${projectId}`)
  }

  const handleViewItem = (id: string, type: 'task' | 'project') => {
    if (type === 'task') {
      router.push(`/tasks/${id}`)
    } else {
      router.push(`/projects/${id}`)
    }
  }

  const handleCreateTask = () => {
    router.push('/tasks/new')
  }

  const handleCreateProject = () => {
    router.push('/projects/new')
  }

  const handleCreateMilestone = () => {
    // For now, redirect to projects page where milestones can be created
    router.push('/projects')
  }

  // Show loading state
  if (loading || isLoading) {
    return <PersonalizedDashboardSkeleton />
  }

  // Show error state if no user
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">
            Please sign in to access your personalized dashboard.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-4"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <SkipToMainContent />
      <main id="main-content" className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Here&apos;s what&apos;s happening with your projects today.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchUserData}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 py-2 px-4"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsOverviewWidget stats={stats} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            <RecentTasksWidget
              tasks={tasks}
              onViewTask={handleViewTask}
              onEditTask={handleEditTask}
            />
            <UpcomingDeadlinesWidget
              tasks={tasks}
              projects={projects}
              onViewItem={handleViewItem}
            />
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            <ActiveProjectsWidget
              projects={projects}
              onViewProject={handleViewProject}
              onEditProject={handleEditProject}
            />
            <QuickActionsWidget
              onCreateTask={handleCreateTask}
              onCreateProject={handleCreateProject}
              onCreateMilestone={handleCreateMilestone}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

