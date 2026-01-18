'use client'

import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/data-display/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Reply,
  Edit,
  Trash2,
  MoreHorizontal,
  AtSign,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { ProposalDiscussion } from '@/types/proposals'

export interface DiscussionUser {
  id: string
  name: string
  avatar?: string
  username?: string
}

export interface DiscussionCommentData extends ProposalDiscussion {
  author?: DiscussionUser
  replies?: DiscussionCommentData[]
  parent_id?: string | null
}

interface DiscussionCommentProps {
  comment: DiscussionCommentData
  currentUserId: string
  onReply?: (comment: DiscussionCommentData) => void
  onEdit?: (commentId: string, content: string) => void
  onDelete?: (commentId: string) => void
  depth?: number
  maxDepth?: number
  className?: string
}

/**
 * Single discussion comment component with support for nested replies
 */
function DiscussionCommentComponent({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  depth = 0,
  maxDepth = 3,
  className,
}: DiscussionCommentProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)
  const [showActions, setShowActions] = useState(false)

  const isOwnComment = comment.user_id === currentUserId
  const hasReplies = comment.replies && comment.replies.length > 0
  const canNest = depth < maxDepth

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit?.(comment.id, editContent)
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditContent(comment.content)
    setIsEditing(false)
  }

  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
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

  // Parse and highlight mentions in content
  const renderContentWithMentions = (content: string) => {
    const parts = content.split(/(@\w+)/g)
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span
            key={index}
            className="inline-flex items-center px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded font-medium text-xs"
          >
            <AtSign className="w-3 h-3 mr-0.5" />
            {part.slice(1)}
          </span>
        )
      }
      return part
    })
  }

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={cn('space-y-3', className)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={cn(
          'flex gap-3',
          depth > 0 && 'ml-10 pl-4 border-l-2 border-muted'
        )}
      >
        {/* Avatar */}
        <Avatar className="w-8 h-8 flex-shrink-0">
          <AvatarImage src={comment.author?.avatar} />
          <AvatarFallback className="text-xs bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            {comment.author?.name ? getInitials(comment.author.name) : 'U'}
          </AvatarFallback>
        </Avatar>

        {/* Comment Content */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-sm truncate">
                {comment.author?.name || 'Unknown User'}
              </span>
              {comment.author?.username && (
                <span className="text-xs text-muted-foreground">
                  @{comment.author.username}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {formatTimeAgo(comment.created_at)}
              </span>
              {comment.updated_at !== comment.created_at && (
                <Badge variant="outline" className="text-xs py-0 px-1.5">
                  edited
                </Badge>
              )}
            </div>

            {/* Actions Dropdown */}
            {isOwnComment && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: showActions ? 1 : 0 }}
                transition={{ duration: 0.15 }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete?.(comment.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            )}
          </div>

          {/* Content or Edit Form */}
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="text-sm resize-none"
                placeholder="Edit your comment..."
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
              {renderContentWithMentions(comment.content)}
            </p>
          )}

          {/* Reply Button */}
          {!isEditing && canNest && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply?.(comment)}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Reply className="w-3 h-3 mr-1" />
                Reply
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Nested Replies */}
      {hasReplies && (
        <div className="space-y-3">
          {comment.replies!.map((reply) => (
            <DiscussionComment
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              depth={depth + 1}
              maxDepth={maxDepth}
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

export const DiscussionComment = memo(DiscussionCommentComponent)
