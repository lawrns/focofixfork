'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  Zap,
  Save,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Wrench,
  Shield,
  History,
  Info
} from 'lucide-react'

// Available AI tools that can be enabled/disabled
const AVAILABLE_TOOLS = [
  { id: 'query_tasks', name: 'Query Tasks', description: 'Search and filter tasks based on criteria' },
  { id: 'get_task_details', name: 'Get Task Details', description: 'Retrieve detailed information about a specific task' },
  { id: 'get_project_overview', name: 'Get Project Overview', description: 'Get summary of project status and progress' },
  { id: 'analyze_workload', name: 'Analyze Workload', description: 'Analyze team member workload distribution' },
  { id: 'suggest_priorities', name: 'Suggest Priorities', description: 'AI-powered priority suggestions' },
  { id: 'generate_reports', name: 'Generate Reports', description: 'Create status reports and summaries' },
  { id: 'search_docs', name: 'Search Documents', description: 'Search through project documentation' },
  { id: 'timeline_analysis', name: 'Timeline Analysis', description: 'Analyze project timelines and dependencies' },
] as const

// Task-specific prompt sections
const TASK_PROMPTS = [
  {
    id: 'task_generation',
    title: 'Task Generation',
    description: 'When creating tasks...',
    placeholder: 'Enter instructions for how AI should create tasks. Example: "Always include acceptance criteria. Use action verbs. Estimate based on team velocity."'
  },
  {
    id: 'task_analysis',
    title: 'Task Analysis',
    description: 'When analyzing tasks...',
    placeholder: 'Enter instructions for how AI should analyze tasks. Example: "Consider dependencies. Flag overdue items. Identify blocking issues."'
  },
  {
    id: 'prioritization',
    title: 'Prioritization',
    description: 'When prioritizing tasks...',
    placeholder: 'Enter instructions for prioritization logic. Example: "Consider business value, urgency, and effort. Deprioritize non-critical items near deadlines."'
  },
] as const

// Audit level descriptions
const AUDIT_LEVELS = [
  {
    value: 'minimal',
    title: 'Minimal',
    description: 'Log only errors and critical events'
  },
  {
    value: 'standard',
    title: 'Standard',
    description: 'Log all AI actions and major decisions'
  },
  {
    value: 'full',
    title: 'Full',
    description: 'Log everything including prompts, responses, and reasoning'
  },
] as const

interface WorkspaceAIPolicy {
  system_instructions: string
  task_prompts: {
    task_generation: string
    task_analysis: string
    prioritization: string
  }
  allowed_tools: string[]
  constraints: {
    allow_task_creation: boolean
    allow_task_updates: boolean
    allow_task_deletion: boolean
    require_approval_for_changes: boolean
    max_tokens_per_request: number
  }
  audit_level: 'minimal' | 'standard' | 'full'
  version: number
  last_updated_by?: string
  last_updated_at?: string
}

const DEFAULT_AI_POLICY: WorkspaceAIPolicy = {
  system_instructions: '',
  task_prompts: {
    task_generation: '',
    task_analysis: '',
    prioritization: '',
  },
  allowed_tools: ['query_tasks', 'get_task_details', 'get_project_overview'],
  constraints: {
    allow_task_creation: true,
    allow_task_updates: true,
    allow_task_deletion: false,
    require_approval_for_changes: true,
    max_tokens_per_request: 4096,
  },
  audit_level: 'standard',
  version: 1,
}

interface AISettingsTabProps {
  workspaceId: string
  currentUserRole?: string
  className?: string
}

