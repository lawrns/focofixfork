'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import MainLayout from '@/components/layout/MainLayout'
import { TaskList, TaskForm } from '@/features/tasks'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
          setSelectedTask(data.data)
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

  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-8 pt-6">
        <TaskList
          showCreateButton={true}
          onCreateTask={handleCreateTask}
          onEditTask={handleEditTask}
          initialAssignee={user?.id}
        />

        {/* Create Task Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
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
