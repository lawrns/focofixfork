'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown, ChevronUp, MoreHorizontal, Calendar, User, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface DataField {
  key: string
  label: string
  value: any
  type?: 'text' | 'date' | 'number' | 'boolean' | 'progress' | 'badge' | 'avatar'
  priority?: 'high' | 'medium' | 'low' // Display priority on mobile
  className?: string
}

interface MobileDataCardProps {
  data: Record<string, any>
  fields: DataField[]
  title?: string
  subtitle?: string
  avatar?: string
  status?: string
  priority?: string
  progress?: number
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onView?: () => void
  actions?: React.ReactNode
  className?: string
  expandable?: boolean
  defaultExpanded?: boolean
}

export function MobileDataCard({
  data,
  fields,
  title,
  subtitle,
  avatar,
  status,
  priority,
  progress,
  onClick,
  onEdit,
  onDelete,
  onView,
  actions,
  className,
  expandable = true,
  defaultExpanded = false
}: MobileDataCardProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Get priority fields for compact display
  const getPriorityFields = () => {
    return fields
      .filter(field => field.priority !== 'low')
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return (priorityOrder[b.priority as keyof typeof priorityOrder] || 2) -
               (priorityOrder[a.priority as keyof typeof priorityOrder] || 2)
      })
      .slice(0, 2) // Show top 2 priority fields
  }

  // Render field value based on type
  const renderFieldValue = (field: DataField) => {
    const value = field.value

    switch (field.type) {
      case 'date':
        return value ? new Date(value).toLocaleDateString() : '-'
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value || '-'
      case 'boolean':
        return value ? 'Yes' : 'No'
      case 'progress':
        return typeof value === 'number' ? `${value}%` : '-'
      case 'badge':
        return value ? (
          <Badge variant="secondary" className="text-xs">
            {value}
          </Badge>
        ) : null
      case 'avatar':
        return value ? (
          <Avatar className="w-6 h-6">
            <AvatarFallback className="text-xs">
              {value.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ) : null
      default:
        return value || '-'
    }
  }

  // Get status color
  const getStatusColor = (statusValue?: string) => {
    switch (statusValue?.toLowerCase()) {
      case 'completed':
      case 'done':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
      case 'active':
      case 'in_progress':
      case 'in progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
      case 'planning':
      case 'planned':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
      case 'on_hold':
      case 'on hold':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
      case 'cancelled':
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300'
    }
  }

  // Get priority color
  const getPriorityColor = (priorityValue?: string) => {
    switch (priorityValue?.toLowerCase()) {
      case 'urgent':
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
      case 'medium':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300'
    }
  }

  const priorityFields = getPriorityFields()

  return (
    <motion.div
      className={cn(
        'bg-card border border-border rounded-lg shadow-sm overflow-hidden',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      whileHover={onClick ? { y: -2 } : {}}
      onClick={onClick}
    >
      {/* Card Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Avatar */}
            {avatar && (
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarFallback>
                  {avatar.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}

            {/* Title and subtitle */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-foreground truncate">
                  {title || data.name || data.title || 'Untitled'}
                </h3>

                {/* Status and Priority Badges */}
                <div className="flex gap-1">
                  {status && (
                    <Badge className={cn('text-xs', getStatusColor(status))}>
                      {status}
                    </Badge>
                  )}
                  {priority && (
                    <Badge className={cn('text-xs', getPriorityColor(priority))}>
                      {priority}
                    </Badge>
                  )}
                </div>
              </div>

              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1 truncate">
                  {subtitle}
                </p>
              )}

              {/* Priority Fields (compact display) */}
              {priorityFields.length > 0 && (
                <div className="flex gap-4 mt-2">
                  {priorityFields.map((field) => (
                    <div key={field.key} className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        {field.label}:
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {renderFieldValue(field)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Progress Bar */}
              {progress !== undefined && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}

            {expandable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsExpanded(!isExpanded)
                }}
                className="p-2"
                aria-label={isExpanded ? 'Show less' : 'Show more'}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            )}

            {/* Default Actions Menu */}
            {(onEdit || onDelete || onView) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2"
                    aria-label="More actions"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onView && (
                    <DropdownMenuItem onClick={onView}>
                      View Details
                    </DropdownMenuItem>
                  )}
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      Edit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {expandable && isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-border bg-muted/30"
        >
          <div className="p-4 space-y-3">
            {fields.map((field) => (
              <div key={field.key} className="flex justify-between items-start">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {field.label}
                </span>
                <div className={cn('text-sm text-foreground flex-1 text-right ml-4', field.className)}>
                  {renderFieldValue(field)}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

export default MobileDataCard
