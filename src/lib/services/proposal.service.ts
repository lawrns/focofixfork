/**
 * Proposal Service
 *
 * Orchestrates proposal lifecycle: creation, AI processing, review workflow,
 * and merging approved items into the project.
 *
 * Responsibilities:
 * - Proposal CRUD operations
 * - AI-powered content processing
 * - Auto-allocation and time estimation
 * - Review and approval workflow
 * - Impact calculation
 * - Merging proposals into actual project entities
 */

import { supabaseAdmin } from '@/lib/supabase-server'
import { aiService } from './ai-service'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Proposal,
  ProposalItem,
  ProposalStatus,
  ProposalItemStatus,
  ProposalImpactSummary,
  CreateProposalData,
  UpdateProposalData,
  CreateProposalItemData,
  ProposalWithDetails,
  ProposalSourceType,
} from '@/types/proposals'

const untypedSupabase = supabaseAdmin as any

// Workload tracking type for auto-allocation
interface MemberWorkload {
  user_id: string
  name: string
  current_hours: number
  capacity_hours: number
  utilization_percent: number
}

// ============================================================================
// Types
// ============================================================================

export interface CreateProposalInput {
  title: string
  description?: string | null
  metadata?: Record<string, unknown>
  source_type: ProposalSourceType
  source_content?: {
    raw_text?: string
    file_url?: string
    transcript?: string
    metadata?: Record<string, unknown>
  }
}

export interface ProcessProposalResult {
  items: ProposalItem[]
  impact_summary: ProposalImpactSummary
}

export interface MergeResult {
  tasks_created: string[]
  milestones_created: string[]
  tasks_updated: string[]
  milestones_updated: string[]
  tasks_deleted: string[]
  milestones_deleted: string[]
  total_changes: number
}

export interface ProposalWithImpact extends Proposal {
  items: ProposalItem[]
  impact_summary: ProposalImpactSummary
}

export interface AIAssignment {
  assignee_id: string | null
  confidence: number
  reasoning: string
  alternatives: Array<{
    assignee_id: string
    score: number
    reason: string
  }>
  workload_context: {
    current_hours: number
    capacity_hours: number
    utilization_percent: number
  }
}

export interface AIEstimate {
  hours: number
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  range: {
    optimistic: number
    expected: number
    pessimistic: number
  }
  basis: 'historical' | 'benchmark' | 'ai_inference'
  comparable_tasks?: Array<{
    id: string
    title: string
    actual_hours: number
  }>
}

// ============================================================================
// Service Class
// ============================================================================

