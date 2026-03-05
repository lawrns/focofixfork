'use client';

import { MessageSquare, History, Paperclip, Zap, Send, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CommentItem } from './comment-item';
import type { Comment } from '@/types/foco';
import type { TaskActionType } from '@/lib/services/task-action-service';

interface ActivityEntry {
  id: string;
  actor_type?: string;
  actor_id?: string | null;
  summary?: string;
  created_at?: string;
  user?: string;
  action?: string;
  time?: string;
}

interface TaskActivityProps {
  comments: Comment[];
  activityLog: ActivityEntry[];
  newComment: string;
  commentSubmitting: boolean;
  onCommentChange: (value: string) => void;
  onCommentSubmit: () => void;
  onAiAction: (action: TaskActionType) => void;
}

export function TaskActivity({
  comments,
  activityLog,
  newComment,
  commentSubmitting,
  onCommentChange,
  onCommentSubmit,
  onAiAction,
}: TaskActivityProps) {
  return (
    <>
      {/* Activity */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-4 w-4 text-zinc-500" />
          <h2 className="font-semibold">Activity</h2>
          <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 rounded">
            {comments.length + activityLog.length}
          </span>
        </div>

        <div className="space-y-3 mb-6">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>

        {/* New Comment */}
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-xs">JD</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              placeholder="Write a comment... Use @ to mention"
              value={newComment}
              onChange={(e) => onCommentChange(e.target.value)}
              className="min-h-[80px] mb-2"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => console.log('File attachments clicked')}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onAiAction('propose_next_step')}
                >
                  <Zap className="h-4 w-4" />
                </Button>
              </div>
              <Button
                size="sm"
                disabled={!newComment.trim() || commentSubmitting}
                onClick={onCommentSubmit}
              >
                {commentSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Comment
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <History className="h-4 w-4 text-zinc-500" />
          <h3 className="text-sm font-medium text-zinc-500">History</h3>
        </div>
        <div className="space-y-2">
          {activityLog.map((activity) => (
            <div key={activity.id} className="flex items-center gap-2 text-sm text-zinc-500">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {activity.user || activity.actor_type || 'system'}
              </span>
              <span>{activity.action || activity.summary}</span>
              <span className="text-zinc-400">•</span>
              <span className="text-zinc-400">
                {activity.time || (activity.created_at ? new Date(activity.created_at).toLocaleString() : '')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
