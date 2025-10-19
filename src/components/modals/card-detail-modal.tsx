'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Edit2, Trash2, Copy, Archive, Calendar, User, Tag, Paperclip, MessageSquare } from 'lucide-react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CardCoverDisplay } from '@/components/cards/card-cover'
import { LabelBadgeList } from '@/components/labels/label-badge'
import { Checklist } from '@/components/tasks/checklist'
import { ActivityFeed } from '@/components/activity/activity-feed'
import { DateInput } from '@/components/ui/date-input'
import { useInlineEdit } from '@/lib/hooks/use-inline-edit'
import { CardCover } from '@/lib/models/card-cover'
import { Label } from '@/lib/models/labels'
import { ChecklistItemData } from '@/components/tasks/checklist'
import { ActivityItem } from '@/components/activity/activity-feed'
import { cn } from '@/lib/utils'

export interface CardData {
  id: string
  title: string
  description?: string
  status: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: string
  assignee?: {
    id: string
    name: string
    email: string
    avatar_url?: string
  }
  cover?: CardCover | null
  labels: Label[]
  checklist?: ChecklistItemData[]
  attachments?: Array<{
    id: string
    name: string
    url: string
    size: number
    type: string
  }>
  comments?: Array<{
    id: string
    user: {
      id: string
      name: string
      avatar_url?: string
    }
    text: string
    timestamp: string
  }>
  activities: ActivityItem[]
  created_at: string
  updated_at: string
}

interface CardDetailModalProps {
  card: CardData | null
  isOpen: boolean
  onClose: () => void
  onCardUpdate: (cardId: string, updates: Partial<CardData>) => Promise<void>
  onCardDelete: (cardId: string) => Promise<void>
  onCardDuplicate: (cardId: string) => Promise<void>
  onCardArchive: (cardId: string) => Promise<void>
  onNavigateCard?: (direction: 'prev' | 'next') => void
  canNavigate?: boolean
  className?: string
}

