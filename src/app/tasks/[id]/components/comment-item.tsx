'use client';

import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Comment } from '@/types/foco';

export function CommentItem({ comment }: { comment: Comment }) {
  return (
    <div className={cn(
      'flex gap-3 p-3 rounded-lg',
      comment.is_ai_generated && 'dark:bg-secondary/50 dark:bg-secondary/20 border dark:border-secondary dark:border-secondary/50'
    )}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={cn(
          'text-xs',
          comment.is_ai_generated && 'bg-secondary text-[color:var(--foco-teal)]'
        )}>
          {comment.is_ai_generated ? (
            <Zap className="h-4 w-4" />
          ) : (
            comment.user?.full_name?.split(' ').map(n => n[0]).join('')
          )}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {comment.is_ai_generated ? 'Critter AI' : comment.user?.full_name}
          </span>
          {comment.is_ai_generated && (
            <Badge variant="secondary" className="text-[10px] h-4">AI</Badge>
          )}
          <span className="text-xs text-zinc-400">
            {new Date(comment.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
          {comment.content}
        </p>
      </div>
    </div>
  );
}
