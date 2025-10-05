'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MilestoneForm } from '@/components/milestones/milestone-form'
import { useAuth } from '@/lib/hooks/use-auth'
import { ProjectsService } from '@/lib/services/projects'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Loader2 } from 'lucide-react'

interface NewMilestonePageProps {
  params: {
    id: string
  }
}

export default function NewMilestonePage({ params }: NewMilestonePageProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
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
        }

        // Load all projects for the form dropdown
        const projectsResponse = await fetch('/api/projects')
        if (projectsResponse.ok) {
          const allProjects = await projectsResponse.json()
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
          <p className="text-muted-foreground mb-4">The project you&apos;re trying to create a milestone for doesn&apos;t exist or you don&apos;t have access to it.</p>
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
          <h1 className="text-3xl font-bold mb-2">Create New Milestone</h1>
          <p className="text-muted-foreground">
            Create a new milestone for project: <span className="font-medium">{selectedProject.name}</span>
          </p>
        </div>
      </div>

      <MilestoneForm
        projects={projects}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  )
}
