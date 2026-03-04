'use client'

import { Project } from './ProjectTableTypes'

export function getStatusBadge(status: Project['status']) {
  const backgroundColors = {
    'planning': '#f1f5f9',
    'active': '#dbeafe',
    'on_hold': '#fed7aa',
    'completed': '#bbf7d0',
    'cancelled': '#fecaca'
  }

  const textColors = {
    'planning': '#475569',
    'active': '#1e40af',
    'on_hold': '#c2410c',
    'completed': '#14532d',
    'cancelled': '#991b1b'
  }

  const borderColors = {
    'planning': '#cbd5e1',
    'active': '#93c5fd',
    'on_hold': '#fb923c',
    'completed': '#86efac',
    'cancelled': '#fca5a5'
  }

  const labels = {
    'planning': 'Planning',
    'active': 'Active',
    'on_hold': 'On Hold',
    'completed': 'Completed',
    'cancelled': 'Cancelled'
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 12px',
        minWidth: '85px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '600',
        letterSpacing: '0.025em',
        textTransform: 'uppercase',
        backgroundColor: backgroundColors[status] || backgroundColors.planning,
        color: textColors[status] || textColors.planning,
        border: `1px solid ${borderColors[status] || borderColors.planning}`
      }}
    >
      {labels[status] || status}
    </span>
  )
}

export function getPriorityBadge(priority: Project['priority']) {
  const backgroundColors = {
    'low': '#e2e8f0',
    'medium': '#3b82f6',
    'high': '#f97316',
    'urgent': '#dc2626'
  }

  const textColors = {
    'low': '#475569',
    'medium': '#ffffff',
    'high': '#ffffff',
    'urgent': '#ffffff'
  }

  const labels = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High',
    'urgent': 'Urgent'
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 12px',
        minWidth: '70px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: '600',
        letterSpacing: '0.025em',
        textTransform: 'uppercase',
        backgroundColor: backgroundColors[priority] || backgroundColors.medium,
        color: textColors[priority] || textColors.medium,
        border: priority === 'low' ? '1px solid #cbd5e1' : 'none'
      }}
    >
      {labels[priority] || priority}
    </span>
  )
}