export class ProposalService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient = untypedSupabase) {
    this.supabase = supabase
  }

  // ============================================================================
  // 1. CREATE PROPOSAL
  // ============================================================================

  /**
   * Creates a new proposal
   * If source content provided, triggers AI processing automatically
   */
  async createProposal(
    userId: string,
    projectId: string,
    input: CreateProposalInput
  ): Promise<Proposal> {
    try {
      // Fetch workspace_id from project
      const { data: project, error: projectError } = await this.supabase
        .from('foco_projects')
        .select('workspace_id')
        .eq('id', projectId)
        .maybeSingle()

      if (projectError || !project) {
        throw new Error(`Project ${projectId} not found`)
      }

      // Create proposal record
      const proposalData = {
        workspace_id: project.workspace_id,
        project_id: projectId,
        title: input.title,
        description: input.description || null,
        status: 'draft' as const,
        owner_id: userId,
        source_type: input.source_type,
        source_content: input.source_content || {},
        base_snapshot_at: new Date().toISOString(),
        metadata: input.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data: proposal, error } = await this.supabase
        .from('proposals')
        .insert(proposalData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create proposal: ${error.message}`)
      }

      // If source content provided, trigger AI processing
      if (input.source_content?.raw_text || input.source_content?.transcript) {
        await this.processProposalContent(proposal.id)
      }

      return proposal as Proposal
    } catch (error: any) {
      console.error('Error creating proposal:', error)
      throw new Error(`Failed to create proposal: ${error.message}`)
    }
  }

  // ============================================================================
  // 2. PROCESS PROPOSAL CONTENT (AI)
  // ============================================================================

  /**
   * Calls AI parser to extract items from proposal content
   * Creates proposal items and calculates initial estimates and assignments
   * Updates impact summary
   */
  async processProposalContent(proposalId: string): Promise<ProposalItem[]> {
    try {
      // Get proposal with source content
      const { data: proposal, error: proposalError } = await this.supabase
        .from('proposals')
        .select('*, foco_projects(id, title, workspace_id)')
        .eq('id', proposalId)
        .maybeSingle()

      if (proposalError || !proposal) {
        throw new Error(`Proposal ${proposalId} not found`)
      }

      const sourceContent = proposal.source_content || {}
      const rawText = sourceContent.raw_text || sourceContent.transcript || ''

      if (!rawText) {
        throw new Error('No source content to process')
      }

      // Get project context (existing tasks, team members)
      const projectContext = await this.getProjectContext(proposal.project_id)

      // AI: Parse content into structured items
      const parsedItems = await this.parseProposalWithAI(rawText, projectContext)

      // AI: Calculate estimates and assignments for each item
      const processedItems = await Promise.all(
        parsedItems.map(async (item, index) => {
          const aiEstimate = await this.estimateTaskDuration(item, projectContext)
          const aiAssignment = await this.assignTask(item, projectContext)

          return {
            proposal_id: proposalId,
            item_type: item.item_type,
            entity_type: item.entity_type,
            entity_id: item.entity_id || null,
            proposed_data: item.proposed_data,
            current_data: item.current_data || null,
            status: 'pending' as ProposalItemStatus,
            ai_estimate: aiEstimate,
            ai_assignment: aiAssignment,
            position: index,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        })
      )

      // Insert proposal items
      const { data: items, error: itemsError } = await this.supabase
        .from('proposal_items')
        .insert(processedItems)
        .select()

      if (itemsError) {
        throw new Error(`Failed to create proposal items: ${itemsError.message}`)
      }

      // Calculate and store impact summary
      await this.calculateImpactSummary(proposalId)

      return items as ProposalItem[]
    } catch (error: any) {
      console.error('Error processing proposal content:', error)
      throw new Error(`Failed to process proposal: ${error.message}`)
    }
  }

  // ============================================================================
  // 3. SUBMIT FOR REVIEW
  // ============================================================================

  /**
   * Validates proposal has items and changes status to pending_review
   * Notifies approver
   */
  async submitForReview(proposalId: string, userId: string): Promise<Proposal> {
    try {
      // Get proposal with items
      const { data: proposal, error: proposalError } = await this.supabase
        .from('proposals')
        .select(`
          *,
          proposal_items(id)
        `)
        .eq('id', proposalId)
        .maybeSingle()

      if (proposalError || !proposal) {
        throw new Error(`Proposal ${proposalId} not found`)
      }

      // Validate user is the creator
      if (proposal.owner_id !== userId) {
        throw new Error('Only the proposal creator can submit for review')
      }

      // Validate status
      if (proposal.status !== 'draft') {
        throw new Error(`Proposal is already ${proposal.status}`)
      }

      // Validate has items
      const items = (proposal.proposal_items as any[]) || []
      if (items.length === 0) {
        throw new Error('Cannot submit empty proposal')
      }

      // Get project to find approver (project owner or manager)
      const { data: project } = await this.supabase
        .from('foco_projects')
        .select('owner_id')
        .eq('id', proposal.project_id)
        .maybeSingle()

      const approverId = project?.owner_id || null

      // Update proposal status
      const { data: updated, error: updateError } = await this.supabase
        .from('proposals')
        .update({
          status: 'pending' as const,
          submitted_at: new Date().toISOString(),
          approver_id: approverId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposalId)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to submit proposal: ${updateError.message}`)
      }

      // TODO: Send notification to approver

      return updated as Proposal
    } catch (error: any) {
      console.error('Error submitting proposal:', error)
      throw new Error(`Failed to submit proposal: ${error.message}`)
    }
  }

  // ============================================================================
  // 4. REVIEW ITEM
  // ============================================================================

  /**
   * Updates item status (approved/rejected)
   * Recalculates impact summary
   * Checks if all items reviewed
   */
  async reviewItem(
    itemId: string,
    userId: string,
    decision: 'approved' | 'rejected',
    notes?: string
  ): Promise<ProposalItem> {
    try {
      // Get item with proposal
      const { data: item, error: itemError } = await this.supabase
        .from('proposal_items')
        .select(`
          *,
          proposals(id, approver_id, status)
        `)
        .eq('id', itemId)
        .maybeSingle()

      if (itemError || !item) {
        throw new Error(`Proposal item ${itemId} not found`)
      }

      const proposal = (item.proposals as any)

      // Validate user is the approver
      if (proposal.approver_id !== userId) {
        throw new Error('Only the designated approver can review items')
      }

      // Validate proposal status
      if (proposal.status !== 'pending') {
        throw new Error('Proposal is not pending review')
      }

      // Update item
      const { data: updated, error: updateError } = await this.supabase
        .from('proposal_items')
        .update({
          approval_status: decision,
          reviewer_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to review item: ${updateError.message}`)
      }

      // Recalculate impact summary
      await this.calculateImpactSummary(item.proposal_id)

      // Check if all items reviewed
      await this.checkAndUpdateProposalStatus(item.proposal_id)

      return updated as ProposalItem
    } catch (error: any) {
      console.error('Error reviewing item:', error)
      throw new Error(`Failed to review item: ${error.message}`)
    }
  }

  // ============================================================================
  // 5. MERGE PROPOSAL
  // ============================================================================

  /**
   * Gets all approved items and creates actual tasks/milestones in the project
   * Archives the proposal
   * Returns created entity IDs
   */
  async mergeProposal(proposalId: string, userId: string): Promise<MergeResult> {
    try {
      // Get proposal with approved items
      const { data: proposal, error: proposalError } = await this.supabase
        .from('proposals')
        .select(`
          *,
          proposal_items(*)
        `)
        .eq('id', proposalId)
        .maybeSingle()

      if (proposalError || !proposal) {
        throw new Error(`Proposal ${proposalId} not found`)
      }

      // Validate user is the approver
      if (proposal.approver_id !== userId) {
        throw new Error('Only the designated approver can merge proposals')
      }

      // Validate proposal status
      if (proposal.status !== 'approved') {
        throw new Error('Proposal must be approved before merging')
      }

      const items = (proposal.proposal_items as any[]) || []
      const approvedItems = items.filter(item => item.approval_status === 'approved')

      if (approvedItems.length === 0) {
        throw new Error('No approved items to merge')
      }

      const result: MergeResult = {
        tasks_created: [],
        milestones_created: [],
        tasks_updated: [],
        milestones_updated: [],
        tasks_deleted: [],
        milestones_deleted: [],
        total_changes: 0,
      }

      // Process each approved item
      for (const item of approvedItems) {
        if (item.entity_type === 'task') {
          if (item.item_type === 'create') {
            const taskId = await this.createTaskFromProposalItem(item, proposal)
            result.tasks_created.push(taskId)
          } else if (item.item_type === 'update') {
            await this.updateTaskFromProposalItem(item)
            result.tasks_updated.push(item.entity_id)
          } else if (item.item_type === 'delete') {
            await this.deleteTask(item.entity_id)
            result.tasks_deleted.push(item.entity_id)
          }
        } else if (item.entity_type === 'milestone') {
          if (item.item_type === 'create') {
            const milestoneId = await this.createMilestoneFromProposalItem(item, proposal)
            result.milestones_created.push(milestoneId)
          } else if (item.item_type === 'update') {
            await this.updateMilestoneFromProposalItem(item)
            result.milestones_updated.push(item.entity_id)
          } else if (item.item_type === 'delete') {
            await this.deleteMilestone(item.entity_id)
            result.milestones_deleted.push(item.entity_id)
          }
        }
      }

      result.total_changes =
        result.tasks_created.length +
        result.tasks_updated.length +
        result.tasks_deleted.length +
        result.milestones_created.length +
        result.milestones_updated.length +
        result.milestones_deleted.length

      // Update proposal status to applied
      await this.supabase
        .from('proposals')
        .update({
          status: 'applied' as const,
          merged_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposalId)

      return result
    } catch (error: any) {
      console.error('Error merging proposal:', error)
      throw new Error(`Failed to merge proposal: ${error.message}`)
    }
  }

  // ============================================================================
  // 6. RECALCULATE WITH ASSUMPTIONS
  // ============================================================================

  /**
   * Updates AI estimates based on new assumptions
   * Recalculates impact
   */
  async recalculateWithAssumptions(
    proposalId: string,
    assumptions: {
      capacity_overrides?: Record<string, number>
      locked_assignments?: string[]
      complexity_adjustments?: Record<string, number>
    }
  ): Promise<Proposal> {
    try {
      // Get proposal items
      const { data: items } = await this.supabase
        .from('proposal_items')
        .select('*')
        .eq('proposal_id', proposalId)

      if (!items || items.length === 0) {
        throw new Error('No items found for proposal')
      }

      // Get project context with overrides
      const projectContext = await this.getProjectContext(
        (items[0] as any).proposals?.project_id
      )

      // Apply capacity overrides
      if (assumptions.capacity_overrides) {
        Object.entries(assumptions.capacity_overrides).forEach(([userId, capacity]) => {
          const member = projectContext.team_members.find(m => m.user_id === userId)
          if (member) {
            member.capacity_hours = capacity
          }
        })
      }

      // Recalculate for each item (unless locked)
      const lockedIds = new Set(assumptions.locked_assignments || [])

      for (const item of items as any[]) {
        if (item.approval_status !== 'pending') continue
        if (lockedIds.has(item.id)) continue

        // Recalculate estimate
        let aiEstimate = item.ai_estimate
        if (assumptions.complexity_adjustments?.[item.id]) {
          const adjustment = assumptions.complexity_adjustments[item.id]
          aiEstimate = await this.estimateTaskDuration(
            item,
            projectContext,
            adjustment
          )
        }

        // Recalculate assignment
        const aiAssignment = await this.assignTask(item, projectContext)

        // Update item
        await this.supabase
          .from('proposal_items')
          .update({
            ai_estimate: aiEstimate,
            ai_assignment: aiAssignment,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id)
      }

      // Recalculate impact summary
      await this.calculateImpactSummary(proposalId)

      // Return updated proposal
      return this.getProposalWithImpact(proposalId)
    } catch (error: any) {
      console.error('Error recalculating proposal:', error)
      throw new Error(`Failed to recalculate proposal: ${error.message}`)
    }
  }

  // ============================================================================
  // 7. GET PROPOSAL WITH IMPACT
  // ============================================================================

  /**
   * Gets proposal with items and computed impact
   */
  async getProposalWithImpact(proposalId: string): Promise<ProposalWithImpact> {
    try {
      const { data: proposal, error } = await this.supabase
        .from('proposals')
        .select(`
          *,
          proposal_items(*),
          proposal_impact_summary(*)
        `)
        .eq('id', proposalId)
        .maybeSingle()

      if (error || !proposal) {
        throw new Error(`Proposal ${proposalId} not found`)
      }

      return {
        ...proposal,
        items: (proposal.proposal_items as any[]) || [],
        impact_summary: (proposal.proposal_impact_summary as any)?.[0] || this.getEmptyImpactSummary(),
      } as ProposalWithImpact
    } catch (error: any) {
      console.error('Error fetching proposal with impact:', error)
      throw new Error(`Failed to fetch proposal: ${error.message}`)
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Get project context for AI processing
   */
  private async getProjectContext(projectId: string) {
    // Get existing tasks
    const { data: tasks } = await this.supabase
      .from('work_items')
      .select('id, title, status, estimate_hours, actual_hours, assignee_id')
      .eq('project_id', projectId)
      .limit(100)

    // Get team members with workload
    const { data: members } = await this.supabase
      .from('foco_project_members')
      .select(`
        user_id,
        role,
        user_profiles(full_name, email)
      `)
      .eq('project_id', projectId)

    return {
      project_id: projectId,
      tasks: tasks || [],
      team_members: (members || []).map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        name: m.user_profiles?.full_name || 'Unknown',
        capacity_hours: 40, // Default 40h/week
      })),
    }
  }

  /**
   * Parse proposal content with AI
   */
  private async parseProposalWithAI(content: string, context: any): Promise<any[]> {
    const prompt = `You are a project management AI. Parse this proposal into structured tasks.

Content: ${content}

Context:
- Existing tasks: ${context.tasks.length}
- Team members: ${context.team_members.map((m: any) => m.name).join(', ')}

Return JSON array of items:
[
  {
    "item_type": "create",
    "entity_type": "task",
    "proposed_data": {
      "title": "Task title",
      "description": "Task description",
      "type": "task|bug|feature",
      "priority": "high|medium|low"
    }
  }
]

Only include tasks explicitly mentioned. Be specific and actionable.`

    try {
      const response = await aiService.generate({
        prompt,
        systemPrompt: 'You are an expert project manager. Parse proposals into clear, actionable tasks.',
        temperature: 0.3,
        maxTokens: 2000,
      })

      const parsed = JSON.parse(response.content)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.error('AI parsing failed:', error)
      // Fallback: Create a single task from the content
      return [
        {
          item_type: 'create',
          entity_type: 'task',
          proposed_data: {
            title: content.substring(0, 100),
            description: content,
            type: 'task',
            priority: 'medium',
          },
        },
      ]
    }
  }

  /**
   * Estimate task duration with AI
   */
  private async estimateTaskDuration(
    item: any,
    context: any,
    complexityAdjustment?: number
  ): Promise<AIEstimate> {
    const taskTitle = item.proposed_data?.title || 'Untitled'
    const taskDescription = item.proposed_data?.description || ''

    // Find similar historical tasks
    const similarTasks = context.tasks
      .filter((t: any) => t.actual_hours && t.actual_hours > 0)
      .slice(0, 5)

    const prompt = `Estimate hours for this task:

Title: ${taskTitle}
Description: ${taskDescription}

${similarTasks.length > 0 ? `
Historical tasks:
${similarTasks.map((t: any) => `- "${t.title}": ${t.actual_hours}h`).join('\n')}
` : ''}

Return JSON:
{
  "hours": 8,
  "confidence": "high|medium|low",
  "reasoning": "Brief explanation",
  "range": {
    "optimistic": 6,
    "expected": 8,
    "pessimistic": 12
  }
}`

    try {
      const response = await aiService.generate({
        prompt,
        systemPrompt: 'You are an expert at estimating software task duration.',
        temperature: 0.4,
        maxTokens: 500,
      })

      const estimate = JSON.parse(response.content)

      // Apply complexity adjustment
      if (complexityAdjustment) {
        estimate.hours *= complexityAdjustment
        estimate.range.optimistic *= complexityAdjustment
        estimate.range.expected *= complexityAdjustment
        estimate.range.pessimistic *= complexityAdjustment
      }

      return {
        ...estimate,
        basis: similarTasks.length > 0 ? 'historical' : 'ai_inference',
        comparable_tasks: similarTasks.slice(0, 3),
      }
    } catch (error) {
      console.error('AI estimation failed:', error)
      return {
        hours: 8,
        confidence: 'low',
        reasoning: 'Default estimate (AI unavailable)',
        range: { optimistic: 4, expected: 8, pessimistic: 16 },
        basis: 'benchmark',
      }
    }
  }

  /**
   * Assign task to team member with AI
   */
  private async assignTask(item: any, context: any): Promise<AIAssignment> {
    const taskTitle = item.proposed_data?.title || 'Untitled'
    const teamMembers = context.team_members

    if (teamMembers.length === 0) {
      return {
        assignee_id: null,
        confidence: 0,
        reasoning: 'No team members available',
        alternatives: [],
        workload_context: {
          current_hours: 0,
          capacity_hours: 0,
          utilization_percent: 0,
        },
      }
    }

    // Calculate current workload for each member
    const workloads: MemberWorkload[] = teamMembers.map((member: any) => {
      const assignedTasks = context.tasks.filter(
        (t: any) => t.assignee_id === member.user_id && t.status !== 'done'
      )
      const currentHours = assignedTasks.reduce(
        (sum: number, t: any) => sum + (t.estimate_hours || 0),
        0
      )
      const capacityHours = member.capacity_hours || 40
      const utilizationPercent = (currentHours / capacityHours) * 100

      return {
        user_id: member.user_id,
        name: member.name,
        current_hours: currentHours,
        capacity_hours: capacityHours,
        utilization_percent: utilizationPercent,
      }
    })

    // Find least loaded member
    const sorted = workloads.sort((a: MemberWorkload, b: MemberWorkload) => a.utilization_percent - b.utilization_percent)
    const bestMatch = sorted[0]

    return {
      assignee_id: bestMatch.user_id,
      confidence: 0.8,
      reasoning: `Assigned to ${bestMatch.name} (${Math.round(bestMatch.utilization_percent)}% utilized)`,
      alternatives: sorted.slice(1, 3).map(w => ({
        assignee_id: w.user_id,
        score: 100 - w.utilization_percent,
        reason: `${w.name} - ${Math.round(w.utilization_percent)}% utilized`,
      })),
      workload_context: {
        current_hours: bestMatch.current_hours,
        capacity_hours: bestMatch.capacity_hours,
        utilization_percent: bestMatch.utilization_percent,
      },
    }
  }

  /**
   * Calculate impact summary for proposal
   */
  private async calculateImpactSummary(proposalId: string): Promise<void> {
    const { data: items } = await this.supabase
      .from('proposal_items')
      .select('*')
      .eq('proposal_id', proposalId)

    if (!items) return

    const summary = {
      total_tasks_added: items.filter(i => i.item_type === 'create' && i.entity_type === 'task').length,
      total_tasks_modified: items.filter(i => i.item_type === 'update' && i.entity_type === 'task').length,
      total_tasks_removed: items.filter(i => i.item_type === 'delete' && i.entity_type === 'task').length,
      total_hours_added: items
        .filter(i => i.item_type === 'create')
        .reduce((sum, i) => sum + ((i.ai_estimate as any)?.hours || 0), 0),
      total_hours_removed: items
        .filter(i => i.item_type === 'delete')
        .reduce((sum, i) => sum + ((i.current_data as any)?.estimate_hours || 0), 0),
      workload_shifts: [],
      deadline_impacts: [],
      resource_conflicts: [],
      risk_score: 0,
      calculated_at: new Date().toISOString(),
    }

    // Upsert impact summary
    await this.supabase
      .from('proposal_impact_summary')
      .upsert({
        proposal_id: proposalId,
        ...summary,
      })
  }

  /**
   * Check if all items reviewed and update proposal status
   */
  private async checkAndUpdateProposalStatus(proposalId: string): Promise<void> {
    const { data: items } = await this.supabase
      .from('proposal_items')
      .select('approval_status')
      .eq('proposal_id', proposalId)

    if (!items || items.length === 0) return

    const pending = items.filter(i => i.approval_status === 'pending').length
    const approved = items.filter(i => i.approval_status === 'approved').length
    const rejected = items.filter(i => i.approval_status === 'rejected').length

    let status: ProposalStatus = 'pending_review'
    let resolvedAt: string | null = null

    if (pending === 0) {
      resolvedAt = new Date().toISOString()
      if (approved > 0 && rejected === 0) {
        status = 'approved'
      } else if (rejected > 0 && approved === 0) {
        status = 'rejected'
      } else if (approved > 0 && rejected > 0) {
        status = 'partially_approved'
      }
    }

    await this.supabase
      .from('proposals')
      .update({
        status,
        resolved_at: resolvedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', proposalId)
  }

  /**
   * Create task from proposal item
   */
  private async createTaskFromProposalItem(item: any, proposal: any): Promise<string> {
    const proposedData = item.proposed_data || {}
    const aiEstimate = (item.ai_estimate || {}) as AIEstimate
    const aiAssignment = (item.ai_assignment || {}) as AIAssignment

    const taskData = {
      workspace_id: proposal.workspace_id,
      project_id: proposal.project_id,
      title: proposedData.title || 'Untitled Task',
      description: proposedData.description || null,
      type: proposedData.type || 'task',
      status: 'backlog',
      priority: proposedData.priority || 'medium',
      assignee_id: aiAssignment.assignee_id || null,
      reporter_id: proposal.owner_id,
      estimate_hours: aiEstimate.hours || null,
      metadata: {
        from_proposal: proposal.id,
        ai_estimate: aiEstimate,
        ai_assignment: aiAssignment,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await this.supabase
      .from('work_items')
      .insert(taskData)
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to create task: ${error.message}`)
    }

    return data.id
  }

  /**
   * Update task from proposal item
   */
  private async updateTaskFromProposalItem(item: any): Promise<void> {
    const proposedData = item.proposed_data || {}

    await this.supabase
      .from('work_items')
      .update({
        ...proposedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.entity_id)
  }

  /**
   * Delete task
   */
  private async deleteTask(taskId: string): Promise<void> {
    await this.supabase.from('work_items').delete().eq('id', taskId)
  }

  /**
   * Create milestone from proposal item
   */
  private async createMilestoneFromProposalItem(item: any, proposal: any): Promise<string> {
    const proposedData = item.proposed_data || {}

    const milestoneData = {
      workspace_id: proposal.workspace_id,
      project_id: proposal.project_id,
      title: proposedData.title || 'Untitled Milestone',
      description: proposedData.description || null,
      due_date: proposedData.due_date || null,
      metadata: {
        from_proposal: proposal.id,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await this.supabase
      .from('foco_milestones')
      .insert(milestoneData)
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to create milestone: ${error.message}`)
    }

    return data.id
  }

  /**
   * Update milestone from proposal item
   */
  private async updateMilestoneFromProposalItem(item: any): Promise<void> {
    const proposedData = item.proposed_data || {}

    await this.supabase
      .from('foco_milestones')
      .update({
        ...proposedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.entity_id)
  }

  /**
   * Delete milestone
   */
  private async deleteMilestone(milestoneId: string): Promise<void> {
    await this.supabase.from('foco_milestones').delete().eq('id', milestoneId)
  }

  /**
   * Get empty impact summary
   */
  private getEmptyImpactSummary(): ProposalImpactSummary {
    return {
      total_items: 0,
      items_by_type: {
        add: 0,
        modify: 0,
        remove: 0,
      },
      items_by_status: {
        pending: 0,
        approved: 0,
        rejected: 0,
      },
      entities_affected: {
        tasks: 0,
        projects: 0,
        milestones: 0,
      },
    }
  }
}

// Export singleton instance
export const proposalService = new ProposalService()
