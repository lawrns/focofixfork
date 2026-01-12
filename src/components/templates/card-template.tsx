'use client'

import { useState } from 'react'
import { Plus, FileText, Bug, Lightbulb, CheckSquare, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface CardTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: 'bug' | 'feature' | 'task' | 'story' | 'general'
  fields: {
    title: string
    description?: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    labels?: string[]
    checklist?: string[]
    assignee?: string
    due_date?: string
  }
  usage_count: number
}

interface CardTemplateProps {
  onApplyTemplate: (template: CardTemplate) => void
  className?: string
}

const PREDEFINED_CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'bug-report',
    name: 'Bug Report',
    description: 'Standard bug report template with reproduction steps',
    icon: '🐛',
    category: 'bug',
    fields: {
      title: 'Bug: [Brief description]',
      description: '## Description\n\n[Detailed description of the bug]\n\n## Steps to Reproduce\n\n1. [First step]\n2. [Second step]\n3. [Third step]\n\n## Expected Behavior\n\n[What should happen]\n\n## Actual Behavior\n\n[What actually happens]\n\n## Environment\n\n- OS: [e.g., Windows 10]\n- Browser: [e.g., Chrome 91]\n- Version: [e.g., 1.0.0]',
      priority: 'medium',
      labels: ['bug', 'needs-triage'],
      checklist: [
        'Reproduced the issue',
        'Added steps to reproduce',
        'Tested on multiple browsers',
        'Checked for similar issues'
      ]
    },
    usage_count: 0
  },
  {
    id: 'user-story',
    name: 'User Story',
    description: 'Agile user story with acceptance criteria',
    icon: '📖',
    category: 'story',
    fields: {
      title: 'As a [user type], I want [goal] so that [benefit]',
      description: '## User Story\n\nAs a [user type], I want [goal] so that [benefit]\n\n## Acceptance Criteria\n\n- [ ] [Criterion 1]\n- [ ] [Criterion 2]\n- [ ] [Criterion 3]\n\n## Definition of Done\n\n- [ ] Code implemented\n- [ ] Tests written\n- [ ] Documentation updated\n- [ ] Code reviewed',
      priority: 'medium',
      labels: ['user-story', 'feature'],
      checklist: [
        'User story written',
        'Acceptance criteria defined',
        'Definition of done agreed',
        'Story points estimated'
      ]
    },
    usage_count: 0
  },
  {
    id: 'feature-request',
    name: 'Feature Request',
    description: 'Feature request template with use cases and impact',
    icon: '💡',
    category: 'feature',
    fields: {
      title: 'Feature: [Feature name]',
      description: '## Feature Description\n\n[Detailed description of the requested feature]\n\n## Use Cases\n\n1. [Use case 1]\n2. [Use case 2]\n3. [Use case 3]\n\n## Expected Impact\n\n[How this feature will benefit users/business]\n\n## Alternatives Considered\n\n[Other solutions that were considered]',
      priority: 'low',
      labels: ['enhancement', 'feature-request'],
      checklist: [
        'Use cases documented',
        'Impact assessed',
        'Alternatives considered',
        'Priority determined'
      ]
    },
    usage_count: 0
  },
  {
    id: 'design-review',
    name: 'Design Review',
    description: 'Design review checklist for UI/UX work',
    icon: '🎨',
    category: 'task',
    fields: {
      title: 'Design Review: [Design name]',
      description: '## Design Overview\n\n[Description of the design]\n\n## Review Checklist\n\n- [ ] Accessibility compliance\n- [ ] Responsive design\n- [ ] Brand consistency\n- [ ] User experience flow\n\n## Feedback\n\n[Reviewer feedback and suggestions]',
      priority: 'medium',
      labels: ['design', 'review'],
      checklist: [
        'Accessibility checked',
        'Responsive design verified',
        'Brand guidelines followed',
        'User testing completed'
      ]
    },
    usage_count: 0
  },
  {
    id: 'research-task',
    name: 'Research Task',
    description: 'Research task template with methodology and deliverables',
    icon: '🔍',
    category: 'task',
    fields: {
      title: 'Research: [Research topic]',
      description: '## Research Objective\n\n[What we want to learn]\n\n## Methodology\n\n[How we will conduct the research]\n\n## Key Questions\n\n1. [Question 1]\n2. [Question 2]\n3. [Question 3]\n\n## Deliverables\n\n- [Deliverable 1]\n- [Deliverable 2]\n- [Deliverable 3]',
      priority: 'medium',
      labels: ['research', 'analysis'],
      checklist: [
        'Research plan created',
        'Methodology approved',
        'Data collected',
        'Findings documented'
      ]
    },
    usage_count: 0
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Meeting notes template with agenda and action items',
    icon: '📝',
    category: 'general',
    fields: {
      title: 'Meeting: [Meeting topic]',
      description: '## Meeting Details\n\n- **Date:** [Date]\n- **Time:** [Time]\n- **Attendees:** [List of attendees]\n- **Duration:** [Duration]\n\n## Agenda\n\n1. [Agenda item 1]\n2. [Agenda item 2]\n3. [Agenda item 3]\n\n## Discussion Points\n\n[Key discussion points and decisions]\n\n## Action Items\n\n- [ ] [Action item 1] - [Assignee] - [Due date]\n- [ ] [Action item 2] - [Assignee] - [Due date]',
      priority: 'low',
      labels: ['meeting', 'notes'],
      checklist: [
        'Agenda shared',
        'Meeting recorded',
        'Action items assigned',
        'Follow-up scheduled'
      ]
    },
    usage_count: 0
  }
]

