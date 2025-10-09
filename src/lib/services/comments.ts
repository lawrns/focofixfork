import { supabase } from '@/lib/supabase-client'
import {
  Comment,
  CommentThread,
  CommentFilters,
  CommentSummary,
  CommentActivity,
  ContributorStats,
  CommentModel,
  Mention
} from '@/lib/models/comments'

export class CommentsService {
  /**
   * Create a new comment
   */
  static async createComment(data: {
    content: string
    author_id: string
    author_name: string
    author_avatar?: string
    entity_type: 'project' | 'milestone' | 'task' | 'organization' | 'time_entry'
    entity_id: string
    type?: 'comment' | 'reply' | 'system'
    parent_id?: string
    mentions?: Mention[]
    attachments?: any[]
    metadata?: any
  }): Promise<Comment> {
    // Map entity_type and entity_id to database fields
    const dbData: any = {
      content: data.content,
      author_id: data.author_id,
      parent_id: data.parent_id
    }

    if (data.entity_type === 'milestone') {
      dbData.milestone_id = data.entity_id
    } else if (data.entity_type === 'project') {
      dbData.project_id = data.entity_id
    }
    // For other entity types, we can't store them in the current schema

    const validation = CommentModel.validateComment({
      ...data,
      status: 'active',
      type: data.type || 'comment'
    })
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }

