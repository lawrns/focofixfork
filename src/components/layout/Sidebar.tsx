'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useEffect, useState, useCallback, useRef } from 'react'
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
import { useOrganizationRealtime } from '@/lib/hooks/useRealtime'
import { projectStore } from '@/lib/stores/project-store'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { useTranslation } from '@/lib/i18n/context'

interface Project {
  id: string
  name: string
  status: string
  organization_id: string | null
}

const getNavigation = (t: any) => [
  { name: t('navigation.home'), href: '/dashboard/personalized', icon: Home },
  { name: t('navigation.inbox'), href: '/inbox', icon: Inbox },
  { name: t('navigation.myTasks'), href: '/tasks', icon: CheckSquare },
  // { name: t('navigation.calendar'), href: '/calendar', icon: CalendarIcon }, // Temporarily disabled
  { name: t('navigation.favorites'), href: '/favorites', icon: Star },
  { name: t('navigation.reports'), href: '/reports', icon: BarChart3 },
  { name: t('navigation.goals'), href: '/dashboard/goals', icon: Target },
  { name: t('navigation.analytics'), href: '/dashboard/analytics', icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsExpanded, setProjectsExpanded] = useState(true)
  const [loading, setLoading] = useState(true)
  const [lastRealtimeUpdate, setLastRealtimeUpdate] = useState<number>(Date.now())
  const [primaryOrgId, setPrimaryOrgId] = useState<string | null>(null)
  const lastFetchTime = useRef<number>(0)
  
  const navigation = getNavigation(t)

  const fetchProjects = useCallback(async (forceRefresh = false) => {
    if (!user) return

    // Debounce rapid successive calls
    const now = Date.now()
    if (!forceRefresh && lastFetchTime.current && (now - lastFetchTime.current) < 1000) {
      console.log('Sidebar: skipping fetch due to debouncing')
      return
    }
    lastFetchTime.current = now

    console.log('Sidebar: fetching fresh projects from API')
    try {
      const response = await fetch(`/api/projects?t=${Date.now()}`, {
        cache: 'no-cache',
      })

      if (response.ok) {
        const data = await response.json()

        // Handle different API response formats
        let projectsData: Project[] = []
        if (data.success && data.data && Array.isArray(data.data.data)) {
          // New format: {success: true, data: {data: [...], pagination: {...}}}
          projectsData = data.data.data
        } else if (data.success && Array.isArray(data.data)) {
          // Legacy format: {success: true, data: [...]}
          projectsData = data.data
        } else if (Array.isArray(data.data)) {
          // Alternative new format: {data: [...], pagination: {...}}
          projectsData = data.data
        } else if (Array.isArray(data)) {
          // Direct array format
          projectsData = data
        }

        console.log('Sidebar: fetched projects from API:', projectsData.length)
        if (projectsData.length > 0) {
          console.log('Sidebar: project IDs from API:', projectsData.map((p: any) => p.id))
        }

        projectStore.setProjects(projectsData)
        setProjects(projectsData)
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
  }, [user])

  useEffect(() => {
    fetchProjects(true) // Always force refresh on mount
  }, [fetchProjects])

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

    const handleProjectDeleted = (event: CustomEvent) => {
      console.log('Sidebar: Project deleted event received:', event.detail?.projectId)
      console.log('Sidebar: Projects before deletion:', projects.map(p => ({ id: p.id, name: p.name })))
      fetchProjects(true) // Force refresh
    }

    const handleProjectUpdated = () => {
      console.log('Sidebar: Project updated, ensuring latest data')
      // For updates, we don't need to force refresh since the store should be updated
      // But we can ensure the sidebar reflects the latest store state
      const latestProjects = projectStore.getProjects()
      setProjects(latestProjects)
    }

    const handleForceProjectRefresh = () => {
      console.log('Sidebar: Force project refresh requested, fetching from API')
      fetchProjects(true) // Force fresh data from API
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('projectDeleted', handleProjectDeleted as EventListener)
    window.addEventListener('projectUpdated', handleProjectUpdated)
    window.addEventListener('forceProjectRefresh', handleForceProjectRefresh)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('projectDeleted', handleProjectDeleted as EventListener)
      window.removeEventListener('projectUpdated', handleProjectUpdated)
      window.removeEventListener('forceProjectRefresh', handleForceProjectRefresh)
    }
  }, [user, fetchProjects, projects])

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
  }, [lastRealtimeUpdate, user, fetchProjects])

  // Don't auto-refresh on auth changes - rely on store subscription

  // Fetch user's primary organization ID
  useEffect(() => {
    if (user) {
      fetch('/api/organizations')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data?.[0]?.id) {
            setPrimaryOrgId(data.data[0].id)
          }
        })
        .catch(err => console.error('Failed to fetch organizations:', err))
    }
  }, [user])

  // Subscribe to global project store
  useEffect(() => {
    console.log('Sidebar: subscribing to project store')
    const unsubscribe = projectStore.subscribe((storeProjects) => {
      console.log('Sidebar: received projects from store:', storeProjects.length, 'projects:', storeProjects.map(p => ({ id: p.id, name: p.name })))
      setProjects(storeProjects as Project[])
    })

    return unsubscribe
  }, [])

  // Real-time updates for projects in sidebar - use organization-specific subscription
  useOrganizationRealtime(primaryOrgId || '', (payload) => {
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
          projectStore.updateProject(payload.new.id, payload.new, true) // isFromRealtime = true
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
  }, !!primaryOrgId) // Only enable when we have an organization ID

  const handleNewProject = () => {
    // For now, just navigate to dashboard - we'll implement a modal later
    window.location.href = '/dashboard?new=true'
  }

  return (
    <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-hover overflow-hidden">
      <div className="flex h-full flex-col p-4 overflow-y-auto">
        {/* Logo Section */}
        <div className="flex items-center gap-3 p-2">
          <Image
            src="/focologo.png"
            alt="Foco Logo"
            width={40}
            height={40}
            className="h-10 w-auto brightness-0 invert"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-sidebar-text-active">Foco</h1>
            <p className="text-sm font-medium text-sidebar-text">Focus on what matters</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Main navigation">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary font-semibold text-white'
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-5 w-5 opacity-70" aria-hidden="true" />
                {item.name}
              </Link>
            )
          })}

          {/* Projects Section */}
          <div className="mt-6">
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-expanded={projectsExpanded}
              aria-label={projectsExpanded ? 'Collapse projects list' : 'Expand projects list'}
            >
              {projectsExpanded ? (
                <ChevronDown className="h-4 w-4 opacity-70" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4 opacity-70" aria-hidden="true" />
              )}
              <Folder className="h-5 w-5 opacity-70" aria-hidden="true" />
              {t('navigation.projects')}
              <span className="ml-auto text-sm bg-muted rounded-full px-2 py-0.5" aria-label={`${projects.length} projects`}>
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
                  <p className="text-sm text-muted-foreground px-3 py-2">
                    {t('projects.noProjects')}
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
                      aria-current={pathname === `/projects/${project.id}` ? 'page' : undefined}
                    >
                      {project.name}
                    </Link>
                  ))
                )}

                {projects.length > 10 && (
                  <p className="text-sm text-muted-foreground px-3 py-1">
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
            <Plus className="h-4 w-4 mr-2 opacity-70" />
            New Project
          </button>

          <Link
            href="/organizations"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Users className="h-5 w-5 opacity-70" />
            Organizations
          </Link>

          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-5 w-5 opacity-70" />
            Settings
          </Link>

          <Link
            href="/help"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <HelpCircle className="h-5 w-5 opacity-70" />
            Help & docs
          </Link>
        </div>
      </div>
    </aside>
  )
}