export function CardTemplateSelector({ onApplyTemplate, className }: CardTemplateProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<CardTemplate | null>(null)

  const getCategoryIcon = (category: CardTemplate['category']) => {
    switch (category) {
      case 'bug':
        return <Bug className="w-4 h-4" />
      case 'feature':
        return <Lightbulb className="w-4 h-4" />
      case 'task':
        return <CheckSquare className="w-4 h-4" />
      case 'story':
        return <FileText className="w-4 h-4" />
      default:
        return <Star className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: CardTemplate['category']) => {
    switch (category) {
      case 'bug':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
      case 'feature':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'task':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'story':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  const handleApplyTemplate = () => {
    if (selectedTemplate) {
      onApplyTemplate(selectedTemplate)
      setIsOpen(false)
      setSelectedTemplate(null)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={cn('gap-2', className)}
      >
        <Plus className="w-4 h-4" />
        Templates
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Card Templates
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PREDEFINED_CARD_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className={cn(
                    'p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer transition-all hover:border-blue-300 dark:hover:border-blue-600',
                    selectedTemplate?.id === template.id && 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  )}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{template.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          {template.name}
                        </h3>
                        <Badge className={getCategoryColor(template.category)}>
                          {getCategoryIcon(template.category)}
                          <span className="capitalize">{template.category}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>{template.usage_count} uses</span>
                        <span>{template.fields.checklist?.length || 0} checklist items</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Template Preview */}
            {selectedTemplate && (
              <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Preview: {selectedTemplate.name}
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Title
                    </label>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {selectedTemplate.fields.title}
                    </p>
                  </div>
                  {selectedTemplate.fields.description && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Description
                      </label>
                      <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {selectedTemplate.fields.description}
                      </div>
                    </div>
                  )}
                  {selectedTemplate.fields.labels && selectedTemplate.fields.labels.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Labels
                      </label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedTemplate.fields.labels.map((label) => (
                          <Badge key={label} variant="secondary" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedTemplate.fields.checklist && selectedTemplate.fields.checklist.length > 0 && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Checklist
                      </label>
                      <ul className="text-sm text-gray-900 dark:text-gray-100 mt-1 space-y-1">
                        {selectedTemplate.fields.checklist.map((item, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <input type="checkbox" className="rounded" disabled />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleApplyTemplate}
                disabled={!selectedTemplate}
              >
                Apply Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
