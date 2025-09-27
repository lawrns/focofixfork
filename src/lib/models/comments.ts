/**
 * Comments and Discussion Threads Entity Models
 * Defines the structure and operations for comments system
 */

export type CommentType = 'comment' | 'reply' | 'system'
export type CommentStatus = 'active' | 'edited' | 'deleted'

export interface Comment {
  id: string
  content: string
  content_html?: string // For rich text rendering
  author_id: string
  author_name: string
  author_avatar?: string
  entity_type: 'project' | 'milestone' | 'task' | 'organization' | 'time_entry'
  entity_id: string
  type: CommentType
  status: CommentStatus
  parent_id?: string // For replies
  mentions: Mention[]
  attachments: CommentAttachment[]
  reactions: CommentReaction[]
  metadata: CommentMetadata
  created_at: string
  updated_at: string
  edited_at?: string
  deleted_at?: string
}

export interface Mention {
  id: string
  user_id: string
  username: string
  display_name: string
  position: number // Character position in content
  length: number
}

export interface CommentAttachment {
  id: string
  filename: string
  original_name: string
  mime_type: string
  size_bytes: number
  url: string
  thumbnail_url?: string
  uploaded_at: string
}

export interface CommentReaction {
  id: string
  emoji: string
  user_id: string
  user_name: string
  created_at: string
}

export interface CommentMetadata {
  word_count?: number
  mentions_count?: number
  attachments_count?: number
  is_important?: boolean
  tags?: string[]
  version?: number
}

export interface CommentThread {
  root_comment: Comment
  replies: Comment[]
  total_replies: number
  last_reply_at?: string
  participants: ThreadParticipant[]
}

export interface ThreadParticipant {
  user_id: string
  user_name: string
  avatar?: string
  last_seen_at: string
  reply_count: number
}

export interface CommentFilters {
  entity_type?: string
  entity_id?: string
  author_id?: string
  type?: CommentType[]
  status?: CommentStatus[]
  has_mentions?: boolean
  has_attachments?: boolean
  date_from?: string
  date_to?: string
  search_query?: string
  limit?: number
  offset?: number
}

export interface CommentSummary {
  total_comments: number
  total_replies: number
  active_threads: number
  participants_count: number
  recent_activity: CommentActivity[]
  top_contributors: ContributorStats[]
}

export interface CommentActivity {
  date: string
  comments_count: number
  replies_count: number
  participants: number
}

export interface ContributorStats {
  user_id: string
  user_name: string
  avatar?: string
  comments_count: number
  replies_count: number
  last_activity: string
}

