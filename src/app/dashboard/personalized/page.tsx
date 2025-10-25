'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
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
import { apiCache } from '@/lib/api-cache'

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
  // Hooks
  const router = useRouter()
  const { user, loading } = useAuth()
  const { t } = useTranslation()
  
  // Use ref to prevent unnecessary re-renders
  const isFetchingRef = useRef(false)
  const lastFetchRef = useRef<number>(0)

  // State
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
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

  // Fetch user data with caching and debouncing
  const fetchUserData = useCallback(async (force = false) => {
    if (!user || isFetchingRef.current) return

    // Debounce - prevent rapid successive calls
    const now = Date.now()
    if (!force && (now - lastFetchRef.current) < 2000) {
      return
    }
    lastFetchRef.current = now
    isFetchingRef.current = true

    try {
      setIsLoading(true)

      // Check cache first
      const cacheKey = `dashboard-${user.id}`
      const cachedData = apiCache.get<{ tasks: Task[], projects: Project[] }>(cacheKey)
      
      if (cachedData && !force) {
        setTasks(cachedData.tasks)
        setProjects(cachedData.projects)

        // Calculate stats from cached data
        const now = new Date()
        const totalTasks = cachedData.tasks.length
        const completedTasks = cachedData.tasks.filter(t => t.status === 'done').length
        const inProgressTasks = cachedData.tasks.filter(t => t.status === 'in_progress').length
        const overdueTasks = cachedData.tasks.filter(t =>
          t.due_date && new Date(t.due_date) < now && t.status !== 'done'
        ).length
        const totalProjects = cachedData.projects.length
        const activeProjects = cachedData.projects.filter(p => p.status === 'active').length
        const completedProjects = cachedData.projects.filter(p => p.status === 'completed').length

        setStats({
          totalTasks,
          completedTasks,
          inProgressTasks,
          overdueTasks,
          totalProjects,
          activeProjects,
          completedProjects
        })

        setIsLoading(false)
        isFetchingRef.current = false
        return
      }

      // Initialize lists at function scope
      let tasksList: Task[] = []
      let projectsList: Project[] = []

      // Fetch tasks
      const tasksResponse = await fetch('/api/tasks')
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()

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

      // Cache the results
      apiCache.set(cacheKey, { tasks: tasksList, projects: projectsList }, 30000)

      // Calculate stats - use the fetched data, not stale state
      const now = new Date()
      const totalTasks = tasksList.length
      const completedTasks = tasksList.filter(t => t.status === 'done').length
      const inProgressTasks = tasksList.filter(t => t.status === 'in_progress').length
      const overdueTasks = tasksList.filter(t =>
        t.due_date && new Date(t.due_date) < now && t.status !== 'done'
      ).length

      const totalProjects = projectsList.length
      const activeProjects = projectsList.filter(p => p.status === 'active').length
      const completedProjects = projectsList.filter(p => p.status === 'completed').length

      setStats({
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        totalProjects,
        activeProjects,
        completedProjects
      })

    } catch (error) {
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [user])

  // Load data on mount or when user changes
  useEffect(() => {
    if (user && !loading) {
      fetchUserData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading])

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
              onClick={() => fetchUserData(true)}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 py-2 px-4"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Overview - 4 individual stat cards */}
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

