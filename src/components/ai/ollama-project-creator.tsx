'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Sparkles, CheckCircle2, XCircle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/hooks/use-auth'

interface OllamaProjectCreatorProps {
  onSuccess?: (projectId: string) => void
  onCancel?: () => void
}

interface CreatedProject {
  project: {
    id: string
    name: string
    description: string
    status: string
    priority: string
  }
  milestones: Array<{
    id: string
    name: string
    deadline: string
  }>
  tasks: Array<{
    id: string
    title: string
    status: string
  }>
  summary: {
    project_name: string
    total_milestones: number
    total_tasks: number
  }
}

export function OllamaProjectCreator({ onSuccess, onCancel }: OllamaProjectCreatorProps) {
  const { user } = useAuth()
  const [specification, setSpecification] = useState('')
  const [organizationId, setOrganizationId] = useState<string>('')
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CreatedProject | null>(null)
  const [orgsLoading, setOrgsLoading] = useState(false)

  // Load organizations on mount
  useEffect(() => {
    const loadOrganizations = async () => {
      if (!user) return

      setOrgsLoading(true)
      try {
        const response = await fetch('/api/organizations', {
          headers: {
            'x-user-id': user.id,
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            setOrganizations(data.data)
            if (data.data.length > 0) {
              setOrganizationId(data.data[0].id)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load organizations:', err)
      } finally {
        setOrgsLoading(false)
      }
    }

    loadOrganizations()
  }, [user])

  const handleCreate = async () => {
    if (!user) {
      setError('You must be logged in to create projects')
      return
    }

    if (!specification.trim()) {
      setError('Please provide a project specification')
      return
    }

    if (!organizationId) {
      setError('Please select an organization')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/ai/create-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          specification,
          organizationId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project')
      }

      if (data.success) {
        setResult(data.data)
        if (onSuccess && data.data.project.id) {
          setTimeout(() => {
            onSuccess(data.data.project.id)
          }, 2000)
        }
      } else {
        throw new Error(data.error || 'Unknown error occurred')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const exampleSpecs = [
    "Build a mobile task management app with user authentication, real-time sync, offline support, and push notifications. Timeline: 3 months, team of 4 developers.",
    "Create an e-commerce platform with product catalog, shopping cart, payment integration (Stripe), order tracking, and admin dashboard. Complex project, 6 months timeline.",
    "Develop a social media analytics dashboard with data visualization, scheduled reports, multi-platform integration (Twitter, Instagram, Facebook), and team collaboration features. 4 months, moderate complexity.",
    "Build a customer support ticketing system with automated routing, SLA tracking, knowledge base, live chat, and reporting. Simple to moderate complexity, 2 months."
  ]

  const handleExampleClick = (example: string) => {
    setSpecification(example)
  }

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
        {organizations.length === 0 && !orgsLoading && (
          <p className="text-sm text-muted-foreground">
            No organizations found. Please create an organization first.
          </p>
        )}
      </div>

      {/* Project Specification */}
      <div className="space-y-2">
        <Label htmlFor="specification">Project Specification</Label>
        <Textarea
          id="specification"
          placeholder="Describe your project in detail. Include features, timeline, team size, complexity, and any specific requirements..."
          value={specification}
          onChange={(e) => setSpecification(e.target.value)}
          rows={8}
          disabled={isLoading}
          className="resize-none"
        />
        <p className="text-sm text-muted-foreground">
          Be specific about features, timeline, team size, and complexity for best results.
        </p>
      </div>

      {/* Example Specifications */}
      <div className="space-y-2">
        <Label>Example Specifications (click to use)</Label>
        <div className="grid gap-2">
          {exampleSpecs.map((example, index) => (
            <button
              key={index}
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
              className="text-left p-3 rounded-lg border border-dashed hover:border-solid hover:bg-muted/50 transition-colors text-sm disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success Display */}
      {result && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            <div className="space-y-2">
              <p className="font-semibold">Project created successfully!</p>
              <div className="space-y-1 text-sm">
                <p><strong>Name:</strong> {result.summary.project_name}</p>
                <p><strong>Milestones:</strong> {result.summary.total_milestones}</p>
                <p><strong>Tasks:</strong> {result.summary.total_tasks}</p>
              </div>
              <p className="text-xs mt-2">Redirecting to project...</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={handleCreate}
          disabled={isLoading || !specification.trim() || !organizationId}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Project...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Create with AI
            </>
          )}
        </Button>
      </div>

      {/* Loading Progress */}
      {isLoading && (
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium">AI is working on your project...</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>✓ Analyzing specification</p>
            <p>✓ Breaking down into milestones</p>
            <p>⏳ Generating tasks...</p>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-muted/30 rounded-xl p-6 space-y-3">
        <h4 className="text-sm font-semibold text-foreground">How It Works</h4>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>1. <strong>Describe your project:</strong> Include features, timeline, team size, and complexity</p>
          <p>2. <strong>AI processes your specification:</strong> Ollama analyzes and structures your project</p>
          <p>3. <strong>Automatic generation:</strong> Creates 3-7 milestones with 3-8 tasks each</p>
          <p>4. <strong>Smart defaults:</strong> Assigns priorities, deadlines, and descriptions</p>
          <p>5. <strong>Ready to use:</strong> Start managing your project immediately</p>
        </div>
      </div>
    </div>
  )
}
