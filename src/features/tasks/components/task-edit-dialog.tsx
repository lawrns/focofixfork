'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarIcon, Loader2, User, Target, Clock } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Task } from '../types'
import { useTaskUpdates } from '../hooks/use-task-updates'
import { useTranslation } from '@/lib/i18n/context'

interface TaskEditDialogProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  onTaskUpdated?: (updatedTask: Task) => void
  projects?: Array<{ id: string; name: string }>
  milestones?: Array<{ id: string; title: string; project_id: string }>
  assignees?: Array<{ id: string; name: string; email: string }>
}

export function TaskEditDialog({
  isOpen,
  onClose,
  task,
  onTaskUpdated,
  projects = [],
  milestones = [],
  assignees = [],
}: TaskEditDialogProps) {
  const { t } = useTranslation()
  const { updateTask, isUpdating } = useTaskUpdates()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as Task['status'],
    priority: 'medium' as Task['priority'],
    assignee_id: null as string | null,
    due_date: null as string | null,
    estimated_hours: null as number | null,
    actual_hours: null as number | null,
    milestone_id: null as string | null,
    project_id: '',
  })

  const [dueDateOpen, setDueDateOpen] = useState(false)

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        assignee_id: task.assignee_id || null,
        due_date: task.due_date || null,
        estimated_hours: task.estimated_hours || null,
        actual_hours: task.actual_hours || null,
        milestone_id: task.milestone_id || null,
        project_id: task.project_id || '',
      })
    }
  }, [task])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!task) return

    try {
      const updatedTask = await updateTask(task.id, formData)
      onTaskUpdated?.(updatedTask)
      onClose()
    } catch (error) {
      // Error is already handled by the hook
    }
  }

  const handleCancel = () => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        assignee_id: task.assignee_id || null,
        due_date: task.due_date || null,
        estimated_hours: task.estimated_hours || null,
        actual_hours: task.actual_hours || null,
        milestone_id: task.milestone_id || null,
        project_id: task.project_id || '',
      })
    }
    onClose()
  }

  const filteredMilestones = milestones.filter(m => m.project_id === formData.project_id)

  if (!task) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('task.editTask')}</DialogTitle>
          <DialogDescription>{t('task.editTaskDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              {t('task.title')} *
            </label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={t('task.titlePlaceholder')}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              {t('task.description')}
            </label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t('task.descriptionPlaceholder')}
              rows={4}
            />
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="status" className="text-sm font-medium">
                {t('task.status')}
              </label>
              <Select
                value={formData.status}
                onValueChange={(value: Task['status']) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('task.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">{t('status.todo')}</SelectItem>
                  <SelectItem value="in_progress">{t('status.inProgress')}</SelectItem>
                  <SelectItem value="review">{t('status.review')}</SelectItem>
                  <SelectItem value="done">{t('status.done')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="priority" className="text-sm font-medium">
                {t('task.priority')}
              </label>
              <Select
                value={formData.priority}
                onValueChange={(value: Task['priority']) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('task.selectPriority')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('priority.low')}</SelectItem>
                  <SelectItem value="medium">{t('priority.medium')}</SelectItem>
                  <SelectItem value="high">{t('priority.high')}</SelectItem>
                  <SelectItem value="urgent">{t('priority.urgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project and Milestone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="project" className="text-sm font-medium">
                {t('task.project')}
              </label>
              <Select
                value={formData.project_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value, milestone_id: null }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('task.selectProject')} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="milestone" className="text-sm font-medium">
                {t('task.milestone')}
              </label>
              <Select
                value={formData.milestone_id || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, milestone_id: value || null }))}
                disabled={!formData.project_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('task.selectMilestone')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('task.noMilestone')}</SelectItem>
                  {filteredMilestones.map(milestone => (
                    <SelectItem key={milestone.id} value={milestone.id}>
                      {milestone.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Assignee and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="assignee" className="text-sm font-medium">
                {t('task.assignee')}
              </label>
              <Select
                value={formData.assignee_id || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, assignee_id: value || null }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('task.selectAssignee')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('task.unassigned')}</SelectItem>
                  {assignees.map(assignee => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="due_date" className="text-sm font-medium">
                {t('task.dueDate')}
              </label>
              <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.due_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(new Date(formData.due_date), "PPP") : t('task.selectDueDate')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.due_date ? new Date(formData.due_date) : undefined}
                    onSelect={(date) => {
                      setFormData(prev => ({ ...prev, due_date: date ? date.toISOString().split('T')[0] : null }))
                      setDueDateOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Time Tracking */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="estimated_hours" className="text-sm font-medium">
                {t('task.estimatedHours')}
              </label>
              <Input
                id="estimated_hours"
                type="number"
                min="0"
                step="0.5"
                value={formData.estimated_hours || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value ? parseFloat(e.target.value) : null }))}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="actual_hours" className="text-sm font-medium">
                {t('task.actualHours')}
              </label>
              <Input
                id="actual_hours"
                type="number"
                min="0"
                step="0.5"
                value={formData.actual_hours || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, actual_hours: e.target.value ? parseFloat(e.target.value) : null }))}
                placeholder="0"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleCancel}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isUpdating || !formData.title.trim()}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

