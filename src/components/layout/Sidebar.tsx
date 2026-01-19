'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import {
  Home,
  Inbox,
  CheckSquare,
  Star,
  BarChart3,
  Plus,
  ChevronDown,
  ChevronRight,
  Folder,
  Users,
  Settings,
  GitBranch,
} from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useOrganizationRealtime } from '@/lib/hooks/useRealtime'
import { projectStore } from '@/lib/stores/project-store'
import { useTranslation } from '@/lib/i18n/context'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface Project {
  id: string
  name: string
  slug?: string
  status: string
  workspace_id: string | null
}

const getNavigation = (t: any) => [
  { name: t('navigation.home'), href: '/dashboard/personalized', icon: Home },
  { name: t('navigation.inbox'), href: '/inbox', icon: Inbox },
  { name: 'Propuestas', href: '/proposals', icon: GitBranch },
  { name: t('navigation.myTasks'), href: '/tasks', icon: CheckSquare },
  { name: t('navigation.favorites'), href: '/favorites', icon: Star },
  { name: t('navigation.reports'), href: '/reports', icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { t } = useTranslation()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsExpanded, setProjectsExpanded] = useState(true)
  const [loading, setLoading] = useState(true)
  const [primaryOrgId, setPrimaryOrgId] = useState<string | null>(null)
  const hasMounted = useRef(false)
  const lastRealtimeUpdate = useRef<number>(0)

  const navigation = getNavigation(t)

  // Initialize projects from store on mount
  useEffect(() => {
    // Initialize lastRealtimeUpdate on client-side to avoid hydration mismatch
    if (lastRealtimeUpdate.current === 0) {
      lastRealtimeUpdate.current = Date.now()
    }

    if (!user || hasMounted.current) return

    hasMounted.current = true
    setLoading(true)

    // Refresh projects via store
    projectStore.refreshProjects().finally(() => {
      setLoading(false)
    })

    // Set up event listeners for updates
    const handleProjectDeleted = () => {
      projectStore.refreshProjects()
    }

    const handleForceProjectRefresh = () => {
      projectStore.refreshProjects()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        projectStore.refreshProjects()
      }
    }

    const handleFocus = () => {
      projectStore.refreshProjects()
    }

    window.addEventListener('projectDeleted', handleProjectDeleted)
    window.addEventListener('forceProjectRefresh', handleForceProjectRefresh)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('projectDeleted', handleProjectDeleted)
      window.removeEventListener('forceProjectRefresh', handleForceProjectRefresh)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [user])

  // Fallback: If no real-time updates received in 5 minutes, force refresh
  useEffect(() => {
    if (!user) return

    const interval = setInterval(() => {
      const now = Date.now()
      const timeSinceLastUpdate = now - lastRealtimeUpdate.current

      if (timeSinceLastUpdate > 300000) { // 5 minutes (300000ms)
        projectStore.refreshProjects()
        lastRealtimeUpdate.current = now // Reset timer
      }
    }, 60000) // Check every 60 seconds

    return () => clearInterval(interval)
  }, [user])

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
        .catch(() => {})
    }
  }, [user])

  // Subscribe to global project store
  useEffect(() => {
    const unsubscribe = projectStore.subscribe((storeProjects) => {
      setProjects(storeProjects as Project[])
    })

    return unsubscribe
  }, [])

  // Real-time updates for projects in sidebar - use organization-specific subscription
  useOrganizationRealtime(primaryOrgId || '', (payload) => {
    // Track that we received a real-time update
    lastRealtimeUpdate.current = Date.now()

    if (payload.table === 'foco_projects') {
      if (payload.eventType === 'INSERT') {
        if (payload.new?.id && payload.new?.name) {
          projectStore.addProject(payload.new)
        }
      } else if (payload.eventType === 'UPDATE') {
        if (payload.new?.id && payload.new?.name) {
          projectStore.updateProject(payload.new.id, payload.new, true) // isFromRealtime = true
        }
      } else if (payload.eventType === 'DELETE') {
        if (payload.old?.id) {
          projectStore.removeProject(payload.old.id)
        }
      }
    }
  }, !!primaryOrgId) // Only enable when we have an organization ID

  const handleNewProject = () => {
    // For now, just navigate to dashboard - we'll implement a modal later
    window.location.href = '/dashboard?new=true'
  }

  return (
    <aside className="hidden md:flex w-60 flex-col bg-white border-r border-zinc-200">
      <div className="flex h-full flex-col px-3 py-4 overflow-y-auto">
        {/* Navigation - Minimal */}
        <nav className="flex flex-1 flex-col gap-0.5" aria-label="Main navigation">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 ${
                  isActive
                    ? 'bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.name}
              </Link>
            )
          })}

          {/* Projects Section - Compact */}
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
              aria-expanded={projectsExpanded}
              aria-label={projectsExpanded ? 'Collapse projects list' : 'Expand projects list'}
            >
              {projectsExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <Folder className="h-4 w-4" aria-hidden="true" />
              <span className="flex-1 text-left">Projects</span>
              <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500" aria-label={`${projects.length} projects`}>
                {projects.length}
              </span>
            </button>

            {projectsExpanded && (
              <div className="mt-1 ml-6 space-y-0.5">
                {loading ? (
                  <div className="animate-pulse space-y-1.5">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-5 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                    ))}
                  </div>
                ) : projects.length === 0 ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 px-2 py-1.5">
                    No projects yet
                  </p>
                ) : (
                  projects.slice(0, 10).map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.slug}`}
                      title={project.name}
                      className={`block rounded-md px-2 py-1 text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 ${
                        pathname === `/projects/${project.slug}`
                          ? 'bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                          : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                      }`}
                      aria-current={pathname === `/projects/${project.slug}` ? 'page' : undefined}
                    >
                      {project.name}
                    </Link>
                  ))
                )}

                {projects.length > 10 && (
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 px-2 py-1">
                    +{projects.length - 10} more
                  </p>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Bottom Actions - Minimal */}
        <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-800 space-y-0.5">
          <button
            onClick={handleNewProject}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
          >
            <Plus className="h-3.5 w-3.5" />
            New Project
          </button>

          <Link
            href="/organizations"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
          >
            <Users className="h-4 w-4" />
            Organizations
          </Link>

          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>

          <div className="flex items-center justify-center px-2 py-1.5">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </aside>
  )
}
