'use client'

import { Suspense, useEffect, useState, useMemo } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import ViewTabs from '@/components/projects/ViewTabs'
import ProjectTable from '@/components/projects/ProjectTable'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/hooks/use-auth'
import { useSavedViews, ViewConfig } from '@/lib/hooks/use-saved-views'
import GanttView from '@/components/views/gantt-view'

interface Project {
  id: string
  name: string
  milestones: Array<{
    id: string
    name: string
    start_date: string
    due_date: string
    status: 'planning' | 'active' | 'completed' | 'cancelled'
    progress_percentage?: number
    dependencies?: string[]
  }>
  tasks: Array<{
    id: string
    milestone_id: string
    name: string
    start_date?: string
    due_date?: string
    status: 'todo' | 'in_progress' | 'completed'
    assignee_id?: string
  }>
}
import ExportDialog from '@/components/export/export-dialog'
import ImportDialog from '@/components/import/import-dialog'
import AIAssistant from '@/components/ai/ai-assistant'
import AISuggestionsPanel from '@/components/ai/ai-suggestions-panel'
import TimeTracker from '@/components/time-tracking/time-tracker'
import FileUploader from '@/components/file-uploads/file-uploader'
import PresenceIndicator from '@/components/collaboration/presence-indicator'
import CommentsSection from '@/components/comments/comments-section'
import NotificationCenter from '@/components/notifications/notification-center'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'
import { GoalsDashboard } from '@/components/goals/goals-dashboard'

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}

interface Organization {
  id: string
  name: string
}

export default function DashboardPage() {
  // Disable static generation for this page since it requires authentication
  noStore()

  const router = useRouter()
  const { user, loading } = useAuth()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!user) {
    return null
  }
  const { createView, setActiveView } = useSavedViews()
  const [activeView, setActiveViewState] = useState<'table' | 'kanban' | 'gantt'>('table')
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(false)

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

  useEffect(() => {
    // Check if we should show the new project modal
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('new') === 'true') {
      setShowNewProjectModal(true)
      // Clean up the URL
      router.replace('/dashboard', undefined)
    }

    // Load organizations
    if (user) {
      fetchOrganizations()
    }
  }, [user, router])

  const fetchOrganizations = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/organizations', {
        headers: {
          'x-user-id': user.id,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const orgs = data.data || []
          setOrganizations(orgs)

          // If no organizations exist, create a default "Personal" one
          if (orgs.length === 0) {
            await createDefaultOrganization()
          }
        }
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    }
  }

  const createDefaultOrganization = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          name: 'Personal'
        }),
      })

      if (response.ok) {
        // Refresh organizations list
        fetchOrganizations()
      }
    } catch (error) {
      console.error('Error creating default organization:', error)
    }
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
          'x-user-id': user.id,
        },
        body: JSON.stringify(projectData),
      })

      if (response.ok) {
        setShowNewProjectModal(false)
        // Refresh the page to show the new project
        window.location.reload()
      } else {
        console.error('Failed to create project')
      }
    } catch (error) {
      console.error('Error creating project:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Memoize the sample project data to prevent infinite re-renders
  const sampleProject = useMemo(() => {
    return {
      id: 'sample-project',
      name: 'Sample Project',
      milestones: [
        {
          id: 'm1',
          name: 'Planning Phase',
          start_date: '2024-01-01',
          due_date: '2024-01-15',
          status: 'completed' as const,
          progress_percentage: 100
        },
        {
          id: 'm2',
          name: 'Development Phase',
          start_date: '2024-01-16',
          due_date: '2024-02-15',
          status: 'active' as const,
          progress_percentage: 65,
          dependencies: ['m1']
        },
        {
          id: 'm3',
          name: 'Testing Phase',
          start_date: '2024-02-16',
          due_date: '2024-03-01',
          status: 'planning' as const,
          progress_percentage: 0,
          dependencies: ['m2']
        }
      ],
      tasks: [
        {
          id: 't1',
          milestone_id: 'm2',
          name: 'Frontend Implementation',
          start_date: '2024-01-20',
          due_date: '2024-02-05',
          status: 'completed' as const,
          assignee_id: 'user1'
        },
        {
          id: 't2',
          milestone_id: 'm2',
          name: 'Backend API',
          start_date: '2024-01-25',
          due_date: '2024-02-10',
          status: 'in_progress' as const,
          assignee_id: 'user2'
        }
      ]
    } as Project
  }, [])

  return (
    <div className="flex h-screen font-display bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between border-b bg-background px-4 py-3">
          <Header />
        </div>
        <div className="flex">
          <div className="flex-1 p-6 md:p-8">
          <div className="flex items-end justify-between mb-8 gap-6">
            <ViewTabs
              activeTab={activeView}
              onTabChange={(tabId) => {
                if (tabId === 'table' || tabId === 'kanban' || tabId === 'gantt') {
                  setActiveViewState(tabId)
                }
              }}
            />

            <div className="flex items-center gap-3 pb-4">
              <AIAssistant />
              <ImportDialog
                onImportComplete={() => window.location.reload()}
              />
              <ExportDialog />
            </div>
          </div>

          <Suspense fallback={<DashboardSkeleton />}>
            {activeView === 'table' && <ProjectTable />}
            {activeView === 'kanban' && <div className="text-center py-12">Kanban view coming soon...</div>}
            {activeView === 'gantt' && (
              <GanttView
                project={sampleProject}
              />
            )}
          </Suspense>
          </div>

          {/* Time Tracker Sidebar - disabled until timer_sessions table exists */}
          {/* <div className="w-80 border-l bg-muted/10 p-4">
            <TimeTracker
              userId={user?.id || ''}
              projects={[]} // TODO: Pass actual projects
            />
          </div> */}
        </div>
      </main>

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
              <Select name="organization_id">
                <SelectTrigger>
                  <SelectValue placeholder="Select organization (optional)" />
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

            {/* File Attachments */}
            <div className="space-y-2">
              <Label>Attachments (Optional)</Label>
              <FileUploader
                entityType="project"
                entityId="new-project" // Will be updated after creation
                currentUserId={user?.id || ''}
                currentUserName={user?.email || 'User'}
                maxFiles={5}
                compact={true}
              />
            </div>

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
    </div>
  )
}