export default function AISettingsTab({
  workspaceId,
  currentUserRole = 'member',
  className
}: AISettingsTabProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [policy, setPolicy] = useState<WorkspaceAIPolicy>(DEFAULT_AI_POLICY)
  const [originalPolicy, setOriginalPolicy] = useState<WorkspaceAIPolicy>(DEFAULT_AI_POLICY)
  const [expandedPrompts, setExpandedPrompts] = useState<string[]>([])

  const canManageSettings = currentUserRole === 'admin' || currentUserRole === 'owner'
  const hasChanges = JSON.stringify(policy) !== JSON.stringify(originalPolicy)

  // Character limit for system instructions
  const SYSTEM_INSTRUCTIONS_LIMIT = 2000

  const loadPolicy = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/workspaces/${workspaceId}/ai-policy`)

      if (response.ok) {
        const data = await response.json()
        if (data.ok && data.data) {
          setPolicy(data.data)
          setOriginalPolicy(data.data)
        }
      }
    } catch (error) {
      console.error('Failed to load AI policy:', error)
      toast.error('Failed to load AI settings')
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    loadPolicy()
  }, [loadPolicy])

  const handleSave = async () => {
    if (!canManageSettings) return

    setIsSaving(true)
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/ai-policy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(policy),
      })

      const data = await response.json()

      if (response.ok && data.ok) {
        // Update with server response (includes new version)
        setPolicy(data.data)
        setOriginalPolicy(data.data)
        toast.success('AI settings saved successfully')
      } else {
        toast.error(data.error?.message || 'Failed to save AI settings')
      }
    } catch (error) {
      console.error('Failed to save AI policy:', error)
      toast.error('Failed to save AI settings')
    } finally {
      setIsSaving(false)
    }
  }

  const togglePromptExpanded = (promptId: string) => {
    setExpandedPrompts(prev =>
      prev.includes(promptId)
        ? prev.filter(id => id !== promptId)
        : [...prev, promptId]
    )
  }

  const toggleTool = (toolId: string) => {
    setPolicy(prev => ({
      ...prev,
      allowed_tools: prev.allowed_tools.includes(toolId)
        ? prev.allowed_tools.filter(id => id !== toolId)
        : [...prev.allowed_tools, toolId]
    }))
  }

  if (!canManageSettings) {
    return (
      <div className={className}>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You need admin or owner permissions to manage AI settings.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={className}>
        <div className="space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-48 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" />
            AI & Prompts
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure AI behavior and capabilities for your workspace
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
        >
          {isSaving ? (
            <>
              <Clock className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        {/* System Instructions Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              System Instructions
            </CardTitle>
            <CardDescription>
              This prompt is prepended to all AI interactions in your workspace
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Enter general AI behavior instructions for your workspace..."
                value={policy.system_instructions}
                onChange={(e) => setPolicy(prev => ({
                  ...prev,
                  system_instructions: e.target.value.slice(0, SYSTEM_INSTRUCTIONS_LIMIT)
                }))}
                rows={6}
                className="resize-none"
              />
              <div className="flex justify-end">
                <span className={`text-sm ${
                  policy.system_instructions.length > SYSTEM_INSTRUCTIONS_LIMIT * 0.9
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                }`}>
                  {policy.system_instructions.length} / {SYSTEM_INSTRUCTIONS_LIMIT}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task-Specific Prompts Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Task-Specific Prompts
            </CardTitle>
            <CardDescription>
              Customize AI behavior for different task operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {TASK_PROMPTS.map((prompt) => (
              <Collapsible
                key={prompt.id}
                open={expandedPrompts.includes(prompt.id)}
                onOpenChange={() => togglePromptExpanded(prompt.id)}
              >
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left">
                    <div>
                      <div className="font-medium">{prompt.title}</div>
                      <div className="text-sm text-muted-foreground">{prompt.description}</div>
                    </div>
                    {expandedPrompts.includes(prompt.id) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3">
                  <Textarea
                    placeholder={prompt.placeholder}
                    value={policy.task_prompts[prompt.id as keyof typeof policy.task_prompts]}
                    onChange={(e) => setPolicy(prev => ({
                      ...prev,
                      task_prompts: {
                        ...prev.task_prompts,
                        [prompt.id]: e.target.value
                      }
                    }))}
                    rows={4}
                    className="resize-none"
                  />
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CardContent>
        </Card>

        {/* Allowed Tools Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Allowed Tools
            </CardTitle>
            <CardDescription>
              Select which AI tools can be used in your workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AVAILABLE_TOOLS.map((tool) => {
                const isEnabled = policy.allowed_tools.includes(tool.id)
                return (
                  <div
                    key={tool.id}
                    className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={tool.id}
                      checked={isEnabled}
                      onCheckedChange={() => toggleTool(tool.id)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={tool.id}
                        className="font-medium cursor-pointer"
                      >
                        {tool.name}
                      </label>
                      <p className="text-sm text-muted-foreground">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Constraints Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Constraints
            </CardTitle>
            <CardDescription>
              Control what actions AI can perform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Allow Task Creation</Label>
                  <p className="text-sm text-muted-foreground">
                    AI can create new tasks
                  </p>
                </div>
                <Switch
                  checked={policy.constraints.allow_task_creation}
                  onCheckedChange={(checked) => setPolicy(prev => ({
                    ...prev,
                    constraints: { ...prev.constraints, allow_task_creation: checked }
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Allow Task Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    AI can modify existing tasks
                  </p>
                </div>
                <Switch
                  checked={policy.constraints.allow_task_updates}
                  onCheckedChange={(checked) => setPolicy(prev => ({
                    ...prev,
                    constraints: { ...prev.constraints, allow_task_updates: checked }
                  }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-start gap-2">
                  <div>
                    <Label className="text-base">Allow Task Deletion</Label>
                    <p className="text-sm text-muted-foreground">
                      AI can delete tasks
                    </p>
                  </div>
                  {policy.constraints.allow_task_deletion && (
                    <Badge variant="destructive" className="ml-2">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Caution
                    </Badge>
                  )}
                </div>
                <Switch
                  checked={policy.constraints.allow_task_deletion}
                  onCheckedChange={(checked) => setPolicy(prev => ({
                    ...prev,
                    constraints: { ...prev.constraints, allow_task_deletion: checked }
                  }))}
                />
              </div>

              {policy.constraints.allow_task_deletion && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Enabling task deletion allows AI to permanently remove tasks.
                    Consider enabling &quot;Require approval for changes&quot; for additional safety.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Require Approval for Changes</Label>
                  <p className="text-sm text-muted-foreground">
                    AI changes must be approved before applying
                  </p>
                </div>
                <Switch
                  checked={policy.constraints.require_approval_for_changes}
                  onCheckedChange={(checked) => setPolicy(prev => ({
                    ...prev,
                    constraints: { ...prev.constraints, require_approval_for_changes: checked }
                  }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-tokens">Max Tokens per Request</Label>
              <Input
                id="max-tokens"
                type="number"
                inputMode="numeric"
                min={256}
                max={32768}
                step={256}
                value={policy.constraints.max_tokens_per_request}
                onChange={(e) => setPolicy(prev => ({
                  ...prev,
                  constraints: {
                    ...prev.constraints,
                    max_tokens_per_request: Math.min(32768, Math.max(256, parseInt(e.target.value) || 4096))
                  }
                }))}
                className="max-w-[200px]"
              />
              <p className="text-sm text-muted-foreground">
                Limit the maximum response length (256 - 32768 tokens)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Audit Level Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Audit Level
            </CardTitle>
            <CardDescription>
              Control how much AI activity is logged
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={policy.audit_level}
              onValueChange={(value) => setPolicy(prev => ({
                ...prev,
                audit_level: value as WorkspaceAIPolicy['audit_level']
              }))}
              className="space-y-3"
            >
              {AUDIT_LEVELS.map((level) => (
                <div key={level.value} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={level.value} id={level.value} className="mt-1" />
                  <div className="flex-1">
                    <label htmlFor={level.value} className="font-medium cursor-pointer">
                      {level.title}
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {level.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Version Info Section (Read-only) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Version Information
            </CardTitle>
            <CardDescription>
              Policy version and history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Current Version</div>
                <div className="text-lg font-semibold">{policy.version}</div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Last Updated By</div>
                <div className="text-lg font-semibold">
                  {policy.last_updated_by || 'N/A'}
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Last Updated At</div>
                <div className="text-lg font-semibold">
                  {policy.last_updated_at
                    ? new Date(policy.last_updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'N/A'
                  }
                </div>
              </div>
            </div>
            <div className="mt-4">
              <Button variant="outline" size="sm" disabled>
                <History className="w-4 h-4" />
                View History
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Version history feature coming soon
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky Save Button for Mobile */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 md:hidden"
          >
            <Button onClick={handleSave} disabled={isSaving} size="lg" className="shadow-lg">
              {isSaving ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
