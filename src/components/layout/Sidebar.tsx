'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  Home,
  Inbox,
  CheckSquare,
  Star,
  BarChart3,
  Target,
  Plus,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Folder,
  Users,
  Settings
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useGlobalRealtime } from '@/lib/hooks/useRealtime'
import { projectStore } from '@/lib/stores/project-store'

interface Project {
  id: string
  name: string
  status: string
  organization_id: string | null
}

const navigation = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Inbox', href: '/inbox', icon: Inbox },
  { name: 'My Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Favorites', href: '/favorites', icon: Star },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Goals', href: '/dashboard/goals', icon: Target },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsExpanded, setProjectsExpanded] = useState(true)
  const [loading, setLoading] = useState(true)
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState<number>(Date.now())

  const fetchProjects = async (forceRefresh = false) => {
    if (!user) return

    // Only use cached projects if not forcing refresh and we have projects
    if (!forceRefresh) {
      const existingProjects = projectStore.getProjects()
      if (existingProjects.length > 0) {
        console.log('Sidebar: using existing projects from store:', existingProjects.length)
        setProjects(existingProjects)
        setLoading(false)
        return
      }
    }

    console.log('Sidebar: fetching fresh projects from API')
    try {
      const response = await fetch('/api/projects', {
        headers: {
          'x-user-id': user.id,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          console.log('Sidebar: fetched projects from API:', data.data?.length || 0)
          projectStore.setProjects(data.data || [])
          setProjects(data.data || [])
        } else {
          console.log('Sidebar: no projects from API')
          projectStore.setProjects([])
          setProjects([])
        }
      } else {
        console.error('Sidebar: failed to fetch projects, status:', response.status)
        projectStore.setProjects([])
        setProjects([])
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      projectStore.setProjects([])
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [user])

  // Refresh projects when navigating back to dashboard or when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Sidebar: Page became visible, refreshing projects')
        fetchProjects(true) // Force refresh
      }
    }

    const handleFocus = () => {
      console.log('Sidebar: Window focused, refreshing projects')
      fetchProjects(true) // Force refresh
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user])

  // Fallback: If no real-time updates received in 30 seconds, force refresh
  useEffect(() => {
    const checkRealtimeHealth = () => {
      const now = Date.now()
      const timeSinceLastUpdate = now - lastRealtimeUpdate

      if (timeSinceLastUpdate > 30000) { // 30 seconds
        console.log('Sidebar: No real-time updates received in 30s, forcing refresh')
        fetchProjects(true) // Force refresh
        setLastRealtimeUpdate(now) // Reset timer
      }
    }

    const interval = setInterval(checkRealtimeHealth, 10000) // Check every 10 seconds

    return () => clearInterval(interval)
  }, [lastRealtimeUpdate, user])

  // Don't auto-refresh on auth changes - rely on store subscription

  // Subscribe to global project store
  useEffect(() => {
    console.log('Sidebar: subscribing to project store')
    const unsubscribe = projectStore.subscribe((storeProjects) => {
      console.log('Sidebar: received projects from store:', storeProjects.length)
      setProjects(storeProjects as Project[])
    })

    return unsubscribe
  }, [])

  // Real-time updates for projects in sidebar (updates store)
  useGlobalRealtime((payload) => {
    console.log('Sidebar: Real-time event received:', {
      eventType: payload.eventType,
      table: payload.table,
      projectId: payload.new?.id || payload.old?.id,
      newData: payload.new,
      oldData: payload.old
    })

    // Track that we received a real-time update
    setLastRealtimeUpdate(Date.now())

    if (payload.table === 'projects') {
      if (payload.eventType === 'INSERT') {
        console.log('Sidebar: Adding project via real-time:', payload.new?.id)
        if (payload.new?.id && payload.new?.name) {
          projectStore.addProject(payload.new)
        } else {
          console.warn('Sidebar: Invalid INSERT payload, missing id or name:', payload.new)
        }
      } else if (payload.eventType === 'UPDATE') {
        console.log('Sidebar: Updating project via real-time:', payload.new?.id, 'with data:', payload.new)
        if (payload.new?.id && payload.new?.name) {
          projectStore.updateProject(payload.new.id, payload.new)
        } else {
          console.warn('Sidebar: Invalid UPDATE payload, missing id or name:', payload.new)
        }
      } else if (payload.eventType === 'DELETE') {
        console.log('Sidebar: Removing project via real-time:', payload.old?.id)
        if (payload.old?.id) {
          projectStore.removeProject(payload.old.id)
        } else {
          console.warn('Sidebar: Invalid DELETE payload, missing old.id:', payload.old)
        }
      }
    }
  }, true) // Explicitly enable real-time

  const handleNewProject = () => {
    // For now, just navigate to dashboard - we'll implement a modal later
    window.location.href = '/dashboard?new=true'
  }

  return (
    <aside className="flex w-64 flex-col bg-card border-r border-border">
      <div className="flex h-full flex-col p-4">
        {/* Logo Section */}
        <div className="flex items-center gap-3 p-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Target className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-foreground">Foco</h1>
            <p className="text-xs font-medium text-muted-foreground">Focus on what matters</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/20 font-semibold text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}

          {/* Projects Section */}
          <div className="mt-6">
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              {projectsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Folder className="h-5 w-5" />
              Projects
              <span className="ml-auto text-xs bg-muted rounded-full px-2 py-0.5">
                {projects.length}
              </span>
            </button>

            {projectsExpanded && (
              <div className="mt-2 ml-6 space-y-1">
                {loading ? (
                  <div className="animate-pulse space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-6 bg-muted rounded"></div>
                    ))}
                  </div>
                ) : projects.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-3 py-2">
                    No projects yet
                  </p>
                ) : (
                  projects.slice(0, 10).map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        pathname === `/projects/${project.id}`
                          ? 'bg-primary/20 font-semibold text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {project.name}
                    </Link>
                  ))
                )}

                {projects.length > 10 && (
                  <p className="text-xs text-muted-foreground px-3 py-1">
                    +{projects.length - 10} more
                  </p>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className="mt-auto flex flex-col gap-2">
          <button
            onClick={handleNewProject}
            className="flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </button>

          <Link
            href="/organizations"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Users className="h-5 w-5" />
            Organizations
          </Link>

          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>

          <Link
            href="/help"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <HelpCircle className="h-5 w-5" />
            Help & docs
          </Link>
        </div>
      </div>
    </aside>
  )
}
