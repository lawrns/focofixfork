'use client'

import React from 'react'
import { MoreHorizontal, Eye, Edit, Copy, Archive, Trash2, Users, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface QuickAction {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
  separator?: boolean
}

export interface QuickActionsProps {
  actions: QuickAction[]
  children?: React.ReactNode
  className?: string
  triggerClassName?: string
}

export function QuickActions({
  actions,
  children,
  className,
  triggerClassName
}: QuickActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children || (
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 w-8 p-0 data-[state=open]:bg-muted',
              triggerClassName
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className={cn('w-48', className)} align="end">
        {actions.map((action, index) => (
          <React.Fragment key={action.id}>
            {action.separator && index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                action.variant === 'destructive' && 'text-destructive focus:text-destructive'
              )}
            >
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Predefined action templates
export const createProjectActions = (
  projectId: string,
  onView: (id: string) => void,
  onEdit: (id: string) => void,
  onDuplicate: (id: string) => void,
  onArchive: (id: string) => void,
  onDelete: (id: string) => void,
  onManageTeam: (id: string) => void,
  onSettings: (id: string) => void
): QuickAction[] => [
  {
    id: 'view',
    label: 'View Details',
    icon: Eye,
    onClick: () => onView(projectId),
  },
  {
    id: 'edit',
    label: 'Edit Project',
    icon: Edit,
    onClick: () => onEdit(projectId),
  },
  {
    id: 'duplicate',
    label: 'Duplicate',
    icon: Copy,
    onClick: () => onDuplicate(projectId),
  },
  {
    id: 'separator1',
    label: '',
    onClick: () => {},
    separator: true,
  },
  {
    id: 'manage-team',
    label: 'Manage Team',
    icon: Users,
    onClick: () => onManageTeam(projectId),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    onClick: () => onSettings(projectId),
  },
  {
    id: 'separator2',
    label: '',
    onClick: () => {},
    separator: true,
  },
  {
    id: 'archive',
    label: 'Archive',
    icon: Archive,
    onClick: () => onArchive(projectId),
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    variant: 'destructive',
    onClick: () => onDelete(projectId),
  },
]

export const createMilestoneActions = (
  milestoneId: string,
  onView: (id: string) => void,
  onEdit: (id: string) => void,
  onComplete: (id: string) => void,
  onDuplicate: (id: string) => void,
  onDelete: (id: string) => void
): QuickAction[] => [
  {
    id: 'view',
    label: 'View Details',
    icon: Eye,
    onClick: () => onView(milestoneId),
  },
  {
    id: 'edit',
    label: 'Edit Milestone',
    icon: Edit,
    onClick: () => onEdit(milestoneId),
  },
  {
    id: 'complete',
    label: 'Mark Complete',
    onClick: () => onComplete(milestoneId),
  },
  {
    id: 'duplicate',
    label: 'Duplicate',
    icon: Copy,
    onClick: () => onDuplicate(milestoneId),
  },
  {
    id: 'separator',
    label: '',
    onClick: () => {},
    separator: true,
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    variant: 'destructive',
    onClick: () => onDelete(milestoneId),
  },
]


