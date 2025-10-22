'use client'

import { Suspense, useEffect, useState, useMemo, useCallback, lazy } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { useRouter } from 'next/navigation'
// Lazy load heavy components
const ViewTabs = lazy(() => import('@/features/projects').then(m => ({ default: m.ViewTabs })))
const KanbanBoard = lazy(() => import('@/features/projects').then(m => ({ default: m.KanbanBoard })))
const ProjectTable = lazy(() => import('@/features/projects/components/ProjectTable'))
const GanttView = lazy(() => import('@/components/views/gantt-view'))
import { Skeleton } from '@/components/ui/skeleton'
import { Loading, LoadingCard, LoadingTable } from '@/components/ui/loading'
import { useToastHelpers, useToast } from '@/components/ui/toast'
import { SkipToMainContent } from '@/components/ui/accessibility'
import { DashboardEmpty } from '@/components/empty-states/dashboard-empty'
import { ProductTour, useProductTour, defaultTourSteps } from '@/components/onboarding/product-tour'
import { useOnboarding } from '@/lib/hooks/use-onboarding'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useSavedViews, ViewConfig } from '@/lib/hooks/use-saved-views'
import { projectStore } from '@/lib/stores/project-store'
import { Project } from '@/features/projects/types'

// Lazy load additional heavy components
const ExportDialog = lazy(() => import('@/components/export/export-dialog'))
const ImportDialog = lazy(() => import('@/components/import/import-dialog'))
const TimeTracker = lazy(() => import('@/components/time-tracking/time-tracker'))
const PresenceIndicator = lazy(() => import('@/components/collaboration/presence-indicator'))
const CommentsSection = lazy(() => import('@/components/comments/comments-section'))
const NotificationCenter = lazy(() => import('@/components/notifications/notification-center'))
const AIProjectCreator = lazy(() => import('@/components/ai/ai-project-creator').then(m => ({ default: m.AIProjectCreator })))
const QuickActionsMenu = lazy(() => import('@/components/ui/quick-actions-menu').then(m => ({ default: m.QuickActionsMenu })))
const ImportExportModal = lazy(() => import('@/components/import-export/import-export-modal').then(m => ({ default: m.ImportExportModal })))

