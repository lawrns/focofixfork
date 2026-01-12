'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/data-display/avatar'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MarkdownPreview } from '@/components/markdown-preview/markdown-preview'
import {
  MessageCircle,
  Reply,
  Edit,
  Trash2,
  Send,
  Paperclip,
  Smile,
  MoreHorizontal,
  Heart,
  ThumbsUp,
  Laugh,
  Frown,
  Angry,
  Search,
  Filter,
  X
} from 'lucide-react'
import { CommentsService } from '@/lib/services/comments'
import { Comment, CommentThread, CommentModel, Mention } from '@/lib/models/comments'
import { cn } from '@/lib/utils'

interface CommentsSectionProps {
  entityType: 'project' | 'milestone' | 'task' | 'organization' | 'time_entry'
  entityId: string
  currentUser: {
    id: string
    name: string
    avatar?: string
  }
  className?: string
  compact?: boolean
  showTitle?: boolean
  maxHeight?: string
}

const REACTION_EMOJIS = [
  { emoji: 'heart', label: 'Heart', icon: Heart },
  { emoji: 'thumbs-up', label: 'Thumbs Up', icon: ThumbsUp },
  { emoji: 'laugh', label: 'Laugh', icon: Laugh },
  { emoji: 'frown', label: 'Sad', icon: Frown },
  { emoji: 'angry', label: 'Angry', icon: Angry }
]

