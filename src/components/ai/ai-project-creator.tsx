'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast as sonnerToast } from 'sonner'
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'

interface AIProjectCreatorProps {
  onSuccess: (projectId: string) => void
  onCancel: () => void
}

export function AIProjectCreator({ onSuccess, onCancel }: AIProjectCreatorProps) {
  const [specification, setSpecification] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [orgsLoading, setOrgsLoading] = useState(true)
  const { user } = useAuth()

  // Load organizations on mount
  useState(() => {
    async function loadOrganizations() {
      try {
        const response = await fetch('/api/organizations')
        const data = await response.json()
        if (data.success) {
          setOrganizations(data.data || [])
          if (data.data && data.data.length > 0) {
            setOrganizationId(data.data[0].id)
          }
        }
      } catch (error) {
        console.error('Error loading organizations:', error)
      } finally {
        setOrgsLoading(false)
      }
    }
    loadOrganizations()
  })

  const handleSubmit = async () => {
    if (!specification.trim()) {
      sonnerToast.error('Description Required', {
        description: 'Please describe your project'
      })
      return
    }

    // Organization is optional - don't require it
    // if (!organizationId) {
    //   sonnerToast.error('Organization Required', {
    //     description: 'Please select an organization'
    //   })
    //   return
    // }

    setLoading(true)

    try {
      const response = await fetch('/api/ai/create-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: specification.trim(),
          ...(organizationId && organizationId !== 'lililili' && { organizationId })
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project')
      }

      if (data.success) {
        sonnerToast.success('Project Created!', {
          description: `Created ${data.data.summary.project_name} with ${data.data.summary.total_milestones} milestones and ${data.data.summary.total_tasks} tasks`
        })
        onSuccess(data.data.project.id)
      } else {
        throw new Error(data.error || 'Failed to create project')
      }
    } catch (error) {
      console.error('AI project creation error:', error)
      sonnerToast.error('Creation Failed', {
        description: error instanceof Error ? error.message : 'Failed to create project with AI'
      })
    } finally {
      setLoading(false)
    }
  }

  const examplePrompts = [
    "Build an e-commerce website with user authentication, product catalog, shopping cart, and payment integration",
    "Create a mobile app for task management with teams, projects, deadlines, and notifications",
    "Develop a customer support ticketing system with automated routing, SLA tracking, knowledge base, and reporting"
  ]

  return (
    <div className="space-y-6">
      {/* Organization Selection */}
      <div className="space-y-2">
        <Label htmlFor="organization">Organization</Label>
        <Select
          value={organizationId}
          onValueChange={setOrganizationId}
          disabled={orgsLoading || organizations.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={orgsLoading ? "Loading organizations..." : "Select organization"} />
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

      {/* Project Description */}
      <div className="space-y-2">
        <Label htmlFor="specification">Project Description</Label>
        <Textarea
          id="specification"
          placeholder="Describe your project in detail. Include features, requirements, timeline, and any specific needs..."
          value={specification}
          onChange={(e) => setSpecification(e.target.value)}
          rows={6}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          Be as detailed as possible. AI will generate a complete project structure with milestones and tasks.
        </p>
      </div>

      {/* Example Prompts */}
      <div className="space-y-2">
        <Label>Example Projects</Label>
        <div className="space-y-2">
          {examplePrompts.map((prompt, index) => (
            <button
              key={index}
              onClick={() => setSpecification(prompt)}
              className="w-full text-left p-3 text-sm border rounded-lg hover:bg-accent transition-colors"
            >
              <Sparkles className="inline h-3 w-3 mr-2 text-primary" />
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !specification.trim()}
          className="min-w-[140px]"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Create Project
            </>
          )}
        </Button>
      </div>

      {/* AI Info */}
      <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
        <Sparkles className="inline h-3 w-3 mr-1" />
        Powered by OpenAI. The AI will analyze your description and create a structured project plan with milestones and tasks.
      </div>
    </div>
  )
}
