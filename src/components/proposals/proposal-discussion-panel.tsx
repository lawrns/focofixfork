'use client'

import { useState } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { ProposalDiscussion } from '@/types/proposals'

interface ProposalDiscussionPanelProps {
  proposalId: string
  discussions: ProposalDiscussion[]
  onAddComment?: (content: string) => Promise<void>
}

export function ProposalDiscussionPanel({
  proposalId,
  discussions,
  onAddComment,
}: ProposalDiscussionPanelProps) {
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!comment.trim()) return
    setIsSubmitting(true)
    try {
      await onAddComment?.(comment.trim())
      setComment('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-500 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Discussion ({discussions.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {discussions.length === 0 ? (
          <p className="text-sm text-zinc-400 text-center py-4">
            No comments yet. Start the discussion.
          </p>
        ) : (
          <div className="space-y-3">
            {discussions.map((discussion) => (
              <div
                key={discussion.id}
                className="flex gap-3 p-3 rounded-md bg-zinc-50 dark:bg-zinc-800/50"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {discussion.user_id.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">User</span>
                    <span className="text-xs text-zinc-400">
                      {new Date(discussion.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    {discussion.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 px-3 py-2 text-sm border rounded-md bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
          />
          <Button
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={!comment.trim()}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
