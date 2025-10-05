'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import MainLayout from '@/components/layout/MainLayout'
import { TaskForm } from '@/components/tasks/task-form'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function TaskDetailPage() {
  return (
    <ProtectedRoute>
      <TaskDetailContent />
    </ProtectedRoute>
  )
}

function TaskDetailContent() {
  const router = useRouter()
  const params = useParams()
  const taskId = params.id as string

  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadTask = async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}`)
        if (response.ok) {
          const data = await response.json()
          setTask(data.data)
        } else {
          toast.error('Failed to load task')
          router.push('/tasks')
        }
      } catch (error) {
        console.error('Failed to load task:', error)
        toast.error('Failed to load task')
        router.push('/tasks')
      } finally {
        setLoading(false)
      }
    }

    if (taskId) {
      loadTask()
    }
  }, [taskId, router])

  const handleSave = async (taskData: any) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      })

      if (response.ok) {
        toast.success('Task updated successfully')
        router.push(`/projects/${task.project_id}`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update task')
      }
    } catch (error) {
      console.error('Failed to update task:', error)
      toast.error('Failed to update task')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    )
  }

  if (!task) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-muted-foreground mb-4">Task not found</p>
          <Button onClick={() => router.push('/tasks')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tasks
          </Button>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/projects/${task.project_id}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">Edit Task</h1>
          <TaskForm
            task={task}
            projectId={task.project_id}
            onSubmit={handleSave}
            onCancel={() => router.push(`/projects/${task.project_id}`)}
            submitLabel={saving ? 'Saving...' : 'Save Changes'}
            disabled={saving}
          />
        </div>
      </div>
    </MainLayout>
  )
}