function DashboardSkeleton() {
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
            <LoadingTable rows={5} columns={4} />
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

interface Organization {
  id: string
  name: string
  created_by: string
  created_at: string
  updated_at: string
}

export default function DashboardPage() {
  // Disable static generation for this page since it requires authentication
  noStore()
  
  console.log('DashboardPage render')

  // ALL HOOKS MUST BE HERE - NO EXCEPTIONS
  const router = useRouter()
  const { user, loading } = useAuth()
  const { createView, setActiveView } = useSavedViews()
  const toast = useToastHelpers()
  const toastNotification = useToast()
  const { shouldShowTour, markTourComplete } = useOnboarding()
  const { isOpen: isTourOpen, startTour, closeTour, completeTour } = useProductTour()

  // Redirect to personalized dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard/personalized')
    }
  }, [loading, user, router])

  // Set page title
  useEffect(() => {
    document.title = 'Dashboard | Foco'
  }, [])

  // Auto-start tour for new users
  useEffect(() => {
    if (shouldShowTour() && !isTourOpen) {
      // Delay tour start to ensure page is fully loaded
      const timer = setTimeout(() => {
        startTour()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [shouldShowTour, isTourOpen, startTour])

  const handleTourComplete = () => {
    markTourComplete()
    completeTour()
  }
  const [activeView, setActiveViewState] = useState<'table' | 'kanban' | 'gantt'>('table')
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showAIProjectModal, setShowAIProjectModal] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)

  const fetchOrganizations = useCallback(async () => {
    if (!user) return

    setIsLoadingOrganizations(true)
    try {
      const { apiClient } = await import('@/lib/api-client')
      const data = await apiClient.get('/api/organizations')
      
      if (data.success) {
        const orgs = data.data || []
        setOrganizations(orgs)
      } else {
        throw new Error(data.error || 'Failed to load organizations')
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
      const errorMessage = error instanceof Error ? error.message : 'No se pudieron cargar las organizaciones'
      toast.error('Error al cargar organizaciones', errorMessage)
    } finally {
      setIsLoadingOrganizations(false)
    }
  }, [user, toast])

  const fetchProjects = useCallback(async () => {
    if (!user) return

    setIsLoadingProjects(true)
    try {
      const { apiClient } = await import('@/lib/api-client')
      const data = await apiClient.get('/api/projects')
      
      if (data.success) {
        const projs = data.data?.data || data.data || []
        setProjects(projs)
      } else {
        throw new Error(data.error || 'Failed to load projects')
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      const errorMessage = error instanceof Error ? error.message : 'No se pudieron cargar los proyectos'
      toast.error('Error al cargar proyectos', errorMessage)
    } finally {
      setIsLoadingProjects(false)
    }
  }, [user, toast])

  // ALL useEffect hooks here
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    // Check if we should show the new project modal
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('new') === 'true') {
      setShowNewProjectModal(true)
      // Clean up the URL
      router.replace('/dashboard', undefined)
    }

    // Load organizations and projects
    if (user) {
      fetchOrganizations()
      fetchProjects()
    }
  }, [user, router, fetchOrganizations, fetchProjects])

  // Listen for quick action events
  useEffect(() => {
    const handleOpenCreateProject = () => {
      setShowNewProjectModal(true)
    }

    const handleOpenCreateTask = () => {
      // For now, just show a toast. In a real implementation, this would open a task creation modal
      toast.success('Task creation coming soon!')
    }

    const handleOpenCreateOrganization = () => {
      router.push('/organizations')
    }

    const handleToggleView = (event: CustomEvent) => {
      const { view } = event.detail
      if (view === 'board') {
        setActiveViewState('kanban')
      } else if (view === 'table') {
        setActiveViewState('table')
      }
    }

    const handleToggleTheme = () => {
      // Toggle theme logic would go here
      toast.success('Theme toggle coming soon!')
    }

    const handleShowShortcuts = () => {
      toast.success('Keyboard shortcuts: Press "/" to open quick actions, "?" for help')
    }

    window.addEventListener('open-create-project', handleOpenCreateProject)
    window.addEventListener('open-create-task', handleOpenCreateTask)
    window.addEventListener('open-create-organization', handleOpenCreateOrganization)
    window.addEventListener('toggle-view', handleToggleView as EventListener)
    window.addEventListener('toggle-theme', handleToggleTheme)
    window.addEventListener('show-shortcuts', handleShowShortcuts)

    return () => {
      window.removeEventListener('open-create-project', handleOpenCreateProject)
      window.removeEventListener('open-create-task', handleOpenCreateTask)
      window.removeEventListener('open-create-organization', handleOpenCreateOrganization)
      window.removeEventListener('toggle-view', handleToggleView as EventListener)
      window.removeEventListener('toggle-theme', handleToggleTheme)
      window.removeEventListener('show-shortcuts', handleShowShortcuts)
    }
  }, [router, toast])

  // TODO: Load projects data for Gantt view when needed

  // CONDITIONAL RENDERING ONLY AFTER ALL HOOKS
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Saved views handlers
  const handleViewSelect = (view: ViewConfig) => {
    setActiveView(view.id)
    // TODO: Apply view filters and settings to the current view
    console.log('Selected view:', view)
  }

  const handleViewSave = (name: string) => {
    // TODO: Capture current view configuration and save it
    const currentConfig = {
      type: 'table' as const,
      filters: {},
      // Add more current view state here
    }
    createView({
      ...currentConfig,
      name,
    })
  }

  const currentViewConfig = {
    type: 'table' as const,
    filters: {},
    // Add more current view configuration
  }

  const handleCreateProject = async (formData: FormData) => {
    if (!user) return

    setIsLoading(true)
    try {
      const projectData = {
        name: formData.get('name'),
        description: formData.get('description'),
        organization_id: formData.get('organization_id') || null,
      }

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Dashboard: project created:', result.data)
        projectStore.addProject(result.data)
        setShowNewProjectModal(false)
      } else {
        console.error('Failed to create project')
      }
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between mb-6 gap-6 px-6 pt-4" data-tour="dashboard-header">
            <Suspense fallback={<Skeleton className="h-10 w-64" />}>
              <ViewTabs
                activeTab={activeView}
                onTabChange={(tabId) => {
                if (tabId === 'table' || tabId === 'kanban' || tabId === 'gantt' || tabId === 'analytics' || tabId === 'goals') {
                  setActiveViewState(tabId as typeof activeView)
                }
              }}
              data-tour="view-tabs"
            />
            </Suspense>

            <div className="flex items-center gap-2 md:gap-3 pb-4">
              <Button
                onClick={() => setShowNewProjectModal(true)}
                variant="default"
                className="flex flex-row items-center gap-2"
                data-tour="create-project-button"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden md:inline">Create Project</span>
                <span className="md:hidden">Create</span>
              </Button>
              <Button
                onClick={() => setShowAIProjectModal(true)}
                variant="outline"
                className="flex flex-row items-center gap-2"
                data-tour="ai-button"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-70"
                >
                  <path d="M12 3a6.364 6.364 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
                <span className="hidden md:inline">Create with AI</span>
                <span className="md:hidden">AI</span>
              </Button>
              <ImportDialog
                onImportComplete={() => window.location.reload()}
              />
              <ExportDialog />
            </div>
          </div>

          <Suspense fallback={<DashboardSkeleton />}>
            {activeView === 'table' && (
              <ProjectTable 
                onCreateProject={() => setShowNewProjectModal(true)}
                onTakeTour={startTour}
                onImportProjects={() => {
                  // TODO: Trigger import dialog
                  console.log('Opening import dialog')
                }}
              />
            )}
            {activeView === 'kanban' && <KanbanBoard />}
            {activeView === 'gantt' && <GanttView project={{ id: '', name: '', milestones: [], tasks: [] }} />}
          </Suspense>

          {/* Time Tracker Sidebar - disabled until timer_sessions table exists */}
          {/* <div className="w-80 border-l bg-muted/10 p-4">
            <TimeTracker
              userId={user?.id || ''}
              projects={[]} // TODO: Pass actual projects
            />
          </div> */}

          {/* New Project Modal */}
      <Dialog open={showNewProjectModal} onOpenChange={setShowNewProjectModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <form action={handleCreateProject} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe your project"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization_id">Organization (Optional)</Label>
              <Select name="organization_id" disabled={isLoadingOrganizations}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingOrganizations ? "Loading organizations..." : "Select organization (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingOrganizations ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    </div>
                  ) : organizations.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No organizations found</div>
                  ) : (
                    organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">

            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                name="due_date"
                type="date"
              />
            </div>

            {/* File Attachments - Disabled for new project creation */}
            {/* Files can be uploaded after the project is created */}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewProjectModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Project Creator Modal */}
      <Dialog open={showAIProjectModal} onOpenChange={setShowAIProjectModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto glass-card border-2">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500">
                  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"></path>
                  <path d="M20 3v4"></path>
                  <path d="M22 5h-4"></path>
                  <path d="M4 17v2"></path>
                  <path d="M5 18H3"></path>
                </svg>
              </div>
              <DialogTitle className="text-2xl">AI-Powered Project Creator</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-muted-foreground">
              Describe your project in natural language, and AI will automatically create a complete project structure with milestones and tasks.
            </DialogDescription>
          </DialogHeader>
          <AIProjectCreator
            onSuccess={(projectId) => {
              setShowAIProjectModal(false)
              router.push(`/projects/${projectId}`)
            }}
            onCancel={() => setShowAIProjectModal(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Product Tour */}
      <ProductTour
        isOpen={isTourOpen}
        onClose={closeTour}
        onComplete={handleTourComplete}
        steps={defaultTourSteps}
      />

      {/* Quick Actions Menu */}
      <QuickActionsMenu />

      {/* Import/Export Modal */}
      <ImportExportModal
        projects={projects}
        tasks={[]} // TODO: Add tasks data
        organizations={organizations}
        labels={[]} // TODO: Add labels data
        onImportComplete={(result) => {
          if (result.success) {
            toastNotification.addToast({ type: 'success', title: 'Success', description: `Successfully imported ${result.imported.projects + result.imported.tasks} items` })
            // Refresh data
            fetchOrganizations()
            fetchProjects()
          }
        }}
        onExportComplete={() => {
          toastNotification.addToast({ type: 'success', title: 'Success', description: 'Export completed successfully' })
        }}
      />
    </div>
  )
}
