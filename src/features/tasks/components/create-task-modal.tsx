'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { filterValidSelectOptions } from '@/lib/ui/select-validation'
import { audioService } from '@/lib/audio/audio-service'
import { hapticService } from '@/lib/audio/haptic-service'
import { apiClient } from '@/lib/api-client'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  defaultProjectId?: string
  defaultSection?: 'now' | 'next' | 'later' | 'waiting' | 'backlog'
  onSuccess?: (task: any) => void
}

interface Project {
  id: string
  name: string
  workspace_id: string
}

interface TeamMember {
  user_id: string
  email: string
  full_name: string | null
}

export function CreateTaskModal({
  isOpen,
  onClose,
  defaultProjectId,
  defaultSection = 'backlog',
  onSuccess
}: CreateTaskModalProps) {
  const router = useRouter()
  const { user } = useAuth()
  
  const [isLoading, setIsLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingData, setLoadingData] = useState(true)
  
  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [projectId, setProjectId] = useState(defaultProjectId || '')
  const [assigneeId, setAssigneeId] = useState('unassigned')
  const [priority, setPriority] = useState('medium')
  const [status, setStatus] = useState<string>(defaultSection)
  const [dueDate, setDueDate] = useState('')

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setDescription('')
      setProjectId(defaultProjectId || '')
      setAssigneeId('unassigned')
      setPriority('medium')
      setStatus(defaultSection)
      setDueDate('')
    }
  }, [isOpen, defaultProjectId, defaultSection])

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        setLoadingData(true)

        // Fetch projects with workspace_id
        const workspacesRes = await fetch('/api/workspaces')
        const workspacesData = await workspacesRes.json()
        
        if (workspacesData.success && workspacesData.data && workspacesData.data.length > 0) {
          const workspaceId = workspacesData.data[0].id
          
          const projectsRes = await fetch(`/api/projects?workspace_id=${workspaceId}`)
          const projectsData = await projectsRes.json()
          
          if (projectsData.success && projectsData.data) {
            setProjects(projectsData.data)
          }

          // Fetch workspace members
          const membersRes = await fetch(`/api/workspaces/${workspaceId}/members`)
          const membersData = await membersRes.json()

          if (membersData.success && Array.isArray(membersData.data)) {
            setTeamMembers(membersData.data.map((m: any) => ({
              user_id: m.user_id,
              email: m.email || '',
              full_name: m.user_name || m.email?.split('@')[0] || 'Unknown User'
            })))
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        toast.error('Failed to load form data')
      } finally {
        setLoadingData(false)
      }
    }

    if (isOpen && projects.length === 0) {
      fetchData()
    }
  }, [user, isOpen, projects.length])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Please enter a task title')
      return
    }

    if (!projectId) {
      toast.error('Please select a project')
      return
    }

    setIsLoading(true)

    try {
      const response = await apiClient.post('/api/tasks', {
        title: title.trim(),
        description: description.trim(),
        project_id: projectId,
        workspace_id: projects.find(p => p.id === projectId)?.workspace_id || null,
        assignee_id: assigneeId === 'unassigned' ? null : assigneeId,
        priority,
        status,
        due_date: dueDate || null,
        type: 'task',
      })

      const data = response

      if (response.success && data.data) {
        toast.success(data.data.queued ? 'Task queued for offline sync' : 'Task created successfully!')
        audioService.play('complete')
        hapticService.success()
        onSuccess?.(data.data)
        onClose()
        
        // If we're not already on a task page and it wasn't queued, optionally navigate
        if (!data.data.queued && window.location.pathname !== '/tasks/new') {
          router.push(`/tasks/${data.data.id}`)
        }
      } else {
        audioService.play('error')
        hapticService.error()
        throw new Error(data.error || 'Failed to create task')
      }
    } catch (error) {
      audioService.play('error')
      hapticService.error()
      console.error('Failed to create task:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create task')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-semibold">Title *</Label>
              <Input
                id="title"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
              <Textarea
                id="description"
                placeholder="Add more details about this task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="project" className="text-sm font-semibold">Project *</Label>
                <Select value={projectId} onValueChange={setProjectId} required>
                  <SelectTrigger id="project" className="min-h-[44px]">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterValidSelectOptions(projects).length === 0 ? (
                      <SelectItem value="none" disabled>No projects available</SelectItem>
                    ) : (
                      filterValidSelectOptions(projects).map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignee" className="text-sm font-semibold">Assignee</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger id="assignee" className="min-h-[44px]">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {teamMembers.filter(m => m.user_id && m.user_id !== '').map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-sm font-semibold">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority" className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">🔴 Urgent</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="low">🟢 Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="text-sm font-semibold">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status" className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    <SelectItem value="next">Next</SelectItem>
                    <SelectItem value="now">Now</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate" className="text-sm font-semibold">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="min-h-[44px]"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 pb-2">
              <Button 
                type="submit" 
                disabled={isLoading || !title.trim() || !projectId}
                className="min-h-[48px] sm:min-h-[40px] flex-1 font-bold text-base"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Task
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="min-h-[48px] sm:min-h-[40px] flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>

  )
}
