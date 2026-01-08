'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import MainLayout from '@/components/layout/MainLayout'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Script from 'next/script'
import { TaskList, TaskForm } from '@/features/tasks'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useAuth } from '@/lib/hooks/use-auth'
import { projectStore } from '@/lib/stores/project-store'

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <TasksContent />
    </ProtectedRoute>
  )
}

function TasksContent() {
  const { user } = useAuth()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])

  // Load projects for task creation
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch('/api/projects')
        if (response.ok) {
          const data = await response.json()

          // Handle wrapped response structure: {success: true, data: {data: [...], pagination: {}}}
          let projectsData: any[] = []
          if (data.success && data.data) {
            if (Array.isArray(data.data.data)) {
              projectsData = data.data.data
            } else if (Array.isArray(data.data)) {
              projectsData = data.data
            }
          } else if (Array.isArray(data.data)) {
            projectsData = data.data
          } else if (Array.isArray(data)) {
            projectsData = data
          }

          const projectList = projectsData.map((p: any) => ({
            id: p.id,
            name: p.name
          }))
          setProjects(projectList)
        }
      } catch (error) {
        console.error('Failed to load projects:', error)
      }
    }

    loadProjects()
  }, [])

  // Load selected task for editing
  useEffect(() => {
    const loadTask = async () => {
      if (!selectedTaskId) {
        setSelectedTask(null)
        return
      }

      try {
        const response = await fetch(`/api/tasks/${selectedTaskId}`)
        if (response.ok) {
          const data = await response.json()
          
          // Handle wrapped response structure: {success: true, data: taskData}
          let taskData = null
          if (data.success && data.data) {
            taskData = data.data
          } else if (data.data) {
            taskData = data.data
          } else {
            taskData = data
          }
          
          setSelectedTask(taskData)
        }
      } catch (error) {
        console.error('Failed to load task:', error)
      }
    }

    loadTask()
  }, [selectedTaskId])

  const handleCreateTask = () => {
    setShowCreateModal(true)
  }

  const handleEditTask = (taskId: string) => {
    setSelectedTaskId(taskId)
    setShowEditModal(true)
  }

  const handleTaskCreated = () => {
    setShowCreateModal(false)
    window.location.reload()
  }

  const handleTaskUpdated = () => {
    setShowEditModal(false)
    setSelectedTaskId(null)
    window.location.reload()
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        alert('Task deleted successfully')
        // Refresh the page to update the task list
        window.location.reload()
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Failed to delete task:', response.statusText, errorData)
        alert(`Failed to delete task: ${errorData.error || response.statusText}`)
      }
    } catch (error) {
      console.error('Error deleting task:', error)
      alert('Error deleting task')
    }
  }

  return (
    <MainLayout>
      <div className="space-y-4 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Tasks</span>
              <Button onClick={handleCreateTask}><Plus className="w-4 h-4 mr-2" />New Task</Button>
            </CardTitle>
            <CardDescription>View and manage tasks. Create, edit, and organize work.</CardDescription>
          </CardHeader>
        </Card>
        <TaskList
          showCreateButton={true}
          onCreateTask={handleCreateTask}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          initialAssignee={user?.id}
        />

        <Script id="jsonld-tasks" type="application/ld+json" strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Dashboard', item: '/dashboard' },
            { '@type': 'ListItem', position: 2, name: 'Tasks', item: '/tasks' }
          ]
        }) }} />

        {/* Create Task Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Create a new task for your project. Fill in the details below.
              </DialogDescription>
            </DialogHeader>
            <TaskForm
              projects={projects}
              onSuccess={handleTaskCreated}
              onCancel={() => setShowCreateModal(false)}
              isInModal={true}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Task Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Update the task details below.
              </DialogDescription>
            </DialogHeader>
            {selectedTask && (
              <TaskForm
                task={selectedTask}
                projects={projects}
                onSuccess={handleTaskUpdated}
                onCancel={() => {
                  setShowEditModal(false)
                  setSelectedTaskId(null)
                }}
                isInModal={true}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
