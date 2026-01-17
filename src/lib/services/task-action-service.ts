/**
 * Task Action Service
 * Handles AI-powered task actions with Plan→Apply execution pattern
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { AIService } from './ai-service'
import { TaskRepository, type Task } from '../repositories/task-repository'
import { isError } from '../repositories/base-repository'

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

// Database-backed preview storage (no more in-memory Map that loses data on restart)

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
    console.log('[TaskActionService] generatePreview called:', { 
      action: request.action, 
      taskId: request.task_id, 
      workspaceId: request.workspace_id,
      userId 
    })

    // Validate task exists and user has access
    const taskResult = await this.taskRepo.getTaskWithDetails(request.task_id)
    if (isError(taskResult)) {
      console.error('[TaskActionService] Task not found:', taskResult.error)
      throw new Error('Task not found')
    }
    const task = taskResult.data
    console.log('[TaskActionService] Task found:', task.title)

    // Build prompt based on action type
    const prompt = this.buildPrompt(request.action, task, policy)
    console.log('[TaskActionService] Prompt built')

    // Call AI service
    console.log('[TaskActionService] Calling AI service...')
    const response = await this.aiService.chatCompletion([
      { role: 'system', content: this.getSystemPrompt(policy) },
      { role: 'user', content: prompt }
    ])
    console.log('[TaskActionService] AI service responded')

    // Parse AI response
    const parsedResponse = this.parseAIResponse(request.action, response)
    console.log('[TaskActionService] Response parsed')

    const executionId = crypto.randomUUID()
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
    console.log('[TaskActionService] Preview created:', executionId)

    // Store preview in database for apply phase (survives serverless restarts)
    const { error: insertError } = await this.supabase
      .from('ai_action_previews')
      .insert({
        execution_id: executionId,
        task_id: request.task_id,
        workspace_id: request.workspace_id,
        user_id: userId,
        action_type: request.action,
        preview_data: preview.preview,
        metadata: preview.metadata,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutes
      })

    if (insertError) {
      console.error('[TaskActionService] Failed to store preview:', insertError)
      // Continue anyway - preview can still be returned to client
    }

    // Log to audit
    console.log('[TaskActionService] Logging to audit...')
    try {
      await this.logAudit(request, preview, userId, true)
      console.log('[TaskActionService] Audit logged')
    } catch (auditError) {
      console.error('[TaskActionService] Audit logging failed:', auditError)
      // Don't fail the whole operation if audit logging fails
    }

    return preview
  }

  /**
   * Apply a previously generated preview (Apply phase)
   */
  async applyPreview(
    executionId: string,
    userId: string
  ): Promise<{ success: boolean; applied_changes: unknown; audit_log_id: string; already_applied?: boolean }> {
    // Fetch preview from database (including already applied ones for idempotency)
    const { data: pending, error: fetchError } = await this.supabase
      .from('ai_action_previews')
      .select('*')
      .eq('execution_id', executionId)
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (fetchError || !pending) {
      console.error('[TaskActionService] Preview fetch error:', fetchError)
      throw new Error('Preview not found or expired')
    }

    // If already applied, return success but indicate it was already done
    if (pending.applied_at) {
      console.log('[TaskActionService] Preview already applied:', executionId)
      return {
        success: true,
        already_applied: true,
        applied_changes: { message: 'Changes were already applied' },
        audit_log_id: 'already_applied'
      }
    }

    const auditLogId = crypto.randomUUID()

    try {
      // Apply changes based on action type
      const appliedChanges = await this.applyChanges(
        pending.action_type as TaskActionType,
        pending.task_id,
        pending.preview_data.proposed_changes
      )

      // Mark preview as applied in database
      await this.supabase
        .from('ai_action_previews')
        .update({ applied_at: new Date().toISOString() })
        .eq('execution_id', executionId)

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