export class CommentModel {
  /**
   * Validate comment creation/update
   */
  static validateComment(data: Partial<Comment>): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!data.content?.trim()) {
      errors.push('Comment content is required')
    }

    if (!data.author_id) {
      errors.push('Author ID is required')
    }

    if (!data.entity_type || !['project', 'milestone', 'task', 'organization', 'time_entry'].includes(data.entity_type)) {
      errors.push('Valid entity type is required')
    }

    if (!data.entity_id) {
      errors.push('Entity ID is required')
    }

    if (!data.type || !['comment', 'reply', 'system'].includes(data.type)) {
      errors.push('Valid comment type is required')
    }

    if (data.type === 'reply' && !data.parent_id) {
      errors.push('Parent ID is required for replies')
    }

    // Validate mentions
    if (data.mentions) {
      data.mentions.forEach((mention, index) => {
        if (!mention.user_id) {
          errors.push(`Mention ${index + 1}: User ID is required`)
        }
        if (!mention.username) {
          errors.push(`Mention ${index + 1}: Username is required`)
        }
        if (mention.position < 0 || mention.length <= 0) {
          errors.push(`Mention ${index + 1}: Invalid position or length`)
        }
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Extract mentions from comment content
   */
  static extractMentions(content: string, users: Array<{ id: string; username: string; display_name: string }>): Mention[] {
    const mentions: Mention[] = []
    const mentionRegex = /@(\w+)/g
    let match

    while ((match = mentionRegex.exec(content)) !== null) {
      const username = match[1]
      const user = users.find(u => u.username === username)

      if (user) {
        mentions.push({
          id: `mention_${Date.now()}_${mentions.length}`,
          user_id: user.id,
          username: user.username,
          display_name: user.display_name,
          position: match.index,
          length: match[0].length
        })
      }
    }

    return mentions
  }

  /**
   * Convert comment content to HTML with mention highlighting
   */
  static contentToHtml(content: string, mentions: Mention[]): string {
    let html = content

    // Sort mentions by position (reverse order to avoid index shifting)
    const sortedMentions = [...mentions].sort((a, b) => b.position - a.position)

    sortedMentions.forEach(mention => {
      const before = html.substring(0, mention.position)
      const mentionText = html.substring(mention.position, mention.position + mention.length)
      const after = html.substring(mention.position + mention.length)

      html = `${before}<span class="mention" data-user-id="${mention.user_id}">@${mention.display_name}</span>${after}`
    })

    // Convert line breaks to <br> tags
    html = html.replace(/\n/g, '<br>')

    return html
  }

  /**
   * Check if user can edit/delete comment
   */
  static canModifyComment(comment: Comment, userId: string, userRole: string): boolean {
    // Comment authors can always edit their own comments (within time limit)
    if (comment.author_id === userId) {
      const createdAt = new Date(comment.created_at)
      const now = new Date()
      const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

      // Allow editing within 24 hours
      return hoursSinceCreation <= 24
    }

    // Admins can edit any comment
    return ['director', 'lead'].includes(userRole)
  }

  /**
   * Check if user can reply to a comment thread
   */
  static canReplyToThread(comment: Comment, userId: string, userRole: string, entityPermissions: any): boolean {
    // Must have read access to the entity
    if (!entityPermissions.can_read) return false

    // Cannot reply to deleted comments
    if (comment.status === 'deleted') return false

    // System comments might not allow replies
    if (comment.type === 'system') return false

    return true
  }

  /**
   * Get comment thread hierarchy
   */
  static buildThread(comments: Comment[]): CommentThread[] {
    const commentMap = new Map<string, Comment>()
    const repliesMap = new Map<string, Comment[]>()

    // Separate root comments from replies
    comments.forEach(comment => {
      commentMap.set(comment.id, comment)

      if (comment.parent_id) {
        if (!repliesMap.has(comment.parent_id)) {
          repliesMap.set(comment.parent_id, [])
        }
        repliesMap.get(comment.parent_id)!.push(comment)
      }
    })

    // Build threads
    const threads: CommentThread[] = []
    const rootComments = comments.filter(c => !c.parent_id)

    rootComments.forEach(rootComment => {
      const replies = repliesMap.get(rootComment.id) || []
      const participants = this.getThreadParticipants([rootComment, ...replies])

      threads.push({
        root_comment: rootComment,
        replies: replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        total_replies: replies.length,
        last_reply_at: replies.length > 0 ? replies[replies.length - 1].created_at : undefined,
        participants
      })
    })

    return threads.sort((a, b) => new Date(b.root_comment.created_at).getTime() - new Date(a.root_comment.created_at).getTime())
  }

  /**
   * Get unique participants in a thread
   */
  private static getThreadParticipants(comments: Comment[]): ThreadParticipant[] {
    const participantMap = new Map<string, ThreadParticipant>()

    comments.forEach(comment => {
      const existing = participantMap.get(comment.author_id)

      if (existing) {
        existing.reply_count += comment.type === 'reply' ? 1 : 0
        existing.last_seen_at = comment.created_at > existing.last_seen_at ? comment.created_at : existing.last_seen_at
      } else {
        participantMap.set(comment.author_id, {
          user_id: comment.author_id,
          user_name: comment.author_name,
          avatar: comment.author_avatar,
          last_seen_at: comment.created_at,
          reply_count: comment.type === 'reply' ? 1 : 0
        })
      }
    })

    return Array.from(participantMap.values())
  }

  /**
   * Format comment for display
   */
  static formatCommentForDisplay(comment: Comment): Comment & {
    formatted_content: string
    time_ago: string
    can_edit: boolean
    can_delete: boolean
  } {
    const timeAgo = this.getTimeAgo(new Date(comment.created_at))

    return {
      ...comment,
      formatted_content: comment.content_html || comment.content,
      time_ago: timeAgo,
      can_edit: true, // This would be calculated based on user permissions
      can_delete: true // This would be calculated based on user permissions
    }
  }

  /**
   * Get human-readable time ago
   */
  private static getTimeAgo(date: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMinutes < 1) return 'just now'
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString()
  }

  /**
   * Transform raw database response to Comment
   */
  static fromDatabase(data: any): Comment {
    return {
      id: data.id,
      content: data.content,
      content_html: data.content_html,
      author_id: data.author_id,
      author_name: data.author_name,
      author_avatar: data.author_avatar,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      type: data.type,
      status: data.status,
      parent_id: data.parent_id,
      mentions: data.mentions || [],
      attachments: data.attachments || [],
      reactions: data.reactions || [],
      metadata: data.metadata || {},
      created_at: data.created_at,
      updated_at: data.updated_at,
      edited_at: data.edited_at,
      deleted_at: data.deleted_at
    }
  }
}


