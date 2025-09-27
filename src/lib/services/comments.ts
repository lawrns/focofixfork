import { supabase } from '@/lib/supabase'
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
    const commentData = {
      content: data.content,
      content_html: CommentModel.contentToHtml(data.content, data.mentions || []),
      author_id: data.author_id,
      author_name: data.author_name,
      author_avatar: data.author_avatar,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      type: data.type || 'comment',
      status: 'active' as const,
      parent_id: data.parent_id,
      mentions: data.mentions || [],
      attachments: data.attachments || [],
      reactions: [],
      metadata: data.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const validation = CommentModel.validateComment(commentData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }

    const { data: result, error } = await supabase
      .from('comments')
      .insert(commentData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create comment: ${error.message}`)
    }

    return CommentModel.fromDatabase(result)
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

    const updateData: any = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    // If content is being updated, regenerate HTML
    if (updates.content) {
      updateData.content_html = CommentModel.contentToHtml(
        updates.content,
        updates.mentions || comment.mentions
      )
      updateData.edited_at = new Date().toISOString()
      updateData.status = 'edited'
    }

    const { data, error } = await supabase
      .from('comments')
      .update(updateData)
      .eq('id', commentId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update comment: ${error.message}`)
    }

    return CommentModel.fromDatabase(data)
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

    const { error } = await supabase
      .from('comments')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)

    if (error) {
      throw new Error(`Failed to delete comment: ${error.message}`)
    }
  }

  /**
   * Add reaction to comment
   */
  static async addReaction(commentId: string, emoji: string, userId: string, userName: string): Promise<void> {
    const reactionData = {
      comment_id: commentId,
      emoji,
      user_id: userId,
      user_name: userName,
      created_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('comment_reactions')
      .insert(reactionData)

    if (error) {
      throw new Error(`Failed to add reaction: ${error.message}`)
    }
  }

  /**
   * Remove reaction from comment
   */
  static async removeReaction(commentId: string, emoji: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('comment_reactions')
      .delete()
      .eq('comment_id', commentId)
      .eq('emoji', emoji)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to remove reaction: ${error.message}`)
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
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (filters.entity_type) {
      query = query.eq('entity_type', filters.entity_type)
    }

    if (filters.entity_id) {
      query = query.eq('entity_id', filters.entity_id)
    }

    if (filters.author_id) {
      query = query.eq('author_id', filters.author_id)
    }

    if (filters.type?.length) {
      query = query.in('type', filters.type)
    }

    if (filters.status?.length) {
      query = query.in('status', filters.status)
    }

    if (filters.has_mentions) {
      query = query.not('mentions', 'is', null)
    }

    if (filters.has_attachments) {
      query = query.not('attachments', 'is', null)
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

    const comments = data?.map(comment => CommentModel.fromDatabase(comment)) || []
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
      {
        id: 'user1',
        username: 'john_doe',
        display_name: 'John Doe',
        avatar: undefined
      },
      {
        id: 'user2',
        username: 'jane_smith',
        display_name: 'Jane Smith',
        avatar: undefined
      }
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
