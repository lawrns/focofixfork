'use client'

import { Suspense, useEffect, useState, useMemo, useCallback } from 'react'
import { unstable_noStore as noStore } from 'next/cache'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import ViewTabs from '@/components/projects/ViewTabs'
import ProjectTable from '@/components/projects/ProjectTable'
import { KanbanBoard } from '@/components/projects/kanban-board'
import GanttView from '@/components/views/gantt-view'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/hooks/use-auth'
import { useSavedViews, ViewConfig } from '@/lib/hooks/use-saved-views'
import { projectStore } from '@/lib/stores/project-store'

import ExportDialog from '@/components/export/export-dialog'
import ImportDialog from '@/components/import/import-dialog'
import AISuggestionsPanel from '@/components/ai/ai-suggestions-panel'
import { OllamaProjectCreator } from '@/components/ai/ollama-project-creator'
import TimeTracker from '@/components/time-tracking/time-tracker'
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

  console.log('DashboardPage render')

  // ALL HOOKS MUST BE HERE - NO EXCEPTIONS
  const router = useRouter()
  const { user, loading } = useAuth()
  const { createView, setActiveView } = useSavedViews()
  const [activeView, setActiveViewState] = useState<'table' | 'kanban' | 'gantt' | 'analytics' | 'goals'>('table')
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showAIProjectModal, setShowAIProjectModal] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchOrganizations = useCallback(async () => {
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
        }
      }
    } catch (error) {
      console.error('Error fetching organizations:', error)
    }
  }, [user])

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

    // Load organizations
    if (user) {
      fetchOrganizations()
    }
  }, [user, router, fetchOrganizations])

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
          'x-user-id': user.id,
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
    <MainLayout>
      <div className="flex">
        <div className="flex-1 p-6 md:p-8">
          <div className="flex items-end justify-between mb-8 gap-6">
            <ViewTabs
              activeTab={activeView}
              onTabChange={(tabId) => {
                if (tabId === 'table' || tabId === 'kanban' || tabId === 'gantt' || tabId === 'analytics' || tabId === 'goals') {
                  setActiveViewState(tabId as typeof activeView)
                }
              }}
            />

            <div className="flex items-center gap-3 pb-4">
              <Button
                onClick={() => setShowAIProjectModal(true)}
                variant="default"
                className="flex flex-row items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3a6.364 6.364 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
                <span>Create with AI</span>
              </Button>
              <ImportDialog
                onImportComplete={() => window.location.reload()}
              />
              <ExportDialog />
            </div>
          </div>

          <Suspense fallback={<DashboardSkeleton />}>
            {activeView === 'table' && <ProjectTable />}
            {activeView === 'kanban' && <KanbanBoard />}
            {activeView === 'gantt' && <GanttView project={{ id: '', name: '', milestones: [], tasks: [] }} />}
            {activeView === 'analytics' && <AnalyticsDashboard />}
            {activeView === 'goals' && <GoalsDashboard />}
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
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI-Powered Project Creator</DialogTitle>
          </DialogHeader>
          <OllamaProjectCreator
            onSuccess={(projectId) => {
              setShowAIProjectModal(false)
              router.push(`/projects/${projectId}`)
            }}
            onCancel={() => setShowAIProjectModal(false)}
          />
        </DialogContent>
      </Dialog>
    </MainLayout>
  )
}


