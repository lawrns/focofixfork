'use client'

import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/data-display/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  MessageCircle,
  Send,
  ChevronDown,
  ChevronUp,
  AtSign,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProposalDiscussion } from '@/types/proposals'
import { DiscussionComment, type DiscussionCommentData, type DiscussionUser } from './discussion-comment'
import { ResolutionBadge } from './resolution-badge'
import { audioService } from '@/lib/audio/audio-service'
import { hapticService } from '@/lib/audio/haptic-service'

interface DiscussionThreadProps {
  proposalId: string
  itemId?: string | null
  discussions: ProposalDiscussion[]
  onAddComment: (content: string) => void
  onResolve: () => void
  currentUserId: string
  isResolved?: boolean
  resolvedAt?: string
  resolvedBy?: string
  users?: DiscussionUser[]
  className?: string
  maxHeight?: string
  compact?: boolean
  showTitle?: boolean
}

/**
 * Discussion thread component for collaborative refinement of proposals
 * Features: comment list, add comment form, resolution badge, nested replies,
 * mentions support, and rich animations
 */
function DiscussionThreadComponent({
  proposalId,
  itemId,
  discussions,
  onAddComment,
  onResolve,
  currentUserId,
  isResolved = false,
  resolvedAt,
  resolvedBy,
  users = [],
  className,
  maxHeight = '400px',
  compact = false,
  showTitle = true,
}: DiscussionThreadProps) {
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [replyingTo, setReplyingTo] = useState<DiscussionCommentData | null>(null)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionSuggestions, setMentionSuggestions] = useState<DiscussionUser[]>([])
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const [isTyping, setIsTyping] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mentionsRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Convert flat discussions to threaded structure
  const threadedDiscussions = useCallback((): DiscussionCommentData[] => {
    const commentMap = new Map<string, DiscussionCommentData>()
    const rootComments: DiscussionCommentData[] = []

    // First pass: create map of all comments
    discussions.forEach(discussion => {
      const user = users.find(u => u.id === discussion.user_id)
      commentMap.set(discussion.id, {
        ...discussion,
        author: user,
        replies: [],
        parent_id: (discussion as any).parent_id || null,
      })
    })

    // Second pass: build tree structure
    commentMap.forEach(comment => {
      if (comment.parent_id && commentMap.has(comment.parent_id)) {
        const parent = commentMap.get(comment.parent_id)!
        parent.replies = parent.replies || []
        parent.replies.push(comment)
      } else {
        rootComments.push(comment)
      }
    })

    // Sort by creation date
    rootComments.sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    return rootComments
  }, [discussions, users])

  // Handle mention detection in comment input
  const handleCommentChange = (value: string) => {
    setNewComment(value)

    // Detect @ mention
    const cursorPosition = textareaRef.current?.selectionStart || 0
    const textBeforeCursor = value.substring(0, cursorPosition)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch && users.length > 0) {
      const query = mentionMatch[1].toLowerCase()
      setMentionQuery(query)
      const filtered = users.filter(user =>
        user.name.toLowerCase().includes(query) ||
        (user.username && user.username.toLowerCase().includes(query))
      ).slice(0, 5)
      setMentionSuggestions(filtered)
      setShowMentions(filtered.length > 0)
      setSelectedMentionIndex(0)
    } else {
      setShowMentions(false)
    }

    // Simulate typing indicator
    setIsTyping(true)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 1000)
  }

  // Handle keyboard navigation for mentions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentions) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedMentionIndex(prev =>
          prev < mentionSuggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
      case 'Tab':
        if (mentionSuggestions[selectedMentionIndex]) {
          e.preventDefault()
          selectMention(mentionSuggestions[selectedMentionIndex])
        }
        break
      case 'Escape':
        setShowMentions(false)
        break
    }
  }

  // Insert selected mention
  const selectMention = (user: DiscussionUser) => {
    const cursorPosition = textareaRef.current?.selectionStart || 0
    const textBeforeCursor = newComment.substring(0, cursorPosition)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      const mentionStart = cursorPosition - mentionMatch[0].length
      const beforeMention = newComment.substring(0, mentionStart)
      const afterCursor = newComment.substring(cursorPosition)
      const mentionText = `@${user.username || user.name.replace(/\s+/g, '')} `

      setNewComment(beforeMention + mentionText + afterCursor)
      setShowMentions(false)

      // Focus and set cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = beforeMention.length + mentionText.length
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(newPosition, newPosition)
        }
      }, 0)
    }
  }

  // Submit new comment
  const handleSubmit = async () => {
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onAddComment(newComment.trim())
      setNewComment('')
      setReplyingTo(null)
      audioService.play('sync')
      hapticService.light()

      // Scroll to bottom after new comment
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
        }
      }, 100)
    } catch (error) {
      console.error('Failed to add comment:', error)
      audioService.play('error')
      hapticService.error()
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle reply action
  const handleReply = (comment: DiscussionCommentData) => {
    setReplyingTo(comment)
    const mentionText = comment.author?.username
      ? `@${comment.author.username} `
      : ''
    setNewComment(mentionText)
    textareaRef.current?.focus()
  }

  // Handle edit action
  const handleEdit = async (commentId: string, content: string) => {
    // This would need to be implemented with a callback prop
    console.log('Edit comment:', commentId, content)
  }

  // Handle delete action
  const handleDelete = async (commentId: string) => {
    // This would need to be implemented with a callback prop
    console.log('Delete comment:', commentId)
  }

  // Get current user for avatar
  const currentUser = users.find(u => u.id === currentUserId)

  // Get user initials
  const getInitials = (name?: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const threaded = threadedDiscussions()

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header */}
      {showTitle && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="w-4 h-4" />
              Discussion
              {discussions.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({discussions.length})
                </span>
              )}
            </CardTitle>

            <div className="flex items-center gap-2">
              {/* Resolution Badge */}
              <ResolutionBadge
                isResolved={isResolved}
                resolvedAt={resolvedAt}
                resolvedBy={resolvedBy}
                size="sm"
              />

              {/* Collapse Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-7 w-7 p-0"
              >
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      )}

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <CardContent className="pt-0 space-y-4">
              {/* Comments List */}
              <ScrollArea
                ref={scrollAreaRef as any}
                className="pr-4"
                style={{ maxHeight }}
              >
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {threaded.length > 0 ? (
                      threaded.map((comment, index) => (
                        <motion.div
                          key={comment.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <DiscussionComment
                            comment={comment}
                            currentUserId={currentUserId}
                            onReply={handleReply}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                          />
                        </motion.div>
                      ))
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-8 text-muted-foreground"
                      >
                        <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p className="text-sm">No comments yet</p>
                        <p className="text-xs mt-1">Start the discussion!</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollArea>

              {/* Typing Indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
                          animate={{
                            y: [0, -4, 0],
                          }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.1,
                          }}
                        />
                      ))}
                    </div>
                    <span>Someone is typing...</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reply Indicator */}
              <AnimatePresence>
                {replyingTo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2"
                  >
                    <span>Replying to</span>
                    <span className="font-medium text-foreground">
                      {replyingTo.author?.name || 'Unknown'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setReplyingTo(null)
                        setNewComment('')
                      }}
                      className="h-5 w-5 p-0 ml-auto"
                    >
                      <span className="sr-only">Cancel reply</span>
                      &times;
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Comment Input */}
              {!isResolved && (
                <div className="relative space-y-3">
                  <div className="flex gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={currentUser?.avatar} />
                      <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        {getInitials(currentUser?.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 relative">
                      <Textarea
                        ref={textareaRef}
                        value={newComment}
                        onChange={(e) => handleCommentChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Add a comment... Use @ to mention someone"
                        rows={compact ? 2 : 3}
                        className="resize-none pr-10"
                        disabled={isSubmitting}
                      />

                      {/* Submit Button (inside textarea) */}
                      <Button
                        size="sm"
                        onClick={handleSubmit}
                        disabled={!newComment.trim() || isSubmitting}
                        className="absolute right-2 bottom-2 h-7 w-7 p-0"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>

                      {/* Mention Suggestions */}
                      <AnimatePresence>
                        {showMentions && (
                          <motion.div
                            ref={mentionsRef}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 w-full bg-popover border border-border rounded-lg shadow-lg mt-1 overflow-hidden"
                          >
                            <div className="p-2">
                              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                                <AtSign className="w-3 h-3" />
                                Mention someone
                              </div>
                              {mentionSuggestions.map((user, index) => (
                                <motion.div
                                  key={user.id}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: index * 0.03 }}
                                  className={cn(
                                    'flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors',
                                    index === selectedMentionIndex
                                      ? 'bg-muted'
                                      : 'hover:bg-muted/50'
                                  )}
                                  onClick={() => selectMention(user)}
                                >
                                  <Avatar className="w-6 h-6">
                                    <AvatarImage src={user.avatar} />
                                    <AvatarFallback className="text-xs">
                                      {getInitials(user.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {user.name}
                                    </p>
                                    {user.username && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        @{user.username}
                                      </p>
                                    )}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Resolve Button */}
                  {discussions.length > 0 && !isResolved && (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onResolve}
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950"
                      >
                        Mark as Resolved
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Resolved State Message */}
              {isResolved && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-4 text-sm text-muted-foreground bg-muted/30 rounded-lg"
                >
                  This discussion has been resolved.
                </motion.div>
              )}
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

export const DiscussionThread = memo(DiscussionThreadComponent)