    const { data: result, error } = await supabase
      .from('comments')
      .insert(dbData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create comment: ${error.message}`)
    }

    // Merge the input data with database result for the Comment object
    return CommentModel.fromDatabase({
      ...result,
      author_name: data.author_name,
      author_avatar: data.author_avatar,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      type: data.type || 'comment',
      status: 'active',
      mentions: data.mentions || [],
      attachments: data.attachments || [],
      reactions: [],
      metadata: data.metadata || {},
      content_html: CommentModel.contentToHtml(data.content, data.mentions || [])
    })
  }

  /**
   * Update a comment
   */
  static async updateComment(
    commentId: string,
    userId: string,
    updates: Partial<Comment>
  ): Promise<Comment> {
    // Get current comment to validate permissions
    const { data: currentComment, error: fetchError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch comment: ${fetchError.message}`)
    }

    const comment = CommentModel.fromDatabase(currentComment)

    // Check permissions (implement proper role checking)
    if (!CommentModel.canModifyComment(comment, userId, 'member')) {
      throw new Error('You do not have permission to edit this comment')
    }

    // Only update fields that exist in the database
    const updateData: any = {}

    if (updates.content !== undefined) {
      updateData.content = updates.content
    }

    if (updates.parent_id !== undefined) {
      updateData.parent_id = updates.parent_id
    }

    // Always update updated_at
    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('comments')
      .update(updateData)
      .eq('id', commentId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update comment: ${error.message}`)
    }

    // Merge updates with database result
    return CommentModel.fromDatabase({
      ...data,
      ...updates
    })
  }

  /**
   * Delete a comment (soft delete)
   */
  static async deleteComment(commentId: string, userId: string): Promise<void> {
    // Get current comment to validate permissions
    const { data: currentComment, error: fetchError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch comment: ${fetchError.message}`)
    }

    const comment = CommentModel.fromDatabase(currentComment)

    // Check permissions
    if (!CommentModel.canModifyComment(comment, userId, 'member')) {
      throw new Error('You do not have permission to delete this comment')
    }

    // Since we can't mark as deleted in the database, we'll just delete the record
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      throw new Error(`Failed to delete comment: ${error.message}`)
    }
  }


  /**
   * Get comments with filtering
   */
  static async getComments(filters: CommentFilters = {}): Promise<{
    comments: Comment[]
    threads: CommentThread[]
    total: number
  }> {
    let query = supabase
      .from('comments')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: true })

    // Map entity_type and entity_id to database fields
    if (filters.entity_type && filters.entity_id) {
      if (filters.entity_type === 'milestone') {
        query = query.eq('milestone_id', filters.entity_id)
      } else if (filters.entity_type === 'project') {
        query = query.eq('project_id', filters.entity_id)
      }
      // For other entity types, no filtering possible with current schema
    }

    if (filters.author_id) {
      query = query.eq('author_id', filters.author_id)
    }

    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from)
    }

    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to)
    }

    if (filters.search_query) {
      query = query.ilike('content', `%${filters.search_query}%`)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
    }

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Failed to fetch comments: ${error.message}`)
    }

    // Convert database records to Comment objects with additional metadata
    const comments = data?.map(comment => CommentModel.fromDatabase({
      ...comment,
      entity_type: filters.entity_type || (comment.milestone_id ? 'milestone' : comment.project_id ? 'project' : 'unknown'),
      entity_id: filters.entity_id || comment.milestone_id || comment.project_id || '',
      type: 'comment',
      status: 'active'
    })) || []

    const threads = CommentModel.buildThread(comments)

    return {
      comments,
      threads,
      total: count || 0
    }
  }

  /**
   * Get comment summary for an entity
   */
  static async getCommentSummary(
    entityType: string,
    entityId: string
  ): Promise<CommentSummary> {
    const { comments } = await this.getComments({
      entity_type: entityType,
      entity_id: entityId,
      limit: 1000 // Get all for summary
    })

    const totalComments = comments.filter(c => c.type === 'comment').length
    const totalReplies = comments.filter(c => c.type === 'reply').length
    const threads = CommentModel.buildThread(comments)
    const activeThreads = threads.length

    // Calculate participants
    const participants = new Set(comments.map(c => c.author_id))
    const participantsCount = participants.size

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentComments = comments.filter(c =>
      new Date(c.created_at) >= thirtyDaysAgo
    )

    const activityMap = new Map<string, {
      date: string
      comments_count: number
      replies_count: number
      participants: Set<string>
    }>()
    recentComments.forEach(comment => {
      const date = new Date(comment.created_at).toISOString().split('T')[0]
      const existing = activityMap.get(date) || {
        date,
        comments_count: 0,
        replies_count: 0,
        participants: new Set<string>()
      }

      if (comment.type === 'comment') {
        existing.comments_count++
      } else if (comment.type === 'reply') {
        existing.replies_count++
      }

      existing.participants.add(comment.author_id)
      activityMap.set(date, existing)
    })

    const recentActivity: CommentActivity[] = Array.from(activityMap.values())
      .map(activity => ({
        date: activity.date,
        comments_count: activity.comments_count,
        replies_count: activity.replies_count,
        participants: activity.participants.size
      }))
      .sort((a, b) => b.date.localeCompare(a.date))

    // Top contributors
    const contributorMap = new Map<string, ContributorStats>()
    comments.forEach(comment => {
      const existing = contributorMap.get(comment.author_id) || {
        user_id: comment.author_id,
        user_name: comment.author_name,
        avatar: comment.author_avatar,
        comments_count: 0,
        replies_count: 0,
        last_activity: comment.created_at
      }

      if (comment.type === 'comment') {
        existing.comments_count++
      } else if (comment.type === 'reply') {
        existing.replies_count++
      }

      if (comment.created_at > existing.last_activity) {
        existing.last_activity = comment.created_at
      }

      contributorMap.set(comment.author_id, existing)
    })

    const topContributors = Array.from(contributorMap.values())
      .sort((a, b) => (b.comments_count + b.replies_count) - (a.comments_count + a.replies_count))
      .slice(0, 10)

    return {
      total_comments: totalComments,
      total_replies: totalReplies,
      active_threads: activeThreads,
      participants_count: participantsCount,
      recent_activity: recentActivity,
      top_contributors: topContributors
    }
  }

  /**
   * Get users that can be mentioned
   */
  static async getMentionableUsers(entityType: string, entityId: string): Promise<Array<{
    id: string
    username: string
    display_name: string
    avatar?: string
  }>> {
    // This would depend on the entity type
    // For projects: get project members
    // For organizations: get organization members
    // For now, return a placeholder
    return [
    ]
  }

  /**
   * Search comments
   */
  static async searchComments(
    query: string,
    entityType?: string,
    entityId?: string,
    limit: number = 50
  ): Promise<Comment[]> {
    const filters: CommentFilters = {
      search_query: query,
      limit
    }

    if (entityType) filters.entity_type = entityType
    if (entityId) filters.entity_id = entityId

    const { comments } = await this.getComments(filters)
    return comments
  }

  /**
   * Add reaction to comment
   * TODO: Implement when comment_reactions table is created
   */
  static async addReaction(commentId: string, emoji: string, userId: string, userName: string): Promise<void> {
    // Temporarily disabled - comment_reactions table not in schema
    console.warn('Comment reactions feature temporarily disabled - table not found in schema')
    return Promise.resolve()
  }

  /**
   * Remove reaction from comment
   * TODO: Implement when comment_reactions table is created
   */
  static async removeReaction(commentId: string, emoji: string, userId: string): Promise<void> {
    // Temporarily disabled - comment_reactions table not in schema
    console.warn('Comment reactions feature temporarily disabled - table not found in schema')
    return Promise.resolve()
  }

  /**
   * Subscribe to real-time comment updates
   */
  static subscribeToComments(
    entityType: string,
    entityId: string,
    callback: (payload: any) => void
  ) {
    const channel = supabase
      .channel(`comments_${entityType}_${entityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `entity_type=eq.${entityType},entity_id=eq.${entityId}`
        },
        callback
      )
      .subscribe()

    return channel
  }
}
