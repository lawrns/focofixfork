'use client'

import React, { useState } from 'react'
import { useTaskTemplates } from '@/hooks/use-task-templates'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu'
import { Copy } from 'lucide-react'

interface UseTemplateButtonProps {
  projectId: string
  onTemplateApplied?: (task: any) => void
}

export function UseTemplateButton({ projectId, onTemplateApplied }: UseTemplateButtonProps) {
  const { templates, loading, applyTemplate } = useTaskTemplates()
  const [applying, setApplying] = useState(false)

  const handleApplyTemplate = async (templateId: string) => {
    try {
      setApplying(true)
      const task = await applyTemplate(templateId, projectId)
      onTemplateApplied?.(task)
    } catch (err) {
      console.error('Failed to apply template:', err)
      alert('Failed to create task from template')
    } finally {
      setApplying(false)
    }
  }

  if (loading || templates.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={applying}>
          <Copy className="w-4 h-4 mr-2" />
          {applying ? 'Creating...' : 'Use Template'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Task Templates</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {templates.map(template => (
          <DropdownMenuItem
            key={template.id}
            onClick={() => handleApplyTemplate(template.id)}
          >
            {template.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
