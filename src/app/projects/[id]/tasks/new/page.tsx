'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TaskForm } from '@/features/tasks'
import { useAuth } from '@/lib/hooks/use-auth'
import { ProjectsService } from '@/features/projects/services/projectService'
import { MilestonesService } from '@/lib/services/milestones'
import { OrganizationsService } from '@/lib/services/organizations'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Loader2 } from 'lucide-react'

interface NewTaskPageProps {
  params: {
    id: string
  }
}

export default function NewTaskPage({ params }: NewTaskPageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [milestones, setMilestones] = useState<Array<{ id: string; title: string; project_id: string }>>([])
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; display_name: string }>>([])
  const [selectedProject, setSelectedProject] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!user) return

      try {
        // Load the specific project
        const projectResponse = await fetch(`/api/projects/${params.id}`)
        if (projectResponse.ok) {
          const project = await projectResponse.json()
          setSelectedProject({ id: project.id, name: project.name })

          // Load milestones for this project
          const milestonesResponse = await fetch(`/api/milestones?project_id=${params.id}`)
          if (milestonesResponse.ok) {
            const projectMilestones = await milestonesResponse.json()
            setMilestones(projectMilestones.map((m: { id: string; name: string; project_id: string }) => ({
              id: m.id,
              title: m.name,
              project_id: m.project_id
            })))
          }

          // Load team members for the project's organization
          if (project.organization_id) {
            const membersResponse = await OrganizationsService.getOrganizationMembers(project.organization_id)
            if (membersResponse.success && membersResponse.data) {
              setTeamMembers(membersResponse.data.map(m => ({
                id: m.user_id,
                display_name: m.user_name || m.email || 'Unknown User'
              })))
            }
          }
        }

        // Load all projects for the form dropdown
        const allProjectsResponse = await fetch('/api/projects')
        if (allProjectsResponse.ok) {
          const allProjects = await allProjectsResponse.json()
          setProjects(allProjects.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })))
        }

      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user, params.id])

  const handleSuccess = () => {
    router.push(`/projects/${params.id}`)
  }

  const handleCancel = () => {
    router.push(`/projects/${params.id}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!selectedProject) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Project Not Found</h1>
          <p className="text-muted-foreground mb-4">The project you&apos;re trying to create a task for doesn&apos;t exist or you don&apos;t have access to it.</p>
          <Button onClick={() => router.push('/projects')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div>
          <h1 className="text-3xl font-bold mb-2">Create New Task</h1>
          <p className="text-muted-foreground">
            Create a new task for project: <span className="font-medium">{selectedProject.name}</span>
          </p>
        </div>
      </div>

      <TaskForm
        projects={projects}
        milestones={milestones}
        teamMembers={teamMembers}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}
