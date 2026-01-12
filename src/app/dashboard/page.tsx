'use client'

import { Suspense, useEffect, useState, useCallback, lazy, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingCard, LoadingTable } from '@/components/ui/loading'
import { useToastHelpers, useToast } from '@/components/ui/toast'
import { SkipToMainContent } from '@/components/ui/accessibility'
import { ProductTour, useProductTour, defaultTourSteps } from '@/components/onboarding/product-tour'
import { useOnboarding } from '@/lib/hooks/use-onboarding'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Plus, Sparkles, Download, Upload } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useSavedViews, ViewConfig } from '@/lib/hooks/use-saved-views'
import { useCommandPaletteStore } from '@/lib/stores/foco-store'
import { projectStore } from '@/lib/stores/project-store'
import { Project } from '@/features/projects/types'
import { PageShell } from '@/components/layout/page-shell'
import { PageHeader } from '@/components/layout/page-header'
import { OnboardingChecklist } from '@/components/onboarding/onboarding-checklist'
import { useKeyboardShortcuts, commonShortcuts } from '@/lib/hooks/use-keyboard-shortcuts'
import { dialogs, placeholders, buttons } from '@/lib/copy'
import { showProjectCreated, showError } from '@/lib/toast-helpers'
import ErrorBoundary from '@/components/error/error-boundary'