export default function CommentsSection({
  entityType,
  entityId,
  currentUser,
  className,
  compact = false,
  showTitle = true,
  maxHeight = '600px'
}: CommentsSectionProps) {
  const [threads, setThreads] = useState<CommentThread[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null)
  const [editingComment, setEditingComment] = useState<Comment | null>(null)
  const [editContent, setEditContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showReactions, setShowReactions] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredThreads, setFilteredThreads] = useState<CommentThread[]>([])

  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const replyInputRef = useRef<HTMLTextAreaElement>(null)

  const updateCommentInState = useCallback((updatedComment: any) => {
    setThreads(prevThreads =>
      prevThreads.map(thread => {
        if (thread.root_comment.id === updatedComment.id) {
          return { ...thread, root_comment: { ...thread.root_comment, ...updatedComment } }
        }
        return {
          ...thread,
          replies: thread.replies.map(reply =>
            reply.id === updatedComment.id ? { ...reply, ...updatedComment } : reply
          )
        }
      })
    )
  }, [])

  const removeCommentFromState = useCallback((commentId: string) => {
    setThreads(prevThreads =>
      prevThreads
        .filter(thread => thread.root_comment.id !== commentId)
        .map(thread => ({
          ...thread,
          replies: thread.replies.filter(reply => reply.id !== commentId)
        }))
    )
  }, [])

  const loadComments = useCallback(async () => {
    try {
      setIsLoading(true)
      const { threads: commentThreads } = await CommentsService.getComments({
        entity_type: entityType,
        entity_id: entityId
      })
      setThreads(commentThreads)
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setIsLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    loadComments()

    // Subscribe to real-time updates
    const subscription = CommentsService.subscribeToComments(
      entityType,
      entityId,
      (payload) => {
        if (payload.eventType === 'INSERT') {
          loadComments() // Reload to get full thread data
        } else if (payload.eventType === 'UPDATE') {
          updateCommentInState(payload.new)
        } else if (payload.eventType === 'DELETE') {
          removeCommentFromState(payload.old.id)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [entityType, entityId, loadComments, updateCommentInState, removeCommentFromState])

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = threads.filter(thread =>
        thread.root_comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        thread.replies.some(reply =>
          reply.content.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        thread.root_comment.author_name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredThreads(filtered)
    } else {
      setFilteredThreads(threads)
    }
  }, [threads, searchQuery])

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      await CommentsService.createComment({
        content: newComment,
        author_id: currentUser.id,
        author_name: currentUser.name,
        author_avatar: currentUser.avatar,
        entity_type: entityType,
        entity_id: entityId,
        type: 'comment'
      })

      setNewComment('')
      await loadComments()
    } catch (error) {
      console.error('Failed to create comment:', error)
      alert('Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentId: string) => {
    if (!replyingTo || !replyingTo.content.trim()) return

    setIsSubmitting(true)
    try {
      const parentComment = findCommentById(parentId)

      await CommentsService.createComment({
        content: replyingTo.content,
        author_id: currentUser.id,
        author_name: currentUser.name,
        author_avatar: currentUser.avatar,
        entity_type: entityType,
        entity_id: entityId,
        type: 'reply',
        parent_id: parentId,
        parent_comment_id: parentComment?.parent_id ? parentComment.id : parentId
      })

      setReplyingTo(null)
      await loadComments()
    } catch (error) {
      console.error('Failed to create reply:', error)
      alert('Failed to post reply')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditComment = async (comment: Comment) => {
    if (!editContent.trim()) return

    try {
      await CommentsService.updateComment(comment.id, currentUser.id, {
        content: editContent
      })

      setEditingComment(null)
      setEditContent('')
      await loadComments()
    } catch (error) {
      console.error('Failed to edit comment:', error)
      alert('Failed to edit comment')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return

    try {
      await CommentsService.deleteComment(commentId, currentUser.id)
      await loadComments()
    } catch (error) {
      console.error('Failed to delete comment:', error)
      alert('Failed to delete comment')
    }
  }

  const handleReaction = async (commentId: string, emoji: string) => {
    try {
      // Check if user already reacted with this emoji
      const comment = findCommentById(commentId)
      const existingReaction = comment?.reactions.find(
        r => r.emoji === emoji && r.user_id === currentUser.id
      )

      if (existingReaction) {
        await CommentsService.removeReaction(commentId, emoji, currentUser.id)
      } else {
        await CommentsService.addReaction(commentId, emoji, currentUser.id, currentUser.name)
      }

      await loadComments()
    } catch (error) {
      console.error('Failed to toggle reaction:', error)
    }
  }

  const findCommentById = (commentId: string): Comment | undefined => {
    for (const thread of threads) {
      if (thread.root_comment.id === commentId) return thread.root_comment
      const reply = thread.replies.find(r => r.id === commentId)
      if (reply) return reply
    }
    return undefined
  }

  const formatTimeAgo = (dateString: string) => {
    return CommentModel.formatCommentForDisplay({} as Comment).time_ago
  }

  if (isLoading && threads.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="animate-pulse space-y-4 w-full">
            <div className="h-4 bg-muted rounded w-32"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Comments ({threads.length})
          </CardTitle>
        </CardHeader>
      )}

      <CardContent className="space-y-6">
        {/* Search and Filter */}
        {!compact && threads.length > 5 && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search comments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Comment Input */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback>
                {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-2">
              <MarkdownPreview
                value={newComment}
                onChange={(value) => setNewComment(value)}
                placeholder="Write a comment... Supports markdown formatting"
                rows={3}
              />

              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </div>

                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  size="sm"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div
          className="space-y-6 overflow-y-auto"
          style={{ maxHeight }}
        >
          <AnimatePresence>
            {filteredThreads.map((thread) => (
              <motion.div
                key={thread.root_comment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                {/* Root Comment */}
                <CommentItem
                  comment={thread.root_comment}
                  currentUser={currentUser}
                  onReply={setReplyingTo}
                  onEdit={(comment) => {
                    setEditingComment(comment)
                    setEditContent(comment.content)
                  }}
                  onDelete={handleDeleteComment}
                  onReaction={handleReaction}
                  showReactions={showReactions}
                  setShowReactions={setShowReactions}
                  depth={0}
                />

                {/* Render Nested Comments Recursively */}
                <CommentThread
                  comments={thread.replies}
                  parentCommentId={thread.root_comment.id}
                  currentUser={currentUser}
                  onReply={setReplyingTo}
                  onEdit={(comment) => {
                    setEditingComment(comment)
                    setEditContent(comment.content)
                  }}
                  onDelete={handleDeleteComment}
                  onReaction={handleReaction}
                  showReactions={showReactions}
                  setShowReactions={setShowReactions}
                  replyingTo={replyingTo}
                  onSubmitReply={handleSubmitReply}
                  isSubmitting={isSubmitting}
                  depth={1}
                />

                {/* Reply Input for Root Comment */}
                {replyingTo?.id === thread.root_comment.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="ml-11 space-y-2"
                  >
                    <div className="flex gap-3">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={currentUser.avatar} />
                        <AvatarFallback className="text-xs">
                          {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <Textarea
                          ref={replyInputRef}
                          placeholder="Write a reply..."
                          value={replyingTo.content}
                          onChange={(e) => setReplyingTo({ ...replyingTo, content: e.target.value })}
                          rows={2}
                          className="resize-none text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setReplyingTo(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSubmitReply(thread.root_comment.id)}
                        disabled={!replyingTo.content.trim() || isSubmitting}
                      >
                        {isSubmitting ? 'Posting...' : 'Reply'}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredThreads.length === 0 && threads.length > 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No comments match your search.
            </div>
          )}

          {threads.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No comments yet</h3>
              <p>Be the first to start the conversation!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Recursive Comment Thread Component
interface CommentThreadProps {
  comments: Comment[]
  parentCommentId: string
  currentUser: { id: string; name: string; avatar?: string }
  onReply: (comment: Comment) => void
  onEdit: (comment: Comment) => void
  onDelete: (commentId: string) => void
  onReaction: (commentId: string, emoji: string) => void
  showReactions: string | null
  setShowReactions: (commentId: string | null) => void
  replyingTo: Comment | null
  onSubmitReply: (parentId: string) => void
  isSubmitting: boolean
  depth: number
}

function CommentThread({
  comments,
  parentCommentId,
  currentUser,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  showReactions,
  setShowReactions,
  replyingTo,
  onSubmitReply,
  isSubmitting,
  depth
}: CommentThreadProps) {
  // Build a map of comments by parent to support recursive rendering
  const childrenByParent = new Map<string, Comment[]>()
  const rootComments: Comment[] = []

  comments.forEach(comment => {
    if (comment.parent_id === parentCommentId) {
      rootComments.push(comment)
    } else if (comment.parent_id) {
      if (!childrenByParent.has(comment.parent_id)) {
        childrenByParent.set(comment.parent_id, [])
      }
      childrenByParent.get(comment.parent_id)!.push(comment)
    }
  })

  const renderCommentAndChildren = (comment: Comment, currentDepth: number) => {
    const children = childrenByParent.get(comment.id) || []
    const maxDepth = 4 // Limit nesting depth to prevent UI issues

    return (
      <div key={comment.id} className="space-y-3">
        {/* Comment Item */}
        <CommentItem
          comment={comment}
          currentUser={currentUser}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          onReaction={onReaction}
          showReactions={showReactions}
          setShowReactions={setShowReactions}
          depth={currentDepth}
        />

        {/* Reply Input */}
        {replyingTo?.id === comment.id && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
            style={{ marginLeft: `${currentDepth * 2.75 + 2.75}rem` }}
          >
            <div className="flex gap-3">
              <Avatar className="w-6 h-6">
                <AvatarImage src={currentUser.avatar} />
                <AvatarFallback className="text-xs">
                  {currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <Textarea
                  placeholder="Write a reply..."
                  value={replyingTo.content}
                  onChange={(e) => onReply({ ...replyingTo, content: e.target.value })}
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply(null as any)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => onSubmitReply(comment.id)}
                disabled={!replyingTo.content.trim() || isSubmitting}
              >
                {isSubmitting ? 'Posting...' : 'Reply'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Render child comments if not at max depth */}
        {children.length > 0 && currentDepth < maxDepth && (
          <div className="space-y-3">
            {children.map(child => renderCommentAndChildren(child, currentDepth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {rootComments.map(comment => renderCommentAndChildren(comment, depth))}
    </>
  )
}

// Comment Item Component
interface CommentItemProps {
  comment: Comment
  currentUser: { id: string; name: string; avatar?: string }
  onReply: (comment: Comment) => void
  onEdit: (comment: Comment) => void
  onDelete: (commentId: string) => void
  onReaction: (commentId: string, emoji: string) => void
  showReactions: string | null
  setShowReactions: (commentId: string | null) => void
  depth: number
}

function CommentItem({
  comment,
  currentUser,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  showReactions,
  setShowReactions,
  depth
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(comment.content)

  const handleSaveEdit = () => {
    onEdit({ ...comment, content: editContent })
    setIsEditing(false)
  }

  const canModify = CommentModel.canModifyComment(comment, currentUser.id, 'member')

  return (
    <div className={cn('flex gap-3', depth > 0 && 'ml-11')}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={comment.author_avatar} />
        <AvatarFallback>
          {comment.author_name.split(' ').map(n => n[0]).join('').toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{comment.author_name}</span>
          <span className="text-xs text-muted-foreground">
            {formatTimeAgo(comment.created_at)}
          </span>
          {comment.status === 'edited' && (
            <Badge variant="outline" className="text-xs">Edited</Badge>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveEdit}>Save</Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false)
                  setEditContent(comment.content)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div
              className="text-sm"
              dangerouslySetInnerHTML={{
                __html: comment.content_html || comment.content.replace(/\n/g, '<br>')
              }}
            />

            {/* Reactions */}
            {comment.reactions.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {comment.reactions.slice(0, 3).map((reaction, index) => {
                  const reactionConfig = REACTION_EMOJIS.find(r => r.emoji === reaction.emoji)
                  const ReactionIcon = reactionConfig?.icon || Heart
                  return (
                    <Button
                      key={`${reaction.emoji}-${index}`}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => onReaction(comment.id, reaction.emoji)}
                    >
                      <ReactionIcon className="w-3 h-3 mr-1" />
                      {reaction.user_id === currentUser.id && <span className="ml-1">✓</span>}
                    </Button>
                  )
                })}
                {comment.reactions.length > 3 && (
                  <span className="text-xs text-muted-foreground px-2">
                    +{comment.reactions.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onReply({ ...comment, content: '' })}
                className="text-muted-foreground hover:text-foreground h-6 px-2 text-xs"
              >
                <Reply className="w-3 h-3" />
                Reply
              </Button>

              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowReactions(showReactions === comment.id ? null : comment.id)}
                  className="text-muted-foreground hover:text-foreground h-6 px-2 text-xs"
                >
                  <Smile className="w-3 h-3" />
                  React
                </Button>

                {showReactions === comment.id && (
                  <div className="absolute bottom-full mb-2 left-0 bg-popover border rounded-lg p-2 shadow-lg z-10">
                    <div className="flex gap-1">
                      {REACTION_EMOJIS.map(({ emoji, label, icon: Icon }) => (
                        <Button
                          key={emoji}
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            onReaction(comment.id, emoji)
                            setShowReactions(null)
                          }}
                          className="h-8 w-8 p-0"
                          title={label}
                        >
                          <Icon className="w-4 h-4" />
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {canModify && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsEditing(true)
                      setEditContent(comment.content)
                    }}
                    className="text-muted-foreground hover:text-foreground h-6 px-2 text-xs"
                  >
                    <Edit className="w-3 h-3" />
                    Edit
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(comment.id)}
                    className="text-muted-foreground hover:text-destructive h-6 px-2 text-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Helper function (should be in utils)
function formatTimeAgo(dateString: string): string {
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


