/**
 * Task Action Service
 * Handles AI-powered task actions with Plan→Apply execution pattern
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { AIService } from './ai-service'
import { TaskRepository, type Task } from '../repositories/task-repository'
import { isError } from '../repositories/base-repository'
import { v4 as uuidv4 } from 'uuid'

export type TaskActionType =
  | 'suggest_subtasks'
  | 'draft_acceptance'
  | 'summarize_thread'
  | 'propose_next_step'
  | 'detect_blockers'
  | 'break_into_subtasks'
  | 'draft_update'
  | 'estimate_time'
  | 'find_similar'

export interface TaskActionRequest {
  action: TaskActionType
  task_id: string
  workspace_id: string
}

export interface TaskActionPreview {
  execution_id: string
  action: TaskActionType
  preview: {
    explanation: string
    proposed_changes: unknown
  }
  metadata: {
    model: string
    latency_ms: number
    policy_version: number
  }
}

export interface WorkspacePolicy {
  system_instructions?: string
  task_prompts?: {
    task_generation?: string
    task_analysis?: string
    prioritization?: string
  }
  constraints?: {
    allow_task_creation?: boolean
    allow_task_updates?: boolean
    require_approval_for_changes?: boolean
  }
  version?: number
}

// In-memory store for pending previews (in production, use Redis or DB)
const pendingPreviews = new Map<string, {
  preview: TaskActionPreview
  taskId: string
  workspaceId: string
  createdAt: Date
}>()

// Clean up old previews every 5 minutes
setInterval(() => {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000) // 30 minutes
  for (const [id, entry] of pendingPreviews.entries()) {
    if (entry.createdAt < cutoff) {
      pendingPreviews.delete(id)
    }
  }
}, 5 * 60 * 1000)

export class TaskActionService {
  private aiService: AIService
  private supabase: SupabaseClient
  private taskRepo: TaskRepository

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
    this.aiService = new AIService()
    this.taskRepo = new TaskRepository(supabase)
  }

  /**
   * Generate a preview for a task action (Plan phase)
   */
  async generatePreview(
    request: TaskActionRequest,
    policy: WorkspacePolicy,
    userId: string
  ): Promise<TaskActionPreview> {
    const startTime = Date.now()

    // Fetch task details
    const taskResult = await this.taskRepo.getTaskWithDetails(request.task_id)
    if (isError(taskResult)) {
      throw new Error(`Task not found: ${request.task_id}`)
    }
    const task = taskResult.data

    // Build prompt based on action type
    const prompt = this.buildPrompt(request.action, task, policy)

    // Call AI service
    const response = await this.aiService.chatCompletion([
      { role: 'system', content: this.getSystemPrompt(policy) },
      { role: 'user', content: prompt }
    ])

    // Parse AI response
    const parsedResponse = this.parseAIResponse(request.action, response)

    const executionId = uuidv4()
    const preview: TaskActionPreview = {
      execution_id: executionId,
      action: request.action,
      preview: {
        explanation: parsedResponse.explanation,
        proposed_changes: parsedResponse.data
      },
      metadata: {
        model: this.aiService.getProviderInfo().model,
        latency_ms: Date.now() - startTime,
        policy_version: policy.version || 1
      }
    }

    // Store preview for apply phase
    pendingPreviews.set(executionId, {
      preview,
      taskId: request.task_id,
      workspaceId: request.workspace_id,
      createdAt: new Date()
    })

    // Log to audit
    await this.logAudit(request, preview, userId, true)

    return preview
  }

  /**
   * Apply a previously generated preview (Apply phase)
   */
  async applyPreview(
    executionId: string,
    userId: string
  ): Promise<{ success: boolean; applied_changes: unknown; audit_log_id: string }> {
    const pending = pendingPreviews.get(executionId)
    if (!pending) {
      throw new Error('Preview not found or expired')
    }

    const { preview, taskId } = pending
    const auditLogId = uuidv4()

    try {
      // Apply changes based on action type
      const appliedChanges = await this.applyChanges(
        preview.action,
        taskId,
        preview.preview.proposed_changes
      )

      // Clean up pending preview
      pendingPreviews.delete(executionId)

      return {
        success: true,
        applied_changes: appliedChanges,
        audit_log_id: auditLogId
      }
    } catch (error) {
      throw new Error(`Failed to apply changes: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Build prompt based on action type
   */
  private buildPrompt(action: TaskActionType, task: Task, policy: WorkspacePolicy): string {
    const customPrompts = policy.task_prompts || {}

    const taskContext = `
Task Details:
- Title: ${task.title}
- Description: ${task.description || 'No description'}
- Status: ${task.status}
- Priority: ${task.priority}
- Type: ${task.type || 'task'}
${task.due_date ? `- Due Date: ${task.due_date}` : ''}
${task.assignee_id ? `- Assigned: Yes` : '- Assigned: No'}
`

    switch (action) {
      case 'suggest_subtasks':
      case 'break_into_subtasks':
        return `${customPrompts.task_generation || ''}

${taskContext}

Generate 3-5 specific, actionable subtasks that would help complete this task.
Each subtask should be:
- Concrete and verifiable
- Appropriately scoped (completable in 1-4 hours)
- Independent where possible

Respond with ONLY a JSON object in this exact format:
{
  "explanation": "Brief explanation of your subtask breakdown",
  "subtasks": [
    { "title": "Subtask title", "description": "Brief description" }
  ]
}`

      case 'draft_acceptance':
        return `${customPrompts.task_analysis || ''}

${taskContext}

Generate 3-5 specific, testable acceptance criteria in Given/When/Then format.
Focus on:
- Concrete behaviors that can be verified
- Edge cases and error handling
- User-facing outcomes

Respond with ONLY a JSON object in this exact format:
{
  "explanation": "Brief explanation of your acceptance criteria",
  "criteria": [
    { "criterion": "Given..., When..., Then..." }
  ]
}`

      case 'summarize_thread':
        return `${taskContext}

Provide a concise summary of this task, including:
- What needs to be done
- Current status and progress
- Any blockers or dependencies

Respond with ONLY a JSON object in this exact format:
{
  "explanation": "Summary explanation",
  "summary": "The concise summary text"
}`

      case 'propose_next_step':
        return `${customPrompts.prioritization || ''}

${taskContext}

Based on the task details, propose the single most important next step to move this task forward.
Consider:
- Current status and what's needed
- Dependencies that might be blocking
- Most efficient path to completion

Respond with ONLY a JSON object in this exact format:
{
  "explanation": "Why this is the best next step",
  "next_step": {
    "action": "What to do",
    "rationale": "Why this is the priority"
  }
}`

      case 'detect_blockers':
        return `${taskContext}

Analyze this task for potential blockers, risks, or impediments.
Consider:
- Missing information or unclear requirements
- Dependencies on other tasks or people
- Technical or resource constraints
- Timeline risks

Respond with ONLY a JSON object in this exact format:
{
  "explanation": "Overview of blocker analysis",
  "blockers": [
    { "issue": "Description of blocker", "severity": "high|medium|low", "suggestion": "How to resolve" }
  ]
}`

      case 'draft_update':
        return `${taskContext}

Draft a brief status update for this task that could be shared with stakeholders.
Include:
- Current progress
- Any recent changes
- Next steps
- Any concerns or blockers

Respond with ONLY a JSON object in this exact format:
{
  "explanation": "Why this update captures the key points",
  "update": "The status update text"
}`

      case 'estimate_time':
        return `${taskContext}

Estimate the time required to complete this task.
Consider:
- Complexity of the work
- Typical developer productivity
- Testing and review time

Respond with ONLY a JSON object in this exact format:
{
  "explanation": "How you arrived at this estimate",
  "estimate": {
    "hours_low": 2,
    "hours_high": 4,
    "confidence": "high|medium|low",
    "factors": ["List of factors affecting estimate"]
  }
}`

      case 'find_similar':
        return `${taskContext}

Describe what similar tasks or patterns should be searched for in the task database.
Consider:
- Similar titles or descriptions
- Same type of work
- Related features or components

Respond with ONLY a JSON object in this exact format:
{
  "explanation": "What makes tasks similar to this one",
  "search_criteria": {
    "keywords": ["relevant", "keywords"],
    "task_types": ["bug", "feature"],
    "similarity_factors": ["What to look for"]
  }
}`

      default:
        throw new Error(`Unknown action type: ${action}`)
    }
  }

  /**
   * Get system prompt with workspace customization
   */
  private getSystemPrompt(policy: WorkspacePolicy): string {
    const basePrompt = `You are an AI assistant for a project management tool called Foco.
You help users manage their tasks more effectively by providing intelligent suggestions.
Always respond with valid JSON as specified in the prompt.
Be concise, specific, and actionable in your suggestions.`

    if (policy.system_instructions) {
      return `${basePrompt}

Workspace-specific instructions:
${policy.system_instructions}`
    }

    return basePrompt
  }

  /**
   * Parse AI response based on action type
   */
  private parseAIResponse(action: TaskActionType, response: string): { explanation: string; data: unknown } {
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = response
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1]
      }

      const parsed = JSON.parse(jsonStr.trim())
      return {
        explanation: parsed.explanation || 'AI generated suggestions',
        data: this.extractActionData(action, parsed)
      }
    } catch (error) {
      // Return raw response if JSON parsing fails
      return {
        explanation: 'AI generated response',
        data: { raw_response: response }
      }
    }
  }

  /**
   * Extract action-specific data from parsed response
   */
  private extractActionData(action: TaskActionType, parsed: Record<string, unknown>): unknown {
    switch (action) {
      case 'suggest_subtasks':
      case 'break_into_subtasks':
        return parsed.subtasks || []
      case 'draft_acceptance':
        return parsed.criteria || []
      case 'summarize_thread':
        return parsed.summary || ''
      case 'propose_next_step':
        return parsed.next_step || {}
      case 'detect_blockers':
        return parsed.blockers || []
      case 'draft_update':
        return parsed.update || ''
      case 'estimate_time':
        return parsed.estimate || {}
      case 'find_similar':
        return parsed.search_criteria || {}
      default:
        return parsed
    }
  }

  /**
   * Apply changes to the database (for actions that modify data)
   */
  private async applyChanges(
    action: TaskActionType,
    taskId: string,
    proposedChanges: unknown
  ): Promise<unknown> {
    // For now, most actions just return the suggested data
    // Subtasks creation would actually create tasks
    if (action === 'suggest_subtasks' || action === 'break_into_subtasks') {
      const subtasks = proposedChanges as Array<{ title: string; description: string }>

      // Get parent task to get workspace/project context
      const taskResult = await this.taskRepo.getTaskWithDetails(taskId)
      if (isError(taskResult)) {
        throw new Error('Parent task not found')
      }
      const parentTask = taskResult.data

      const createdSubtasks = []
      for (const subtask of subtasks) {
        const result = await this.taskRepo.create({
          title: subtask.title,
          description: subtask.description,
          workspace_id: parentTask.workspace_id,
          project_id: parentTask.project_id,
          parent_id: taskId,
          status: 'backlog',
          priority: parentTask.priority,
          type: 'task',
          reporter_id: parentTask.reporter_id || parentTask.assignee_id || ''
        })

        if (!isError(result)) {
          createdSubtasks.push(result.data)
        }
      }

      return { created: createdSubtasks }
    }

    // For non-write actions, just return the data as "applied"
    return { applied: proposedChanges }
  }

  /**
   * Log audit entry
   */
  private async logAudit(
    request: TaskActionRequest,
    preview: TaskActionPreview,
    userId: string,
    success: boolean
  ): Promise<void> {
    try {
      await this.supabase.from('activity_log').insert({
        workspace_id: request.workspace_id,
        entity_type: 'ai_task_action',
        entity_id: request.task_id,
        action: `ai_action:${request.action}`,
        changes: {
          execution_id: preview.execution_id,
          action: request.action,
          model: preview.metadata.model,
          latency_ms: preview.metadata.latency_ms,
          success
        },
        user_id: userId,
        is_ai_action: true,
        can_undo: false
      })
    } catch (error) {
      console.error('Failed to log audit:', error)
      // Don't throw - audit logging shouldn't block operations
    }
  }
}
