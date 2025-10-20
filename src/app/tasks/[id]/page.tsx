'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/protected-route'
import MainLayout from '@/components/layout/MainLayout'
import { TaskForm } from '@/features/tasks'
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
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [milestones, setMilestones] = useState<Array<{ id: string; title: string; project_id: string }>>([])
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; display_name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadTask = async () => {
      try {
        const response = await fetch(`/api/tasks/${taskId}`)
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
          
          if (!taskData) {
            toast.error('Task not found')
            router.push('/tasks')
            return
          }
          
          setTask(taskData)

          // Load related data
          const projectsResponse = await fetch('/api/projects')
          if (projectsResponse.ok) {
            const projectsData = await projectsResponse.json()
            
            // Handle wrapped response structure for projects
            let projectsList: any[] = []
            if (projectsData.success && projectsData.data) {
              if (Array.isArray(projectsData.data.data)) {
                projectsList = projectsData.data.data
              } else if (Array.isArray(projectsData.data)) {
                projectsList = projectsData.data
              }
            } else if (Array.isArray(projectsData.data)) {
              projectsList = projectsData.data
            } else if (Array.isArray(projectsData)) {
              projectsList = projectsData
            }
            
            setProjects(projectsList.map((p: any) => ({ id: p.id, name: p.name })))
          }

          // Load milestones for the task's project
          if (taskData.project_id) {
            const milestonesResponse = await fetch(`/api/milestones?project_id=${taskData.project_id}`)
            if (milestonesResponse.ok) {
              const milestonesData = await milestonesResponse.json()
              
              // Handle wrapped response structure for milestones
              let milestonesList: any[] = []
              if (milestonesData.success && milestonesData.data) {
                if (Array.isArray(milestonesData.data.data)) {
                  milestonesList = milestonesData.data.data
                } else if (Array.isArray(milestonesData.data)) {
                  milestonesList = milestonesData.data
                }
              } else if (Array.isArray(milestonesData.data)) {
                milestonesList = milestonesData.data
              } else if (Array.isArray(milestonesData)) {
                milestonesList = milestonesData
              }
              
              setMilestones(milestonesList.map((m: any) => ({ id: m.id, title: m.name, project_id: m.project_id })))
            }
          }
        } else {
          const errorData = await response.json()
          toast.error(errorData.error?.message || 'Failed to load task')
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
        toast.error(error.error?.message || 'Failed to update task')
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
            projects={projects}
            milestones={milestones}
            teamMembers={teamMembers}
            onSuccess={() => router.push(`/projects/${task.project_id}`)}
            onCancel={() => router.push(`/projects/${task.project_id}`)}
          />
        </div>
      </div>
    </MainLayout>
  )
}
