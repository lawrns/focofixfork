'use client'

import { useState } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import MainLayout from '@/components/layout/MainLayout'
import { TaskList } from '@/components/tasks/task-list'
import { TaskForm } from '@/components/tasks/task-form'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/lib/hooks/use-auth'

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
              onSuccess={handleTaskCreated}
              onCancel={() => setShowCreateModal(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Task Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
            </DialogHeader>
            {selectedTaskId && (
              <TaskForm
                taskId={selectedTaskId}
                onSuccess={handleTaskUpdated}
                onCancel={() => {
                  setShowEditModal(false)
                  setSelectedTaskId(null)
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  )
}
