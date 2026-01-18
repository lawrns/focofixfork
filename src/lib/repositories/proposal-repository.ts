/**
 * Proposal Repository
 * Type-safe database access for proposal management system
 */

import { BaseRepository, Result, Ok, Err, isError } from './base-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Proposal,
  ProposalItem,
  ProposalDiscussion,
  ProposalImpactSummary,
  CreateProposalData,
  UpdateProposalData,
  CreateProposalItemData,
  UpdateProposalItemData,
  ProposalFilters,
  ProposalWithItems,
  ProposalWithDetails,
  ProposalStatus,
} from '@/types/proposals'

export class ProposalRepository extends BaseRepository<Proposal> {
  protected table = 'foco_proposals'
  private itemsTable = 'foco_proposal_items'
  private discussionsTable = 'foco_proposal_discussions'

  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  /**
   * Create a new proposal
   */
  async createProposal(data: CreateProposalData): Promise<Result<Proposal>> {
    const proposalData = {
      workspace_id: data.workspace_id,
      project_id: data.project_id,
      title: data.title,
      description: data.description || null,
      status: 'draft' as const,
      created_by: data.created_by,
      submitted_at: null,
      reviewed_by: null,
      reviewed_at: null,
      merged_at: null,
      metadata: data.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return this.create(proposalData)
  }

  /**
   * Get proposal by ID
   */
  async getProposalById(id: string): Promise<Result<Proposal>> {
    return this.findById(id)
  }

  /**
   * Get proposals by project with optional filters
   */
  async getProposalsByProject(
    projectId: string,
    filters?: {
      status?: ProposalStatus
      limit?: number
      offset?: number
    }
  ): Promise<Result<Proposal[]>> {
    let query = this.supabase
      .from(this.table)
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)

    // Apply status filter
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    // Apply pagination
    if (filters?.limit !== undefined) {
      const offset = filters.offset ?? 0
      query = query.range(offset, offset + filters.limit - 1)
    }

    // Sort by updated_at descending
    query = query.order('updated_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch proposals by project',
        details: error,
      })
    }

    return Ok(data as Proposal[], { count: count ?? undefined })
  }

  /**
   * Get proposals by workspace with optional filters
   */
  async getProposalsByWorkspace(
    workspaceId: string,
    filters?: ProposalFilters & {
      limit?: number
      offset?: number
    }
  ): Promise<Result<Proposal[]>> {
    let query = this.supabase
      .from(this.table)
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)

    // Apply filters
    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.created_by) {
      query = query.eq('created_by', filters.created_by)
    }

    // Apply pagination
    if (filters?.limit !== undefined) {
      const offset = filters.offset ?? 0
      query = query.range(offset, offset + filters.limit - 1)
    }

    // Sort by updated_at descending
    query = query.order('updated_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch proposals by workspace',
        details: error,
      })
    }

    return Ok(data as Proposal[], { count: count ?? undefined })
  }

  /**
   * Update a proposal
   */
  async updateProposal(
    id: string,
    data: UpdateProposalData
  ): Promise<Result<Proposal>> {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    }

    return this.update(id, updateData)
  }

  /**
   * Delete a proposal
   */
  async deleteProposal(id: string): Promise<Result<void>> {
    return this.delete(id)
  }

  /**
   * Submit a proposal (change status to pending)
   */
  async submitProposal(id: string): Promise<Result<Proposal>> {
    const updateData = {
      status: 'pending_review' as const,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return this.update(id, updateData as Partial<Proposal>)
  }

  /**
   * Get all items for a proposal
   */
  async getProposalItems(proposalId: string): Promise<Result<ProposalItem[]>> {
    const { data, error } = await this.supabase
      .from(this.itemsTable)
      .select('*')
      .eq('proposal_id', proposalId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch proposal items',
        details: error,
      })
    }

    return Ok((data || []) as ProposalItem[])
  }

  /**
   * Create a proposal item
   */
  async createProposalItem(
    proposalId: string,
    data: CreateProposalItemData
  ): Promise<Result<ProposalItem>> {
    // Get the current max position for this proposal
    const { data: existingItems, error: fetchError } = await this.supabase
      .from(this.itemsTable)
      .select('position')
      .eq('proposal_id', proposalId)
      .order('position', { ascending: false })
      .limit(1)

    if (fetchError) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch existing items',
        details: fetchError,
      })
    }

    const maxPosition = existingItems?.[0]?.position ?? -1
    const position = data.position !== undefined ? data.position : maxPosition + 1

    const itemData = {
      proposal_id: proposalId,
      item_type: data.item_type,
      entity_type: data.entity_type,
      entity_id: data.entity_id || null,
      proposed_data: data.proposed_data,
      current_data: data.current_data || null,
      status: 'pending' as const,
      review_notes: null,
      reviewed_by: null,
      reviewed_at: null,
      position,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: created, error } = await this.supabase
      .from(this.itemsTable)
      .insert(itemData)
      .select()
      .single()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to create proposal item',
        details: error,
      })
    }

    return Ok(created as ProposalItem)
  }

  /**
   * Update a proposal item
   */
  async updateProposalItem(
    itemId: string,
    data: UpdateProposalItemData
  ): Promise<Result<ProposalItem>> {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error } = await this.supabase
      .from(this.itemsTable)
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return Err({
          code: 'NOT_FOUND',
          message: `Proposal item with id ${itemId} not found`,
          details: { itemId },
        })
      }

      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to update proposal item',
        details: error,
      })
    }

    return Ok(updated as ProposalItem)
  }

  /**
   * Approve a proposal item
   */
  async approveProposalItem(
    itemId: string,
    notes?: string,
    reviewedBy?: string
  ): Promise<Result<ProposalItem>> {
    const updateData = {
      status: 'approved' as const,
      review_notes: notes || null,
      reviewed_by: reviewedBy || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error } = await this.supabase
      .from(this.itemsTable)
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return Err({
          code: 'NOT_FOUND',
          message: `Proposal item with id ${itemId} not found`,
          details: { itemId },
        })
      }

      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to approve proposal item',
        details: error,
      })
    }

    return Ok(updated as ProposalItem)
  }

  /**
   * Reject a proposal item
   */
  async rejectProposalItem(
    itemId: string,
    notes?: string,
    reviewedBy?: string
  ): Promise<Result<ProposalItem>> {
    const updateData = {
      status: 'rejected' as const,
      review_notes: notes || null,
      reviewed_by: reviewedBy || null,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: updated, error } = await this.supabase
      .from(this.itemsTable)
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return Err({
          code: 'NOT_FOUND',
          message: `Proposal item with id ${itemId} not found`,
          details: { itemId },
        })
      }

      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to reject proposal item',
        details: error,
      })
    }

    return Ok(updated as ProposalItem)
  }

  /**
   * Add a discussion comment
   */
  async addDiscussion(
    proposalId: string,
    userId: string,
    content: string,
    itemId?: string
  ): Promise<Result<ProposalDiscussion>> {
    const discussionData = {
      proposal_id: proposalId,
      proposal_item_id: itemId || null,
      user_id: userId,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: created, error } = await this.supabase
      .from(this.discussionsTable)
      .insert(discussionData)
      .select()
      .single()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to add discussion',
        details: error,
      })
    }

    return Ok(created as ProposalDiscussion)
  }

  /**
   * Get all discussions for a proposal
   */
  async getDiscussions(proposalId: string): Promise<Result<ProposalDiscussion[]>> {
    const { data, error } = await this.supabase
      .from(this.discussionsTable)
      .select('*')
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: true })

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to fetch discussions',
        details: error,
      })
    }

    return Ok((data || []) as ProposalDiscussion[])
  }

  /**
   * Calculate impact summary for a proposal
   */
  async calculateImpactSummary(
    proposalId: string
  ): Promise<Result<ProposalImpactSummary>> {
    const itemsResult = await this.getProposalItems(proposalId)

    if (isError(itemsResult)) {
      return itemsResult
    }

    const items = itemsResult.data

    const summary: ProposalImpactSummary = {
      total_items: items.length,
      items_by_type: {
        add: items.filter((item) => item.action === 'add').length,
        modify: items.filter((item) => item.action === 'modify').length,
        remove: items.filter((item) => item.action === 'remove').length,
      },
      items_by_status: {
        pending: items.filter((item) => item.status === 'pending').length,
        approved: items.filter((item) => item.status === 'approved').length,
        rejected: items.filter((item) => item.status === 'rejected').length,
      },
      entities_affected: {
        tasks: items.filter((item) => item.entity_type === 'task').length,
        projects: 0, // Projects not directly supported as entity type
        milestones: items.filter((item) => item.entity_type === 'milestone').length,
      },
    }

    return Ok(summary)
  }

  /**
   * Merge a proposal - creates actual tasks from approved items
   */
  async mergeProposal(
    proposalId: string,
    mergedBy: string
  ): Promise<Result<{ proposal: Proposal; merged_items: number }>> {
    // Get the proposal
    const proposalResult = await this.findById(proposalId)
    if (isError(proposalResult)) {
      return proposalResult
    }

    const proposal = proposalResult.data

    // Verify proposal is in approved status
    if (proposal.status !== 'approved') {
      return Err({
        code: 'INVALID_STATE',
        message: 'Proposal must be approved before merging',
        details: { current_status: proposal.status },
      })
    }

    // Get all approved items
    const itemsResult = await this.getProposalItems(proposalId)
    if (isError(itemsResult)) {
      return itemsResult
    }

    const approvedItems = itemsResult.data.filter(
      (item) => item.status === 'approved'
    )

    if (approvedItems.length === 0) {
      return Err({
        code: 'INVALID_STATE',
        message: 'No approved items to merge',
        details: { proposal_id: proposalId },
      })
    }

    // Process each approved item
    let mergedCount = 0
    const errors: Array<{ item_id: string; error: unknown }> = []

    for (const item of approvedItems) {
      try {
        if (item.action === 'add') {
          // Create new entity based on entity_type
          const tableName = this.getTableNameForEntityType(item.entity_type)
          const { error } = await this.supabase
            .from(tableName)
            .insert({
              ...item.proposed_data,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })

          if (error) {
            errors.push({ item_id: item.id, error })
          } else {
            mergedCount++
          }
        } else if (item.action === 'modify' && item.entity_id) {
          // Update existing entity
          const tableName = this.getTableNameForEntityType(item.entity_type)
          const { error } = await this.supabase
            .from(tableName)
            .update({
              ...item.proposed_data,
              updated_at: new Date().toISOString(),
            })
            .eq('id', item.entity_id)

          if (error) {
            errors.push({ item_id: item.id, error })
          } else {
            mergedCount++
          }
        } else if (item.action === 'remove' && item.entity_id) {
          // Delete entity
          const tableName = this.getTableNameForEntityType(item.entity_type)
          const { error } = await this.supabase
            .from(tableName)
            .delete()
            .eq('id', item.entity_id)

          if (error) {
            errors.push({ item_id: item.id, error })
          } else {
            mergedCount++
          }
        }
      } catch (error) {
        errors.push({ item_id: item.id, error })
      }
    }

    // If any errors occurred, return them
    if (errors.length > 0) {
      return Err({
        code: 'MERGE_ERROR',
        message: `Failed to merge ${errors.length} items`,
        details: { errors, merged_count: mergedCount },
      })
    }

    // Update proposal status to merged
    const updateResult = await this.update(proposalId, {
      status: 'merged' as const,
      merged_at: new Date().toISOString(),
      reviewed_by: mergedBy,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)

    if (isError(updateResult)) {
      return updateResult
    }

    return Ok({
      proposal: updateResult.data,
      merged_items: mergedCount,
    })
  }

  /**
   * Get proposal with all items
   */
  async getProposalWithItems(proposalId: string): Promise<Result<ProposalWithItems>> {
    const proposalResult = await this.findById(proposalId)
    if (isError(proposalResult)) {
      return proposalResult
    }

    const itemsResult = await this.getProposalItems(proposalId)
    if (isError(itemsResult)) {
      return itemsResult
    }

    return Ok({
      ...proposalResult.data,
      items: itemsResult.data,
    })
  }

  /**
   * Get proposal with full details (items, discussions, impact)
   */
  async getProposalWithDetails(
    proposalId: string
  ): Promise<Result<ProposalWithDetails>> {
    const proposalResult = await this.findById(proposalId)
    if (isError(proposalResult)) {
      return proposalResult
    }

    const itemsResult = await this.getProposalItems(proposalId)
    if (isError(itemsResult)) {
      return itemsResult
    }

    const discussionsResult = await this.getDiscussions(proposalId)
    if (isError(discussionsResult)) {
      return discussionsResult
    }

    const impactResult = await this.calculateImpactSummary(proposalId)
    if (isError(impactResult)) {
      return impactResult
    }

    return Ok({
      ...proposalResult.data,
      items: itemsResult.data,
      discussions: discussionsResult.data,
      impact: impactResult.data,
      discussion_count: discussionsResult.data.length,
    })
  }

  /**
   * Helper method to get table name for entity type
   */
  private getTableNameForEntityType(
    entityType: string
  ): string {
    switch (entityType) {
      case 'task':
        return 'work_items'
      case 'project':
        return 'foco_projects'
      case 'milestone':
        return 'foco_milestones'
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
    }
  }

  /**
   * Check if user has permission to access proposal (via workspace membership)
   */
  async verifyUserAccess(
    proposalId: string,
    userId: string
  ): Promise<Result<boolean>> {
    // Get the proposal
    const proposalResult = await this.findById(proposalId)
    if (isError(proposalResult)) {
      return proposalResult
    }

    const proposal = proposalResult.data

    // Check if user is a member of the workspace
    const { data: membership, error } = await this.supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', proposal.workspace_id)
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to check workspace membership',
        details: error,
      })
    }

    return Ok(!!membership)
  }

  /**
   * Batch approve multiple proposal items
   */
  async batchApproveItems(
    itemIds: string[],
    reviewedBy: string,
    notes?: string
  ): Promise<Result<ProposalItem[]>> {
    const updateData = {
      status: 'approved' as const,
      review_notes: notes || null,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await this.supabase
      .from(this.itemsTable)
      .update(updateData)
      .in('id', itemIds)
      .select()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to batch approve items',
        details: error,
      })
    }

    return Ok((data || []) as ProposalItem[])
  }

  /**
   * Batch reject multiple proposal items
   */
  async batchRejectItems(
    itemIds: string[],
    reviewedBy: string,
    notes?: string
  ): Promise<Result<ProposalItem[]>> {
    const updateData = {
      status: 'rejected' as const,
      review_notes: notes || null,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await this.supabase
      .from(this.itemsTable)
      .update(updateData)
      .in('id', itemIds)
      .select()

    if (error) {
      return Err({
        code: 'DATABASE_ERROR',
        message: 'Failed to batch reject items',
        details: error,
      })
    }

    return Ok((data || []) as ProposalItem[])
  }
}