// Lazy load heavy components
const ViewTabs = lazy(() => import('@/features/projects').then(m => ({ default: m.ViewTabs })))
const KanbanBoard = lazy(() => import('@/features/projects').then(m => ({ default: m.KanbanBoard })))
const ProjectTable = lazy(() => import('@/features/projects/components/ProjectTable'))
const ExportDialog = lazy(() => import('@/components/export/export-dialog'))
const ImportDialog = lazy(() => import('@/components/import/import-dialog'))
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
  // ALL HOOKS MUST BE HERE - NO EXCEPTIONS
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const { createView, setActiveView } = useSavedViews()
  const toast = useToastHelpers()
  
  // Register global shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      { ...commonShortcuts.search, action: () => useCommandPaletteStore.getState().open() },
      { ...commonShortcuts.newTask, action: () => setShowNewProjectModal(true) }, // Using project modal as placeholder
      { ...commonShortcuts.goHome, action: () => router.push('/dashboard') },
      { ...commonShortcuts.goInbox, action: () => router.push('/inbox') },
      { ...commonShortcuts.goMyWork, action: () => router.push('/my-work') },
      { ...commonShortcuts.goProjects, action: () => router.push('/projects') },
    ]
  })

  const toastNotification = useToast()
  const { shouldShowTour, markTourComplete } = useOnboarding()
  const { isOpen: isTourOpen, startTour, closeTour, completeTour } = useProductTour()

  // Redirect to personalized dashboard - disabled to prevent flickering
  // useEffect(() => {
  //   if (!loading && user) {
  //     router.replace('/dashboard/personalized')
  //   }
  // }, [loading, user, router])

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
  const [showBriefGeneration, setShowBriefGeneration] = useState(false)
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false)
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  
  // Refs to prevent duplicate fetch calls
  const hasLoadedOrganizations = useRef(false)
  const hasLoadedProjects = useRef(false)

  const fetchOrganizations = useCallback(async () => {
    if (!user || hasLoadedOrganizations.current) return

    setIsLoadingOrganizations(true)
    hasLoadedOrganizations.current = true
    
    try {
      const { apiClient } = await import('@/lib/api-client')
      const data = await apiClient.get('/api/organizations')

      if (data.success) {
        // Handle both direct array and nested data structure
        const orgs = Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.data?.data)
            ? data.data.data
            : []
        setOrganizations(orgs)
      } else {
        throw new Error(data.error || 'Failed to load organizations')
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
      const errorMessage = error instanceof Error ? error.message : 'No se pudieron cargar las organizaciones'
      toast.error('Error al cargar organizaciones', errorMessage)
      setOrganizations([]) // Ensure organizations is always an array
    } finally {
      setIsLoadingOrganizations(false)
    }
  }, [user, toast])

  const fetchProjects = useCallback(async () => {
    if (!user || hasLoadedProjects.current) return

    setIsLoadingProjects(true)
    hasLoadedProjects.current = true
    
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

  // Handle query parameters from command palette
  useEffect(() => {
    const briefParam = searchParams.get('brief')
    const suggestionsParam = searchParams.get('suggestions')

    if (briefParam === 'generate') {
      setShowBriefGeneration(true)
      toast.success('Generating daily brief...')
      // Clear the parameter from URL
      router.replace(pathname || '/dashboard')
    }

    if (suggestionsParam === 'true') {
      setShowAISuggestions(true)
      toast.success('Loading AI suggestions...')
      // Clear the parameter from URL
      router.replace(pathname || '/dashboard')
    }
  }, [searchParams, router, pathname, toast])

  useEffect(() => {
    // Check if we should show the new project modal
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('new') === 'true') {
      setShowNewProjectModal(true)
      // Clean up the URL
      router.replace('/dashboard', undefined)
    }
  }, [router])

  useEffect(() => {
    // Load organizations and projects
    if (user) {
      fetchOrganizations()
      fetchProjects()
    }
  }, [user, fetchOrganizations, fetchProjects])

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
    <ErrorBoundary>
      <PageShell>
        <OnboardingChecklist />
        <PageHeader
        title="Dashboard"
        subtitle={`${projects.length} projects`}
        primaryAction={
          <div className="flex items-center gap-2" data-tour="dashboard-actions">
            <Button 
              onClick={() => setShowNewProjectModal(true)} 
              data-tour="create-project-button"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create project</span>
              <span className="sm:hidden">Create</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowAIProjectModal(true)}
              data-tour="ai-button"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">AI create</span>
              <span className="sm:hidden">AI</span>
            </Button>
          </div>
        }
        secondaryActions={[
          { label: 'Import', onClick: () => {}, icon: Upload },
          { label: 'Export', onClick: () => {}, icon: Download },
        ]}
      />

      {/* View Tabs */}
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

      {/* Main Content */}
      <Suspense fallback={<DashboardSkeleton />}>
        {activeView === 'table' && (
          <ProjectTable 
            onCreateProject={() => setShowNewProjectModal(true)}
            onTakeTour={startTour}
            onImportProjects={() => {
              console.log('Opening import dialog')
            }}
          />
        )}
        {activeView === 'kanban' && <KanbanBoard />}
      </Suspense>

      {/* Create Project Dialog */}
      <Dialog open={showNewProjectModal} onOpenChange={setShowNewProjectModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{dialogs.createProject.title}</DialogTitle>
            <DialogDescription>{dialogs.createProject.description}</DialogDescription>
          </DialogHeader>
          <form action={handleCreateProject} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                placeholder={placeholders.projectName}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder={placeholders.description}
                rows={3}
              />
              <p className="text-xs text-zinc-500">Optional. Helps your team understand the goal.</p>
            </div>

            {organizations.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="organization_id">Organization</Label>
                <Select name="organization_id" disabled={isLoadingOrganizations}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="due_date">Due date</Label>
              <Input
                id="due_date"
                name="due_date"
                type="date"
              />
              <p className="text-xs text-zinc-500">When should this be complete?</p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewProjectModal(false)}
              >
                {buttons.cancel}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {buttons.creating}
                  </>
                ) : (
                  buttons.createProject
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AI Project Creator Dialog */}
      <Dialog open={showAIProjectModal} onOpenChange={setShowAIProjectModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/10">
                <Sparkles className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <DialogTitle>Create with AI</DialogTitle>
                <DialogDescription>
                  Describe your project and AI will create tasks and milestones.
                </DialogDescription>
              </div>
            </div>
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
        tasks={[]}
        organizations={organizations}
        labels={[]}
        onImportComplete={(result) => {
          if (result.success) {
            toastNotification.addToast({ 
              type: 'success', 
              title: 'Import complete', 
              description: `${result.imported.projects + result.imported.tasks} items imported` 
            })
            fetchOrganizations()
            fetchProjects()
          }
        }}
        onExportComplete={() => {
          toastNotification.addToast({ 
            type: 'success', 
            title: 'Export complete', 
            description: 'Your data has been exported' 
          })
        }}
      />
    </PageShell>
  )
}