export function CardDetailModal({
  card,
  isOpen,
  onClose,
  onCardUpdate,
  onCardDelete,
  onCardDuplicate,
  onCardArchive,
  onNavigateCard,
  canNavigate = false,
  className
}: CardDetailModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'activity'>('details')
  const modalRef = useRef<HTMLDivElement>(null)

  // Optimistic updates
  const [optimisticCard, setOptimisticCard] = useState<CardData | null>(card)

  useEffect(() => {
    setOptimisticCard(card)
  }, [card])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case 'j':
        case 'ArrowDown':
          if (canNavigate && onNavigateCard) {
            e.preventDefault()
            onNavigateCard('next')
          }
          break
        case 'k':
        case 'ArrowUp':
          if (canNavigate && onNavigateCard) {
            e.preventDefault()
            onNavigateCard('prev')
          }
          break
        case 'e':
          e.preventDefault()
          // Focus on title for editing
          const titleInput = modalRef.current?.querySelector('[data-editable="title"]') as HTMLInputElement
          titleInput?.focus()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, canNavigate, onNavigateCard])

  const handleUpdate = useCallback(async (updates: Partial<CardData>) => {
    if (!optimisticCard) return

    // Optimistic update
    setOptimisticCard(prev => prev ? { ...prev, ...updates } : null)

    try {
      await onCardUpdate(optimisticCard.id, updates)
    } catch (error) {
      // Revert on error
      setOptimisticCard(card)
      console.error('Failed to update card:', error)
    }
  }, [optimisticCard, onCardUpdate, card])

  const handleDelete = async () => {
    if (!optimisticCard) return
    if (!confirm('Are you sure you want to delete this card?')) return

    setIsLoading(true)
    try {
      await onCardDelete(optimisticCard.id)
      onClose()
    } catch (error) {
      console.error('Failed to delete card:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDuplicate = async () => {
    if (!optimisticCard) return

    setIsLoading(true)
    try {
      await onCardDuplicate(optimisticCard.id)
    } catch (error) {
      console.error('Failed to duplicate card:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleArchive = async () => {
    if (!optimisticCard) return

    setIsLoading(true)
    try {
      await onCardArchive(optimisticCard.id)
      onClose()
    } catch (error) {
      console.error('Failed to archive card:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!optimisticCard) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        ref={modalRef}
        className={cn(
          'sm:max-w-[800px] max-h-[90vh] overflow-hidden p-0',
          className
        )}
      >
        {/* Header with cover */}
        <div className="relative">
          {optimisticCard.cover && (
            <CardCoverDisplay 
              cover={optimisticCard.cover} 
              size="full"
              className="rounded-t-lg"
            />
          )}
          
          {/* Navigation arrows */}
          {canNavigate && onNavigateCard && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateCard('prev')}
                className="absolute left-4 top-4 bg-white/80 hover:bg-white/90 backdrop-blur-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateCard('next')}
                className="absolute right-4 top-4 bg-white/80 hover:bg-white/90 backdrop-blur-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          )}

          {/* Close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute right-4 top-4 bg-white/80 hover:bg-white/90 backdrop-blur-sm"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex flex-col h-full overflow-hidden">
          {/* Title */}
          <div className="p-6 pb-4">
            <EditableTitle
              title={optimisticCard.title}
              onUpdate={(title) => handleUpdate({ title })}
            />
          </div>

          {/* Tabs */}
          <div className="px-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex space-x-8">
              {[
                { id: 'details', label: 'Details', icon: Edit2 },
                { id: 'comments', label: 'Comments', icon: MessageSquare, count: optimisticCard.comments?.length },
                { id: 'activity', label: 'Activity', icon: Calendar }
              ].map(({ id, label, icon: Icon, count }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={cn(
                    'flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors',
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {count && count > 0 && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {count}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'details' && (
              <DetailsTab
                card={optimisticCard}
                onUpdate={handleUpdate}
                isLoading={isLoading}
              />
            )}
            {activeTab === 'comments' && (
              <CommentsTab
                card={optimisticCard}
                onUpdate={handleUpdate}
              />
            )}
            {activeTab === 'activity' && (
              <ActivityTab card={optimisticCard} />
            )}
          </div>

          {/* Actions */}
          <div className="p-6 pt-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDuplicate}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleArchive}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </Button>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isLoading}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Editable title component
function EditableTitle({ 
  title, 
  onUpdate 
}: { 
  title: string
  onUpdate: (title: string) => void
}) {
  const inlineEdit = useInlineEdit({
    initialValue: title,
    onSave: onUpdate,
    validate: (value) => {
      if (!value.trim()) return 'Title is required'
      if (value.length > 200) return 'Title must be less than 200 characters'
      return null
    }
  })

  if (inlineEdit.isEditing) {
    return (
      <Input
        ref={inlineEdit.inputRef as React.RefObject<HTMLInputElement>}
        value={inlineEdit.value}
        onChange={inlineEdit.handleChange}
        onKeyDown={inlineEdit.handleKeyDown}
        onBlur={inlineEdit.handleBlur}
        className="text-xl font-semibold border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
        data-editable="title"
      />
    )
  }

  return (
    <h1 
      className="text-xl font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-2 py-1 -mx-2 -my-1 transition-colors"
      onClick={inlineEdit.startEditing}
    >
      {title}
    </h1>
  )
}

// Details tab component
function DetailsTab({ 
  card, 
  onUpdate, 
  isLoading 
}: { 
  card: CardData
  onUpdate: (updates: Partial<CardData>) => void
  isLoading: boolean
}) {
  return (
    <div className="p-6 space-y-6">
      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </label>
        <Textarea
          value={card.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value })}
          placeholder="Add a description..."
          className="min-h-[100px]"
          disabled={isLoading}
        />
      </div>

      {/* Due date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Due Date
        </label>
        <DateInput
          value={card.due_date ? new Date(card.due_date) : null}
          onChange={(date) => onUpdate({ due_date: date ? date.toISOString().split('T')[0] : undefined })}
          placeholder="Set due date..."
          allowPast={false}
        />
      </div>

      {/* Assignee */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Assignee
        </label>
        {card.assignee ? (
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={card.assignee.avatar_url} />
              <AvatarFallback>
                {card.assignee.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{card.assignee.name}</span>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="gap-2">
            <User className="w-4 h-4" />
            Assign to someone
          </Button>
        )}
      </div>

      {/* Labels */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Labels
        </label>
        <LabelBadgeList
          labels={card.labels}
          onLabelClick={(label) => {
            // Remove label
            onUpdate({
              labels: card.labels.filter(l => l.id !== label.id)
            })
          }}
        />
        <Button variant="outline" size="sm" className="mt-2 gap-2">
          <Tag className="w-4 h-4" />
          Add labels
        </Button>
      </div>

      {/* Checklist */}
      {card.checklist && (
        <div>
          <Checklist
            items={card.checklist}
            onItemsChange={(items) => onUpdate({ checklist: items })}
          />
        </div>
      )}

      {/* Attachments */}
      {card.attachments && card.attachments.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Attachments
          </label>
          <div className="space-y-2">
            {card.attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <Paperclip className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{attachment.name}</span>
                <span className="text-xs text-gray-500">
                  {(attachment.size / 1024).toFixed(1)} KB
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Comments tab component
function CommentsTab({ 
  card, 
  onUpdate 
}: { 
  card: CardData
  onUpdate: (updates: Partial<CardData>) => void
}) {
  const [newComment, setNewComment] = useState('')

  const handleAddComment = () => {
    if (!newComment.trim()) return

    const comment = {
      id: `comment-${Date.now()}`,
      user: {
        id: 'current-user',
        name: 'You',
        avatar_url: undefined
      },
      text: newComment.trim(),
      timestamp: new Date().toISOString()
    }

    onUpdate({
      comments: [...(card.comments || []), comment]
    })
    setNewComment('')
  }

  return (
    <div className="p-6 space-y-4">
      {/* Add comment */}
      <div className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[80px]"
        />
        <div className="flex justify-end">
          <Button onClick={handleAddComment} disabled={!newComment.trim()}>
            Add Comment
          </Button>
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {card.comments?.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={comment.user.avatar_url} />
              <AvatarFallback>
                {comment.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">{comment.user.name}</span>
                <span className="text-xs text-gray-500">
                  {new Date(comment.timestamp).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {comment.text}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Activity tab component
function ActivityTab({ card }: { card: CardData }) {
  return (
    <div className="p-6">
      <ActivityFeed
        activities={card.activities}
        showAvatars={true}
        groupSimilar={true}
      />
    </div>
  )
}
